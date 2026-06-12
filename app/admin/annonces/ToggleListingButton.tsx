'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  listingId: string
  isActive: boolean
}

export default function ToggleListingButton({ listingId, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(isActive)

  async function toggle() {
    if (!confirm(current ? 'Désactiver cette annonce ?' : 'Réactiver cette annonce ?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/toggle-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, active: !current }),
      })
      if (!res.ok) throw new Error()
      setCurrent(!current)
      router.refresh()
    } catch {
      alert('Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '8px',
        border: '1px solid',
        background: 'transparent',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s',
        ...(current
          ? { borderColor: '#EF4444', color: '#EF4444' }
          : { borderColor: '#4ECBA0', color: '#4ECBA0' }),
      }}
    >
      {loading ? '…' : current ? 'Désactiver' : 'Réactiver'}
    </button>
  )
}
