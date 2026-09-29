'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** « Marquer facturée » : commission de la délégation, via /api/admin/delegations. */
export default function MarkBilled({ delegationId }: { delegationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function mark() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegationId, status: 'facturee' }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      alert('Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="btn btn-glass btn-sm" type="button" onClick={mark} disabled={loading}>
      {loading ? 'Enregistrement…' : 'Marquer facturée'}
    </button>
  )
}
