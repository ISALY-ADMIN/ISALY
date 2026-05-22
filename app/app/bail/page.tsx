'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { useLease } from '@/contexts/LeaseContext'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthsDiff(start: string): number {
  const s = new Date(start)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth())
}

function monthsRemaining(end: string | null): number | null {
  if (!end) return null
  const e = new Date(end)
  const now = new Date()
  return Math.max(0, (e.getFullYear() - now.getFullYear()) * 12 + e.getMonth() - now.getMonth())
}

export default function BailPage() {
  const router = useRouter()
  const { lease, loading } = useLease()

  useEffect(() => {
    if (!loading && !lease) router.replace('/app/swipe')
  }, [lease, loading, router])

  if (loading || !lease) {
    return (
      <>
        <Topbar title="Mon bail" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>📄</div>
        </div>
      </>
    )
  }

  const duration = monthsDiff(lease.start_date)
  const remaining = monthsRemaining(lease.end_date)

  const rows = [
    { label: 'Adresse', value: `${lease.address}${lease.city ? `, ${lease.city}` : ''}` },
    { label: 'Loyer mensuel', value: `${lease.monthly_rent} €/mois` },
    { label: 'Date de début', value: formatDate(lease.start_date) },
    { label: 'Date de fin', value: lease.end_date ? formatDate(lease.end_date) : 'Non définie' },
    { label: 'Durée en cours', value: `${duration} mois` },
    { label: 'Durée restante', value: remaining !== null ? `${remaining} mois` : '—' },
    { label: 'Colocataires', value: `${lease.nb_roommates} personne${lease.nb_roommates > 1 ? 's' : ''}` },
    { label: 'Statut', value: '🟢 Bail actif' },
  ]

  return (
    <>
      <Topbar title="Mon bail" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '620px' }}>

        <h2 className="text-[24px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
          Mon bail
        </h2>
        <p className="text-[13px] mb-6" style={{ color: '#6B7280' }}>
          Informations et documents relatifs à votre location.
        </p>

        {/* Details card */}
        <div
          className="rounded-[14px] overflow-hidden mb-5"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}
        >
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-5 py-3.5 text-[13.5px]"
              style={{ borderBottom: i < rows.length - 1 ? '1px solid #F3F4F6' : 'none' }}
            >
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span className="font-semibold text-right" style={{ color: '#111827', maxWidth: '60%' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Documents */}
        <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
          Documents
        </div>
        <div className="flex flex-col gap-2 mb-6">
          {[
            { icon: '📄', label: 'Bail signé', available: true },
            { icon: '🔑', label: "État des lieux d'entrée", available: true },
            { icon: '📸', label: 'État des lieux de sortie', available: false },
          ].map(doc => (
            <div
              key={doc.label}
              className="flex items-center justify-between p-4 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[20px]">{doc.icon}</span>
                <span className="text-[13.5px] font-medium" style={{ color: '#374151' }}>{doc.label}</span>
              </div>
              <button
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border-none cursor-pointer"
                style={doc.available ? { background: '#4ECBA0', color: '#fff' } : { background: '#F3F4F6', color: '#9CA3AF' }}
              >
                {doc.available ? 'Télécharger' : 'Non disponible'}
              </button>
            </div>
          ))}
        </div>

        {/* Back link */}
        <Link href="/app/dashboard" className="no-underline flex items-center gap-2 text-[13px] font-medium" style={{ color: '#4ECBA0' }}>
          ← Retour au tableau de bord
        </Link>
      </div>
    </>
  )
}
