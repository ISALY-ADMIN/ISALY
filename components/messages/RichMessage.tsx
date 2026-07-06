'use client'

import { CalendarClock, KeyRound, Home, FileText, Video, MapPin, Check, X, RefreshCw, ExternalLink } from 'lucide-react'
import { EmojiText } from '@/components/ui/Emoji'

export interface RichPayload {
  [k: string]: unknown
  status?: 'pending' | 'accepted' | 'refused'
}

interface RichMessageProps {
  type: string
  payload: RichPayload | null
  isMe: boolean
  onRespond?: (status: 'accepted' | 'refused') => void
  onCounter?: () => void
  /** Lien vers le formulaire "Établir le bail" (affiché côté loueur quand la réservation est acceptée). */
  establishLeaseHref?: string | null
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: '✓ Accepté', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  refused: { label: '✕ Refusé', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  pending: { label: '⏳ En attente', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
}

export default function RichMessage({ type, payload, isMe, onRespond, onCounter, establishLeaseHref }: RichMessageProps) {
  const p = payload ?? {}
  const status = (p.status as string) ?? 'pending'
  const cardBase: React.CSSProperties = {
    borderRadius: 16, padding: 14, minWidth: 240, maxWidth: 300,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  }
  // Le destinataire (isMe = false) peut répondre tant que c'est en attente
  const canRespond = !isMe && status === 'pending' && (type === 'visite' || type === 'reservation')

  if (type === 'annonce') {
    return (
      <a href={`/app/annonce/${p.listing_id}`} style={{ ...cardBase, textDecoration: 'none', display: 'block', padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 120, background: p.photo ? `url(${p.photo}) center/cover` : 'linear-gradient(135deg,#1f1f1f,#2a2a2a)' }} />
        <div style={{ padding: 12 }}>
          <div className="flex items-center gap-1.5" style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            <Home size={13} /> ANNONCE
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{String(p.title ?? 'Logement')}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, marginTop: 2 }}>{String(p.city ?? '')} · {String(p.rent ?? '')}€/mois</div>
          <div className="flex items-center gap-1" style={{ color: '#10B981', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
            Voir l&apos;annonce <ExternalLink size={12} />
          </div>
        </div>
      </a>
    )
  }

  if (type === 'document') {
    return (
      <div style={cardBase}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-[10px] flex-shrink-0" style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
            <FileText size={20} color="#fff" />
          </div>
          <div className="min-w-0">
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5 }} className="truncate">{String(p.name ?? 'Document')}</div>
            <a href={String(p.url ?? '#')} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: '#10B981', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
              Ouvrir <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // visite / reservation
  const isVisite = type === 'visite'
  const accent = isVisite ? '#10B981' : '#6366F1'
  const Icon = isVisite ? CalendarClock : KeyRound
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.pending

  return (
    <div style={cardBase}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5" style={{ color: accent, fontSize: 11, fontWeight: 700 }}>
          <Icon size={14} /> {isVisite ? 'PROPOSITION DE VISITE' : 'DEMANDE DE RÉSERVATION'}
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 20 }}><EmojiText text={st.label} size="10.5px" /></span>
      </div>

      {isVisite ? (
        <>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {p.date ? new Date(`${p.date}T${p.time ?? '00:00'}`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
          </div>
          <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5 }}>
            <span>{String(p.time ?? '')}</span>
            <span className="flex items-center gap-1">
              {p.mode === 'visio' ? <Video size={13} /> : <MapPin size={13} />} {p.mode === 'visio' ? 'Visio' : 'Physique'}
            </span>
          </div>
        </>
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>
          {p.listing_title ? <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>{String(p.listing_title)}</div> : null}
          {String(p.message ?? '')}
        </div>
      )}

      {type === 'reservation' && status === 'accepted' && !isMe && establishLeaseHref && (
        <a href={establishLeaseHref}
          className="flex items-center justify-center gap-1.5 mt-3 py-2 px-3 rounded-[10px] text-[12px] font-bold no-underline transition-transform active:scale-[0.96]"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff' }}>
          <FileText size={14} /> Établir le bail
        </a>
      )}

      {canRespond && (
        <div className="flex gap-1.5 mt-3">
          <RespBtn onClick={() => onRespond?.('accepted')} bg="linear-gradient(135deg,#10B981,#059669)" color="#fff"><Check size={14} /> Accepter</RespBtn>
          <RespBtn onClick={() => onRespond?.('refused')} bg="rgba(255,255,255,0.06)" color="#fff"><X size={14} /> Refuser</RespBtn>
          {isVisite && onCounter && (
            <RespBtn onClick={onCounter} bg="rgba(255,255,255,0.06)" color="#fff" title="Proposer un autre créneau"><RefreshCw size={14} /></RespBtn>
          )}
        </div>
      )}
    </div>
  )
}

function RespBtn({ children, onClick, bg, color, title }: { children: React.ReactNode; onClick: () => void; bg: string; color: string; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-[10px] text-[12px] font-bold flex-1 transition-transform active:scale-[0.96]"
      style={{ background: bg, color, border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </button>
  )
}
