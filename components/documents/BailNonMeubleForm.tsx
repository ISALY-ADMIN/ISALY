'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  start_date: string
  tenant_id: string | null
}

interface Member { id: string; name: string }

export interface BailNonMeubleData {
  // Section 1 — Parties
  bailleurNomPrenom: string
  bailleurDomicile: string
  bailleurQualite: 'Personne physique' | 'Personne morale'
  bailleurSocieteCivileFamiliale: boolean
  bailleurEmail: string
  mandataireActif: boolean
  mandataireNom: string
  mandataireAdresse: string
  mandataireActivite: string
  mandataireNumCarte: string
  garantNom: string
  garantAdresse: string
  locataire1Nom: string
  locataire1Email: string
  locataire2Actif: boolean
  locataire2Nom: string
  locataire2Email: string

  // Section 2 — Logement
  adresse: string
  batiment: string
  identifiantFiscal: string
  typeImmeuble: 'Collectif' | 'Individuel'
  regimeJuridique: 'Mono-propriété' | 'Copropriété'
  periodeConstruction: string
  surfaceHabitable: string
  nbPiecesPrincipales: string
  autresParties: string[]
  autrePartieTexte: string
  equipements: string[]
  equipementSanitaireTexte: string
  equipementAutreTexte: string
  chauffageType: 'Individuel' | 'Collectif'
  chauffageModalites: string
  eauChaudeType: 'Individuel' | 'Collectif'
  eauChaudeModalites: string
  dpe: string
  destination: 'Habitation' | 'Usage mixte'
  locauxPrivatifs: string[]
  locauxPrivatifsNumeros: string
  locauxPrivatifsAutreTexte: string
  locauxCommuns: string[]
  locauxCommunsAutreTexte: string
  equipementTic: string

  // Section 3 — Durée
  dateEffet: string
  dureeType: '3 ans (personne physique)' | '6 ans (personne morale)' | 'Durée réduite'
  dureeReduiteAnnees: string
  dureeReduiteEvenement: string

  // Section 4 — Conditions financières
  loyerMensuel: string
  zoneTendue: boolean
  soumisDecretEncadrement: boolean
  loyerReference: string
  loyerReferenceMajore: string
  complementLoyerActif: boolean
  complementLoyerMontant: string
  complementLoyerJustification: string
  precedentLocataireMoins18Mois: boolean
  dernierLoyerMontant: string
  dernierLoyerDateVersement: string
  derniereRevisionDate: string
  revisionDateAnnuelle: string
  revisionTrimestreIRL: string
  chargesModalite: 'Provisions avec régularisation' | 'Paiement périodique sans provision' | 'Forfait (colocation)'
  chargesMontant: string
  contributionPartageActif: boolean
  contributionPartageMontant: string
  contributionPartageDuree: string
  contributionPartageJustification: string
  assuranceCompteColocatairesActif: boolean
  assuranceAnnuelle: string
  jourExigibilite: string

  // Section 5 — Travaux
  travauxAmeliorationTexte: string
  travauxAmeliorationMontant: string
  majorationTravauxNature: string
  majorationTravauxMontant: string
  diminutionTravauxNature: string
  diminutionTravauxMontant: string
  diminutionTravauxDuree: string

  // Section 6 — Garanties
  depotGarantie: string
  depotGarantieLettres: string

  // Section 7 — Honoraires
  honorairesPlafondVisiteDossierRedaction: string
  honorairesPlafondEtatLieux: string
  honorairesBailleurDetail: string
  honorairesLocataireDetail: string

  // Section 8 — Conditions particulières
  conditionsParticulieres: string

  // Section 9 — Annexes
  annexes: string[]
}

export function emptyBailNonMeubleData(): BailNonMeubleData {
  return {
    bailleurNomPrenom: '', bailleurDomicile: '', bailleurQualite: 'Personne physique', bailleurSocieteCivileFamiliale: false, bailleurEmail: '',
    mandataireActif: false, mandataireNom: '', mandataireAdresse: '', mandataireActivite: '', mandataireNumCarte: '',
    garantNom: '', garantAdresse: '',
    locataire1Nom: '', locataire1Email: '', locataire2Actif: false, locataire2Nom: '', locataire2Email: '',

    adresse: '', batiment: '', identifiantFiscal: '', typeImmeuble: 'Collectif', regimeJuridique: 'Copropriété',
    periodeConstruction: '1975-1989', surfaceHabitable: '', nbPiecesPrincipales: '',
    autresParties: [], autrePartieTexte: '', equipements: [], equipementSanitaireTexte: '', equipementAutreTexte: '',
    chauffageType: 'Individuel', chauffageModalites: '', eauChaudeType: 'Individuel', eauChaudeModalites: '',
    dpe: 'D', destination: 'Habitation',
    locauxPrivatifs: [], locauxPrivatifsNumeros: '', locauxPrivatifsAutreTexte: '',
    locauxCommuns: [], locauxCommunsAutreTexte: '', equipementTic: '',

    dateEffet: '', dureeType: '3 ans (personne physique)', dureeReduiteAnnees: '', dureeReduiteEvenement: '',

    loyerMensuel: '', zoneTendue: false, soumisDecretEncadrement: false, loyerReference: '', loyerReferenceMajore: '',
    complementLoyerActif: false, complementLoyerMontant: '', complementLoyerJustification: '',
    precedentLocataireMoins18Mois: false, dernierLoyerMontant: '', dernierLoyerDateVersement: '', derniereRevisionDate: '',
    revisionDateAnnuelle: '', revisionTrimestreIRL: '',
    chargesModalite: 'Provisions avec régularisation', chargesMontant: '',
    contributionPartageActif: false, contributionPartageMontant: '', contributionPartageDuree: '', contributionPartageJustification: '',
    assuranceCompteColocatairesActif: false, assuranceAnnuelle: '', jourExigibilite: '1er du mois',

    travauxAmeliorationTexte: '', travauxAmeliorationMontant: '', majorationTravauxNature: '', majorationTravauxMontant: '',
    diminutionTravauxNature: '', diminutionTravauxMontant: '', diminutionTravauxDuree: '',

    depotGarantie: '', depotGarantieLettres: '',

    honorairesPlafondVisiteDossierRedaction: '', honorairesPlafondEtatLieux: '', honorairesBailleurDetail: '', honorairesLocataireDetail: '',

    conditionsParticulieres: '',

    annexes: [],
  }
}

const PERIODE_OPTIONS = ['Avant 1949', '1949-1974', '1975-1989', '1989-2005', 'Depuis 2005']
const AUTRES_PARTIES_OPTIONS = ['Grenier', 'Comble', 'Terrasse', 'Balcon', 'Loggia', 'Jardin', 'Autre']
const EQUIPEMENTS_OPTIONS = ['Cuisine équipée', 'Installations sanitaires', 'Autre']
const DPE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const LOCAUX_PRIVATIFS_OPTIONS = ['Cave', 'Parking', 'Garage', 'Autre']
const LOCAUX_COMMUNS_OPTIONS = ['Garage à vélo', 'Ascenseur', 'Espaces verts', 'Aires de jeux', 'Laverie', 'Local poubelle', 'Gardiennage', 'Autre']
const ANNEXES_OPTIONS = ['Règlement de copropriété', 'Dossier diagnostic technique (DPE, plomb, amiante, électricité/gaz, risques naturels)', "Notice d'information droits/obligations", "État des lieux", 'Autorisation préalable', 'Références loyers voisinage']

const STEP_LABELS = [
  'Désignation des parties',
  'Le logement',
  'Durée du bail',
  'Conditions financières',
  'Travaux',
  'Garanties et clauses',
  'Honoraires de location',
  'Conditions particulières',
  'Annexes',
  'Signature électronique',
]
const TOTAL = STEP_LABELS.length

const inputCls = "w-full px-3.5 py-2.5 rounded-[9px] text-[13px] border outline-none"
const inputStyle = { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }
const labelCls = "block text-[11px] font-semibold mb-1"
const labelStyle = { color: '#6B7280' }

export interface SignerState {
  approved: boolean
  signed: boolean
  signedAt: string | null
}

function emptySignerState(): SignerState {
  return { approved: false, signed: false, signedAt: null }
}

export default function BailNonMeubleForm({ lease, members, onClose }: { lease: LeaseRow; members: Member[]; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [d, setD] = useState<BailNonMeubleData>(emptyBailNonMeubleData())

  const sigBailleur = useRef<SignatureCanvasHandle>(null)
  const sigLocataire1 = useRef<SignatureCanvasHandle>(null)
  const sigLocataire2 = useRef<SignatureCanvasHandle>(null)
  const [signerBailleur, setSignerBailleur] = useState<SignerState>(emptySignerState())
  const [signerLocataire1, setSignerLocataire1] = useState<SignerState>(emptySignerState())
  const [signerLocataire2, setSignerLocataire2] = useState<SignerState>(emptySignerState())
  const [signaturesValidated, setSignaturesValidated] = useState(false)

  const canValidateSignatures =
    signerBailleur.approved && signerBailleur.signed &&
    signerLocataire1.approved && signerLocataire1.signed &&
    (!d.locataire2Actif || (signerLocataire2.approved && signerLocataire2.signed))

  function handleValidateSignatures() {
    const now = new Date().toISOString()
    setSignerBailleur(s => ({ ...s, signedAt: now }))
    setSignerLocataire1(s => ({ ...s, signedAt: now }))
    if (d.locataire2Actif) setSignerLocataire2(s => ({ ...s, signedAt: now }))
    setSignaturesValidated(true)
  }

  useEffect(() => {
    async function prefill() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('first_name, last_name, city, email').eq('id', user.id).single()
      setD(f => ({
        ...f,
        bailleurNomPrenom: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : f.bailleurNomPrenom,
        bailleurDomicile: profile?.city ?? f.bailleurDomicile,
        bailleurEmail: profile?.email ?? f.bailleurEmail,
        adresse: `${lease.address}${lease.city ? `, ${lease.city}` : ''}`,
        loyerMensuel: String(lease.monthly_rent ?? ''),
        dateEffet: lease.start_date ?? f.dateEffet,
        locataire1Nom: members[0]?.name ?? f.locataire1Nom,
        locataire2Actif: members.length > 1,
        locataire2Nom: members[1]?.name ?? f.locataire2Nom,
      }))
    }
    prefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease.id])

  function upd<K extends keyof BailNonMeubleData>(key: K, value: BailNonMeubleData[K]) {
    setD(f => ({ ...f, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.82)' }}>
      <div className="bg-white rounded-[24px] w-full flex flex-col" style={{ padding: '32px 36px', boxShadow: '0 20px 60px rgba(0,0,0,.5)', maxWidth: '760px', maxHeight: '90vh' }}>
        <div className="flex justify-between items-start mb-3">
          <div className="text-[10.5px] font-extrabold uppercase" style={{ letterSpacing: '2px', color: '#2AA87C' }}>ÉTAPE {step} / {TOTAL}</div>
          <button onClick={onClose} className="text-[18px] cursor-pointer border-none bg-transparent leading-none" style={{ color: '#9CA3AF' }}>✕</button>
        </div>

        <div className="flex gap-1 mb-3.5">
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300" style={{ background: i < step ? '#4ECBA0' : '#E5E7EB' }} />
          ))}
        </div>

        <h2 className="text-[22px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>{STEP_LABELS[step - 1]}</h2>

        <div className="overflow-y-auto flex-1" style={{ paddingRight: '4px' }}>
          {step === 1 && <Step1 d={d} upd={upd} />}
          {step === 2 && <Step2 d={d} upd={upd} />}
          {step === 3 && <Step3 d={d} upd={upd} />}
          {step === 4 && <Step4 d={d} upd={upd} />}
          {step === 5 && <Step5 d={d} upd={upd} />}
          {step === 6 && <Step6 d={d} upd={upd} />}
          {step === 7 && <Step7 d={d} upd={upd} />}
          {step === 8 && <Step8 d={d} upd={upd} />}
          {step === 9 && <Step9 d={d} upd={upd} />}
          {step === 10 && (
            <SignatureStep
              d={d}
              members={members}
              sigBailleur={sigBailleur}
              sigLocataire1={sigLocataire1}
              sigLocataire2={sigLocataire2}
              signerBailleur={signerBailleur} setSignerBailleur={setSignerBailleur}
              signerLocataire1={signerLocataire1} setSignerLocataire1={setSignerLocataire1}
              signerLocataire2={signerLocataire2} setSignerLocataire2={setSignerLocataire2}
              signaturesValidated={signaturesValidated}
            />
          )}
        </div>

        <div className="flex gap-2.5 mt-5">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-full text-[13.5px] font-semibold border-[1.5px] cursor-pointer bg-transparent" style={{ borderColor: '#E5E7EB', color: '#374151' }}>
              ← Précédent
            </button>
          )}
          {step < TOTAL && (
            <button onClick={() => setStep(s => s + 1)} className="py-3 rounded-full text-[13.5px] font-semibold text-white border-none cursor-pointer" style={{ background: '#4ECBA0', flex: step > 1 ? 2 : 1 }}>
              Suivant →
            </button>
          )}
          {step === TOTAL && !signaturesValidated && (
            <button
              onClick={handleValidateSignatures}
              disabled={!canValidateSignatures}
              className="py-3 rounded-full text-[13.5px] font-semibold text-white border-none cursor-pointer disabled:opacity-40"
              style={{ background: '#4ECBA0', flex: 2 }}
            >
              Valider les signatures
            </button>
          )}
          {step === TOTAL && signaturesValidated && (
            <div className="flex-1 py-3 rounded-full text-[13.5px] font-semibold text-center" style={{ background: '#ECFDF5', color: '#2AA87C', flex: 2 }}>
              ✓ Signatures validées
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type Upd = <K extends keyof BailNonMeubleData>(key: K, value: BailNonMeubleData[K]) => void

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[12.5px] font-bold mb-2.5" style={{ color: '#111827' }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer mb-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: '#4ECBA0', width: 16, height: 16 }} />
      <span className="text-[12.5px] font-semibold" style={{ color: '#374151' }}>{label}</span>
    </label>
  )
}

function PillGroup({ options, value, onChange, multi }: { options: string[]; value: string | string[]; onChange: (v: never) => void; multi?: boolean }) {
  function isActive(opt: string) { return multi ? (value as string[]).includes(opt) : value === opt }
  function handleClick(opt: string) {
    if (multi) {
      const arr = value as string[]
      onChange((arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt]) as never)
    } else {
      onChange(opt as never)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => handleClick(opt)}
          className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
          style={isActive(opt) ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' } : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}
        >
          {isActive(opt) ? '✓ ' : ''}{opt}
        </button>
      ))}
    </div>
  )
}

function Step1({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <>
      <Section title="Bailleur">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Nom/prénom ou dénomination"><input className={inputCls} style={inputStyle} value={d.bailleurNomPrenom} onChange={e => upd('bailleurNomPrenom', e.target.value)} /></Field>
          <Field label="Domicile / siège social"><input className={inputCls} style={inputStyle} value={d.bailleurDomicile} onChange={e => upd('bailleurDomicile', e.target.value)} /></Field>
          <Field label="Email (facultatif)"><input className={inputCls} style={inputStyle} value={d.bailleurEmail} onChange={e => upd('bailleurEmail', e.target.value)} /></Field>
          <Field label="Qualité">
            <PillGroup options={['Personne physique', 'Personne morale']} value={d.bailleurQualite} onChange={v => upd('bailleurQualite', v)} />
          </Field>
        </div>
        {d.bailleurQualite === 'Personne morale' && (
          <CheckRow checked={d.bailleurSocieteCivileFamiliale} onChange={v => upd('bailleurSocieteCivileFamiliale', v)} label="Société civile entre parents jusqu'au 4e degré" />
        )}
      </Section>

      <Section title="Mandataire">
        <CheckRow checked={d.mandataireActif} onChange={v => upd('mandataireActif', v)} label="Un mandataire est impliqué" />
        {d.mandataireActif && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom / raison sociale"><input className={inputCls} style={inputStyle} value={d.mandataireNom} onChange={e => upd('mandataireNom', e.target.value)} /></Field>
            <Field label="Adresse"><input className={inputCls} style={inputStyle} value={d.mandataireAdresse} onChange={e => upd('mandataireAdresse', e.target.value)} /></Field>
            <Field label="Activité"><input className={inputCls} style={inputStyle} value={d.mandataireActivite} onChange={e => upd('mandataireActivite', e.target.value)} /></Field>
            <Field label="N° carte professionnelle"><input className={inputCls} style={inputStyle} value={d.mandataireNumCarte} onChange={e => upd('mandataireNumCarte', e.target.value)} /></Field>
          </div>
        )}
      </Section>

      <Section title="Garant (optionnel)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom"><input className={inputCls} style={inputStyle} value={d.garantNom} onChange={e => upd('garantNom', e.target.value)} /></Field>
          <Field label="Adresse"><input className={inputCls} style={inputStyle} value={d.garantAdresse} onChange={e => upd('garantAdresse', e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Locataire(s)">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Nom/prénom locataire 1"><input className={inputCls} style={inputStyle} value={d.locataire1Nom} onChange={e => upd('locataire1Nom', e.target.value)} /></Field>
          <Field label="Email locataire 1 (facultatif)"><input className={inputCls} style={inputStyle} value={d.locataire1Email} onChange={e => upd('locataire1Email', e.target.value)} /></Field>
        </div>
        <CheckRow checked={d.locataire2Actif} onChange={v => upd('locataire2Actif', v)} label="Second locataire" />
        {d.locataire2Actif && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom/prénom locataire 2"><input className={inputCls} style={inputStyle} value={d.locataire2Nom} onChange={e => upd('locataire2Nom', e.target.value)} /></Field>
            <Field label="Email locataire 2 (facultatif)"><input className={inputCls} style={inputStyle} value={d.locataire2Email} onChange={e => upd('locataire2Email', e.target.value)} /></Field>
          </div>
        )}
      </Section>
    </>
  )
}

function Step2({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <>
      <Section title="Adresse et localisation">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Adresse"><input className={inputCls} style={inputStyle} value={d.adresse} onChange={e => upd('adresse', e.target.value)} /></Field>
          <Field label="Bâtiment / escalier / étage / porte"><input className={inputCls} style={inputStyle} value={d.batiment} onChange={e => upd('batiment', e.target.value)} /></Field>
          <Field label="Identifiant fiscal (optionnel)"><input className={inputCls} style={inputStyle} value={d.identifiantFiscal} onChange={e => upd('identifiantFiscal', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type d'immeuble"><PillGroup options={['Collectif', 'Individuel']} value={d.typeImmeuble} onChange={v => upd('typeImmeuble', v)} /></Field>
          <Field label="Régime juridique"><PillGroup options={['Mono-propriété', 'Copropriété']} value={d.regimeJuridique} onChange={v => upd('regimeJuridique', v)} /></Field>
        </div>
      </Section>

      <Section title="Caractéristiques">
        <Field label="Période de construction"><PillGroup options={PERIODE_OPTIONS} value={d.periodeConstruction} onChange={v => upd('periodeConstruction', v)} /></Field>
        <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
          <Field label="Surface habitable (m²)"><input className={inputCls} style={inputStyle} value={d.surfaceHabitable} onChange={e => upd('surfaceHabitable', e.target.value)} /></Field>
          <Field label="Nombre de pièces principales"><input className={inputCls} style={inputStyle} value={d.nbPiecesPrincipales} onChange={e => upd('nbPiecesPrincipales', e.target.value)} /></Field>
        </div>
        <Field label="Autres parties du logement"><PillGroup multi options={AUTRES_PARTIES_OPTIONS} value={d.autresParties} onChange={v => upd('autresParties', v)} /></Field>
        {d.autresParties.includes('Autre') && (
          <div className="mt-2"><input className={inputCls} style={inputStyle} placeholder="Préciser" value={d.autrePartieTexte} onChange={e => upd('autrePartieTexte', e.target.value)} /></div>
        )}
      </Section>

      <Section title="Équipements">
        <PillGroup multi options={EQUIPEMENTS_OPTIONS} value={d.equipements} onChange={v => upd('equipements', v)} />
        {d.equipements.includes('Installations sanitaires') && (
          <div className="mt-2"><input className={inputCls} style={inputStyle} placeholder="Préciser les installations sanitaires" value={d.equipementSanitaireTexte} onChange={e => upd('equipementSanitaireTexte', e.target.value)} /></div>
        )}
        {d.equipements.includes('Autre') && (
          <div className="mt-2"><input className={inputCls} style={inputStyle} placeholder="Préciser" value={d.equipementAutreTexte} onChange={e => upd('equipementAutreTexte', e.target.value)} /></div>
        )}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Chauffage">
            <PillGroup options={['Individuel', 'Collectif']} value={d.chauffageType} onChange={v => upd('chauffageType', v)} />
            {d.chauffageType === 'Collectif' && <input className={`${inputCls} mt-2`} style={inputStyle} placeholder="Modalités de répartition" value={d.chauffageModalites} onChange={e => upd('chauffageModalites', e.target.value)} />}
          </Field>
          <Field label="Eau chaude">
            <PillGroup options={['Individuel', 'Collectif']} value={d.eauChaudeType} onChange={v => upd('eauChaudeType', v)} />
            {d.eauChaudeType === 'Collectif' && <input className={`${inputCls} mt-2`} style={inputStyle} placeholder="Modalités de répartition" value={d.eauChaudeModalites} onChange={e => upd('eauChaudeModalites', e.target.value)} />}
          </Field>
        </div>
      </Section>

      <Section title="Performance et destination">
        <div className="grid grid-cols-2 gap-3">
          <Field label="DPE"><PillGroup options={DPE_OPTIONS} value={d.dpe} onChange={v => upd('dpe', v)} /></Field>
          <Field label="Destination des locaux"><PillGroup options={['Habitation', 'Usage mixte']} value={d.destination} onChange={v => upd('destination', v)} /></Field>
        </div>
      </Section>

      <Section title="Locaux privatifs accessoires">
        <PillGroup multi options={LOCAUX_PRIVATIFS_OPTIONS} value={d.locauxPrivatifs} onChange={v => upd('locauxPrivatifs', v)} />
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(d.locauxPrivatifs.includes('Parking') || d.locauxPrivatifs.includes('Garage')) && (
            <input className={inputCls} style={inputStyle} placeholder="Numéros" value={d.locauxPrivatifsNumeros} onChange={e => upd('locauxPrivatifsNumeros', e.target.value)} />
          )}
          {d.locauxPrivatifs.includes('Autre') && (
            <input className={inputCls} style={inputStyle} placeholder="Préciser" value={d.locauxPrivatifsAutreTexte} onChange={e => upd('locauxPrivatifsAutreTexte', e.target.value)} />
          )}
        </div>
      </Section>

      <Section title="Locaux communs">
        <PillGroup multi options={LOCAUX_COMMUNS_OPTIONS} value={d.locauxCommuns} onChange={v => upd('locauxCommuns', v)} />
        {d.locauxCommuns.includes('Autre') && (
          <div className="mt-2"><input className={inputCls} style={inputStyle} placeholder="Préciser" value={d.locauxCommunsAutreTexte} onChange={e => upd('locauxCommunsAutreTexte', e.target.value)} /></div>
        )}
      </Section>

      <Section title="Équipement TIC">
        <input className={inputCls} style={inputStyle} placeholder="Fibre, ADSL, antenne collective…" value={d.equipementTic} onChange={e => upd('equipementTic', e.target.value)} />
      </Section>
    </>
  )
}

function Step3({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <Section title="Durée du contrat">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Date de prise d'effet"><input type="date" className={inputCls} style={inputStyle} value={d.dateEffet} onChange={e => upd('dateEffet', e.target.value)} /></Field>
        <Field label="Durée">
          <PillGroup options={['3 ans (personne physique)', '6 ans (personne morale)', 'Durée réduite']} value={d.dureeType} onChange={v => upd('dureeType', v)} />
        </Field>
      </div>
      {d.dureeType === 'Durée réduite' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre d'années"><input className={inputCls} style={inputStyle} value={d.dureeReduiteAnnees} onChange={e => upd('dureeReduiteAnnees', e.target.value)} /></Field>
          <Field label="Événement justificatif"><input className={inputCls} style={inputStyle} value={d.dureeReduiteEvenement} onChange={e => upd('dureeReduiteEvenement', e.target.value)} /></Field>
        </div>
      )}
    </Section>
  )
}

function Step4({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  const assuranceMensuelle = d.assuranceAnnuelle ? (parseFloat(d.assuranceAnnuelle) / 12).toFixed(2) : '0.00'
  const totalMensuel = (
    (parseFloat(d.loyerMensuel) || 0) +
    (parseFloat(d.chargesMontant) || 0) +
    (parseFloat(d.contributionPartageMontant) || 0) +
    (d.assuranceCompteColocatairesActif ? parseFloat(assuranceMensuelle) || 0 : 0)
  ).toFixed(2)

  return (
    <>
      <Section title="Loyer et zone tendue">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Montant du loyer mensuel (€)"><input className={inputCls} style={inputStyle} value={d.loyerMensuel} onChange={e => upd('loyerMensuel', e.target.value)} /></Field>
          <Field label="Zone tendue"><PillGroup options={['Oui', 'Non']} value={d.zoneTendue ? 'Oui' : 'Non'} onChange={v => upd('zoneTendue', v === 'Oui')} /></Field>
        </div>
        {d.zoneTendue && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Soumis au décret encadrement"><PillGroup options={['Oui', 'Non']} value={d.soumisDecretEncadrement ? 'Oui' : 'Non'} onChange={v => upd('soumisDecretEncadrement', v === 'Oui')} /></Field>
            <Field label="Loyer de référence (€/m²)"><input className={inputCls} style={inputStyle} value={d.loyerReference} onChange={e => upd('loyerReference', e.target.value)} /></Field>
            <Field label="Loyer de référence majoré (€/m²)"><input className={inputCls} style={inputStyle} value={d.loyerReferenceMajore} onChange={e => upd('loyerReferenceMajore', e.target.value)} /></Field>
            <Field label="Complément de loyer">
              <PillGroup options={['Oui', 'Non']} value={d.complementLoyerActif ? 'Oui' : 'Non'} onChange={v => upd('complementLoyerActif', v === 'Oui')} />
            </Field>
            {d.complementLoyerActif && (
              <>
                <Field label="Montant du complément (€)"><input className={inputCls} style={inputStyle} value={d.complementLoyerMontant} onChange={e => upd('complementLoyerMontant', e.target.value)} /></Field>
                <Field label="Justification"><input className={inputCls} style={inputStyle} value={d.complementLoyerJustification} onChange={e => upd('complementLoyerJustification', e.target.value)} /></Field>
              </>
            )}
          </div>
        )}
      </Section>

      <Section title="Informations sur le précédent locataire">
        <CheckRow checked={d.precedentLocataireMoins18Mois} onChange={v => upd('precedentLocataireMoins18Mois', v)} label="Précédent locataire parti il y a moins de 18 mois" />
        {d.precedentLocataireMoins18Mois && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Montant dernier loyer (€)"><input className={inputCls} style={inputStyle} value={d.dernierLoyerMontant} onChange={e => upd('dernierLoyerMontant', e.target.value)} /></Field>
            <Field label="Date de versement"><input type="date" className={inputCls} style={inputStyle} value={d.dernierLoyerDateVersement} onChange={e => upd('dernierLoyerDateVersement', e.target.value)} /></Field>
            <Field label="Date dernière révision"><input type="date" className={inputCls} style={inputStyle} value={d.derniereRevisionDate} onChange={e => upd('derniereRevisionDate', e.target.value)} /></Field>
          </div>
        )}
      </Section>

      <Section title="Révision du loyer">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date annuelle de révision"><input className={inputCls} style={inputStyle} placeholder="Ex: 1er janvier" value={d.revisionDateAnnuelle} onChange={e => upd('revisionDateAnnuelle', e.target.value)} /></Field>
          <Field label="Trimestre de référence IRL"><input className={inputCls} style={inputStyle} placeholder="Ex: T2" value={d.revisionTrimestreIRL} onChange={e => upd('revisionTrimestreIRL', e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Charges récupérables">
        <Field label="Modalité">
          <PillGroup options={['Provisions avec régularisation', 'Paiement périodique sans provision', 'Forfait (colocation)']} value={d.chargesModalite} onChange={v => upd('chargesModalite', v)} />
        </Field>
        <div className="mt-3"><Field label="Montant des charges (€)"><input className={inputCls} style={inputStyle} value={d.chargesMontant} onChange={e => upd('chargesMontant', e.target.value)} /></Field></div>
      </Section>

      <Section title="Contribution au partage des économies de charges">
        <CheckRow checked={d.contributionPartageActif} onChange={v => upd('contributionPartageActif', v)} label="Une contribution est due" />
        {d.contributionPartageActif && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant (€)"><input className={inputCls} style={inputStyle} value={d.contributionPartageMontant} onChange={e => upd('contributionPartageMontant', e.target.value)} /></Field>
            <Field label="Durée"><input className={inputCls} style={inputStyle} value={d.contributionPartageDuree} onChange={e => upd('contributionPartageDuree', e.target.value)} /></Field>
            <Field label="Justification des travaux"><input className={inputCls} style={inputStyle} value={d.contributionPartageJustification} onChange={e => upd('contributionPartageJustification', e.target.value)} /></Field>
          </div>
        )}
      </Section>

      <Section title="Assurance pour compte des colocataires">
        <CheckRow checked={d.assuranceCompteColocatairesActif} onChange={v => upd('assuranceCompteColocatairesActif', v)} label="Le bailleur souscrit une assurance pour le compte des colocataires" />
        {d.assuranceCompteColocatairesActif && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant annuel (€)"><input className={inputCls} style={inputStyle} value={d.assuranceAnnuelle} onChange={e => upd('assuranceAnnuelle', e.target.value)} /></Field>
            <Field label="Montant mensuel (calculé)"><div className={inputCls} style={{ ...inputStyle, color: '#2AA87C', fontWeight: 700 }}>{assuranceMensuelle} €</div></Field>
          </div>
        )}
      </Section>

      <Section title="Modalités de paiement">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jour d'exigibilité dans le mois"><input className={inputCls} style={inputStyle} value={d.jourExigibilite} onChange={e => upd('jourExigibilite', e.target.value)} /></Field>
          <Field label="Total mensuel (calculé)"><div className={inputCls} style={{ ...inputStyle, color: '#2AA87C', fontWeight: 700 }}>{totalMensuel} €</div></Field>
        </div>
      </Section>
    </>
  )
}

function Step5({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <>
      <Section title="Travaux d'amélioration récents (optionnel)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Description"><input className={inputCls} style={inputStyle} value={d.travauxAmeliorationTexte} onChange={e => upd('travauxAmeliorationTexte', e.target.value)} /></Field>
          <Field label="Montant (€)"><input className={inputCls} style={inputStyle} value={d.travauxAmeliorationMontant} onChange={e => upd('travauxAmeliorationMontant', e.target.value)} /></Field>
        </div>
      </Section>
      <Section title="Majoration de loyer suite à travaux du bailleur (optionnel)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nature des travaux"><input className={inputCls} style={inputStyle} value={d.majorationTravauxNature} onChange={e => upd('majorationTravauxNature', e.target.value)} /></Field>
          <Field label="Montant de la majoration (€)"><input className={inputCls} style={inputStyle} value={d.majorationTravauxMontant} onChange={e => upd('majorationTravauxMontant', e.target.value)} /></Field>
        </div>
      </Section>
      <Section title="Diminution de loyer suite à travaux du locataire (optionnel)">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Nature des travaux"><input className={inputCls} style={inputStyle} value={d.diminutionTravauxNature} onChange={e => upd('diminutionTravauxNature', e.target.value)} /></Field>
          <Field label="Montant de la diminution (€)"><input className={inputCls} style={inputStyle} value={d.diminutionTravauxMontant} onChange={e => upd('diminutionTravauxMontant', e.target.value)} /></Field>
          <Field label="Durée"><input className={inputCls} style={inputStyle} value={d.diminutionTravauxDuree} onChange={e => upd('diminutionTravauxDuree', e.target.value)} /></Field>
        </div>
      </Section>
    </>
  )
}

const CLAUSE_SOLIDARITE = `Les preneurs sont tenus solidairement et indivisiblement de l'exécution de toutes les conditions du présent bail et du paiement des loyers, charges et accessoires, y compris après le départ de l'un d'entre eux, jusqu'à l'expiration du bail.`
const CLAUSE_RESOLUTOIRE = `À défaut de paiement au terme convenu de l'une quelconque des échéances de loyer ou de charges, ou en cas de non-versement du dépôt de garantie, le présent bail sera résilié de plein droit, deux mois après une mise en demeure restée infructueuse, conformément à l'article 24 de la loi du 6 juillet 1989.`

function Step6({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <>
      <Section title="Dépôt de garantie">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (€)"><input className={inputCls} style={inputStyle} value={d.depotGarantie} onChange={e => upd('depotGarantie', e.target.value)} /></Field>
          <Field label="En toutes lettres (optionnel)"><input className={inputCls} style={inputStyle} placeholder="Ex: mille cinq cents euros" value={d.depotGarantieLettres} onChange={e => upd('depotGarantieLettres', e.target.value)} /></Field>
        </div>
      </Section>
      <Section title="Clauses légales">
        <div className="flex flex-col gap-2 text-[11.5px] p-3.5 rounded-[10px]" style={{ background: '#F9FAFB', color: '#6B7280', lineHeight: 1.6 }}>
          <p><strong style={{ color: '#374151' }}>Clause de solidarité —</strong> {CLAUSE_SOLIDARITE}</p>
          <p><strong style={{ color: '#374151' }}>Clause résolutoire —</strong> {CLAUSE_RESOLUTOIRE}</p>
        </div>
      </Section>
    </>
  )
}

function Step7({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  if (!d.mandataireActif) {
    return <p className="text-[12.5px]" style={{ color: '#9CA3AF' }}>Section disponible si un mandataire est impliqué dans la location (voir section 1).</p>
  }
  return (
    <>
      <Section title="Plafonds réglementaires (€/m²)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Visite / dossier / rédaction"><input className={inputCls} style={inputStyle} value={d.honorairesPlafondVisiteDossierRedaction} onChange={e => upd('honorairesPlafondVisiteDossierRedaction', e.target.value)} /></Field>
          <Field label="État des lieux"><input className={inputCls} style={inputStyle} value={d.honorairesPlafondEtatLieux} onChange={e => upd('honorairesPlafondEtatLieux', e.target.value)} /></Field>
        </div>
      </Section>
      <Section title="Détail des honoraires">
        <div className="grid grid-cols-2 gap-3">
          <Field label="À la charge du bailleur"><textarea className={inputCls} style={{ ...inputStyle, resize: 'vertical' as const }} rows={3} value={d.honorairesBailleurDetail} onChange={e => upd('honorairesBailleurDetail', e.target.value)} /></Field>
          <Field label="À la charge du locataire"><textarea className={inputCls} style={{ ...inputStyle, resize: 'vertical' as const }} rows={3} value={d.honorairesLocataireDetail} onChange={e => upd('honorairesLocataireDetail', e.target.value)} /></Field>
        </div>
      </Section>
    </>
  )
}

function Step8({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <Section title="Conditions particulières">
      <textarea className={inputCls} style={{ ...inputStyle, resize: 'vertical' as const }} rows={6} value={d.conditionsParticulieres} onChange={e => upd('conditionsParticulieres', e.target.value)} />
    </Section>
  )
}

function SignatureZone({
  label, sigRef, signer, setSigner,
}: {
  label: string
  sigRef: React.RefObject<SignatureCanvasHandle>
  signer: SignerState
  setSigner: React.Dispatch<React.SetStateAction<SignerState>>
}) {
  return (
    <div className="p-3.5 rounded-[12px]" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
      <label className="flex items-center gap-2 cursor-pointer mb-2.5">
        <input type="checkbox" checked={signer.approved} onChange={e => setSigner(s => ({ ...s, approved: e.target.checked }))} style={{ accentColor: '#4ECBA0', width: 16, height: 16 }} />
        <span className="text-[12px] font-semibold" style={{ color: '#374151' }}>Lu et approuvé</span>
      </label>
      <SignatureCanvas ref={sigRef} label={label} onChange={signed => setSigner(s => ({ ...s, signed }))} />
      {signer.signedAt && (
        <p className="text-[10.5px] mt-1.5" style={{ color: '#9CA3AF' }}>Signé le {new Date(signer.signedAt).toLocaleString('fr-FR')}</p>
      )}
    </div>
  )
}

function SignatureStep({
  d, members, sigBailleur, sigLocataire1, sigLocataire2,
  signerBailleur, setSignerBailleur, signerLocataire1, setSignerLocataire1, signerLocataire2, setSignerLocataire2,
  signaturesValidated,
}: {
  d: BailNonMeubleData
  members: Member[]
  sigBailleur: React.RefObject<SignatureCanvasHandle>
  sigLocataire1: React.RefObject<SignatureCanvasHandle>
  sigLocataire2: React.RefObject<SignatureCanvasHandle>
  signerBailleur: SignerState; setSignerBailleur: React.Dispatch<React.SetStateAction<SignerState>>
  signerLocataire1: SignerState; setSignerLocataire1: React.Dispatch<React.SetStateAction<SignerState>>
  signerLocataire2: SignerState; setSignerLocataire2: React.Dispatch<React.SetStateAction<SignerState>>
  signaturesValidated: boolean
}) {
  return (
    <Section title="Signatures électroniques">
      <fieldset disabled={signaturesValidated} className="grid grid-cols-2 gap-3">
        <SignatureZone label={`Bailleur — ${d.bailleurNomPrenom || 'à renseigner'}`} sigRef={sigBailleur} signer={signerBailleur} setSigner={setSignerBailleur} />
        <SignatureZone label={`Locataire — ${d.locataire1Nom || members[0]?.name || 'à renseigner'}`} sigRef={sigLocataire1} signer={signerLocataire1} setSigner={setSignerLocataire1} />
        {d.locataire2Actif && (
          <SignatureZone label={`Locataire — ${d.locataire2Nom || members[1]?.name || 'à renseigner'}`} sigRef={sigLocataire2} signer={signerLocataire2} setSigner={setSignerLocataire2} />
        )}
      </fieldset>
    </Section>
  )
}

function Step9({ d, upd }: { d: BailNonMeubleData; upd: Upd }) {
  return (
    <Section title="Annexes jointes au contrat">
      <div className="flex flex-col gap-2">
        {ANNEXES_OPTIONS.map(opt => (
          <CheckRow key={opt} checked={d.annexes.includes(opt)} onChange={() => upd('annexes', d.annexes.includes(opt) ? d.annexes.filter(v => v !== opt) : [...d.annexes, opt])} label={opt} />
        ))}
      </div>
    </Section>
  )
}
