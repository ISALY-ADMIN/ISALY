'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Camera, CheckCircle2, Circle, Droplets, Eye, Flame, Loader2, Lock,
  MessageCircle, MessageSquare, Package, Send, Snowflake, X, Zap,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'

// ═══════════════ Types ═══════════════

interface MaintenanceRequest {
  id: string
  lease_id: string
  tenant_id: string | null
  title: string
  category: string
  description: string
  urgency: 'low' | 'normal' | 'urgent'
  status: 'sent' | 'received' | 'in_progress' | 'resolved'
  photo_url: string | null
  photos: string[] | null
  bailleur_comment: string | null
  resolved_photo_url: string | null
  created_at: string
  resolved_at: string | null
}

interface LeaseInfo { id: string; owner_id: string; tenant_id: string; address: string | null; city: string | null }
interface PartyInfo { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }

// ═══════════════ Constantes ═══════════════

const OUTFIT = "'Outfit', sans-serif"

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  plomberie:   { icon: <Droplets  size={22} />, label: 'Plomberie'   },
  electricite: { icon: <Zap       size={22} />, label: 'Électricité' },
  chauffage:   { icon: <Flame     size={22} />, label: 'Chauffage'   },
  serrurerie:  { icon: <Lock      size={22} />, label: 'Serrurerie'  },
  fenetres:    { icon: <Snowflake size={22} />, label: 'Fenêtres'    },
  nuisibles:   { icon: <Package  size={22} />, label: 'Nuisibles'   },
  autre:       { icon: <Package  size={22} />, label: 'Autre'       },
}

const URGENCY: Record<string, { label: string; bg: string; color: string; border: string }> = {
  low:    { label: 'Basse',   bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)' },
  normal: { label: 'Moyenne', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B',                border: 'rgba(245,158,11,0.35)'  },
  urgent: { label: 'Urgent',  bg: 'rgba(239,68,68,0.12)',   color: '#F87171',                border: 'rgba(239,68,68,0.4)'    },
}

const STATUS_STEPS = [
  { id: 'sent',        label: 'Nouveau',  full: 'Signalé par le locataire' },
  { id: 'received',    label: 'Vu',       full: 'Vu par le propriétaire'   },
  { id: 'in_progress', label: 'En cours', full: 'Traitement en cours'      },
  { id: 'resolved',    label: 'Résolu',   full: 'Problème résolu'          },
] as const

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  sent:        { bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.35)' },
  received:    { bg: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: 'rgba(96,165,250,0.35)' },
  in_progress: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.35)' },
  resolved:    { bg: 'rgba(16,185,129,0.15)', color: '#10B981', border: 'rgba(16,185,129,0.4)'  },
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  padding: '22px 24px',
  fontFamily: OUTFIT,
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

// ═══════════════ Timeline ═══════════════

function Timeline({ req }: { req: MaintenanceRequest }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.id === req.status)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
        Historique
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIdx
          const active = i === currentIdx
          const timestamp = i === 0
            ? req.created_at
            : step.id === 'resolved' && req.resolved_at
              ? req.resolved_at
              : null
          return (
            <div key={step.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
                background: done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: done ? '#10B981' : 'rgba(255,255,255,0.35)',
              }}>
                {done ? <CheckCircle2 size={14} /> : <Circle size={12} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < STATUS_STEPS.length - 1 ? 4 : 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: done ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                  {step.full}
                  {active && (
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
                    }}>ACTUEL</span>
                  )}
                </div>
                {timestamp && (
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {formatDateTime(timestamp)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════ Lightbox ═══════════════

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)' }}>
      <button type="button" onClick={onClose} aria-label="Fermer"
        style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer' }}>
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Photo agrandie" style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
    </div>
  )
}

// ═══════════════ Page ═══════════════

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [request, setRequest] = useState<MaintenanceRequest | null>(null)
  const [lease, setLease] = useState<LeaseInfo | null>(null)
  const [tenant, setTenant] = useState<PartyInfo | null>(null)
  const [viewerRole, setViewerRole] = useState<'owner' | 'tenant'>('owner')
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [savingStatus, setSavingStatus] = useState<string | null>(null)
  const [savingComment, setSavingComment] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const notify = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind }); setTimeout(() => setToast(null), 3200)
  }, [])

  const load = useCallback(async () => {
    const res = await fetch(`/api/maintenance/${id}`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/auth/login'); return }
    if (res.status === 403 || res.status === 404) { router.push('/app/maintenance'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { console.error('[maintenance detail] fetch failed:', res.status, json); setLoading(false); return }
    setRequest(json.request)
    setLease(json.lease)
    setTenant(json.tenant)
    setViewerRole(json.viewerRole ?? 'owner')
    setComment(json.request?.bailleur_comment ?? '')
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  // Rediriger le locataire vers sa vue lecture seule
  useEffect(() => {
    if (!loading && viewerRole === 'tenant' && request) {
      router.replace(`/app/signalement/${request.id}`)
    }
  }, [loading, viewerRole, request, router])

  async function updateStatus(status: MaintenanceRequest['status']) {
    if (!request || savingStatus) return
    if (status === request.status) return
    const previous = request
    // Mise à jour optimiste : la timeline et la progress bar réagissent immédiatement
    setRequest({
      ...request,
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : request.resolved_at,
    })
    setSavingStatus(status)
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json().catch(() => ({} as { request?: MaintenanceRequest; error?: string }))
      if (!res.ok) {
        console.error('[maintenance detail] status update failed:', res.status, json)
        setRequest(previous) // rollback
        notify(`Impossible d'enregistrer le statut${json?.error ? ` : ${json.error}` : ''}`, 'err')
      } else {
        if (json.request) setRequest(json.request as MaintenanceRequest)
        notify(`Statut mis à jour : ${STATUS_STEPS.find(s => s.id === status)?.label}`)
      }
    } catch (e) {
      console.error('[maintenance detail] status update exception:', e)
      setRequest(previous)
      notify('Erreur réseau — statut non enregistré', 'err')
    }
    setSavingStatus(null)
  }

  async function saveComment() {
    if (!request) return
    setSavingComment(true)
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bailleur_comment: comment }),
      })
      const json = await res.json().catch(() => ({} as { request?: MaintenanceRequest; error?: string }))
      if (!res.ok) {
        console.error('[maintenance detail] comment save failed:', res.status, json)
        notify(`Impossible d'envoyer la réponse${json?.error ? ` : ${json.error}` : ''}`, 'err')
      } else {
        if (json.request) setRequest(json.request as MaintenanceRequest)
        notify('Réponse envoyée au locataire')
      }
    } catch (e) {
      console.error('[maintenance detail] comment save exception:', e)
      notify('Erreur réseau — réponse non enregistrée', 'err')
    }
    setSavingComment(false)
  }

  async function uploadResolutionPhoto(file: File) {
    if (!request) return
    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const path = `maintenance/${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) {
        console.error('[maintenance detail] upload error:', upErr)
        notify('Impossible d\'uploader la photo', 'err')
        setUploadingPhoto(false)
        return
      }
      const { data: pub } = supabase.storage.from('documents').getPublicUrl(path)
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved_photo_url: pub.publicUrl }),
      })
      const json = await res.json().catch(() => ({} as { request?: MaintenanceRequest; error?: string }))
      if (!res.ok) {
        console.error('[maintenance detail] resolution photo save failed:', res.status, json)
        notify(`Impossible d'enregistrer la photo${json?.error ? ` : ${json.error}` : ''}`, 'err')
      } else {
        if (json.request) setRequest(json.request as MaintenanceRequest)
        notify('Photo de résolution enregistrée')
      }
    } catch (e) {
      console.error('[maintenance detail] resolution photo exception:', e)
      notify('Erreur réseau — photo non enregistrée', 'err')
    }
    setUploadingPhoto(false)
  }

  if (loading) {
    return (
      <>
        <Topbar title="Signalement" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin" style={{ color: '#10B981' }} />
        </div>
      </>
    )
  }
  if (!request) return null

  const cat = CATEGORY_ICONS[request.category] ?? CATEGORY_ICONS.autre
  const urg = URGENCY[request.urgency ?? 'normal']
  const status = STATUS_COLORS[request.status] ?? STATUS_COLORS.sent
  const statusIdx = STATUS_STEPS.findIndex(s => s.id === request.status)
  const photos = request.photos && request.photos.length > 0 ? request.photos : (request.photo_url ? [request.photo_url] : [])
  const tenantName = tenant ? `${tenant.first_name ?? ''} ${tenant.last_name?.[0] ?? ''}`.trim() || 'Locataire' : 'Locataire'
  const tenantInitials = `${tenant?.first_name?.[0] ?? '?'}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      <Topbar title="Signalement" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 24px 64px' }}>

          {/* Retour */}
          <button type="button" onClick={() => router.push('/app/maintenance')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: OUTFIT, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              padding: '4px 6px', marginBottom: 16,
            }}>
            <ArrowLeft size={15} /> Tous les signalements
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }} className="lg:grid-cols-[3fr_2fr]">

            {/* ─── Colonne gauche : détail ─── */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              style={cardStyle}>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981',
                }}>{cat.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800 }}>
                    {cat.label}
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.25, wordBreak: 'break-word' }}>{request.title}</h1>
                </div>
                <span style={{
                  fontSize: 11.5, fontWeight: 800, padding: '5px 12px', borderRadius: 20, flexShrink: 0,
                  background: urg.bg, color: urg.color, border: `1px solid ${urg.border}`,
                }}>{urg.label}</span>
              </div>

              {/* Sous-header : locataire + status + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {tenant?.avatar_url ? (
                    <Image src={tenant.avatar_url} alt={tenantName} width={28} height={28}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: 11.5, fontWeight: 800,
                    }}>{tenantInitials}</div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{tenantName}</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(request.created_at)}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{
                  fontSize: 11.5, fontWeight: 800, padding: '4px 11px', borderRadius: 20,
                  background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                }}>{STATUS_STEPS[statusIdx]?.label ?? request.status}</span>
                {lease?.address && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>{lease.address}{lease.city ? `, ${lease.city}` : ''}</span>
                  </>
                )}
              </div>

              {/* Description */}
              <div style={{
                padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Description
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {request.description}
                </p>
              </div>

              {/* Galerie photos */}
              {photos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                    Photos ({photos.length})
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    {photos.map((url, i) => (
                      <button key={i} type="button" onClick={() => setLightbox(url)}
                        className="relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
                        style={{ borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '4 / 3' }}>
                        <Image src={url} alt={`Photo ${i + 1}`} fill sizes="(max-width: 640px) 50vw, 300px" style={{ objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Timeline req={request} />
              </div>
            </motion.section>

            {/* ─── Colonne droite : panneau actions ─── */}
            <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Progress statut */}
              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
                  Statut du signalement
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                  {STATUS_STEPS.map((_, i) => (
                    <motion.div key={i} initial={false} animate={{ background: i <= statusIdx ? '#10B981' : 'rgba(255,255,255,0.08)' }}
                      transition={{ duration: 0.4 }}
                      style={{ flex: 1, height: 4, borderRadius: 4 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STATUS_STEPS.map((step, i) => {
                    const active = i === statusIdx
                    const done = i <= statusIdx
                    const busy = savingStatus === step.id
                    return (
                      <button key={step.id} type="button" onClick={() => updateStatus(step.id)} disabled={savingStatus !== null}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                          cursor: savingStatus ? 'wait' : 'pointer', textAlign: 'left', fontFamily: OUTFIT,
                          background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                          border: active ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${done ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
                          color: done ? '#10B981' : 'rgba(255,255,255,0.4)', flexShrink: 0,
                        }}>
                          {busy ? <Loader2 size={11} className="animate-spin" /> : done ? <CheckCircle2 size={11} /> : <Circle size={9} />}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                            {step.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{step.full}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Réponse au locataire */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <MessageSquare size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    Réponse au locataire
                  </div>
                </div>
                <textarea rows={5} value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Expliquez les actions que vous allez entreprendre…"
                  onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12, outline: 'none', resize: 'none',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 13.5, fontFamily: OUTFIT, transition: 'border-color 150ms ease',
                  }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button size="sm" loading={savingComment}
                    disabled={!comment.trim() || comment === (request.bailleur_comment ?? '')}
                    onClick={saveComment}>
                    <Send size={13} /> Envoyer la réponse
                  </Button>
                </div>
              </div>

              {/* Photo de résolution */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Camera size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    Photo de résolution
                  </div>
                </div>
                {request.resolved_photo_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button type="button" onClick={() => setLightbox(request.resolved_photo_url!)}
                      className="relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
                      style={{ borderRadius: 14, aspectRatio: '4 / 3', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <Image src={request.resolved_photo_url} alt="Résolution" fill sizes="300px" style={{ objectFit: 'cover' }} />
                    </button>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 14px',
                      borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, fontFamily: OUTFIT,
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)',
                    }}>
                      {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />} Changer la photo
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadResolutionPhoto(f); e.target.value = '' }} />
                    </label>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '24px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: OUTFIT,
                    border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}>
                    {uploadingPhoto ? <Loader2 size={22} className="animate-spin" style={{ color: '#10B981' }} /> : <Camera size={22} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                      Joindre une preuve de résolution
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Cliquez pour choisir un fichier</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadResolutionPhoto(f); e.target.value = '' }} />
                  </label>
                )}
              </div>

              {/* Contacter le locataire */}
              {tenant && (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <MessageCircle size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                      Contacter le locataire
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                    Discutez en direct avec {tenantName} pour préciser les détails.
                  </div>
                  <Button variant="secondary" onClick={() => router.push(`/app/messages?owner=${tenant.id}`)} className="w-full">
                    <MessageCircle size={13} /> Ouvrir la conversation
                  </Button>
                </div>
              )}
            </motion.aside>
          </div>
        </div>
      </div>

      {/* Lightbox photo */}
      <AnimatePresence>
        {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
              padding: '12px 20px', borderRadius: 12, fontFamily: OUTFIT, fontSize: 13, fontWeight: 700,
              backdropFilter: 'blur(6px)',
              ...(toast.kind === 'err'
                ? { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)' }
                : { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)' }),
            }}>
            <Eye size={13} style={{ display: 'inline', marginRight: 6 }} /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
