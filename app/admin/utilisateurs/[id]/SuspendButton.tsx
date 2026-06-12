'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  suspended: boolean
}

export default function SuspendButton({ userId, suspended }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(suspended)

  async function toggle() {
    if (!confirm(current ? 'Réactiver ce compte ?' : 'Suspendre ce compte ? L\'utilisateur ne pourra plus accéder à l\'app.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, suspend: !current }),
      })
      if (!res.ok) throw new Error()
      setCurrent(!current)
      router.refresh()
    } catch {
      alert('Erreur lors de la mise à jour du statut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '10px 18px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        border: '1px solid',
        background: 'transparent',
        flexShrink: 0,
        transition: 'all 0.15s',
        ...(current
          ? { borderColor: '#4ECBA0', color: '#4ECBA0' }
          : { borderColor: '#EF4444', color: '#EF4444' }),
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? '…' : current ? 'Réactiver' : 'Suspendre'}
    </button>
  )
}
