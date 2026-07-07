'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, Circle, Droplets, Flame, Loader2, Lock,
  MessageSquare, Package, Snowflake, X, Zap,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Emoji from '@/components/ui/Emoji'

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

interface PartyInfo { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }

// ═══════════════ Constantes ═══════════════

const OUTFIT = "'Outfit', sans-serif"

const CATEGORY: Record<string, { icon: React.ReactNode; label: string }> = {
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
  { id: 'sent',        label: 'Envoyé',   full: 'Signalement envoyé' },
  { id: 'received',    label: 'Reçu',     full: 'Vu par le propriétaire' },
  { id: 'in_progress', label: 'En cours', full: 'Traitement en cours' },
  { id: 'resolved',    label: 'Résolu',   full: 'Problème résolu' },
] as const

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  sent:        { bg: 'rgba(239,68,68,0.12)',   color: '#F87171', border: 'rgba(239,68,68,0.4)'   },
  received:    { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', border: 'rgba(96,165,250,0.35)' },
  in_progress: { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', border: 'rgba(245,158,11,0.35)' },
  resolved:    { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', border: 'rgba(16,185,129,0.4)'  },
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

// ═══════════════ Timeline (partagée avec la page loueur, dupliquée volontairement — routes indépendantes) ═══════════════

function Timeline({ req }: { req: MaintenanceRequest }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.id === req.status)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
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
              <div style={{ flex: 1 }}>
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

export default function SignalementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [request, setRequest] = useState<MaintenanceRequest | null>(null)
  const [owner, setOwner] = useState<PartyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/maintenance/${id}`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/auth/login'); return }
    if (res.status === 403 || res.status === 404) { router.push('/app/declarer-probleme'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { console.error('[signalement] fetch failed:', res.status, json); setLoading(false); return }
    setRequest(json.request)
    setOwner(json.owner)
    setLoading(false)
    // Marque comme "vu" pour effacer le badge sidebar (dot mint sur "Déclarer un problème")
    try { localStorage.setItem('maintenance_last_seen', new Date().toISOString()) } catch {}
    window.dispatchEvent(new Event('maintenance-seen'))
  }, [id, router])

  useEffect(() => { load() }, [load])

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

  const cat = CATEGORY[request.category] ?? CATEGORY.autre
  const urg = URGENCY[request.urgency ?? 'normal']
  const status = STATUS_COLORS[request.status] ?? STATUS_COLORS.sent
  const statusIdx = STATUS_STEPS.findIndex(s => s.id === request.status)
  const photos = request.photos && request.photos.length > 0 ? request.photos : (request.photo_url ? [request.photo_url] : [])
  const ownerName = owner ? `${owner.first_name ?? ''} ${owner.last_name?.[0] ?? ''}`.trim() || 'Bailleur' : 'Bailleur'
  const ownerInitials = `${owner?.first_name?.[0] ?? '?'}${owner?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      <Topbar title="Signalement" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 64px' }}>

          <button type="button" onClick={() => router.push('/app/declarer-probleme')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: OUTFIT, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              padding: '4px 6px', marginBottom: 16,
            }}>
            <ArrowLeft size={15} /> Mes signalements
          </button>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, marginBottom: 16 }}>

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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(request.created_at)}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{
                fontSize: 11.5, fontWeight: 800, padding: '4px 11px', borderRadius: 20,
                background: status.bg, color: status.color, border: `1px solid ${status.border}`,
              }}>{STATUS_STEPS[statusIdx]?.label ?? request.status}</span>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {STATUS_STEPS.map((_, i) => (
                <motion.div key={i} initial={false} animate={{ background: i <= statusIdx ? '#10B981' : 'rgba(255,255,255,0.08)' }}
                  transition={{ duration: 0.4 }} style={{ flex: 1, height: 4, borderRadius: 4 }} />
              ))}
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

            {/* Photos */}
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
          </motion.section>

          {/* Réponse du bailleur */}
          {(request.bailleur_comment || request.resolved_photo_url) && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}
              style={{ ...cardStyle, marginBottom: 16, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {owner?.avatar_url ? (
                  <Image src={owner.avatar_url} alt={ownerName} width={32} height={32}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: 12, fontWeight: 800,
                  }}>{ownerInitials}</div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Réponse de {ownerName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Propriétaire</div>
                </div>
              </div>

              {request.bailleur_comment && (
                <div style={{ display: 'flex', gap: 10, marginBottom: request.resolved_photo_url ? 14 : 0 }}>
                  <MessageSquare size={14} style={{ color: '#10B981', flexShrink: 0, marginTop: 3 }} />
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {request.bailleur_comment}
                  </p>
                </div>
              )}

              {request.resolved_photo_url && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    Photo de résolution
                  </div>
                  <button type="button" onClick={() => setLightbox(request.resolved_photo_url!)}
                    className="relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
                    style={{ display: 'block', width: '100%', maxWidth: 320, borderRadius: 14, aspectRatio: '4 / 3', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <Image src={request.resolved_photo_url} alt="Résolution" fill sizes="320px" style={{ objectFit: 'cover' }} />
                  </button>
                </div>
              )}
            </motion.section>
          )}

          {/* Timeline */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
            style={cardStyle}>
            <Timeline req={request} />
          </motion.section>

          {/* CTA discret */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 20, fontFamily: OUTFIT }}>
            <Emoji native="💬" size="11px" /> Une question ?{' '}
            <button type="button" onClick={() => router.push('/app/messages')}
              style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontWeight: 700, fontFamily: OUTFIT, fontSize: 12 }}>
              Écrire au bailleur
            </button>
          </p>
        </div>
      </div>

      <AnimatePresence>
        {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </>
  )
}
