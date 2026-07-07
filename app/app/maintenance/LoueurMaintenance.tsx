'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, ChevronRight, Droplets, Flame, Loader2, Lock,
  Package, Paperclip, Snowflake, Wrench, Zap,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

// ═══════════════ Types ═══════════════

interface LeaseRow { id: string; address: string | null; city: string | null }

interface MaintenanceRequest {
  id: string
  lease_id: string
  title: string
  category: string
  description: string
  urgency: 'low' | 'normal' | 'urgent'
  status: 'sent' | 'received' | 'in_progress' | 'resolved'
  created_at: string
  tenant_id: string | null
  photo_url: string | null
  photos: string[] | null
  bailleur_comment: string | null
  resolved_photo_url: string | null
}

// ═══════════════ Constantes ═══════════════

const OUTFIT = "'Outfit', sans-serif"

const CATEGORY: Record<string, { icon: React.ReactNode; label: string }> = {
  plomberie:   { icon: <Droplets  size={16} />, label: 'Plomberie'   },
  electricite: { icon: <Zap       size={16} />, label: 'Électricité' },
  chauffage:   { icon: <Flame     size={16} />, label: 'Chauffage'   },
  serrurerie:  { icon: <Lock      size={16} />, label: 'Serrurerie'  },
  fenetres:    { icon: <Snowflake size={16} />, label: 'Fenêtres'    },
  nuisibles:   { icon: <Package   size={16} />, label: 'Nuisibles'   },
  autre:       { icon: <Package   size={16} />, label: 'Autre'       },
}

const URGENCY: Record<string, { label: string; bg: string; color: string; border: string }> = {
  low:    { label: 'Basse',   bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)' },
  normal: { label: 'Moyenne', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B',                border: 'rgba(245,158,11,0.35)'  },
  urgent: { label: 'Urgent',  bg: 'rgba(239,68,68,0.12)',   color: '#F87171',                border: 'rgba(239,68,68,0.4)'    },
}

const STATUS: Record<string, { label: string; bg: string; color: string; border: string; pulse?: boolean }> = {
  sent:        { label: 'Nouveau',  bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.4)',  pulse: true },
  received:    { label: 'Vu',       bg: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: 'rgba(96,165,250,0.35)' },
  in_progress: { label: 'En cours', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.35)' },
  resolved:    { label: 'Résolu',   bg: 'rgba(16,185,129,0.08)', color: 'rgba(16,185,129,0.7)', border: 'rgba(16,185,129,0.25)' },
}

const STATUS_FILTERS = [
  { id: 'all',         label: 'Tous'      },
  { id: 'sent',        label: 'Ouverts'   },
  { id: 'in_progress', label: 'En cours'  },
  { id: 'resolved',    label: 'Résolus'   },
] as const

type StatusFilter = typeof STATUS_FILTERS[number]['id']

const STATUS_RANK: Record<string, number> = { sent: 0, received: 1, in_progress: 2, resolved: 3 }
const URGENCY_RANK: Record<string, number> = { urgent: 0, normal: 1, low: 2 }

const cardBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding: '18px 20px',
  fontFamily: OUTFIT,
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

function Pill({ label, bg, color, border, size = 'md' }: { label: string; bg: string; color: string; border: string; size?: 'sm' | 'md' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: size === 'sm' ? 10.5 : 11.5, fontWeight: 800, letterSpacing: '0.02em',
      padding: size === 'sm' ? '3px 9px' : '4px 11px', borderRadius: 20, fontFamily: OUTFIT,
      background: bg, color, border: `1px solid ${border}`,
    }}>{label}</span>
  )
}

// ═══════════════ Composant ═══════════════

export default function LoueurMaintenance() {
  const router = useRouter()
  const [leases, setLeases] = useState<LeaseRow[]>([])
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedLeaseId, setSelectedLeaseId] = useState<'all' | string>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    let leaseRows: LeaseRow[] = []
    let requestRows: MaintenanceRequest[] = []
    let debugUserId: string | null = null

    try {
      const res = await fetch('/api/maintenance', { cache: 'no-store' })
      if (res.status === 401) { router.push('/auth/login'); return }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) console.error('[maintenance] GET failed:', res.status, json)
      leaseRows = (json.leases ?? []) as LeaseRow[]
      requestRows = (json.requests ?? []) as MaintenanceRequest[]
    } catch (e) {
      console.error('[maintenance] GET network error, fallback client:', e)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      debugUserId = user.id
      const { data: ls } = await supabase.from('leases').select('id, address, city, status')
        .eq('owner_id', user.id)
        .in('status', ['active', 'pending_signature', 'ended'])
        .order('created_at', { ascending: false })
      leaseRows = (ls ?? []) as LeaseRow[]
      if (leaseRows.length > 0) {
        const { data: rs } = await supabase.from('maintenance_requests').select('*')
          .in('lease_id', leaseRows.map(l => l.id))
          .order('created_at', { ascending: false })
        requestRows = (rs ?? []) as MaintenanceRequest[]
      }
    }

    console.log('[maintenance] loaded',
      { userId: debugUserId, leases: leaseRows.length, leaseIds: leaseRows.map(l => l.id),
        requests: requestRows.length, requestLeaseIds: requestRows.map(r => r.lease_id) })

    setLeases(leaseRows)

    const list = requestRows.sort((a, b) => {
      const sr = (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0)
      if (sr !== 0) return sr
      const ur = (URGENCY_RANK[a.urgency ?? 'normal'] ?? 1) - (URGENCY_RANK[b.urgency ?? 'normal'] ?? 1)
      if (ur !== 0) return ur
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    setRequests(list)

    const tenantIds = Array.from(new Set(list.map(r => r.tenant_id).filter(Boolean))) as string[]
    if (tenantIds.length > 0) {
      const supabase = createClient()
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds)
      const map: Record<string, string> = {}
      for (const p of (profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[]) {
        map[p.id] = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire'
      }
      setTenantNames(map)
    }

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => {
    if (selectedLeaseId !== 'all' && r.lease_id !== selectedLeaseId) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'sent') return r.status === 'sent' || r.status === 'received'
    return r.status === statusFilter
  })

  const openCount = requests.filter(r => r.status === 'sent' || r.status === 'received').length
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length

  const leaseLabel = (id: string) => {
    const l = leases.find(x => x.id === id)
    if (!l) return 'Bail'
    return l.address ? `${l.address}${l.city ? `, ${l.city}` : ''}` : 'Bail'
  }

  // ═══════════════ Rendu ═══════════════

  if (loading) {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin" style={{ color: '#10B981' }} />
        </div>
      </>
    )
  }

  if (leases.length === 0) {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6" style={{ fontFamily: OUTFIT }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', marginBottom: 18,
          }}><Wrench size={28} /></div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Aucun bail à surveiller</h3>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', maxWidth: 340, margin: 0 }}>
            Les signalements de vos locataires apparaîtront ici dès qu&apos;un bail sera actif.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Maintenance" />
      <style>{`
        @keyframes pulseMint { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }
        .pulse-mint { animation: pulseMint 1.8s ease-in-out infinite; }
        .mreq-card { transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease; }
        .mreq-card:hover { transform: translateY(-2px); border-color: rgba(16,185,129,0.4) !important; box-shadow: 0 10px 30px rgba(16,185,129,0.1); }
        .mreq-card:focus-visible { outline: 2px solid #10B981; outline-offset: 2px; }
      `}</style>
      <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: OUTFIT, fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Signalements</h1>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)' }}>
                Suivez et résolvez les demandes de vos locataires.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {openCount > 0 && <Pill label={`${openCount} ouvert${openCount > 1 ? 's' : ''}`}
                bg="rgba(16,185,129,0.12)" color="#10B981" border="rgba(16,185,129,0.35)" />}
              {inProgressCount > 0 && <Pill label={`${inProgressCount} en cours`}
                bg="rgba(245,158,11,0.12)" color="#F59E0B" border="rgba(245,158,11,0.35)" />}
            </div>
          </motion.div>

          {/* ── Filtres bail ── */}
          {leases.length > 1 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {[{ id: 'all', label: 'Tous les baux' }, ...leases.map(l => ({ id: l.id, label: leaseLabel(l.id) }))].map(l => {
                const active = selectedLeaseId === l.id
                return (
                  <button key={l.id} type="button" onClick={() => setSelectedLeaseId(l.id as 'all' | string)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all"
                    style={{
                      background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: active ? '#10B981' : 'rgba(255,255,255,0.55)',
                      fontFamily: OUTFIT,
                    }}>{l.label}</button>
                )
              })}
            </div>
          )}

          {/* ── Filtres statut ── */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f.id
              return (
                <button key={f.id} type="button" onClick={() => setStatusFilter(f.id)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all"
                  style={{
                    background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: active ? '#10B981' : 'rgba(255,255,255,0.55)',
                    fontFamily: OUTFIT,
                  }}>{f.label}</button>
              )
            })}
          </div>

          {/* ── Liste ── */}
          {filtered.length === 0 ? (
            <div style={{ ...cardBase, textAlign: 'center', padding: '60px 24px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', margin: '0 auto 16px',
              }}><CheckCircle2 size={26} /></div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {requests.length === 0 ? 'Aucun signalement pour le moment' : 'Aucun signalement dans ce filtre'}
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>
                {requests.length === 0
                  ? 'Vos locataires n\'ont rien signalé — tout va bien.'
                  : 'Modifiez le statut ou le bail sélectionné.'}
              </div>
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {filtered.map(req => {
                const cat = CATEGORY[req.category] ?? CATEGORY.autre
                const st = STATUS[req.status] ?? STATUS.sent
                const urg = URGENCY[req.urgency ?? 'normal']
                const nbPhotos = (req.photos?.length ?? 0) + (req.photo_url ? 1 : 0)

                return (
                  <motion.button key={req.id} type="button"
                    variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                    onClick={() => router.push(`/app/maintenance/${req.id}`)}
                    className="mreq-card text-left"
                    style={{ ...cardBase, cursor: 'pointer', display: 'block', width: '100%' }}
                    aria-label={`Ouvrir le signalement ${req.title}`}>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
                        borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                        color: '#10B981', flexShrink: 0,
                      }}>{cat.icon}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{req.title}</h3>
                          {urg && req.urgency !== 'normal' && (
                            <Pill size="sm" label={urg.label} bg={urg.bg} color={urg.color} border={urg.border} />
                          )}
                        </div>
                        <p style={{
                          fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{req.description}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className={st.pulse ? 'pulse-mint' : ''} style={{ borderRadius: 20, display: 'inline-flex' }}>
                          <Pill label={st.label} bg={st.bg} color={st.color} border={st.border} />
                        </span>
                        <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                      fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 10,
                      paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span>{cat.label}</span>
                      <span>·</span>
                      <span>{tenantNames[req.tenant_id ?? ''] ?? 'Locataire'}</span>
                      <span>·</span>
                      <span>{timeAgo(req.created_at)}</span>
                      {leases.length > 1 && (
                        <><span>·</span><span>{leaseLabel(req.lease_id)}</span></>
                      )}
                      {nbPhotos > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(16,185,129,0.75)' }}>
                          <Paperclip size={11} /> {nbPhotos}
                        </span>
                      )}
                      {req.bailleur_comment && (
                        <span style={{ color: 'rgba(16,185,129,0.75)', fontWeight: 700 }}>Réponse envoyée</span>
                      )}
                      {req.urgency === 'urgent' && req.status !== 'resolved' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#F87171', fontWeight: 700 }}>
                          <AlertTriangle size={11} /> Priorité
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}
