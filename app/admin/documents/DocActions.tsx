'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function DocActions({ documentId, signedUrl }: {
  documentId: string
  signedUrl: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  async function decide(approve: boolean) {
    setBusy(approve ? 'approve' : 'reject')
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, approve }),
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
      {signedUrl && (
        <Button
          variant="secondary" size="sm"
          onClick={() => window.open(signedUrl, '_blank', 'noopener')}
          className="!px-3"
        >
          <Eye size={13} strokeWidth={2} />
          Voir
        </Button>
      )}
      <Button
        variant="secondary" size="sm"
        onClick={() => decide(true)}
        loading={busy === 'approve'}
        disabled={busy !== null}
        className="!px-3 !text-[#10B981] !border-[rgba(16,185,129,0.35)] hover:!bg-[rgba(16,185,129,0.08)]"
      >
        <Check size={13} strokeWidth={2.4} />
        Valider
      </Button>
      <Button
        variant="danger" size="sm"
        onClick={() => decide(false)}
        loading={busy === 'reject'}
        disabled={busy !== null}
        className="!px-3"
      >
        <X size={13} strokeWidth={2.4} />
        Rejeter
      </Button>
    </div>
  )
}
