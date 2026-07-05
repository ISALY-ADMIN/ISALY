'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const ONLINE_CHANNEL = 'presence:online'

/**
 * Track la présence de l'utilisateur courant :
 *  - Supabase Realtime Presence (canal partagé) → statut "en ligne" instantané
 *  - last_seen dans profiles (update focus/blur + périodique) → "Vu il y a X"
 */
export function usePresence(currentUserId: string | null) {
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    async function updateLastSeen() {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', currentUserId)
    }

    updateLastSeen()
    const interval = setInterval(updateLastSeen, 30000)
    window.addEventListener('focus', updateLastSeen)
    window.addEventListener('blur', updateLastSeen)

    // Presence channel partagé : on s'annonce en ligne
    const channel = supabase.channel(ONLINE_CHANNEL, {
      config: { presence: { key: currentUserId } },
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() })
      }
    })

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', updateLastSeen)
      window.removeEventListener('blur', updateLastSeen)
      supabase.removeChannel(channel)
    }
  }, [currentUserId])
}

/**
 * Ensemble des user_id actuellement en ligne (via le canal Presence partagé).
 * Utilisé pour les pastilles vertes dans la liste des conversations.
 */
export function useOnlineUsers(currentUserId: string | null): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()
    const channel = supabase.channel(ONLINE_CHANNEL, {
      config: { presence: { key: currentUserId } },
    })

    function sync() {
      const state = channel.presenceState() as Record<string, unknown[]>
      setOnline(new Set(Object.keys(state)))
    }

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  return online
}

/**
 * Présence d'un utilisateur précis (header du chat) :
 * combine le canal Presence (instantané) + last_seen (fallback "Vu il y a X").
 */
export function useUserPresence(userId: string | null) {
  const [presenceOnline, setPresenceOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    async function fetchPresence() {
      const { data } = await supabase
        .from('profiles')
        .select('last_seen')
        .eq('id', userId)
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
            if (msgs[i].sender_id === userId && msgs[i - 1].sender_id !== userId) {
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

    // Presence instantanée sur le canal partagé
    const channel = supabase.channel(ONLINE_CHANNEL)
    channelRef.current = channel
    const uid = userId
    function sync() {
      const state = channel.presenceState() as Record<string, unknown[]>
      setPresenceOnline(uid in state)
    }
    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe()

    // Fallback : update de last_seen
    const lsChannel = supabase
      .channel(`presence:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
      }, (payload) => setLastSeen((payload.new as { last_seen: string }).last_seen))
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
      supabase.removeChannel(lsChannel)
    }
  }, [userId])

  // En ligne si présent sur le canal OU last_seen < 5 min
  const lastSeenRecent = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) / 60000 < 5 : false
  const isOnline = presenceOnline || lastSeenRecent

  return { isOnline, lastSeen, avgResponseTime }
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Hors ligne'
  const diff = (Date.now() - new Date(lastSeen).getTime()) / 60000
  if (diff < 5) return 'En ligne'
  if (diff < 60) return `Vu il y a ${Math.round(diff)} min`
  if (diff < 1440) return `Vu il y a ${Math.round(diff / 60)}h`
  return `Vu il y a ${Math.round(diff / 1440)}j`
}
