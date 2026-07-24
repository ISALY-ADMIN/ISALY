'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Clock, CheckCircle2, XCircle, Sparkles, X, Star,
  Briefcase, CalendarDays, Clock3, ShieldCheck, Home as HomeIcon, MessageCircle,
  CalendarClock, Layers, ListFilter, Bookmark,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import CertificationBadge, { type CertLevel } from '@/components/ui/CertificationBadge'
import { IsalyScoreGauge } from '@/components/ui/IsalyScore'
import { BentoStyles, CountUp, cardBase } from '@/components/ui/Bento'
import { createClient } from '@/lib/supabase/client'
import { computeCompatibility } from '@/lib/matching'
import { emploiLabel, leaseDurationLabel, statusMeta, EMPLOI_OPTIONS } from '@/lib/candidatures'
import type { CandidatureStatus } from '@/types/database'

const OUTFIT = "'Outfit', sans-serif"

// ─── Types ───────────────────────────────────────────────────
interface CandProfile {
  id: string
  first_name: string | null
  last_name: string | null
  city: string | null
  bio: string | null
  avatar_url: string | null
  cert_level: number | null
  last_seen: string | null
  matching_data: unknown
}
interface IsalyLite { score: number; avgRating: number | null; reviewCount: number }
interface Candidature {
  swipe_id: string
  swiper_id: string
  created_at: string
  status: CandidatureStatus
  motivation: string | null
  moveIn: string | null
  duration: string | null
  emploi: string | null
  hasGarant: boolean | null
  coloc: number | null
  profile: CandProfile
  compatibility: number | null
  isaly: IsalyLite | null
}
interface ListingLite { id: string; title: string | null; city: string | null; photos: string[] | null; owner_id: string | null }

type SortKey = 'compat' | 'score' | 'date' | 'status'
type StatusFilter = 'all' | CandidatureStatus

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 30 * 86400) return `il y a ${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function isOnline(ls: string | null): boolean {
  return !!ls && Date.now() - new Date(ls).getTime() < 5 * 60 * 1000
}
function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function displayName(p: CandProfile): string {
  return `${p.first_name ?? 'Candidat'}${p.last_name ? ` ${p.last_name[0]}.` : ''}`
}
function garantLabel(v: boolean | null): string {
  if (v === true) return 'Garant disponible'
  if (v === false) return 'Sans garant'
  return 'Non précisé'
}
function colocLabel(n: number | null): string {
  if (n == null || n === 0) return 'Seul·e'
  return `+${n} colocataire${n > 1 ? 's' : ''}`
}

// ─── Toast ───────────────────────────────────────────────────
function Toast({ msg, tone, onClose }: { msg: string; tone: 'success' | 'error'; onClose: () => void }) {
  const isErr = tone === 'error'
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      style={{
        position: 'fixed', top: '76px', left: '50%', transform: 'translateX(-50%)',
        background: isErr ? 'rgba(239,68,68,0.14)' : 'rgba(16,185,129,0.14)',
        color: isErr ? '#F87171' : '#4ECBA0',
        border: `1px solid ${isErr ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
        borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: 600,
        zIndex: 1200, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: '10px', fontFamily: OUTFIT,
      }}
    >
      <CheckCircle2 size={16} strokeWidth={2.2} /><span>{msg}</span>
      <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
    </motion.div>
  )
}

// ─── Status pill ─────────────────────────────────────────────
function StatusPill({ status }: { status: CandidatureStatus }) {
  const m = statusMeta(status)
  return (
    <span style={{
      fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', fontFamily: OUTFIT,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap',
    }}>{m.label}</span>
  )
}
function CompatPill({ v }: { v: number | null }) {
  if (v == null) return null
  return (
    <span style={{
      fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', fontFamily: OUTFIT,
      background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}><Sparkles size={11} strokeWidth={2.2} />{v}%</span>
  )
}

// ─── Criteria chips ──────────────────────────────────────────
function CriteriaRow({ c }: { c: Candidature }) {
  const items: { icon: React.ReactNode; label: string }[] = [
    c.emploi ? { icon: <Briefcase size={12} strokeWidth={2} />, label: emploiLabel(c.emploi as never) ?? c.emploi } : null,
    c.moveIn ? { icon: <CalendarDays size={12} strokeWidth={2} />, label: `Dès le ${fmtDate(c.moveIn)}` } : null,
    c.duration ? { icon: <Clock3 size={12} strokeWidth={2} />, label: leaseDurationLabel(c.duration) ?? c.duration } : null,
    { icon: <ShieldCheck size={12} strokeWidth={2} />, label: garantLabel(c.hasGarant) },
    (c.coloc != null && c.coloc > 0) ? { icon: <Users size={12} strokeWidth={2} />, label: colocLabel(c.coloc) } : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {items.map((it, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '11.5px', fontWeight: 600, color: 'rgba(255,255,255,0.65)',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '9px', padding: '4px 9px',
        }}>
          <span style={{ color: '#10B981', display: 'inline-flex' }}>{it.icon}</span>{it.label}
        </span>
      ))}
    </div>
  )
}

// ─── Action buttons ──────────────────────────────────────────
function DecisionActions({ current, busy, onDecide, compact }: {
  current: CandidatureStatus; busy: boolean; onDecide: (s: CandidatureStatus) => void; compact?: boolean
}) {
  const btn = (s: CandidatureStatus, label: string, icon: React.ReactNode, color: string) => {
    const active = current === s
    return (
      <button
        type="button" onClick={() => onDecide(s)} disabled={busy} title={label}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: compact ? '7px 9px' : '8px 12px', borderRadius: '9px', cursor: busy ? 'default' : 'pointer',
          fontFamily: OUTFIT, fontSize: '12px', fontWeight: 700, flex: compact ? '1' : 'none',
          background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${active ? `${color}66` : 'rgba(255,255,255,0.1)'}`,
          color: active ? color : 'rgba(255,255,255,0.72)', transition: 'all 0.15s ease', opacity: busy ? 0.6 : 1,
        }}
      >{icon}{!compact && label}</button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: compact ? 'nowrap' : 'wrap' }}>
      {btn('accepted', 'Accepter', <CheckCircle2 size={14} strokeWidth={2.2} />, '#10B981')}
      {btn('visit_proposed', 'Visite', <CalendarClock size={14} strokeWidth={2.2} />, '#34D399')}
      {btn('waitlisted', 'En réserve', <Bookmark size={14} strokeWidth={2.2} />, '#818CF8')}
      {btn('rejected', 'Refuser', <XCircle size={14} strokeWidth={2.2} />, '#F87171')}
    </div>
  )
}

// ─── Candidate card (list) ───────────────────────────────────
function CandidatureCard({ c, busy, onDecide, onOpen }: {
  c: Candidature; busy: boolean; onDecide: (s: CandidatureStatus) => void; onOpen: () => void
}) {
  const online = isOnline(c.profile.last_seen)
  const initials = `${c.profile.first_name?.[0] ?? '?'}${c.profile.last_name?.[0] ?? ''}`.toUpperCase()
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      className="cand-card" style={{ ...cardBase, padding: '18px 20px', height: 'auto', gap: '14px' }}
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <button type="button" onClick={onOpen} aria-label="Voir le détail"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%', overflow: 'hidden',
            background: c.profile.avatar_url ? `url(${c.profile.avatar_url}) center/cover` : 'linear-gradient(135deg,#10B981,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: OUTFIT, fontSize: '18px', fontWeight: 800, color: '#fff',
          }}>{!c.profile.avatar_url && initials}</div>
          {online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#10B981', border: '2.5px solid #0A0A0A' }} />}
        </button>
        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
            <button type="button" onClick={onOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: OUTFIT, fontSize: '15.5px', fontWeight: 700, color: '#fff' }}>
              {displayName(c.profile)}
            </button>
            {c.profile.city && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>· {c.profile.city}</span>}
            {(c.profile.cert_level ?? 0) > 0 && <CertificationBadge level={(c.profile.cert_level ?? 0) as CertLevel} size="sm" />}
            <CompatPill v={c.compatibility} />
            {c.isaly && (
              <span title="ISALY Score" style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', fontFamily: OUTFIT,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)',
              }}>ISALY {c.isaly.score}</span>
            )}
            {c.isaly && c.isaly.avgRating != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: '#F59E0B', fontWeight: 700 }}>
                <Star size={11} fill="currentColor" />{c.isaly.avgRating}
              </span>
            )}
            <span style={{ marginLeft: 'auto' }}><StatusPill status={c.status} /></span>
          </div>
          {c.motivation && (
            <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              “{c.motivation}”
            </p>
          )}
          <CriteriaRow c={c} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
            <DecisionActions current={c.status} busy={busy} onDecide={onDecide} />
            <button type="button" onClick={onOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', fontFamily: OUTFIT, fontSize: '12px', fontWeight: 700, marginLeft: 'auto' }}>
              Détails →
            </button>
            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.32)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} strokeWidth={1.8} />{timeAgo(c.created_at)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Detail modal ────────────────────────────────────────────
function DetailModal({ c, busy, onDecide, onClose, onContact }: {
  c: Candidature; busy: boolean; onDecide: (s: CandidatureStatus) => void; onClose: () => void; onContact: () => void
}) {
  const initials = `${c.profile.first_name?.[0] ?? '?'}${c.profile.last_name?.[0] ?? ''}`.toUpperCase()
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '26px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: c.profile.avatar_url ? `url(${c.profile.avatar_url}) center/cover` : 'linear-gradient(135deg,#10B981,#059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT, fontSize: '20px', fontWeight: 800, color: '#fff',
              }}>{!c.profile.avatar_url && initials}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: OUTFIT, fontSize: '19px', fontWeight: 700, color: '#fff', margin: 0 }}>{displayName(c.profile)}</h2>
                  {(c.profile.cert_level ?? 0) > 0 && <CertificationBadge level={(c.profile.cert_level ?? 0) as CertLevel} size="sm" />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {c.profile.city && <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)' }}>{c.profile.city}</span>}
                  <CompatPill v={c.compatibility} />
                  <StatusPill status={c.status} />
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
          </div>

          {/* ISALY Score */}
          <div style={{ marginBottom: '18px' }}><IsalyScoreGauge userId={c.swiper_id} /></div>

          {/* Bio */}
          {c.profile.bio && (
            <div style={{ ...cardBase, padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>À propos</div>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{c.profile.bio}</p>
            </div>
          )}

          {/* Motivation */}
          {c.motivation && (
            <div style={{ ...cardBase, padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Message de motivation</div>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontStyle: 'italic' }}>“{c.motivation}”</p>
            </div>
          )}

          {/* Critères */}
          <div style={{ ...cardBase, padding: '16px', marginBottom: '18px', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critères soumis</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <DetailRow icon={<Briefcase size={13} />} label="Situation" value={emploiLabel(c.emploi as never) ?? '—'} />
              <DetailRow icon={<CalendarDays size={13} />} label="Emménagement" value={fmtDate(c.moveIn) ?? '—'} />
              <DetailRow icon={<Clock3 size={13} />} label="Durée de bail" value={leaseDurationLabel(c.duration) ?? '—'} />
              <DetailRow icon={<ShieldCheck size={13} />} label="Garant" value={garantLabel(c.hasGarant)} />
              <DetailRow icon={<Users size={13} />} label="Colocation" value={colocLabel(c.coloc)} />
              <DetailRow icon={<Clock size={13} />} label="Reçue" value={timeAgo(c.created_at)} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <DecisionActions current={c.status} busy={busy} onDecide={onDecide} />
            <Button variant="ghost" size="md" onClick={onContact}>
              <MessageCircle size={14} strokeWidth={2} /> Ouvrir la conversation
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
        <span style={{ color: '#10B981', display: 'inline-flex' }}>{icon}</span>{label}
      </span>
      <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600, fontFamily: OUTFIT }}>{value}</span>
    </div>
  )
}

// ─── Comparative table ───────────────────────────────────────
function CompareView({ list, busy, onDecide, onOpen }: {
  list: Candidature[]; busy: string | null; onDecide: (c: Candidature, s: CandidatureStatus) => void; onOpen: (c: Candidature) => void
}) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '12px', minWidth: 'min-content' }}>
        {list.map(c => {
          const initials = `${c.profile.first_name?.[0] ?? '?'}${c.profile.last_name?.[0] ?? ''}`.toUpperCase()
          return (
            <div key={c.swipe_id} style={{ ...cardBase, width: '230px', flexShrink: 0, padding: '16px', gap: '12px' }}>
              <button type="button" onClick={() => onOpen(c)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                  background: c.profile.avatar_url ? `url(${c.profile.avatar_url}) center/cover` : 'linear-gradient(135deg,#10B981,#059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT, fontSize: '17px', fontWeight: 800, color: '#fff',
                }}>{!c.profile.avatar_url && initials}</div>
                <span style={{ fontFamily: OUTFIT, fontSize: '14px', fontWeight: 700, color: '#fff' }}>{displayName(c.profile)}</span>
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <CompatPill v={c.compatibility} />
                {c.isaly && <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>ISALY {c.isaly.score}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><StatusPill status={c.status} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <CompareLine label="Situation" value={emploiLabel(c.emploi as never) ?? '—'} />
                <CompareLine label="Emménagement" value={fmtDate(c.moveIn) ?? '—'} />
                <CompareLine label="Durée" value={leaseDurationLabel(c.duration) ?? '—'} />
                <CompareLine label="Garant" value={c.hasGarant === true ? 'Oui' : c.hasGarant === false ? 'Non' : '—'} />
                <CompareLine label="Note" value={c.isaly?.avgRating != null ? `${c.isaly.avgRating}/5` : '—'} />
              </div>
              <DecisionActions current={c.status} busy={busy === c.swipe_id} onDecide={s => onDecide(c, s)} compact />
            </div>
          )
        })}
      </div>
    </div>
  )
}
function CompareLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: number; tint?: string }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      style={{ ...cardBase, minHeight: '90px', padding: '16px 20px', flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
      <span style={{ width: 42, height: 42, borderRadius: '12px', flexShrink: 0, background: tint ? `${tint}18` : 'rgba(16,185,129,0.12)', border: `1px solid ${tint ? `${tint}40` : 'rgba(16,185,129,0.28)'}`, color: tint ?? '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <CountUp value={value} style={{ fontFamily: OUTFIT, fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
      </div>
    </motion.div>
  )
}

// ─── Page ────────────────────────────────────────────────────
export default function ListingCandidaturesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<ListingLite | null>(null)
  const [items, setItems] = useState<Candidature[] | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [sort, setSort] = useState<SortKey>('compat')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [compare, setCompare] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: l } = await supabase.from('listings').select('id, title, city, photos, owner_id').eq('id', id).single()
    if (!l || l.owner_id !== user.id) { setForbidden(true); return }
    setListing(l as ListingLite)

    const { data: swipes } = await supabase
      .from('swipes')
      .select('id, swiper_id, created_at, candidature_status, motivation_message, move_in_date, lease_duration, emploi_situation, has_garant, colocataires_count, applied_at')
      .eq('swiped_id', user.id)
      .eq('listing_id', id)
      .not('applied_at', 'is', null)
      .order('created_at', { ascending: false })

    if (!swipes || swipes.length === 0) { setItems([]); return }

    const swiperIds = Array.from(new Set(swipes.map(s => s.swiper_id).filter(Boolean))) as string[]
    const [profilesRes, meRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, city, bio, avatar_url, cert_level, last_seen, matching_data').in('id', swiperIds),
      supabase.from('profiles').select('matching_data').eq('id', user.id).maybeSingle(),
    ])
    const profileById = new Map((profilesRes.data ?? []).map(p => [p.id, p as CandProfile]))
    const myMatching = meRes.data?.matching_data ?? null

    // ISALY scores (endpoint existant, en parallèle)
    const scoreEntries = await Promise.all(swiperIds.map(async uid => {
      try {
        const r = await fetch(`/api/isaly-score/${uid}`)
        if (!r.ok) return [uid, null] as const
        const j = await r.json()
        return [uid, { score: j.score, avgRating: j.avgRating ?? null, reviewCount: j.reviewCount ?? 0 } as IsalyLite] as const
      } catch { return [uid, null] as const }
    }))
    const scoreById = new Map(scoreEntries)

    const built: Candidature[] = swipes
      .filter(s => s.swiper_id && profileById.has(s.swiper_id))
      .map(s => {
        const profile = profileById.get(s.swiper_id as string)!
        const cmp = computeCompatibility(myMatching, profile.matching_data)
        return {
          swipe_id: s.id,
          swiper_id: s.swiper_id as string,
          created_at: s.created_at,
          status: (s.candidature_status ?? 'pending') as CandidatureStatus,
          motivation: s.motivation_message ?? null,
          moveIn: s.move_in_date ?? null,
          duration: s.lease_duration ?? null,
          emploi: s.emploi_situation ?? null,
          hasGarant: s.has_garant ?? null,
          coloc: s.colocataires_count ?? null,
          profile,
          compatibility: cmp ? Math.round(cmp.score) : null,
          isaly: scoreById.get(s.swiper_id as string) ?? null,
        }
      })
    setItems(built)
  }, [id, router])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t) }, [toast])

  async function decide(c: Candidature, status: CandidatureStatus) {
    if (busyId) return
    setBusyId(c.swipe_id)
    const prev = c.status
    setItems(list => (list ?? []).map(x => x.swipe_id === c.swipe_id ? { ...x, status } : x))
    try {
      const res = await fetch(`/api/candidatures/${c.swipe_id}/decision`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erreur')
      setToast({ msg: `Candidature · ${statusMeta(status).label.toLowerCase()}`, tone: 'success' })
      if (status === 'visit_proposed') {
        setToast({ msg: 'Visite proposée — pensez à publier vos créneaux', tone: 'success' })
      }
    } catch (e) {
      setItems(list => (list ?? []).map(x => x.swipe_id === c.swipe_id ? { ...x, status: prev } : x))
      setToast({ msg: e instanceof Error ? e.message : 'Erreur', tone: 'error' })
    }
    setBusyId(null)
  }

  async function contact(c: Candidature) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: existing } = await supabase.from('matches').select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${c.swiper_id}),and(user1_id.eq.${c.swiper_id},user2_id.eq.${user.id})`).maybeSingle()
    let matchId = existing?.id ?? null
    if (!matchId) {
      const { data: m } = await supabase.from('matches').insert({ user1_id: user.id, user2_id: c.swiper_id }).select('id').single()
      matchId = m?.id ?? null
    }
    if (!matchId) { setToast({ msg: 'Impossible de créer la conversation', tone: 'error' }); return }
    const { data: conv } = await supabase.from('conversations').select('id').eq('match_id', matchId).maybeSingle()
    let convId = conv?.id ?? null
    if (!convId) {
      const { data: nc } = await supabase.from('conversations').insert({ match_id: matchId }).select('id').single()
      convId = nc?.id ?? null
    }
    router.push(convId ? `/app/messages?conversation=${convId}` : '/app/messages')
  }

  const filtered = useMemo(() => {
    const arr = items ?? []
    const f = statusFilter === 'all' ? arr : arr.filter(c => c.status === statusFilter)
    const s = [...f]
    if (sort === 'compat') s.sort((a, b) => (b.compatibility ?? -1) - (a.compatibility ?? -1))
    else if (sort === 'score') s.sort((a, b) => (b.isaly?.score ?? -1) - (a.isaly?.score ?? -1))
    else if (sort === 'date') s.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    else if (sort === 'status') s.sort((a, b) => a.status.localeCompare(b.status))
    return s
  }, [items, statusFilter, sort])

  const stats = useMemo(() => {
    const arr = items ?? []
    return {
      total: arr.length,
      pending: arr.filter(c => c.status === 'pending').length,
      accepted: arr.filter(c => c.status === 'accepted').length,
      active: arr.filter(c => c.status !== 'rejected').length,
    }
  }, [items])

  const selectedCand = useMemo(() => (items ?? []).find(c => c.swipe_id === selected) ?? null, [items, selected])
  const listingTitle = listing?.title || (listing?.city ? `Colocation à ${listing.city}` : 'Annonce')

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Toutes' },
    { id: 'pending', label: 'En attente' },
    { id: 'accepted', label: 'Acceptées' },
    { id: 'visit_proposed', label: 'Visites' },
    { id: 'waitlisted', label: 'En réserve' },
    { id: 'rejected', label: 'Refusées' },
  ]

  if (forbidden) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Topbar title="Candidatures" />
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <h1 style={{ fontFamily: OUTFIT, fontSize: '22px', fontWeight: 700, color: '#fff' }}>Annonce introuvable</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>Cette annonce n’existe pas ou ne vous appartient pas.</p>
          <div style={{ marginTop: '20px' }}><Button variant="primary" onClick={() => router.push('/app/mes-annonces')}>Mes annonces</Button></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Candidatures" />
      <BentoStyles />
      <style>{`.cand-card:hover { border-color: rgba(16,185,129,0.3) !important; }`}</style>

      <AnimatePresence>{toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}</AnimatePresence>
      {selectedCand && (
        <DetailModal
          c={selectedCand} busy={busyId === selectedCand.swipe_id}
          onDecide={s => decide(selectedCand, s)} onClose={() => setSelected(null)}
          onContact={() => contact(selectedCand)}
        />
      )}

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '28px 24px 64px' }}>
        {/* Header */}
        <button type="button" onClick={() => router.push('/app/mes-annonces')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Mes annonces
        </button>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {listing?.photos?.[0] ? <Image src={listing.photos[0]} alt={listingTitle} fill sizes="52px" style={{ objectFit: 'cover' }} unoptimized /> : <HomeIcon size={22} color="#10B981" />}
          </div>
          <div>
            <h1 style={{ fontFamily: OUTFIT, fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>Candidatures</h1>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{listingTitle}</div>
          </div>
        </motion.div>

        {/* Stats */}
        {items !== null && items.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '22px' }}>
            <StatCard icon={<Users size={20} strokeWidth={1.8} />} label="candidatures" value={stats.total} />
            <StatCard icon={<Clock size={20} strokeWidth={1.8} />} label="en attente" value={stats.pending} tint="#F59E0B" />
            <StatCard icon={<CheckCircle2 size={20} strokeWidth={1.8} />} label="acceptées" value={stats.accepted} tint="#10B981" />
          </motion.div>
        )}

        {/* Toolbar : filtres + tri + compare */}
        {items !== null && items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {statusTabs.map(t => (
                <button key={t.id} type="button" onClick={() => setStatusFilter(t.id)}
                  style={{
                    padding: '7px 12px', borderRadius: '9px', cursor: 'pointer', fontFamily: OUTFIT, fontSize: '12.5px', fontWeight: 700,
                    background: statusFilter === t.id ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${statusFilter === t.id ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: statusFilter === t.id ? '#10B981' : 'rgba(255,255,255,0.6)',
                  }}>{t.label}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: OUTFIT }}>
                <ListFilter size={14} strokeWidth={2} />
                <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '7px 10px', color: '#fff', fontFamily: OUTFIT, fontSize: '12.5px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
                  <option value="compat">Compatibilité</option>
                  <option value="score">ISALY Score</option>
                  <option value="date">Plus récentes</option>
                  <option value="status">Statut</option>
                </select>
              </label>
              <button type="button" onClick={() => setCompare(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '9px', cursor: 'pointer', fontFamily: OUTFIT, fontSize: '12.5px', fontWeight: 700,
                  background: compare ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${compare ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: compare ? '#10B981' : 'rgba(255,255,255,0.7)',
                }} disabled={filtered.length < 2} title={filtered.length < 2 ? 'Au moins 2 candidatures' : 'Vue comparative'}>
                <Layers size={14} strokeWidth={2} /> Comparer
              </button>
            </div>
          </div>
        )}

        {/* Liste / compare / états */}
        {items === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="shimmer" style={{ ...cardBase, height: '150px' }} />
            <div className="shimmer" style={{ ...cardBase, height: '150px' }} />
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...cardBase, minHeight: '280px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ width: 68, height: 68, borderRadius: '20px', marginBottom: '18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={30} color="#10B981" strokeWidth={1.5} />
            </div>
            <h3 style={{ fontFamily: OUTFIT, fontSize: '19px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Aucune candidature pour l’instant</h3>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: '0 0 22px', maxWidth: '360px' }}>
              Les candidatures reçues sur cette annonce apparaîtront ici, triées par compatibilité.
            </p>
            <Button variant="primary" onClick={() => router.push(`/app/boost?listing=${id}`)}><Sparkles size={16} strokeWidth={2.2} /> Booster cette annonce</Button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardBase, minHeight: '140px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '36px' }}>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)' }}>Aucune candidature dans cette catégorie.</div>
          </div>
        ) : compare ? (
          <CompareView list={filtered} busy={busyId} onDecide={decide} onOpen={c => setSelected(c.swipe_id)} />
        ) : (
          <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(c => (
              <CandidatureCard key={c.swipe_id} c={c} busy={busyId === c.swipe_id}
                onDecide={s => decide(c, s)} onOpen={() => setSelected(c.swipe_id)} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
