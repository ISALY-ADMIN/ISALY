'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  reportId: string
  currentStatus: string
}

const TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  open: [
    { label: 'En cours', next: 'reviewing', color: '#F59E0B' },
    { label: 'Ignorer', next: 'dismissed', color: '#6B7280' },
  ],
  reviewing: [
    { label: 'Résoudre', next: 'resolved', color: '#4ECBA0' },
    { label: 'Ignorer', next: 'dismissed', color: '#6B7280' },
  ],
}

export default function ReportActions({ reportId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  const actions = TRANSITIONS[status] ?? []

  if (actions.length === 0) {
    return (
      <span style={{ fontSize: '11px', color: '#4B5563', fontStyle: 'italic' }}>—</span>
    )
  }

  async function update(next: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/update-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: next }),
      })
      if (!res.ok) throw new Error()
      setStatus(next)
      router.refresh()
    } catch {
      alert('Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {actions.map(a => (
        <button
          key={a.next}
          onClick={() => update(a.next)}
          disabled={loading}
          style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '7px', border: `1px solid ${a.color}`, color: a.color, background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
