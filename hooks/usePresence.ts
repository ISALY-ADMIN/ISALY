'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const ONLINE_CHANNEL = 'presence:online'

type SupabaseClient = ReturnType<typeof createClient>
type Channel = ReturnType<SupabaseClient['channel']>

// ════════════════════════════════════════════════════════════════
// Canal de présence PARTAGÉ (singleton)
// ----------------------------------------------------------------
// createBrowserClient() renvoie un client singleton et realtime-js
// déduplique les canaux par topic : si plusieurs hooks appellent
// supabase.channel('presence:online'), ils récupèrent le MÊME canal.
// Ajouter .on(...) sur ce canal déjà souscrit lève :
//   "cannot add 'presence' callbacks ... after 'subscribe()'".
// → On centralise : un seul canal, tous les .on() liés AVANT un
//   unique .subscribe(), et un registre de listeners pour les lecteurs.
// ════════════════════════════════════════════════════════════════
let presenceChannel: Channel | null = null
let presenceKey: string | null = null
let presenceRefCount = 0
let currentOnline: Set<string> = new Set()
const onlineListeners = new Set<(online: Set<string>) => void>()

function notifyOnline() {
  onlineListeners.forEach(l => l(currentOnline))
}

function ensurePresenceChannel(supabase: SupabaseClient, uid: string): Channel {
  if (presenceChannel && presenceKey === uid) return presenceChannel

  // Changement d'utilisateur (nouvelle session) → on repart proprement
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel)
    presenceChannel = null
    currentOnline = new Set()
  }

  presenceKey = uid
  const channel = supabase.channel(ONLINE_CHANNEL, {
    config: { presence: { key: uid } },
  })

  function sync() {
    const state = channel.presenceState() as Record<string, unknown[]>
    currentOnline = new Set(Object.keys(state ?? {}))
    notifyOnline()
  }

  // Tous les callbacks AVANT subscribe()
  channel
    .on('presence', { event: 'sync' }, sync)
    .on('presence', { event: 'join' }, sync)
    .on('presence', { event: 'leave' }, sync)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: uid, online_at: new Date().toISOString() })
      }
    })

  presenceChannel = channel
  return channel
}

/** Attache un conscommateur au canal partagé ; renvoie la fonction de détachement. */
function attachPresence(uid: string, listener?: (online: Set<string>) => void): () => void {
  const supabase = createClient()
  ensurePresenceChannel(supabase, uid)
  presenceRefCount++
  if (listener) {
    onlineListeners.add(listener)
    listener(currentOnline) // état courant immédiat
  }
  return () => {
    if (listener) onlineListeners.delete(listener)
    presenceRefCount = Math.max(0, presenceRefCount - 1)
    if (presenceRefCount === 0 && presenceChannel) {
      supabase.removeChannel(presenceChannel)
      presenceChannel = null
      presenceKey = null
      currentOnline = new Set()
    }
  }
}

/**
 * Track la présence de l'utilisateur courant :
 *  - Presence Realtime (canal partagé) → statut "en ligne" instantané
 *  - last_seen dans profiles (focus/blur + périodique) → "Vu il y a X"
 */
export function usePresence(currentUserId: string | null) {
  useEffect(() => {
    if (!currentUserId) return

    async function updateLastSeen() {
      try {
        const res = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true,
        })
        if (!res.ok) console.error('[presence] heartbeat failed', res.status, await res.text().catch(() => ''))
      } catch (e) {
        console.error('[presence] heartbeat error', e)
      }
    }

    function beaconLastSeen() {
      // beforeunload : fetch async peut être coupé ; sendBeacon garantit l'envoi.
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/presence/heartbeat', new Blob([], { type: 'application/json' }))
        } else {
          fetch('/api/presence/heartbeat', { method: 'POST', keepalive: true, credentials: 'same-origin' })
        }
      } catch { /* noop */ }
    }

    updateLastSeen()
    const interval = setInterval(updateLastSeen, 60000)
    window.addEventListener('focus', updateLastSeen)
    window.addEventListener('blur', updateLastSeen)
    window.addEventListener('beforeunload', beaconLastSeen)
    document.addEventListener('visibilitychange', updateLastSeen)

    const detach = attachPresence(currentUserId)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', updateLastSeen)
      window.removeEventListener('blur', updateLastSeen)
      window.removeEventListener('beforeunload', beaconLastSeen)
      document.removeEventListener('visibilitychange', updateLastSeen)
      detach()
    }
  }, [currentUserId])
}

/**
 * Ensemble des user_id actuellement en ligne (canal Presence partagé).
 * Pastilles vertes dans la liste des conversations.
 */
export function useOnlineUsers(currentUserId: string | null): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!currentUserId) return
    const detach = attachPresence(currentUserId, setOnline)
    return detach
  }, [currentUserId])

  return online
}

/**
 * Présence d'un utilisateur précis (header du chat) :
 * Presence partagée (instantané) + last_seen (fallback "Vu il y a X").
 */
export function useUserPresence(userId: string | null) {
  const [presenceOnline, setPresenceOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null)
  const mountId = useRef(Math.random().toString(36).slice(2))

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    async function fetchPresence() {
      const { data } = await supabase
        .from('profiles')
        .select('last_seen')
        .eq('id', userId!)
        .single()

      if (data?.last_seen) setLastSeen(data.last_seen)

      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .limit(5)

      if (convData && convData.length > 0) {
        const convIds = convData.map(c => c.id)
        const { data: msgs } = await supabase
          .from('messages')
          .select('sender_id, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true })
          .limit(100)

        if (msgs && msgs.length > 1) {
          const responseTimes: number[] = []
          for (let i = 1; i < msgs.length; i++) {
            if (msgs[i]?.sender_id === userId && msgs[i - 1]?.sender_id !== userId) {
              const diff = new Date(msgs[i].created_at).getTime() - new Date(msgs[i - 1].created_at).getTime()
              if (diff < 24 * 60 * 60 * 1000) responseTimes.push(diff / 60000)
            }
          }
          if (responseTimes.length > 0) {
            setAvgResponseTime(Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length))
          }
        }
      }
    }

    fetchPresence()
    const interval = setInterval(fetchPresence, 60000)

    // Présence instantanée via le canal partagé (listener, pas de nouveau canal)
    const uid = userId
    const onOnline = (set: Set<string>) => setPresenceOnline(set.has(uid))
    const detach = attachPresence(uid, onOnline)

    // Fallback last_seen : canal postgres_changes propre à ce montage (topic unique)
    const lsChannel = supabase
      .channel(`presence-user:${userId}:${mountId.current}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
      }, (payload) => {
        const ls = (payload?.new as { last_seen?: string } | null)?.last_seen
        if (ls) setLastSeen(ls)
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      detach()
      supabase.removeChannel(lsChannel)
    }
  }, [userId])

  // En ligne si présent sur le canal OU last_seen < 5 min
  const lastSeenRecent = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) / 60000 < 5 : false
  const isOnline = presenceOnline || lastSeenRecent

  return { isOnline, lastSeen, avgResponseTime }
}

/**
 * Formatage relatif français du last_seen.
 * null (jamais tracké) → chaîne vide : n'affiche rien.
 */
export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return ''
  const d = new Date(lastSeen)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMin = (now.getTime() - d.getTime()) / 60000
  if (diffMin < 5) return 'En ligne'
  if (diffMin < 60) return `Vu il y a ${Math.round(diffMin)} min`
  if (d.toDateString() === now.toDateString()) return `Vu il y a ${Math.round(diffMin / 60)} h`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Vu hier'
  return `Vu le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}
