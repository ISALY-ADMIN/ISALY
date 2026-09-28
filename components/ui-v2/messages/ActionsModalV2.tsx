'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RichType } from '@/components/messages/ActionsPanel'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Icon, Ico, Segmented } from '../primitives'
import { eur, longDateTime } from '../format'

interface Listing { id: string; title: string | null; city: string | null; rent: number | null; photos: string[] | null }
interface Doc { id: string; type: string; file_url: string | null }

const DOC_LABELS: Record<string, string> = {
  identity_front: 'Pièce d’identité (recto)',
  identity_back: 'Pièce d’identité (verso)',
  selfie: 'Selfie de vérification',
  payslip: 'Bulletin de salaire',
  domicile: 'Justificatif de domicile',
  guarantor: 'Document du garant',
}

const ACTIONS: { key: RichType; label: string; desc: string; ic: 'calendar' | 'contract' | 'building' | 'doc' }[] = [
  { key: 'visite', label: 'Proposer une visite', desc: 'Sur place ou en visio, date et heure', ic: 'calendar' },
  { key: 'reservation', label: 'Demander à réserver', desc: 'Envoyer une demande de réservation', ic: 'contract' },
  { key: 'annonce', label: 'Partager une annonce', desc: 'Une de tes annonces', ic: 'building' },
  { key: 'document', label: 'Envoyer un document', desc: 'Depuis ton dossier', ic: 'doc' },
]

/**
 * Actions de la messagerie (même logique que components/messages/ActionsPanel.tsx),
 * dans une fenêtre du dashboard v2.
 */
export default function ActionsModalV2({
  open, currentUserId, otherUserId, otherName, onClose, onSendRich, initialView,
}: {
  open: boolean
  currentUserId: string
  otherUserId: string
  otherName: string
  onClose: () => void
  onSendRich: (type: RichType, payload: Record<string, unknown>, content: string) => void
  initialView?: RichType
}) {
  const [view, setView] = useState<'menu' | RichType>(initialView ?? 'menu')
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [otherListings, setOtherListings] = useState<Listing[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [vDate, setVDate] = useState('')
  const [vTime, setVTime] = useState('')
  const [vMode, setVMode] = useState<'physique' | 'visio'>('physique')
  const [rMessage, setRMessage] = useState('Bonjour, je souhaite réserver une chambre dans votre logement.')
  const [rListing, setRListing] = useState('')

  useEffect(() => {
    if (open) setView(initialView ?? 'menu')
  }, [open, initialView])

  useEffect(() => {
    if (!open) return
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
  }, [open, currentUserId, otherUserId])

  const done = () => onClose()
  const title = view === 'menu' ? 'Actions' : ACTIONS.find(a => a.key === view)?.label

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {view !== 'menu' && !initialView && (
        <button className="link mt" type="button" onClick={() => setView('menu')}>Toutes les actions</button>
      )}
      {view === 'menu' && (
        <div className="stackv mt" style={{ gap: 10 }}>
          {ACTIONS.map(a => (
            <button key={a.key} type="button" className="opt" onClick={() => setView(a.key)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Ico name={a.ic} tone="brand" />
              <span style={{ display: 'grid' }}>
                <b style={{ fontSize: 16 }}>{a.label}</b>
                <span>{a.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {view === 'visite' && (
        <div className="form mt">
          <div className="f2">
            <div className="field"><label htmlFor="vdate">Date</label><input id="vdate" className="input" type="date" value={vDate} onChange={e => setVDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="vtime">Heure</label><input id="vtime" className="input" type="time" value={vTime} onChange={e => setVTime(e.target.value)} /></div>
          </div>
          <div className="field">
            <span className="flabel">Type de visite</span>
            <Segmented options={[{ value: 'physique', label: 'Sur place', icon: 'pin' }, { value: 'visio', label: 'En visio', icon: 'eye' }]} value={vMode} onChange={setVMode} label="Type de visite" />
          </div>
          <div className="mfoot">
            <Button
              variant="main"
              disabled={!vDate || !vTime}
              onClick={() => {
                onSendRich('visite', { date: vDate, time: vTime, mode: vMode, status: 'pending' }, `Proposition de visite, ${longDateTime(`${vDate}T${vTime}:00`).toLowerCase()}`)
                done()
              }}
            >
              Envoyer la proposition
            </Button>
          </div>
        </div>
      )}

      {view === 'reservation' && (
        <div className="form mt">
          {otherListings.length > 0 && (
            <div className="field">
              <label htmlFor="rlist">Annonce de {otherName}, si tu veux en préciser une</label>
              <select id="rlist" className="select" value={rListing} onChange={e => setRListing(e.target.value)}>
                <option value="">Aucune annonce précise</option>
                {otherListings.map(l => <option key={l.id} value={l.id}>{l.title ?? 'Logement'}, {l.city ?? ''}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label htmlFor="rmsg">Message</label><textarea id="rmsg" className="textarea" value={rMessage} onChange={e => setRMessage(e.target.value)} /></div>
          <div className="mfoot">
            <Button
              variant="main"
              onClick={() => {
                const l = otherListings.find(x => x.id === rListing)
                onSendRich('reservation', { listing_id: l?.id ?? null, listing_title: l?.title ?? null, message: rMessage, status: 'pending' }, `Demande de réservation${l?.title ? `, ${l.title}` : ''}`)
                done()
              }}
            >
              Envoyer la demande
            </Button>
          </div>
        </div>
      )}

      {view === 'annonce' && (
        <div className="stackv mt" style={{ gap: 10 }}>
          {myListings.length === 0 ? <p className="soft">Tu n’as pas encore d’annonce active.</p> : myListings.map(l => (
            <button key={l.id} type="button" className="opt" onClick={() => {
              onSendRich('annonce', { listing_id: l.id, title: l.title, city: l.city, rent: l.rent, photo: l.photos?.[0] ?? null }, `Annonce partagée, ${l.title ?? 'Logement'}`)
              done()
            }}>
              <b style={{ fontSize: 16 }}>{l.title ?? 'Logement'}</b>
              <span>{l.city}{l.rent ? `, ${eur(l.rent)} par mois` : ''}</span>
            </button>
          ))}
        </div>
      )}

      {view === 'document' && (
        <div className="stackv mt" style={{ gap: 10 }}>
          {docs.length === 0 ? <p className="soft">Aucun document dans ton dossier.</p> : docs.map(d => (
            <button key={d.id} type="button" className="opt" style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => {
              onSendRich('document', { name: DOC_LABELS[d.type] ?? d.type, url: d.file_url }, `Document envoyé, ${DOC_LABELS[d.type] ?? d.type}`)
              done()
            }}>
              <span className="ico"><Icon name="doc" size={18} /></span>
              <b style={{ fontSize: 15 }}>{DOC_LABELS[d.type] ?? d.type}</b>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
