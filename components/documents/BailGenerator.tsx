'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'
import { generateBailPdf, type BailFormData } from '@/lib/bailPdf'
import Emoji from '@/components/ui/Emoji'

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  start_date: string
  tenant_id: string | null
}

interface Member { id: string; name: string }

const EQUIPEMENTS_OPTIONS = ['Cuisine équipée', 'Installations sanitaires', 'Chauffage individuel', 'Chauffage collectif', 'Eau chaude']
const ANNEXES_OPTIONS = ['DPE', 'Notice d\'information', "État des lieux d'entrée", 'Règlement de copropriété', 'Attestation assurance']
const DUREE_OPTIONS = ['3 ans', '6 ans', 'Durée réduite']

function emptyForm(): BailFormData {
  return {
    bailleurNom: '', bailleurAdresse: '', locataireNoms: '', garantNom: '', mandataireNom: '',
    adresse: '', surface: '', nbPieces: '', periodeConstruction: '', equipements: [], dpe: '',
    dateEffet: '', duree: '3 ans', evenementJustificatif: '',
    loyerMensuel: '', chargesType: 'Provisions sur charges', chargesMontant: '', depotGarantie: '', dateExigibilite: '1er du mois', zoneTendue: 'Non', loyerReference: '',
    travaux: '', conditionsParticulieres: '', annexes: [],
  }
}

export default function BailGenerator({ lease, members }: { lease: LeaseRow; members: Member[] }) {
  const [form, setForm] = useState<BailFormData>(emptyForm())
  const [selectedTenantId, setSelectedTenantId] = useState(members[0]?.id ?? '')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const sigBailleur = useRef<SignatureCanvasHandle>(null)
  const sigLocataire = useRef<SignatureCanvasHandle>(null)

  useEffect(() => {
    async function prefill() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('first_name, last_name, city').eq('id', user.id).single()
      setForm(f => ({
        ...f,
        bailleurNom: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : f.bailleurNom,
        bailleurAdresse: profile?.city ?? f.bailleurAdresse,
        locataireNoms: members.map(m => m.name).join(', '),
        adresse: `${lease.address}${lease.city ? `, ${lease.city}` : ''}`,
        loyerMensuel: String(lease.monthly_rent ?? ''),
        dateEffet: lease.start_date ?? f.dateEffet,
      }))
    }
    prefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease.id])

  function update<K extends keyof BailFormData>(key: K, value: BailFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleArrayValue(key: 'equipements' | 'annexes', value: string) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }))
  }

  function handleGeneratePdf() {
    const doc = generateBailPdf(form, {
      bailleur: sigBailleur.current?.toDataURL() ?? null,
      locataire: sigLocataire.current?.toDataURL() ?? null,
    })
    doc.save(`bail-${lease.address.replace(/\s/g, '_')}.pdf`)
  }

  async function handleSendForSignature() {
    if (!selectedTenantId) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/documents/send-for-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: lease.id,
          tenant_id: selectedTenantId,
          bail_data: form,
          owner_signature: sigBailleur.current?.toDataURL() ?? null,
        }),
      })
      const json = await res.json()
      if (res.ok) setSendResult('✓ Email envoyé au locataire pour signature.')
      else setSendResult(`Erreur : ${json.error}`)
    } catch {
      setSendResult('Erreur lors de l\'envoi.')
    }
    setSending(false)
  }

  const inputCls = "w-full px-3.5 py-2 rounded-[10px] text-[13px] border outline-none"
  const inputStyle = { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }
  const labelCls = "block text-[11px] font-extrabold uppercase tracking-wider mb-1.5"
  const labelStyle = { color: '#6B7280' }

  return (
    <div className="mb-8">
      <h3 className="text-[16px] font-bold mb-1" style={{ color: '#fff' }}><Emoji native="📝" /> Créer un contrat de bail</h3>
      <p className="text-[12.5px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Logement non meublé — Loi n°89-462 du 6 juillet 1989</p>

      <div className="rounded-[16px] p-5 flex flex-col gap-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>

        {/* I. Parties */}
        <Section title="I. Désignation des parties">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bailleur"><input className={inputCls} style={inputStyle} value={form.bailleurNom} onChange={e => update('bailleurNom', e.target.value)} /></Field>
            <Field label="Adresse du bailleur"><input className={inputCls} style={inputStyle} value={form.bailleurAdresse} onChange={e => update('bailleurAdresse', e.target.value)} /></Field>
            <Field label="Locataire(s)"><input className={inputCls} style={inputStyle} value={form.locataireNoms} onChange={e => update('locataireNoms', e.target.value)} /></Field>
            <Field label="Garant (optionnel)"><input className={inputCls} style={inputStyle} value={form.garantNom} onChange={e => update('garantNom', e.target.value)} /></Field>
            <Field label="Mandataire (optionnel)"><input className={inputCls} style={inputStyle} value={form.mandataireNom} onChange={e => update('mandataireNom', e.target.value)} /></Field>
          </div>
        </Section>

        {/* II. Objet */}
        <Section title="II. Objet du contrat">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Adresse du logement"><input className={inputCls} style={inputStyle} value={form.adresse} onChange={e => update('adresse', e.target.value)} /></Field>
            <Field label="Surface (m²)"><input className={inputCls} style={inputStyle} value={form.surface} onChange={e => update('surface', e.target.value)} /></Field>
            <Field label="Nombre de pièces"><input className={inputCls} style={inputStyle} value={form.nbPieces} onChange={e => update('nbPieces', e.target.value)} /></Field>
            <Field label="Période de construction"><input className={inputCls} style={inputStyle} placeholder="Avant 1949, 1949-2000…" value={form.periodeConstruction} onChange={e => update('periodeConstruction', e.target.value)} /></Field>
            <Field label="DPE"><input className={inputCls} style={inputStyle} placeholder="Ex: D — 210 kWh/m²/an" value={form.dpe} onChange={e => update('dpe', e.target.value)} /></Field>
          </div>
          <span className={labelCls} style={labelStyle}>Équipements</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPEMENTS_OPTIONS.map(opt => (
              <Checkbox key={opt} checked={form.equipements.includes(opt)} onChange={() => toggleArrayValue('equipements', opt)} label={opt} />
            ))}
          </div>
        </Section>

        {/* III. Durée */}
        <Section title="III. Durée">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de prise d'effet"><input type="date" className={inputCls} style={inputStyle} value={form.dateEffet} onChange={e => update('dateEffet', e.target.value)} /></Field>
            <Field label="Durée">
              <select className={inputCls} style={inputStyle} value={form.duree} onChange={e => update('duree', e.target.value)}>
                {DUREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            {form.duree === 'Durée réduite' && (
              <Field label="Événement justificatif"><input className={inputCls} style={inputStyle} value={form.evenementJustificatif} onChange={e => update('evenementJustificatif', e.target.value)} /></Field>
            )}
          </div>
        </Section>

        {/* IV. Conditions financières */}
        <Section title="IV. Conditions financières">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Loyer mensuel (€)"><input className={inputCls} style={inputStyle} value={form.loyerMensuel} onChange={e => update('loyerMensuel', e.target.value)} /></Field>
            <Field label="Dépôt de garantie (€)"><input className={inputCls} style={inputStyle} value={form.depotGarantie} onChange={e => update('depotGarantie', e.target.value)} /></Field>
            <Field label="Charges">
              <select className={inputCls} style={inputStyle} value={form.chargesType} onChange={e => update('chargesType', e.target.value)}>
                <option>Provisions sur charges</option>
                <option>Forfait de charges</option>
                <option>Sans provision</option>
              </select>
            </Field>
            <Field label="Montant des charges (€)"><input className={inputCls} style={inputStyle} value={form.chargesMontant} onChange={e => update('chargesMontant', e.target.value)} /></Field>
            <Field label="Date d'exigibilité"><input className={inputCls} style={inputStyle} value={form.dateExigibilite} onChange={e => update('dateExigibilite', e.target.value)} /></Field>
            <Field label="Zone tendue">
              <select className={inputCls} style={inputStyle} value={form.zoneTendue} onChange={e => update('zoneTendue', e.target.value)}>
                <option>Non</option>
                <option>Oui</option>
              </select>
            </Field>
            {form.zoneTendue === 'Oui' && (
              <Field label="Loyer de référence (€)"><input className={inputCls} style={inputStyle} value={form.loyerReference} onChange={e => update('loyerReference', e.target.value)} /></Field>
            )}
          </div>
        </Section>

        {/* V. Travaux */}
        <Section title="V. Travaux (optionnel)">
          <textarea className={inputCls} style={{ ...inputStyle, resize: 'vertical' as const }} rows={2} value={form.travaux} onChange={e => update('travaux', e.target.value)} />
        </Section>

        {/* VII-IX. Clauses légales fixes */}
        <Section title="VII–IX. Clauses légales">
          <div className="flex flex-col gap-2 text-[11.5px]" style={{ color: '#6B7280', lineHeight: 1.6 }}>
            <p><strong style={{ color: '#374151' }}>Solidarité —</strong> Les preneurs sont tenus solidairement et indivisiblement de l&apos;exécution de toutes les conditions du présent bail.</p>
            <p><strong style={{ color: '#374151' }}>Clause résolutoire —</strong> À défaut de paiement, le bail sera résilié de plein droit conformément à l&apos;article 24 de la loi du 6 juillet 1989.</p>
            <p><strong style={{ color: '#374151' }}>Honoraires —</strong> Répartis conformément aux dispositions réglementaires en vigueur (article 5 de la loi du 6 juillet 1989).</p>
          </div>
        </Section>

        {/* X. Conditions particulières */}
        <Section title="X. Conditions particulières">
          <textarea className={inputCls} style={{ ...inputStyle, resize: 'vertical' as const }} rows={3} value={form.conditionsParticulieres} onChange={e => update('conditionsParticulieres', e.target.value)} />
        </Section>

        {/* XI. Annexes */}
        <Section title="XI. Annexes">
          <div className="flex flex-wrap gap-2">
            {ANNEXES_OPTIONS.map(opt => (
              <Checkbox key={opt} checked={form.annexes.includes(opt)} onChange={() => toggleArrayValue('annexes', opt)} label={opt} />
            ))}
          </div>
        </Section>

        {/* Signatures */}
        <Section title="Signatures électroniques">
          <div className="grid grid-cols-2 gap-4">
            <SignatureCanvas ref={sigBailleur} label="Bailleur" />
            <SignatureCanvas ref={sigLocataire} label="Locataire (si signature en personne)" />
          </div>
        </Section>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={handleGeneratePdf}
            className="w-full py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
          >
            <Emoji native="📄" /> Générer le PDF
          </button>

          {members.length > 0 && (
            <div className="flex items-center gap-2">
              {members.length > 1 && (
                <select className={inputCls} style={{ ...inputStyle, flex: 1 }} value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)}>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              <button
                onClick={handleSendForSignature}
                disabled={sending}
                className="flex-shrink-0 px-5 py-2.5 rounded-full text-[12.5px] font-bold border cursor-pointer disabled:opacity-50"
                style={{ background: '#FFFFFF', borderColor: '#4ECBA0', color: '#2AA87C' }}
              >
                {sending ? 'Envoi…' : <><Emoji native="✉️" /> Envoyer pour signature</>}
              </button>
            </div>
          )}
          {sendResult && <p className="text-[12px]" style={{ color: sendResult.startsWith('✓') ? '#2AA87C' : '#EF4444' }}>{sendResult}</p>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12.5px] font-bold mb-2.5" style={{ color: '#111827' }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: '#6B7280' }}>{label}</label>
      {children}
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
      style={checked ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' } : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}
    >
      {checked ? '✓ ' : ''}{label}
    </button>
  )
}
