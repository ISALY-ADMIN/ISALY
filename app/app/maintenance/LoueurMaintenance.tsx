'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import Emoji, { EmojiText } from '@/components/ui/Emoji'

interface LeaseRow { id: string; address: string; city: string | null }

interface MaintenanceRequest {
  id: string
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

const CATEGORIES: Record<string, { icon: string; label: string }> = {
  plomberie: { icon: '🚿', label: 'Plomberie' },
  electricite: { icon: '🔌', label: 'Électricité' },
  chauffage: { icon: '🌡️', label: 'Chauffage' },
  serrurerie: { icon: '🔐', label: 'Serrurerie' },
  fenetres: { icon: '🪟', label: 'Fenêtres' },
  autre: { icon: '📦', label: 'Autre' },
}

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'sent', label: 'Ouverts' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'resolved', label: 'Résolus' },
]

const URGENCY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  low: { label: 'Basse', bg: '#F3F4F6', color: '#6B7280' },
  normal: { label: 'Moyenne', bg: '#FFFBEB', color: '#D97706' },
  urgent: { label: '🔴 Urgent', bg: '#FEF2F2', color: '#DC2626' },
}

const URGENCY_RANK: Record<string, number> = { urgent: 0, normal: 1, low: 2 }

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  sent: { label: '🔴 Ouvert', bg: '#FEF2F2', color: '#DC2626' },
  received: { label: '🟡 Reçu', bg: '#FFFBEB', color: '#D97706' },
  in_progress: { label: '🟡 En cours', bg: '#FFFBEB', color: '#D97706' },
  resolved: { label: '✅ Résolu', bg: '#ECFDF5', color: '#059669' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function LoueurMaintenance() {
  const router = useRouter()
  const [leases, setLeases] = useState<LeaseRow[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('leases')
        .select('id, address, city')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const rows = (data ?? []) as LeaseRow[]
      setLeases(rows)
      if (rows.length > 0) setSelectedLeaseId(rows[0].id)
      setLoading(false)
    }
    load()
  }, [router])

  const loadRequests = useCallback(async () => {
    if (!selectedLeaseId) { setRequests([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('lease_id', selectedLeaseId)
      .order('created_at', { ascending: false })

    const rows = ((data ?? []) as MaintenanceRequest[]).sort((a, b) => {
      const ar = a.status === 'resolved' ? 1 : 0
      const br = b.status === 'resolved' ? 1 : 0
      if (ar !== br) return ar - br
      const au = URGENCY_RANK[a.urgency ?? 'normal'] ?? 1
      const bu = URGENCY_RANK[b.urgency ?? 'normal'] ?? 1
      if (au !== bu) return au - bu
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    setRequests(rows)

    const tenantIds = Array.from(new Set(rows.map(r => r.tenant_id).filter(Boolean))) as string[]
    if (tenantIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds)
      const map: Record<string, string> = {}
      for (const p of (profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[]) {
        map[p.id] = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire'
      }
      setTenantNames(map)
    }
  }, [selectedLeaseId])

  useEffect(() => { loadRequests() }, [loadRequests])

  async function updateStatus(id: string, status: MaintenanceRequest['status']) {
    setSavingId(id)
    try {
      await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadRequests()
    } catch {}
    setSavingId(null)
  }

  async function saveComment(id: string) {
    setSavingId(id)
    try {
      await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bailleur_comment: commentDraft }),
      })
      setEditingId(null)
      await loadRequests()
    } catch {}
    setSavingId(null)
  }

  async function uploadResolutionPhoto(id: string, file: File) {
    setSavingId(id)
    try {
      const supabase = createClient()
      const path = `maintenance/${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { error } = await supabase.storage.from('documents').upload(path, file)
      if (!error) {
        const { data: pub } = supabase.storage.from('documents').getPublicUrl(path)
        await fetch(`/api/maintenance/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolved_photo_url: pub.publicUrl }),
        })
        await loadRequests()
      }
    } catch {}
    setSavingId(null)
  }

  if (loading) {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="🔧" /></div>
        </div>
      </>
    )
  }

  if (leases.length === 0) {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[52px] mb-4"><Emoji native="🔧" /></div>
          <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>Aucun bail actif</h3>
          <p className="text-[13px]" style={{ color: '#6B7280' }}>Les signalements apparaîtront ici une fois un bail actif créé.</p>
        </div>
      </>
    )
  }

  const filtered = requests.filter(r => statusFilter === 'all' || (statusFilter === 'sent' ? r.status !== 'resolved' && r.status !== 'in_progress' : r.status === statusFilter))

  return (
    <>
      <Topbar title="Maintenance" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '800px' }}>
        <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>Signalements</h2>
        <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Gérez les signalements de vos locataires.</p>

        {leases.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {leases.map(l => (
              <button
                key={l.id}
                onClick={() => setSelectedLeaseId(l.id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
                style={selectedLeaseId === l.id ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' } : { background: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                {l.address}{l.city ? `, ${l.city}` : ''}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer"
              style={statusFilter === f.id ? { background: '#111827', borderColor: '#111827', color: '#fff' } : { background: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-[18px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="text-[48px] mb-4"><Emoji native="✅" /></div>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun signalement dans cette catégorie.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(req => {
              const cat = CATEGORIES[req.category] ?? CATEGORIES.autre
              const badge = STATUS_BADGE[req.status] ?? STATUS_BADGE.sent
              return (
                <div key={req.id} className="rounded-[14px] p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[18px]"><Emoji native={cat.icon} size="18px" /></span>
                        <span className="text-[14px] font-bold" style={{ color: '#111827' }}>{req.title}</span>
                        {(() => { const u = URGENCY_BADGE[req.urgency ?? 'normal']; return u ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: u.bg, color: u.color }}><EmojiText text={u.label} size="10px" /></span>
                        ) : null })()}
                      </div>
                      <p className="text-[12.5px]" style={{ color: '#6B7280' }}>{req.description}</p>
                      <p className="text-[11.5px] mt-1" style={{ color: '#9CA3AF' }}>
                        {tenantNames[req.tenant_id ?? ''] ?? 'Locataire'} · {formatDate(req.created_at)}
                      </p>
                      {req.photo_url && <Image src={req.photo_url} alt={req.title} width={120} height={90} className="mt-2 rounded-[10px] object-cover" style={{ width: '120px', height: '90px' }} />}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: badge.bg, color: badge.color }}><EmojiText text={badge.label} size="11px" /></span>
                  </div>

                  {/* Status controls */}
                  <div className="flex gap-1.5 mt-3">
                    {(['sent', 'received', 'in_progress', 'resolved'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(req.id, s)}
                        disabled={savingId === req.id}
                        className="flex-1 py-1.5 rounded-[8px] text-[11px] font-semibold border cursor-pointer disabled:opacity-50"
                        style={req.status === s ? { background: '#111827', borderColor: '#111827', color: '#fff' } : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}
                      >
                        {{ sent: 'Envoyé', received: 'Reçu', in_progress: 'En cours', resolved: 'Résolu' }[s]}
                      </button>
                    ))}
                  </div>

                  {/* Comment + resolution photo */}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                    {req.bailleur_comment && editingId !== req.id && (
                      <p className="text-[12.5px] mb-2" style={{ color: '#374151' }}><Emoji native="💬" /> {req.bailleur_comment}</p>
                    )}
                    {req.resolved_photo_url && (
                      <Image src={req.resolved_photo_url} alt="Résolution" width={120} height={90} className="mb-2 rounded-[10px] object-cover" style={{ width: '120px', height: '90px' }} />
                    )}

                    {editingId === req.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={commentDraft}
                          onChange={e => setCommentDraft(e.target.value)}
                          rows={2}
                          placeholder="Ajouter une note interne pour le locataire…"
                          className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none resize-none"
                          style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }}
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveComment(req.id)} disabled={savingId === req.id} className="text-[11px] font-bold px-3 py-1.5 rounded-full border-none cursor-pointer text-white disabled:opacity-50" style={{ background: '#4ECBA0' }}>Enregistrer</button>
                          <button onClick={() => setEditingId(null)} className="text-[11px] font-semibold border-none bg-transparent cursor-pointer" style={{ color: '#9CA3AF' }}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setEditingId(req.id); setCommentDraft(req.bailleur_comment ?? '') }}
                          className="text-[11.5px] font-semibold border-none bg-transparent cursor-pointer"
                          style={{ color: '#4ECBA0' }}
                        >
                          <Emoji native="💬" /> Ajouter un commentaire
                        </button>
                        <label className="text-[11.5px] font-semibold cursor-pointer" style={{ color: '#4ECBA0' }}>
                          <Emoji native="📷" /> Photo de résolution
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadResolutionPhoto(req.id, f) }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
