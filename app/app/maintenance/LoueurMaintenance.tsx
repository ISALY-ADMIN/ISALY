'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AlertTriangle, Camera, CheckCircle2, Loader2, MessageSquare, Wrench } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'

interface LeaseRow {
  id: string
  address: string | null
  city: string | null
}

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
  bailleur_comment: string | null
  resolved_photo_url: string | null
}

// ═══════════════ Constantes ═══════════════

const OUTFIT = "'Outfit', sans-serif"

const CATEGORIES: Record<string, { icon: string; label: string }> = {
  plomberie: { icon: '🚿', label: 'Plomberie' },
  electricite: { icon: '🔌', label: 'Électricité' },
  chauffage: { icon: '🌡️', label: 'Chauffage' },
  serrurerie: { icon: '🔐', label: 'Serrurerie' },
  fenetres: { icon: '🪟', label: 'Fenêtres' },
  autre: { icon: '📦', label: 'Autre' },
}

const URGENCY_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  low:    { label: 'Basse',   bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)' },
  normal: { label: 'Moyenne', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B',                border: 'rgba(245,158,11,0.35)' },
  urgent: { label: 'Urgent',  bg: 'rgba(239,68,68,0.12)',   color: '#F87171',                border: 'rgba(239,68,68,0.4)'   },
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  sent:        { label: 'Ouvert',   bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.35)' },
  received:    { label: 'Reçu',     bg: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: 'rgba(96,165,250,0.35)' },
  in_progress: { label: 'En cours', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.35)' },
  resolved:    { label: 'Résolu',   bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)' },
}

const STATUS_FILTERS = [
  { id: 'all',         label: 'Tous'      },
  { id: 'sent',        label: 'Ouverts'   },
  { id: 'in_progress', label: 'En cours'  },
  { id: 'resolved',    label: 'Résolus'   },
] as const

type StatusFilter = typeof STATUS_FILTERS[number]['id']

const URGENCY_RANK: Record<string, number> = { urgent: 0, normal: 1, low: 2 }
const STATUS_RANK: Record<string, number> = { sent: 0, received: 0, in_progress: 1, resolved: 2 }

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  padding: '20px 22px',
  fontFamily: OUTFIT,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function Pill({ label, bg, color, border, size = 'md' }: { label: string; bg: string; color: string; border: string; size?: 'sm' | 'md' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: size === 'sm' ? '10.5px' : '11.5px', fontWeight: 800, letterSpacing: '0.02em',
      padding: size === 'sm' ? '3px 9px' : '4px 11px', borderRadius: '20px', fontFamily: OUTFIT,
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  /** Charge tous les baux du loueur + tous leurs signalements en une passe. */
  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Baux du loueur — tous statuts sauf 'draft' (un signalement peut exister
    // sur un bail 'active' ou 'ended' ; 'draft' n'a jamais eu de locataire).
    const { data: leaseRows, error: leaseErr } = await supabase
      .from('leases')
      .select('id, address, city, status')
      .eq('owner_id', user.id)
      .in('status', ['active', 'pending_signature', 'ended'])
      .order('created_at', { ascending: false })

    if (leaseErr) console.error('[maintenance] leases fetch error:', leaseErr)

    const rows = (leaseRows ?? []) as (LeaseRow & { status: string })[]
    setLeases(rows)

    if (rows.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    // Signalements pour TOUS les baux du loueur, en une seule requête.
    const { data: reqRows, error: reqErr } = await supabase
      .from('maintenance_requests')
      .select('*')
      .in('lease_id', rows.map(l => l.id))
      .order('created_at', { ascending: false })

    if (reqErr) console.error('[maintenance] requests fetch error:', reqErr)

    const list = ((reqRows ?? []) as MaintenanceRequest[]).sort((a, b) => {
      const sr = (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0)
      if (sr !== 0) return sr
      const ur = (URGENCY_RANK[a.urgency ?? 'normal'] ?? 1) - (URGENCY_RANK[b.urgency ?? 'normal'] ?? 1)
      if (ur !== 0) return ur
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    setRequests(list)

    // Noms des locataires
    const tenantIds = Array.from(new Set(list.map(r => r.tenant_id).filter(Boolean))) as string[]
    if (tenantIds.length > 0) {
      const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds)
      if (profErr) console.error('[maintenance] tenants fetch error:', profErr)
      const map: Record<string, string> = {}
      for (const p of (profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[]) {
        map[p.id] = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire'
      }
      setTenantNames(map)
    }

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: MaintenanceRequest['status']) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) console.error('[maintenance] update status failed:', await res.text())
      await load()
    } catch (e) { console.error('[maintenance] update status error:', e) }
    setSavingId(null)
  }

  async function saveComment(id: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bailleur_comment: commentDraft }),
      })
      if (!res.ok) console.error('[maintenance] save comment failed:', await res.text())
      setEditingId(null)
      await load()
    } catch (e) { console.error('[maintenance] save comment error:', e) }
    setSavingId(null)
  }

  async function uploadResolutionPhoto(id: string, file: File) {
    setSavingId(id)
    try {
      const supabase = createClient()
      const path = `maintenance/${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { error } = await supabase.storage.from('documents').upload(path, file)
      if (error) { console.error('[maintenance] upload error:', error); setSavingId(null); return }
      const { data: pub } = supabase.storage.from('documents').getPublicUrl(path)
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved_photo_url: pub.publicUrl }),
      })
      if (!res.ok) console.error('[maintenance] resolution photo save failed:', await res.text())
      await load()
    } catch (e) { console.error('[maintenance] upload resolution photo error:', e) }
    setSavingId(null)
  }

  // ── Filtrage ──
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
          <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Aucun bail à surveiller</h3>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', maxWidth: 340, margin: 0 }}>
            Les signalements de vos locataires apparaîtront ici dès qu'un bail sera actif.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Maintenance" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: OUTFIT, fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Signalements</h1>
              <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)' }}>
                Suivez et résolvez les demandes de vos locataires.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {openCount > 0 && (
                <Pill label={`${openCount} ouvert${openCount > 1 ? 's' : ''}`}
                  bg="rgba(16,185,129,0.12)" color="#10B981" border="rgba(16,185,129,0.35)" />
              )}
              {inProgressCount > 0 && (
                <Pill label={`${inProgressCount} en cours`}
                  bg="rgba(245,158,11,0.12)" color="#F59E0B" border="rgba(245,158,11,0.35)" />
              )}
            </div>
          </motion.div>

          {/* ── Filtres bail (si plusieurs) ── */}
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
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', margin: '0 auto 16px',
              }}><CheckCircle2 size={26} /></div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {requests.length === 0 ? 'Aucun signalement pour le moment' : 'Aucun signalement dans ce filtre'}
              </div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
                {requests.length === 0
                  ? 'Vos locataires n\'ont rien signalé — tout va bien.'
                  : 'Modifiez le statut ou le bail sélectionné.'}
              </div>
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {filtered.map(req => {
                const cat = CATEGORIES[req.category] ?? CATEGORIES.autre
                const status = STATUS_BADGE[req.status] ?? STATUS_BADGE.sent
                const urgency = URGENCY_BADGE[req.urgency ?? 'normal']
                const isEditing = editingId === req.id
                const busy = savingId === req.id

                return (
                  <motion.article key={req.id}
                    variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                    style={cardStyle}>

                    {/* En-tête */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
                            borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                            fontSize: 15,
                          }}><Emoji native={cat.icon} size="15px" /></span>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{req.title}</h3>
                          {urgency && req.urgency !== 'normal' && (
                            <Pill size="sm" label={urgency.label} bg={urgency.bg} color={urgency.color} border={urgency.border} />
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{cat.label}</span>
                          <span>·</span>
                          <span>{tenantNames[req.tenant_id ?? ''] ?? 'Locataire'}</span>
                          <span>·</span>
                          <span>{formatDate(req.created_at)}</span>
                          {leases.length > 1 && (
                            <><span>·</span><span>{leaseLabel(req.lease_id)}</span></>
                          )}
                        </div>
                      </div>
                      <Pill label={status.label} bg={status.bg} color={status.color} border={status.border} />
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.7)', margin: '10px 0 0', lineHeight: 1.55 }}>
                      {req.description}
                    </p>

                    {/* Photo initiale */}
                    {req.photo_url && (
                      <div style={{ marginTop: 12 }}>
                        <Image src={req.photo_url} alt={req.title} width={160} height={120}
                          style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }} />
                      </div>
                    )}

                    {/* Contrôles statut */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                      {(['sent', 'received', 'in_progress', 'resolved'] as const).map(s => {
                        const active = req.status === s
                        const label = { sent: 'Ouvert', received: 'Reçu', in_progress: 'En cours', resolved: 'Résolu' }[s]
                        return (
                          <button key={s} type="button" onClick={() => updateStatus(req.id, s)} disabled={busy}
                            className="flex-1 min-w-[86px] rounded-[10px] py-2 text-[11.5px] font-bold cursor-pointer transition-all disabled:opacity-50"
                            style={{
                              background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                              border: active ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
                              color: active ? '#10B981' : 'rgba(255,255,255,0.55)',
                              fontFamily: OUTFIT,
                            }}>{label}</button>
                        )
                      })}
                    </div>

                    {/* Commentaire + photo résolution */}
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {req.bailleur_comment && !isEditing && (
                        <div style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12,
                          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', marginBottom: 12,
                        }}>
                          <MessageSquare size={14} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.55 }}>
                            {req.bailleur_comment}
                          </p>
                        </div>
                      )}

                      {req.resolved_photo_url && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
                            Photo de résolution
                          </div>
                          <Image src={req.resolved_photo_url} alt="Résolution" width={160} height={120}
                            style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)' }} />
                        </div>
                      )}

                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <textarea rows={3} value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
                            placeholder="Ajouter une note pour le locataire…"
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 10, outline: 'none', resize: 'none',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff', fontSize: 13, fontFamily: OUTFIT,
                            }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button size="sm" loading={busy} onClick={() => saveComment(req.id)}>Enregistrer</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button size="sm" variant="secondary"
                            onClick={() => { setEditingId(req.id); setCommentDraft(req.bailleur_comment ?? '') }}>
                            <MessageSquare size={13} /> {req.bailleur_comment ? 'Modifier le commentaire' : 'Ajouter un commentaire'}
                          </Button>
                          <label
                            className="inline-flex items-center justify-center gap-2 rounded-[10px] cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-white/[0.06] active:scale-[0.98] px-3.5 py-2 text-[12.5px] font-medium"
                            style={{
                              background: 'transparent', color: 'rgba(255,255,255,0.85)',
                              border: '1px solid rgba(255,255,255,0.15)', fontFamily: OUTFIT,
                            }}>
                            <Camera size={13} /> {req.resolved_photo_url ? 'Changer la photo' : 'Photo de résolution'}
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadResolutionPhoto(req.id, f); e.target.value = '' }} />
                          </label>
                          {req.urgency === 'urgent' && req.status !== 'resolved' && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800,
                              padding: '6px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', fontFamily: OUTFIT,
                            }}><AlertTriangle size={12} /> Traiter en priorité</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.article>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}
