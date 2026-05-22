'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useLease } from '@/contexts/LeaseContext'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceRequest {
  id: string
  title: string
  category: string
  description: string
  urgency: 'low' | 'normal' | 'urgent'
  status: 'sent' | 'received' | 'in_progress' | 'resolved'
  created_at: string
  resolved_at: string | null
}

const CATEGORIES = [
  { id: 'plomberie',   icon: '🚿', label: 'Plomberie' },
  { id: 'electricite', icon: '🔌', label: 'Électricité' },
  { id: 'chauffage',   icon: '🌡️', label: 'Chauffage' },
  { id: 'serrurerie',  icon: '🔐', label: 'Serrurerie' },
  { id: 'fenetres',    icon: '🪟', label: 'Fenêtres' },
  { id: 'autre',       icon: '📦', label: 'Autre' },
]

const URGENCY_CONFIG = [
  { id: 'low',    label: 'Faible',  color: '#059669', bg: '#ECFDF5' },
  { id: 'normal', label: 'Normale', color: '#D97706', bg: '#FFFBEB' },
  { id: 'urgent', label: 'Urgente', color: '#DC2626', bg: '#FEF2F2' },
]

const STATUS_STEPS = ['sent', 'received', 'in_progress', 'resolved'] as const
const STATUS_LABELS: Record<string, string> = {
  sent:        '📤 Envoyé',
  received:    '📬 Reçu',
  in_progress: '🔧 En cours',
  resolved:    '✅ Résolu',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function MaintenancePage() {
  const router = useRouter()
  const { lease, loading: leaseLoading } = useLease()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    urgency: 'normal' as 'low' | 'normal' | 'urgent',
  })

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
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.category || !form.title || !form.description || !lease) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from('maintenance_requests').insert({
        lease_id: lease.id,
        tenant_id: user.id,
        category: form.category,
        title: form.title,
        description: form.description,
        urgency: form.urgency,
        status: 'sent',
      }).select().single()

      if (!error && data) {
        setRequests(r => [data as MaintenanceRequest, ...r])
        setForm({ category: '', title: '', description: '', urgency: 'normal' })
        setShowForm(false)
      }
    } catch {}
    setSubmitting(false)
  }

  if (leaseLoading || !lease) {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>🔧</div>
        </div>
      </>
    )
  }

  const openCount = requests.filter(r => r.status !== 'resolved').length

  return (
    <>
      <Topbar title="Maintenance" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '760px' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Signalements
            </h2>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>
              {openCount > 0 ? `${openCount} signalement${openCount > 1 ? 's' : ''} en cours` : 'Aucun signalement en cours'}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 16px rgba(78,203,160,.3)' }}
          >
            + Signaler un problème
          </button>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)' }} onClick={() => setShowForm(false)}>
            <div
              className="rounded-[20px] p-6 w-full"
              style={{ background: '#FFFFFF', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px]" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
                  Signaler un problème
                </h3>
                <button onClick={() => setShowForm(false)} className="border-none bg-transparent cursor-pointer text-lg" style={{ color: '#9CA3AF' }}>✕</button>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Catégorie</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                      className="flex flex-col items-center gap-1 py-3 rounded-[10px] border-[2px] cursor-pointer transition-all"
                      style={{
                        background: form.category === cat.id ? '#ECFDF5' : '#F9FAFB',
                        borderColor: form.category === cat.id ? '#4ECBA0' : '#E5E7EB',
                        color: '#374151',
                      }}
                    >
                      <span className="text-[22px]">{cat.icon}</span>
                      <span className="text-[11px] font-semibold">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Titre du problème</label>
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

              {/* Description */}
              <div className="mb-4">
                <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez le problème en détail…"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] border outline-none resize-none"
                  style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }}
                  onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {/* Urgency */}
              <div className="mb-6">
                <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Urgence</label>
                <div className="flex gap-2">
                  {URGENCY_CONFIG.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setForm(f => ({ ...f, urgency: u.id as 'low' | 'normal' | 'urgent' }))}
                      className="flex-1 py-2 rounded-[8px] text-[12.5px] font-semibold border-[2px] cursor-pointer transition-all"
                      style={{
                        background: form.urgency === u.id ? u.bg : '#F9FAFB',
                        borderColor: form.urgency === u.id ? u.color : '#E5E7EB',
                        color: form.urgency === u.id ? u.color : '#6B7280',
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.category || !form.title || !form.description || submitting}
                className="w-full py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
              >
                {submitting ? 'Envoi en cours…' : '📤 Envoyer au propriétaire'}
              </button>
            </div>
          </div>
        )}

        {/* Request list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-[40px]" style={{ animation: 'bop 1s ease infinite' }}>🔧</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 rounded-[18px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="text-[48px] mb-4">✅</div>
            <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Tout est en ordre !</h3>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun signalement pour le moment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(req => {
              const statusIdx = STATUS_STEPS.indexOf(req.status as typeof STATUS_STEPS[number])
              const urgCfg = URGENCY_CONFIG.find(u => u.id === req.urgency) ?? URGENCY_CONFIG[1]
              return (
                <div
                  key={req.id}
                  className="rounded-[14px] p-5"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[18px]">{CATEGORIES.find(c => c.id === req.category)?.icon ?? '📦'}</span>
                        <span className="text-[14px] font-bold" style={{ color: '#111827' }}>{req.title}</span>
                      </div>
                      <p className="text-[12.5px]" style={{ color: '#6B7280' }}>{req.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: urgCfg.bg, color: urgCfg.color }}>
                        {urgCfg.label}
                      </span>
                      <span className="text-[10.5px]" style={{ color: '#9CA3AF' }}>{formatDate(req.created_at)}</span>
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="flex items-center gap-1 mt-3">
                    {STATUS_STEPS.map((s, i) => (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div
                          className="flex-1 h-1.5 rounded-full"
                          style={{ background: i <= statusIdx ? '#4ECBA0' : '#F3F4F6' }}
                        />
                        {i === STATUS_STEPS.length - 1 && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: statusIdx === STATUS_STEPS.length - 1 ? '#4ECBA0' : '#F3F4F6' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {STATUS_STEPS.map((s, i) => (
                      <span key={s} className="text-[9.5px]" style={{ color: i <= statusIdx ? '#4ECBA0' : '#D1D5DB' }}>
                        {['Envoyé', 'Reçu', 'En cours', 'Résolu'][i]}
                      </span>
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
