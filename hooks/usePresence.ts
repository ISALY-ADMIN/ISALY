'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePresence(currentUserId: string | null) {
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    async function updatePresence() {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', currentUserId)
    }

    updatePresence()
    const interval = setInterval(updatePresence, 30000)
    window.addEventListener('focus', updatePresence)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', updatePresence)
    }
  }, [currentUserId])
}

export function useUserPresence(userId: string | null) {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    async function fetchPresence() {
      const { data } = await supabase
        .from('profiles')
        .select('last_seen')
        .eq('id', userId)
        .single()

      if (data?.last_seen) {
        const lastSeenDate = new Date(data.last_seen)
        const diffMinutes = (Date.now() - lastSeenDate.getTime()) / 60000
        setIsOnline(diffMinutes < 5)
        setLastSeen(data.last_seen)
      }

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

    const channel = supabase
      .channel(`presence:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        const lastSeenDate = new Date(payload.new.last_seen)
        const diffMinutes = (Date.now() - lastSeenDate.getTime()) / 60000
        setIsOnline(diffMinutes < 5)
        setLastSeen(payload.new.last_seen)
      })
      .subscribe()

    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [userId])

  return { isOnline, lastSeen, avgResponseTime }
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Jamais connecté'
  const diff = (Date.now() - new Date(lastSeen).getTime()) / 60000
  if (diff < 5) return 'En ligne'
  if (diff < 60) return `Vu il y a ${Math.round(diff)} min`
  if (diff < 1440) return `Vu il y a ${Math.round(diff / 60)}h`
  return `Vu il y a ${Math.round(diff / 1440)}j`
}
