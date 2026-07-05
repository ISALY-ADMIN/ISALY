'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarClock, KeyRound, Home, FileText, X, Video, MapPin, ChevronLeft } from 'lucide-react'

export type RichType = 'visite' | 'reservation' | 'annonce' | 'document'

interface Listing { id: string; title: string | null; city: string | null; rent: number | null; photos: string[] | null }
interface Doc { id: string; type: string; file_url: string | null }

interface ActionsPanelProps {
  currentUserId: string
  otherUserId: string
  otherName: string
  onClose: () => void
  onSendRich: (type: RichType, payload: Record<string, unknown>, content: string) => void
  /** Ouvre directement une action (depuis les icônes du header) au lieu du menu */
  initialView?: RichType
}

const DOC_LABELS: Record<string, string> = {
  identity_front: "Pièce d'identité (recto)",
  identity_back: "Pièce d'identité (verso)",
  selfie: 'Selfie de vérification',
  payslip: 'Bulletin de salaire',
  domicile: 'Justificatif de domicile',
  guarantor: 'Document garant',
}

const ACTIONS: { key: RichType; label: string; desc: string; icon: typeof Home; grad: string }[] = [
  { key: 'visite', label: 'Proposer une visite', desc: 'Physique ou visio, date & heure', icon: CalendarClock, grad: 'linear-gradient(135deg,#10B981,#059669)' },
  { key: 'reservation', label: 'Demander à réserver', desc: 'Envoyer une demande de réservation', icon: KeyRound, grad: 'linear-gradient(135deg,#6366F1,#4F46E5)' },
  { key: 'annonce', label: 'Partager une annonce', desc: 'Une de tes annonces', icon: Home, grad: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { key: 'document', label: 'Envoyer un document', desc: 'Depuis ton dossier', icon: FileText, grad: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
]

export default function ActionsPanel({ currentUserId, otherUserId, otherName, onClose, onSendRich, initialView }: ActionsPanelProps) {
  const [view, setView] = useState<'menu' | RichType>(initialView ?? 'menu')
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [otherListings, setOtherListings] = useState<Listing[]>([])
  const [docs, setDocs] = useState<Doc[]>([])

  // Visite
  const [vDate, setVDate] = useState('')
  const [vTime, setVTime] = useState('')
  const [vMode, setVMode] = useState<'physique' | 'visio'>('physique')
  // Réservation
  const [rMessage, setRMessage] = useState('Bonjour, je souhaite réserver une chambre dans votre logement.')
  const [rListing, setRListing] = useState('')

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const [{ data: mine }, { data: theirs }, { data: myDocs }] = await Promise.all([
        supabase.from('listings').select('id, title, city, rent, photos').eq('owner_id', currentUserId).eq('is_active', true),
        supabase.from('listings').select('id, title, city, rent, photos').eq('owner_id', otherUserId).eq('is_active', true),
        supabase.from('user_documents').select('id, type, file_url').eq('user_id', currentUserId),
      ])
      setMyListings((mine ?? []) as Listing[])
      setOtherListings((theirs ?? []) as Listing[])
      setDocs(((myDocs ?? []) as Doc[]).filter(d => d.file_url))
    })()
  }, [currentUserId, otherUserId])

  function submitVisite() {
    if (!vDate || !vTime) return
    const dateLabel = new Date(`${vDate}T${vTime}`).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    onSendRich('visite', { date: vDate, time: vTime, mode: vMode, status: 'pending' }, `📅 Proposition de visite — ${dateLabel}`)
    onClose()
  }
  function submitReservation() {
    const l = otherListings.find(x => x.id === rListing)
    onSendRich('reservation', { listing_id: l?.id ?? null, listing_title: l?.title ?? null, message: rMessage, status: 'pending' }, `🔑 Demande de réservation${l?.title ? ` — ${l.title}` : ''}`)
    onClose()
  }
  function shareListing(l: Listing) {
    onSendRich('annonce', { listing_id: l.id, title: l.title, city: l.city, rent: l.rent, photo: l.photos?.[0] ?? null }, `🏠 Annonce partagée — ${l.title ?? 'Logement'}`)
    onClose()
  }
  function sendDoc(d: Doc) {
    onSendRich('document', { name: DOC_LABELS[d.type] ?? d.type, url: d.file_url }, `📄 Document envoyé — ${DOC_LABELS[d.type] ?? d.type}`)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100,
          background: '#141414', borderTop: '1px solid rgba(255,255,255,0.1)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '18px 18px 24px',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', maxHeight: '70vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {view !== 'menu' && (
              <button onClick={() => setView('menu')} className="flex items-center justify-center rounded-full transition-colors" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)' }}>
                <ChevronLeft size={18} color="#fff" />
              </button>
            )}
            <span className="text-[15px] font-bold text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
              {view === 'menu' ? 'Actions' : ACTIONS.find(a => a.key === view)?.label}
            </span>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)' }}>
            <X size={18} color="#fff" />
          </button>
        </div>

        {view === 'menu' && (
          <div className="grid grid-cols-2 gap-2.5">
            {ACTIONS.map(a => {
              const Icon = a.icon
              return (
                <button
                  key={a.key}
                  onClick={() => setView(a.key)}
                  className="flex flex-col gap-2 p-3.5 rounded-[16px] text-left transition-transform active:scale-[0.97]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center justify-center rounded-[12px]" style={{ width: 40, height: 40, background: a.grad }}>
                    <Icon size={20} color="#fff" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white">{a.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {view === 'visite' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Date"><input type="date" value={vDate} onChange={e => setVDate(e.target.value)} style={inputStyle} /></Field>
              <Field label="Heure"><input type="time" value={vTime} onChange={e => setVTime(e.target.value)} style={inputStyle} /></Field>
            </div>
            <Field label="Type de visite">
              <div className="grid grid-cols-2 gap-2">
                {(['physique', 'visio'] as const).map(m => (
                  <button key={m} onClick={() => setVMode(m)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors"
                    style={{ background: vMode === m ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${vMode === m ? '#10B981' : 'rgba(255,255,255,0.08)'}`, color: vMode === m ? '#10B981' : 'rgba(255,255,255,0.6)' }}>
                    {m === 'physique' ? <MapPin size={15} /> : <Video size={15} />} {m === 'physique' ? 'Physique' : 'Visio'}
                  </button>
                ))}
              </div>
            </Field>
            <PrimaryBtn disabled={!vDate || !vTime} onClick={submitVisite}>Envoyer la proposition</PrimaryBtn>
          </div>
        )}

        {view === 'reservation' && (
          <div className="flex flex-col gap-3">
            {otherListings.length > 0 && (
              <Field label={`Annonce de ${otherName} (optionnel)`}>
                <select value={rListing} onChange={e => setRListing(e.target.value)} style={inputStyle}>
                  <option value="">— Aucune annonce précise —</option>
                  {otherListings.map(l => <option key={l.id} value={l.id}>{l.title ?? 'Logement'} · {l.city ?? ''}</option>)}
                </select>
              </Field>
            )}
            <Field label="Message">
              <textarea value={rMessage} onChange={e => setRMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </Field>
            <PrimaryBtn onClick={submitReservation}>Envoyer la demande</PrimaryBtn>
          </div>
        )}

        {view === 'annonce' && (
          <div className="flex flex-col gap-2">
            {myListings.length === 0 ? (
              <Empty>Tu n&apos;as pas encore d&apos;annonce active.</Empty>
            ) : myListings.map(l => (
              <button key={l.id} onClick={() => shareListing(l)} className="flex items-center gap-3 p-2.5 rounded-[14px] text-left transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-12 h-12 rounded-[10px] flex-shrink-0 bg-cover bg-center" style={{ background: l.photos?.[0] ? `url(${l.photos[0]}) center/cover` : 'rgba(255,255,255,0.06)' }} />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-white truncate">{l.title ?? 'Logement'}</div>
                  <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{l.city} · {l.rent}€/mois</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {view === 'document' && (
          <div className="flex flex-col gap-2">
            {docs.length === 0 ? (
              <Empty>Aucun document dans ton dossier.</Empty>
            ) : docs.map(d => (
              <button key={d.id} onClick={() => sendDoc(d)} className="flex items-center gap-3 p-3 rounded-[14px] text-left transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-center rounded-[10px] flex-shrink-0" style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
                  <FileText size={18} color="#fff" />
                </div>
                <div className="text-[13px] font-semibold text-white">{DOC_LABELS[d.type] ?? d.type}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</label>
      {children}
    </div>
  )
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
      style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)', opacity: disabled ? 0.5 : 1, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{children}</div>
}
