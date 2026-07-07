'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Send, Paperclip, X, ChevronRight } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import NoLeaseState from '@/components/ui/NoLeaseState'
import Button from '@/components/ui/Button'
import { useLease } from '@/contexts/LeaseContext'
import { createClient } from '@/lib/supabase/client'
import Emoji, { EmojiText } from '@/components/ui/Emoji'

interface MaintenanceRequest {
  id: string
  title: string
  category: string
  description: string
  urgency?: 'low' | 'normal' | 'urgent'
  status: 'sent' | 'received' | 'in_progress' | 'resolved'
  created_at: string
  resolved_at: string | null
  photo_url?: string | null
  photos?: string[] | null
  bailleur_comment?: string | null
  resolved_photo_url?: string | null
}

const CATEGORIES = [
  { id: 'plomberie',   icon: '🚿', label: 'Plomberie' },
  { id: 'electricite', icon: '🔌', label: 'Électricité' },
  { id: 'chauffage',   icon: '🌡️', label: 'Chauffage' },
  { id: 'serrurerie',  icon: '🔐', label: 'Serrurerie / Sécurité' },
  { id: 'nuisibles',   icon: '🐛', label: 'Nuisibles' },
  { id: 'autre',       icon: '📦', label: 'Autre' },
]

const URGENCIES = [
  { id: 'low',    label: 'Basse',   hint: 'Peut attendre',       color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)', dot: 'rgba(255,255,255,0.4)' },
  { id: 'normal', label: 'Moyenne', hint: 'À traiter bientôt',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', dot: '#F59E0B' },
  { id: 'urgent', label: 'Urgente', hint: 'Intervention rapide', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', dot: '#EF4444' },
] as const

const STATUS_STEPS = ['sent', 'received', 'in_progress', 'resolved'] as const
const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  sent:        { label: '📤 Ouvert',   bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
  received:    { label: '📬 Reçu',     bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  in_progress: { label: '🔧 En cours', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  resolved:    { label: '✅ Résolu',   bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
}

const darkCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const darkInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
}

const labelCls = 'block text-[11.5px] font-extrabold uppercase tracking-wider mb-2'
const labelColor = { color: 'rgba(255,255,255,0.4)' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DeclarerProblemePage() {
  const router = useRouter()
  const { lease, loading: leaseLoading } = useLease()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ title: '', category: '', description: '', urgency: 'normal' })

  useEffect(() => {
    if (!lease) return
    loadRequests()
    // Marque comme vu → efface le badge sidebar (dot mint sur "Déclarer un problème")
    try { localStorage.setItem('maintenance_last_seen', new Date().toISOString()) } catch {}
    window.dispatchEvent(new Event('maintenance-seen'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease])

  async function loadRequests() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('lease_id', lease!.id)
        .order('created_at', { ascending: false })
      if (data) setRequests(data as MaintenanceRequest[])
    } catch {}
    setLoadingRequests(false)
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPhotoFiles(prev => [...prev, ...incoming].slice(0, 3))
  }

  function removeFile(idx: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!form.category || !form.title || !form.description || !lease) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const photoUrls: string[] = []
      for (const file of photoFiles) {
        const path = `maintenance/${Date.now()}-${file.name.replace(/\s/g, '_')}`
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
        if (!upErr) {
          const { data: pub } = supabase.storage.from('documents').getPublicUrl(path)
          photoUrls.push(pub.publicUrl)
        }
      }

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          description: form.description,
          urgency: form.urgency,
          photos: photoUrls,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur lors de l\'envoi')

      setRequests(r => [json.request as MaintenanceRequest, ...r])
      setForm({ title: '', category: '', description: '', urgency: 'normal' })
      setPhotoFiles([])
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'envoi')
    }
    setSubmitting(false)
  }

  // Guard strict : n'affiche JAMAIS le NoLeaseState tant que le lease-context charge.
  // Sinon, avant que fetchLease ne finisse, `!lease` est vrai et le locataire voit
  // "Aucun bail actif" par erreur alors qu'il en a un.
  if (leaseLoading) {
    return (
      <>
        <Topbar title="Déclarer un problème" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="🔧" /></div>
        </div>
      </>
    )
  }

  if (!lease || lease.status !== 'active') {
    const msg = lease && lease.status === 'pending_signature'
      ? "Votre bail est en attente de signature. Vous pourrez déclarer un problème dès qu'il sera signé par les deux parties."
      : "Vous pourrez déclarer un problème dès qu'un bail actif sera lié à votre compte. Si votre bail est en attente de signature, il apparaîtra ici une fois signé par les deux parties."
    return <NoLeaseState title="Déclarer un problème" message={msg} />
  }

  const canSubmit = !!form.category && !!form.title && !!form.description && !submitting

  return (
    <>
      <Topbar title="Déclarer un problème" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '760px', fontFamily: "'Outfit', sans-serif" }}>

        {/* MODULE A — Nouveau signalement */}
        <div className="rounded-[20px] mb-7 overflow-hidden" style={darkCard}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[16px]"><Emoji native="✉️" /></span>
            <h2 className="text-[15px] font-bold" style={{ color: '#fff' }}>Nouveau signalement</h2>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className={labelCls} style={labelColor}>Objet</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Fuite sous l'évier de la cuisine"
                className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] outline-none"
                style={darkInput}
                onFocus={e => (e.target.style.borderColor = '#10B981')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div className="mb-4">
              <label className={labelCls} style={labelColor}>Catégorie</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const active = form.category === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                      className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[12px] cursor-pointer transition-all"
                      style={active
                        ? { background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.5)', boxShadow: '0 2px 14px rgba(16,185,129,.12)' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-[22px] leading-none"><Emoji native={cat.icon} size="22px" /></span>
                      <span className="text-[11.5px] font-semibold text-center leading-tight" style={{ color: active ? '#10B981' : 'rgba(255,255,255,0.55)' }}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className={labelCls} style={labelColor}>Niveau d&apos;urgence</label>
              <div className="grid grid-cols-3 gap-2">
                {URGENCIES.map(u => {
                  const active = form.urgency === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, urgency: u.id }))}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-[12px] cursor-pointer transition-all"
                      style={active
                        ? { background: u.bg, border: `1.5px solid ${u.border}` }
                        : { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: active ? u.color : 'rgba(255,255,255,0.55)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: u.dot }} />
                        {u.label}
                      </span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className={labelCls} style={labelColor}>Détail du problème</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez le problème en détail…"
                rows={4}
                className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] outline-none resize-none"
                style={darkInput}
                onFocus={e => (e.target.style.borderColor = '#10B981')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div className="mb-6">
              <label className={labelCls} style={labelColor}>Photos (optionnel, max 3)</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files) }}
                onClick={() => photoFiles.length < 3 && fileInputRef.current?.click()}
                className="rounded-[12px] flex flex-col items-center justify-center gap-1.5 py-6 cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragOver ? '#10B981' : 'rgba(255,255,255,0.12)'}`,
                  background: dragOver ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                  opacity: photoFiles.length >= 3 ? 0.6 : 1,
                  pointerEvents: photoFiles.length >= 3 ? 'none' : 'auto',
                }}
              >
                <Paperclip size={20} strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[12.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Glissez-déposez ou cliquez pour ajouter des photos
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files) addFiles(e.target.files) }}
                />
              </div>
              {photoFiles.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {photoFiles.map((file, idx) => (
                    <div key={idx} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="rounded-[10px] object-cover"
                        style={{ width: '72px', height: '72px' }}
                      />
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-none cursor-pointer"
                        style={{ background: '#fff', color: '#111827' }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canSubmit && (
              <div className="mb-4 p-3.5 rounded-[12px] flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="text-[20px]"><Emoji native={CATEGORIES.find(c => c.id === form.category)?.icon ?? '📦'} size="20px" /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-bold truncate" style={{ color: '#fff' }}>{form.title}</span>
                    {(() => { const u = URGENCIES.find(x => x.id === form.urgency)!; return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: u.bg, color: u.color }}>{u.label}</span>
                    ) })()}
                  </div>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Prêt à être envoyé à votre bailleur</p>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12.5px] mb-3" style={{ color: '#EF4444' }}>{error}</p>
            )}

            <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting} className="w-full">
              <Send size={16} strokeWidth={2} />
              {submitting ? 'Envoi en cours…' : sent ? 'Envoyé !' : 'Envoyer au bailleur'}
            </Button>
          </div>
        </div>

        {/* MODULE B — Mes signalements */}
        <div className="mb-3">
          <h3 className="text-[16px] font-bold" style={{ color: '#fff' }}>Mes signalements</h3>
          <p className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {requests.length > 0 ? `${requests.length} signalement${requests.length > 1 ? 's' : ''}` : 'Aucun signalement pour le moment'}
          </p>
        </div>

        {loadingRequests ? (
          <div className="text-center py-12">
            <div className="text-[40px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="🔧" /></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 rounded-[20px]" style={darkCard}>
            <div className="text-[48px] mb-4"><Emoji native="✅" /></div>
            <h3 className="text-[17px] mb-2 font-bold" style={{ color: '#fff' }}>Tout est en ordre !</h3>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun signalement envoyé pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(req => {
              const statusIdx = STATUS_STEPS.indexOf(req.status)
              const badge = STATUS_LABELS[req.status] ?? STATUS_LABELS.sent
              const cat = CATEGORIES.find(c => c.id === req.category)
              const photos = req.photos && req.photos.length > 0 ? req.photos : (req.photo_url ? [req.photo_url] : [])
              return (
                <button key={req.id} type="button"
                  onClick={() => router.push(`/app/signalement/${req.id}`)}
                  className="rounded-[16px] p-5 text-left cursor-pointer transition-all hover:-translate-y-0.5 w-full block"
                  style={{
                    ...darkCard, borderColor: 'rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(16,185,129,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[18px]"><Emoji native={cat?.icon ?? '📦'} size="18px" /></span>
                        <span className="text-[14px] font-bold" style={{ color: '#fff' }}>{req.title}</span>
                        {(() => { const u = URGENCIES.find(x => x.id === (req.urgency ?? 'normal')); return u && u.id !== 'normal' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: u.bg, color: u.color }}>{u.label}</span>
                        ) : null })()}
                      </div>
                      <p className="text-[12.5px]" style={{
                        color: 'rgba(255,255,255,0.55)', margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{req.description}</p>
                      {photos.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold" style={{ color: 'rgba(16,185,129,0.75)' }}>
                          <Paperclip size={11} /> {photos.length} photo{photos.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                        <EmojiText text={badge.label} size="11px" />
                      </span>
                      <span className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDate(req.created_at)}</span>
                      <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)', marginTop: 2 }} />
                    </div>
                  </div>

                  {req.bailleur_comment && (
                    <div className="mt-3 p-3 rounded-[10px]" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>Réponse du bailleur</div>
                      <p className="text-[12.5px]" style={{
                        color: 'rgba(255,255,255,0.75)', margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{req.bailleur_comment}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-3">
                    {STATUS_STEPS.map((s, i) => (
                      <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: i <= statusIdx ? '#10B981' : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
