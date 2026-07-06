'use client'
import { useEffect, useState } from 'react'
import Emoji from '@/components/ui/Emoji'

export default function PushPermission() {
  const [status, setStatus] = useState<NotificationPermission | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setStatus(Notification.permission)
    }
    const d = localStorage.getItem('push_dismissed')
    if (d) setDismissed(true)
  }, [])

  async function requestPermission() {
    const permission = await Notification.requestPermission()
    setStatus(permission)
    if (permission === 'granted') {
      await subscribe()
    }
  }

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
    } catch (err) {
      console.error('Push subscribe error:', err)
    }
  }

  function dismiss() {
    localStorage.setItem('push_dismissed', '1')
    setDismissed(true)
  }

  if (status === 'granted' || status === 'denied' || dismissed || !status) return null

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '14px 16px',
      margin: '8px 24px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ fontSize: '24px' }}><Emoji native="🔔" /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Activer les notifications</div>
        <div style={{ fontSize: '12px', color: '#6B7280' }}>Sois alerté des nouveaux matchs et messages</div>
      </div>
      <button onClick={requestPermission} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" }}>
        Activer
      </button>
      <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
    </div>
  )
}
