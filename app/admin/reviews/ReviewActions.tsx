'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function ReviewActions({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'keep' | 'delete' | null>(null)

  async function decide(action: 'keep' | 'delete') {
    if (action === 'delete' && !confirm('Supprimer définitivement cet avis ? Le reviewer sera notifié.')) return
    setBusy(action)
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Erreur' }))
        alert(error ?? 'Erreur')
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
      <Button
        variant="secondary" size="sm"
        onClick={() => decide('keep')}
        loading={busy === 'keep'}
        disabled={busy !== null}
        className="!px-3 !text-[#10B981] !border-[rgba(16,185,129,0.35)] hover:!bg-[rgba(16,185,129,0.08)]"
      >
        <ShieldCheck size={13} strokeWidth={2.2} />
        Garder
      </Button>
      <Button
        variant="danger" size="sm"
        onClick={() => decide('delete')}
        loading={busy === 'delete'}
        disabled={busy !== null}
        className="!px-3"
      >
        <Trash2 size={13} strokeWidth={2} />
        Supprimer
      </Button>
    </div>
  )
}
