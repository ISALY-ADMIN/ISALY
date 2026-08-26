'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowUpDown } from 'lucide-react'
import type { BugReportStatus } from '@/types/database'
import { AdminBugReport, TicketCard, DetailModal, SpinnerStyles } from '../shared'

/**
 * Liste des tickets archivés (status = 'rejete').
 *
 * Même carte et même panneau de détail que la vue principale — le composant
 * est partagé. La seule différence de comportement : restaurer un ticket le
 * fait sortir de cette liste, puisqu'il n'est plus rejeté.
 */
export default function ArchivedList({ reports }: { reports: AdminBugReport[] }) {
  const [sortDesc, setSortDesc] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [restored, setRestored] = useState<Record<string, BugReportStatus>>({})

  const visible = useMemo(() => {
    const list = reports.filter(r => !restored[r.id])
    return [...list].sort((a, b) => {
      const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDesc ? -delta : delta
    })
  }, [reports, restored, sortDesc])

  const openReport = openId ? visible.find(r => r.id === openId) ?? null : null
  const restoredCount = Object.keys(restored).length

  /** Un ticket restauré quitte immédiatement les archives. */
  function handleChanged(id: string, status: BugReportStatus) {
    if (status !== 'rejete') {
      setRestored(prev => ({ ...prev, [id]: status }))
      setOpenId(current => (current === id ? null : current))
    }
  }

  return (
    <>
      <SpinnerStyles />

      <div className="flex flex-wrap items-center" style={{ gap: '10px', marginBottom: '18px' }}>
        <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
          {visible.length} ticket{visible.length !== 1 ? 's' : ''} archivé{visible.length !== 1 ? 's' : ''}
          {restoredCount > 0 && ` · ${restoredCount} restauré${restoredCount !== 1 ? 's' : ''} à l’instant`}
        </span>

        <button
          onClick={() => setSortDesc(v => !v)}
          className="flex items-center gap-1.5 cursor-pointer transition-all"
          style={{
            marginLeft: 'auto', padding: '6px 12px', borderRadius: '9px', fontSize: '12.5px',
            fontFamily: "'Outfit', sans-serif", fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#9CA3AF',
          }}
        >
          <ArrowUpDown size={13} />
          {sortDesc ? 'Plus récents' : 'Plus anciens'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '18px', padding: '40px', textAlign: 'center', fontSize: '13px', color: '#4B5563',
          }}
        >
          {restoredCount > 0
            ? 'Tous les tickets archivés ont été restaurés.'
            : 'Aucun ticket archivé.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map(report => (
            <TicketCard
              key={report.id}
              report={report}
              onOpen={() => setOpenId(report.id)}
              onChanged={handleChanged}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {openReport && (
          <DetailModal
            report={openReport}
            onClose={() => setOpenId(null)}
            onChanged={handleChanged}
          />
        )}
      </AnimatePresence>
    </>
  )
}
