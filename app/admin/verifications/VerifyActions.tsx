'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  alreadyVerified: boolean
}

export default function VerifyActions({ userId, alreadyVerified }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(
    alreadyVerified ? 'approved' : null
  )

  async function act(approve: boolean) {
    const label = approve ? 'approve' : 'reject'
    if (!confirm(approve ? 'Valider cette identité et notifier l\'utilisateur ?' : 'Rejeter cette vérification ?')) return
    setLoading(label)
    try {
      const res = await fetch('/api/admin/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve }),
      })
      if (!res.ok) throw new Error()
      setDone(approve ? 'approved' : 'rejected')
      router.refresh()
    } catch {
      alert('Erreur lors de la mise à jour.')
    } finally {
      setLoading(null)
    }
  }

  if (done === 'approved') {
    return (
      <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', background: 'rgba(78,203,160,0.15)', color: '#4ECBA0' }}>
        ✓ Validée
      </span>
    )
  }
  if (done === 'rejected') {
    return (
      <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
        ✗ Rejetée
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => act(true)}
        disabled={!!loading}
        style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid #4ECBA0', color: '#4ECBA0', background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        {loading === 'approve' ? '…' : '✓ Valider'}
      </button>
      <button
        onClick={() => act(false)}
        disabled={!!loading}
        style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid #EF4444', color: '#EF4444', background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        {loading === 'reject' ? '…' : '✗ Rejeter'}
      </button>
    </div>
  )
}
