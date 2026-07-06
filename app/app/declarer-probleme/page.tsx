'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Send, Paperclip, X } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
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
  { id: 'low',    label: 'Basse',   hint: 'Peut attendre',     bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
  { id: 'normal', label: 'Moyenne', hint: 'À traiter bientôt', bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  { id: 'urgent', label: 'Urgente', hint: 'Intervention rapide', bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
] as const

const STATUS_STEPS = ['sent', 'received', 'in_progress', 'resolved'] as const
const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  sent:        { label: '📤 Ouvert',   bg: '#FEF2F2', color: '#DC2626' },
  received:    { label: '📬 Reçu',     bg: '#FFFBEB', color: '#D97706' },
  in_progress: { label: '🔧 En cours', bg: '#FFFBEB', color: '#D97706' },
  resolved:    { label: '✅ Résolu',   bg: '#ECFDF5', color: '#059669' },
}

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
    if (!leaseLoading && !lease) router.replace('/app/swipe')
  }, [lease, leaseLoading, router])

  useEffect(() => {
    if (!lease) return
    loadRequests()
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

  if (leaseLoading || !lease) {
    return (
      <>
        <Topbar title="Déclarer un problème" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="🔧" /></div>
        </div>
      </>
    )
  }

  const canSubmit = !!form.category && !!form.title && !!form.description && !submitting

  return (
    <>
      <Topbar title="Déclarer un problème" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '760px' }}>

        {/* MODULE A — Envoyer un message */}
        <div
          className="rounded-[18px] mb-7 overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}
          >
            <span className="text-[16px]"><Emoji native="✉️" /></span>
            <h2 className="text-[15px] font-bold" style={{ color: '#111827' }}>Nouveau signalement</h2>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Objet</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Fuite sous l'évier de la cuisine"
                className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] border outline-none"
                style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }}
                onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            <div className="mb-4">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Catégorie</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const active = form.category === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                      className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[12px] border-[1.5px] cursor-pointer transition-all"
                      style={active
                        ? { background: '#ECFDF5', borderColor: '#4ECBA0', boxShadow: '0 2px 10px rgba(78,203,160,.18)' }
                        : { background: '#F9FAFB', borderColor: '#E5E7EB' }}
                    >
                      <span className="text-[22px] leading-none"><Emoji native={cat.icon} size="22px" /></span>
                      <span className="text-[11.5px] font-semibold text-center leading-tight" style={{ color: active ? '#2AA87C' : '#6B7280' }}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Niveau d&apos;urgence</label>
              <div className="grid grid-cols-3 gap-2">
                {URGENCIES.map(u => {
                  const active = form.urgency === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, urgency: u.id }))}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-[12px] border-[1.5px] cursor-pointer transition-all"
                      style={active
                        ? { background: u.bg, borderColor: u.color, boxShadow: `0 2px 10px ${u.color}22` }
                        : { background: '#F9FAFB', borderColor: '#E5E7EB' }}
                    >
                      <span className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: active ? u.color : '#6B7280' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: u.dot }} />
                        {u.label}
                      </span>
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{u.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Détail du problème</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez le problème en détail…"
                rows={4}
                className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] border outline-none resize-none"
                style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }}
                onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            <div className="mb-6">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                Photos (optionnel, max 3)
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files) }}
                onClick={() => photoFiles.length < 3 && fileInputRef.current?.click()}
                className="rounded-[12px] border-[2px] border-dashed flex flex-col items-center justify-center gap-1.5 py-6 cursor-pointer transition-all"
                style={{
                  borderColor: dragOver ? '#4ECBA0' : '#E5E7EB',
                  background: dragOver ? '#ECFDF5' : '#F9FAFB',
                  opacity: photoFiles.length >= 3 ? 0.6 : 1,
                  pointerEvents: photoFiles.length >= 3 ? 'none' : 'auto',
                }}
              >
                <Paperclip size={20} strokeWidth={1.75} style={{ color: '#9CA3AF' }} />
                <span className="text-[12.5px] font-semibold" style={{ color: '#6B7280' }}>
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
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="rounded-[10px] object-cover"
                        style={{ width: '72px', height: '72px' }}
                      />
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-none cursor-pointer"
                        style={{ background: '#111827', color: '#fff' }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canSubmit && (
              <div className="mb-4 p-3.5 rounded-[12px] flex items-center gap-3" style={{ background: '#F0FDF9', border: '1px solid #C6F0DE' }}>
                <span className="text-[20px]"><Emoji native={CATEGORIES.find(c => c.id === form.category)?.icon ?? '📦'} size="20px" /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-bold truncate" style={{ color: '#111827' }}>{form.title}</span>
                    {(() => { const u = URGENCIES.find(x => x.id === form.urgency)!; return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: u.bg, color: u.color }}>{u.label}</span>
                    ) })()}
                  </div>
                  <p className="text-[11px]" style={{ color: '#6B7280' }}>Prêt à être envoyé à votre bailleur</p>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12.5px] mb-3" style={{ color: '#DC2626' }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 16px rgba(78,203,160,.3)' }}
            >
              <Send size={16} strokeWidth={2} />
              {submitting ? 'Envoi en cours…' : sent ? 'Envoyé !' : 'Envoyer au bailleur'}
            </button>
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
          <div className="text-center py-16 rounded-[18px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="text-[48px] mb-4"><Emoji native="✅" /></div>
            <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Tout est en ordre !</h3>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun signalement envoyé pour l'instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(req => {
              const statusIdx = STATUS_STEPS.indexOf(req.status)
              const badge = STATUS_LABELS[req.status] ?? STATUS_LABELS.sent
              const cat = CATEGORIES.find(c => c.id === req.category)
              const photos = req.photos && req.photos.length > 0 ? req.photos : (req.photo_url ? [req.photo_url] : [])
              return (
                <div
                  key={req.id}
                  className="rounded-[14px] p-5"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[18px]"><Emoji native={cat?.icon ?? '📦'} size="18px" /></span>
                        <span className="text-[14px] font-bold" style={{ color: '#111827' }}>{req.title}</span>
                        {(() => { const u = URGENCIES.find(x => x.id === (req.urgency ?? 'normal')); return u && u.id !== 'normal' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: u.bg, color: u.color }}>{u.label}</span>
                        ) : null })()}
                      </div>
                      <p className="text-[12.5px]" style={{ color: '#6B7280' }}>{req.description}</p>
                      {photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {photos.map((url, i) => (
                            <Image key={i} src={url} alt={req.title} width={90} height={70} className="rounded-[10px] object-cover" style={{ width: '90px', height: '70px' }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                        <EmojiText text={badge.label} size="11px" />
                      </span>
                      <span className="text-[10.5px]" style={{ color: '#9CA3AF' }}>{formatDate(req.created_at)}</span>
                    </div>
                  </div>

                  {req.bailleur_comment && (
                    <div className="mt-3 p-3 rounded-[10px]" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                      <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Réponse du bailleur</div>
                      <p className="text-[12.5px]" style={{ color: '#374151' }}>{req.bailleur_comment}</p>
                      {req.resolved_photo_url && (
                        <Image src={req.resolved_photo_url} alt="Résolution" width={120} height={90} className="mt-2 rounded-[10px] object-cover" style={{ width: '120px', height: '90px' }} />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-3">
                    {STATUS_STEPS.map((s, i) => (
                      <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: i <= statusIdx ? '#4ECBA0' : '#F3F4F6' }} />
                    ))}
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
