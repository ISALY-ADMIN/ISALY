'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_TOTAL_STEPS, type MatchingData } from '@/lib/matching'
import { ROLE_CHOICES } from '@/lib/roles'
import { Icon, Logo, NNBSP, eur, type IconName } from '@/components/ui-v2'
import { SiteRoot } from '@/components/ui-v2/public'
import { CompatTest, CompatResult } from '@/components/ui-v2/test/CompatTest'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  role: string
  first_name: string; last_name: string; age: string
  city: string; profession: string; status: string
  budget_min: number; budget_max: number
  move_in: string; duration: string; zones: string[]
  quiz_answers: Record<string, number>
  // ── Branche loueur (role = 'loueur') ──
  // Ces trois réponses remplacent entièrement l'étape « Ta recherche » et le
  // test de compatibilité, qui n'ont aucun sens pour quelqu'un qui loue un bien.
  owner_timing: string
  owner_cities: string[]
  owner_property_type: string
}

const DEFAULT: OnboardingData = {
  role: '',
  first_name: '', last_name: '', age: '', city: '', profession: '', status: '',
  budget_min: 400, budget_max: 1000,
  move_in: '', duration: '', zones: [],
  quiz_answers: {},
  owner_timing: '', owner_cities: [], owner_property_type: '',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = ['Étudiant', 'Salarié CDI', 'Salarié CDD', 'Freelance', 'Auto-entrepreneur', 'Autre']

// Étapes enregistrées (profiles.onboarding_step) : inchangées. Un locataire en
// a 3 (qui es-tu, recherche, test), un loueur 2 (qui es-tu, projet).
// stepCountFor() borne la reprise d'un brouillon selon le rôle.
const STEP_COUNT_LOCATAIRE = 3
const STEP_COUNT_LOUEUR = 2

const OWNER_TIMING_OPTS = [
  'J’ai un bien à publier maintenant',
  'Bientôt, d’ici quelques semaines',
  'Je regarde comment ça marche',
]
const OWNER_TYPE_OPTS = [
  'Appartement en colocation',
  'Maison en colocation',
  'Studio / T1',
  'Plusieurs biens',
]

/* Écrans du site v2 (maquette : 7 pour un locataire, 5 pour un bailleur).
   Chaque écran de saisie correspond à une étape enregistrée ; les écrans
   après le test (résultat, dossier, prêt) suivent l'enregistrement final. */
type Screen = 'role' | 'toi' | 'recherche' | 'test' | 'resultat' | 'dossier' | 'pret' | 'logement' | 'dossierb'
const SCREENS: Record<'locataire' | 'loueur', Screen[]> = {
  locataire: ['role', 'toi', 'recherche', 'test', 'resultat', 'dossier', 'pret'],
  loueur: ['role', 'toi', 'logement', 'dossierb', 'pret'],
}
/** Étape enregistrée d'un écran de saisie. */
const STEP_OF: Partial<Record<Screen, number>> = { role: 1, toi: 1, recherche: 2, logement: 2, test: 3 }

/** Libellés des rôles repris de la maquette (valeurs de ROLE_CHOICES inchangées). */
const ROLE_UI: Record<string, { t: string; s: string; ic: IconName }> = {
  locataire: { t: 'Je cherche une colocation', s: 'Trouve des colocs compatibles avec toi.', ic: 'compass' },
  loueur: { t: 'Je loue un logement en colocation', s: 'Publie ton annonce et choisis tes locataires.', ic: 'building' },
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function Chips({ opts, value, onSelect, label }: {
  opts: string[]; value: string | string[]; onSelect: (v: string) => void; label: string
}) {
  const on = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <div className="chipsel" role="group" aria-label={label}>
      {opts.map(opt => (
        <button key={opt} type="button" className="fchip" aria-pressed={on(opt)} onClick={() => onSelect(opt)}>{opt}</button>
      ))}
    </div>
  )
}

/** Saisie libre ajoutée en puces (zones, villes), avec suppression. */
function TagInput({ id, label, placeholder, values, onToggle }: {
  id: string; label: string; placeholder: string; values: string[]; onToggle: (v: string) => void
}) {
  const [input, setInput] = useState('')
  function add() {
    if (input.trim()) {
      onToggle(input.trim())
      setInput('')
    }
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="acts" style={{ flexWrap: 'nowrap' }}>
        <input
          id={id}
          className="input"
          value={input}
          placeholder={placeholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button className="btn btn-glass" type="button" onClick={add} aria-label="Ajouter"><Icon name="plus" size={18} /></button>
      </div>
      {values.length > 0 && (
        <div className="chipsel">
          {values.map(v => (
            <button key={v} type="button" className="fchip" aria-pressed="true" onClick={() => onToggle(v)} aria-label={`Retirer ${v}`}>
              {v}<Icon name="x" size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

/** Nombre d'étapes du parcours pour un rôle donné. */
function stepCountFor(role: string | undefined | null): number {
  return role === 'loueur' ? STEP_COUNT_LOUEUR : STEP_COUNT_LOCATAIRE
}

/**
 * Destination de fin d'onboarding.
 *
 * Un loueur part droit sur la création d'annonce (/app/annonce, le formulaire
 * mutualisé derrière « Publier une annonce ») : le dashboard swipe ne lui sert
 * à rien tant qu'il n'a rien publié.
 */
function homeFor(role: string | undefined | null): string {
  return role === 'loueur' ? '/app/annonce' : '/app/swipe'
}

/** Premier écran correspondant à une étape enregistrée (reprise d'un brouillon). */
function screenForStep(step: number, role: string | undefined | null): Screen {
  if (step >= 3 && role !== 'loueur') return 'test'
  if (step >= 2) return role === 'loueur' ? 'logement' : 'recherche'
  return role ? 'toi' : 'role'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('role')
  const [d, setD] = useState<OnboardingData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [resumeBanner, setResumeBanner] = useState(false)
  const [result, setResult] = useState<MatchingData | null>(null)
  const [draftState, setDraftState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLoueur = d.role === 'loueur'
  const screens = SCREENS[isLoueur ? 'loueur' : 'locataire']
  const si = Math.max(0, screens.indexOf(screen))
  // Étape enregistrée courante (les écrans après le test gardent la dernière).
  const step = STEP_OF[screen] ?? stepCountFor(d.role)

  // Load: check DB draft first (if logged in), then localStorage
  useEffect(() => {
    async function loadDraft() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_draft, onboarding_step, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed) {
          router.push(homeFor(profile.role as string | undefined))
          return
        }

        if (profile?.onboarding_draft && profile.onboarding_step > 0) {
          const draft = profile.onboarding_draft as Record<string, unknown>
          const localRaw = (() => { try { return localStorage.getItem('isaly_onboarding_data') } catch { return null } })()
          const localStep = (() => { try { const p = JSON.parse(localRaw ?? '{}'); return p.onboarding_step ?? 0 } catch { return 0 } })()
          if (profile.onboarding_step >= localStep) {
            setD({ ...DEFAULT, ...(draft as Partial<OnboardingData>) })
            // Le brouillon d'un loueur ne compte que 2 étapes.
            const s = Math.min(profile.onboarding_step, stepCountFor(draft.role as string | undefined))
            setScreen(screenForStep(s, draft.role as string | undefined))
            setResumeBanner(true)
            setTimeout(() => setResumeBanner(false), 4000)
            return
          }
        }
      }

      // Fallback: localStorage
      let raw: string | null = null
      try { raw = localStorage.getItem('isaly_onboarding_data') } catch {}
      if (!raw) return
      let saved: Record<string, unknown> = {}
      try { saved = JSON.parse(raw) } catch { return }
      if (saved.onboarding_completed) {
        if (user) {
          const supabase = createClient()
          await supabase.from('profiles').upsert({
            id: user.id, email: user.email,
            first_name: (saved.first_name as string) || null,
            last_name: (saved.last_name as string) || null,
            role: (saved.role as string) || null,
            city: (saved.city as string) || null,
            budget_max: typeof saved.budget_max === 'number' ? saved.budget_max : null,
            onboarding_completed: true,
            matching_data: saved.matching_data ?? null,
          })
          try { localStorage.removeItem('isaly_onboarding_data') } catch {}
          router.push(homeFor(saved.role as string | undefined))
        }
        return
      }
      if (saved.onboarding_step && typeof saved.onboarding_step === 'number' && saved.onboarding_step > 1) {
        setD({ ...DEFAULT, ...(saved as Partial<OnboardingData>) })
        const s = Math.min(saved.onboarding_step as number, stepCountFor(saved.role as string | undefined))
        setScreen(screenForStep(s, saved.role as string | undefined))
      }
    }
    loadDraft()
  }, [router])

  // Debounced save to DB + localStorage after each step update
  function saveDraftToServer(data: OnboardingData, currentStep: number) {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    setDraftState('saving')
    draftSaveTimer.current = setTimeout(async () => {
      try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...data, onboarding_step: currentStep })) } catch {}
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setDraftState('saved'); return }
      await supabase.from('profiles').update({
        onboarding_draft: { ...data, onboarding_step: currentStep } as Record<string, unknown>,
        onboarding_step: currentStep,
      }).eq('id', user.id)
      setDraftState('saved')
    }, 800)
  }

  function upd<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setD(prev => {
      const next = { ...prev, [key]: value }
      saveDraftToServer(next, step)
      return next
    })
  }

  function togglePill(key: 'zones' | 'owner_cities', val: string, max?: number) {
    setD(prev => {
      const arr = prev[key]
      const has = arr.includes(val)
      if (has) return { ...prev, [key]: arr.filter(v => v !== val) }
      if (max !== undefined && arr.length >= max) return prev
      return { ...prev, [key]: [...arr, val] }
    })
  }

  /** Passage à l'étape enregistrée suivante (même écriture que l'ancien next()). */
  async function next() {
    const total = stepCountFor(d.role)
    if (step >= total) return
    const nextStep = step + 1
    try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, onboarding_step: nextStep })) } catch {}
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setDraftState('saving')
      supabase.from('profiles').update({
        onboarding_draft: { ...d, onboarding_step: nextStep } as Record<string, unknown>,
        onboarding_step: nextStep,
      }).eq('id', user.id).then(() => setDraftState('saved'))
    }
    setScreen(screenForStep(nextStep, d.role))
  }

  async function finish(matching_data: MatchingData) {
    setSaving(true)
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      budget_max:  d.budget_max,
      onboarding_completed: true,
      // Trace la réponse à la question de rôle : sans elle, la garde de
      // /app/* reposerait la question à ce compte (cf. RoleGate).
      role_confirmed_at: new Date().toISOString(),
      matching_data,
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Already logged in — save directly and clear draft
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, ...payload,
        onboarding_draft: null, onboarding_step: 0,
      })
      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      // Site v2 : le profil est enregistré ; on montre le résultat avant de partir.
      setResult(matching_data)
      setSaving(false)
      setDraftState('saved')
      setScreen('resultat')
    } else {
      // Not yet logged in — save to localStorage and go to register
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, matching_data }))
      } catch {}
      router.push('/auth/register')
    }
  }

  /**
   * Fin de parcours loueur.
   *
   * Pas de matching_data : le vecteur de compatibilité est un objet de
   * colocataire, il n'a pas d'équivalent côté loueur et reste donc NULL.
   * Les réponses des 3 questions partent dans profiles.owner_intent (JSONB,
   * migration 38) via une écriture séparée et best-effort : tant que la
   * migration n'est pas jouée, l'onboarding se termine quand même.
   */
  async function finishLoueur() {
    if (saving) return
    setSaving(true)

    const ownerIntent = {
      timing: d.owner_timing || null,
      property_type: d.owner_property_type || null,
      cities: d.owner_cities,
      answered_at: new Date().toISOString(),
    }
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      onboarding_completed: true,
      role_confirmed_at: new Date().toISOString(),
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, ...payload,
        onboarding_draft: null, onboarding_step: 0,
      })
      // Colonne absente (migration 38 pas encore jouée) : on ignore l'échec.
      try {
        await supabase.from('profiles').update({ owner_intent: ownerIntent }).eq('id', user.id)
      } catch { /* noop */ }
      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      setSaving(false)
      setDraftState('saved')
      setScreen('dossierb')
    } else {
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, owner_intent: ownerIntent }))
      } catch {}
      router.push('/auth/register')
    }
  }

  // Le rôle conditionne toute la suite du parcours : on ne laisse pas passer
  // la première question sans réponse.
  const canProceed = screen !== 'role' || d.role === 'locataire' || d.role === 'loueur'
  // Projet du loueur : au moins la question « Où en es-tu ? » doit être
  // renseignée, les deux autres restent facultatives.
  const canFinishLoueur = d.owner_timing !== '' && !saving
  const n = screens.length
  const eyebrow = `Étape ${si + 1} sur ${n}`

  // ── Contenu de l'écran ──
  let body: React.ReactNode = null
  let action: { label: string; onClick: () => void; disabled?: boolean; icon?: boolean } | null = { label: 'Continuer', onClick: () => undefined, icon: true }
  let skip: React.ReactNode = null
  let canBack = false
  let onBack = () => undefined as void

  if (screen === 'role') {
    body = (
      <>
        <span className="eyebrow">Bienvenue sur ISALY</span>
        <h1>Qu’est-ce qui t’amène&#8239;?</h1>
        <p className="lead">Tu pourras changer de mode à tout moment depuis ton espace.</p>
        {/* Première question de l'onboarding : elle fixe profiles.role, donc la
            navigation et le dashboard que verra ce compte. Elle est obligatoire —
            « Continuer » reste désactivé tant qu'aucun choix n'est fait. */}
        <div className="choices">
          {ROLE_CHOICES.map(r => {
            const ui = ROLE_UI[r.value] ?? { t: r.title, s: r.description, ic: 'user' as IconName }
            return (
              <button key={r.value} className="choice" type="button" aria-pressed={d.role === r.value} onClick={() => upd('role', r.value)}>
                <span className="ico brand"><Icon name={ui.ic} size={24} /></span>
                <span className="grow"><b>{ui.t}</b><span className="s">{ui.s}</span></span>
              </button>
            )
          })}
        </div>
      </>
    )
    action = { label: 'Continuer', onClick: () => { saveDraftToServer(d, 1); setScreen('toi') }, disabled: !canProceed, icon: true }
  } else if (screen === 'toi') {
    body = (
      <>
        <span className="eyebrow">{eyebrow}</span>
        <h1>Parle-nous de toi</h1>
        <p className="lead">{isLoueur ? 'Les candidats verront ton prénom et ta photo.' : 'Les colocs verront ton prénom, ton âge et ta photo.'}</p>
        <div className="form">
          <div className="f2">
            <div className="field"><label htmlFor="op">Prénom</label><input id="op" className="input" autoComplete="given-name" value={d.first_name} onChange={e => upd('first_name', e.target.value)} /></div>
            <div className="field"><label htmlFor="on">Nom</label><input id="on" className="input" autoComplete="family-name" value={d.last_name} onChange={e => upd('last_name', e.target.value)} /></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="oa">Âge</label><input id="oa" className="input" type="number" inputMode="numeric" value={d.age} onChange={e => upd('age', e.target.value)} /></div>
            <div className="field"><label htmlFor="oc">Ville</label><input id="oc" className="input" autoComplete="address-level2" value={d.city} onChange={e => upd('city', e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="opr">Profession</label><input id="opr" className="input" autoComplete="organization-title" value={d.profession} onChange={e => upd('profession', e.target.value)} /></div>
          <div className="field">
            <span className="flabel">Ta situation</span>
            <Chips label="Ta situation" opts={STATUS_OPTS} value={d.status} onSelect={v => upd('status', v)} />
          </div>
        </div>
      </>
    )
    canBack = true
    onBack = () => setScreen('role')
    action = { label: 'Continuer', onClick: () => { next() }, icon: true }
  } else if (screen === 'recherche') {
    body = (
      <>
        <span className="eyebrow">{eyebrow}</span>
        <h1>Ta recherche</h1>
        <p className="lead">On ne te montre que les colocations qui correspondent.</p>
        <div className="form">
          <div className="field">
            <div className="rangev"><label htmlFor="obmin">Budget minimum</label><b className="num">{eur(d.budget_min)}</b></div>
            <input
              id="obmin" className="range" type="range" min={300} max={2000} step={50} value={d.budget_min}
              onChange={e => upd('budget_min', Math.min(Number(e.target.value), d.budget_max - 50))}
            />
          </div>
          <div className="field">
            <div className="rangev"><label htmlFor="obmax">Budget maximum, par mois</label><b className="num">{eur(d.budget_max)}</b></div>
            <input
              id="obmax" className="range" type="range" min={300} max={2000} step={50} value={d.budget_max}
              onChange={e => upd('budget_max', Math.max(Number(e.target.value), d.budget_min + 50))}
            />
          </div>
          <div className="field">
            <span className="flabel">Arrivée souhaitée</span>
            <Chips label="Arrivée souhaitée" opts={['Dès maintenant', 'Dans 1 mois', 'Dans 2-3 mois', 'Date précise']} value={d.move_in} onSelect={v => upd('move_in', v)} />
          </div>
          <div className="field">
            <span className="flabel">Durée recherchée</span>
            <Chips label="Durée recherchée" opts={['Court terme -6 mois', 'Moyen terme 6-12 mois', 'Long terme +1 an']} value={d.duration} onSelect={v => upd('duration', v)} />
          </div>
          <TagInput id="oz" label="Zones souhaitées" placeholder="Par exemple : Lyon 2e, Part-Dieu" values={d.zones} onToggle={v => togglePill('zones', v)} />
        </div>
      </>
    )
    canBack = true
    onBack = () => setScreen('toi')
    action = { label: 'Continuer', onClick: () => { next() }, icon: true }
  } else if (screen === 'test') {
    body = (
      <>
        <span className="eyebrow">Test de compatibilité</span>
        <h1>Comment tu vis au quotidien&#8239;?</h1>
        <p className="lead">{`${QUIZ_TOTAL_STEPS} questions, environ 3 minutes. Il n’y a pas de bonne réponse.`}</p>
        {saving ? (
          <div className="note" role="status"><Icon name="clock" size={18} /><span>Création de ton profil…</span></div>
        ) : (
          <CompatTest
            initialAnswers={Object.keys(d.quiz_answers).length > 0 ? d.quiz_answers : undefined}
            onProgress={answers => upd('quiz_answers', answers)}
            onComplete={finish}
            budgetMin={d.budget_min}
          />
        )}
      </>
    )
    canBack = !saving
    onBack = () => setScreen('recherche')
    // Passage automatique d'une question à l'autre : pas de bouton ici.
    action = null
  } else if (screen === 'resultat' && result) {
    body = (
      <>
        <span className="eyebrow">Ton profil est prêt</span>
        <h1>Voilà comment tu vis en coloc</h1>
        <p className="lead">On compare maintenant tes réponses à celles de chaque colocataire, pour chaque annonce.</p>
        <CompatResult data={result} />
      </>
    )
    action = { label: 'Continuer', onClick: () => setScreen('dossier'), icon: true }
  } else if (screen === 'logement') {
    body = (
      <>
        <span className="eyebrow">{eyebrow}</span>
        <h1>Ton logement</h1>
        <p className="lead">Juste l’essentiel : tu compléteras l’annonce ensuite.</p>
        {saving ? (
          <div className="note" role="status"><Icon name="clock" size={18} /><span>Création de ton espace loueur…</span></div>
        ) : (
          <div className="form">
            <div className="field">
              <span className="flabel">Où en es-tu&#8239;?</span>
              <Chips label="Où en es-tu" opts={OWNER_TIMING_OPTS} value={d.owner_timing} onSelect={v => upd('owner_timing', v)} />
            </div>
            <div className="field">
              <span className="flabel">Type de bien</span>
              <Chips label="Type de bien" opts={OWNER_TYPE_OPTS} value={d.owner_property_type} onSelect={v => upd('owner_property_type', v)} />
            </div>
            <TagInput id="ov" label={`Dans quelle(s) ville(s)${NNBSP}?`} placeholder="Par exemple : Lyon, Villeurbanne" values={d.owner_cities} onToggle={v => togglePill('owner_cities', v)} />
            <div className="note">
              <Icon name="info" size={18} />
              <span>Ensuite, on t’emmène sur la création de ta première annonce. Tu pourras l’enregistrer en brouillon si tu n’as pas encore toutes les infos.</span>
            </div>
          </div>
        )}
      </>
    )
    canBack = !saving
    onBack = () => setScreen('toi')
    action = { label: 'Continuer', onClick: () => { finishLoueur() }, disabled: !canFinishLoueur, icon: true }
  } else if (screen === 'dossier' || screen === 'dossierb') {
    const docs: [IconName, string, string][] = screen === 'dossier'
      ? [['shield', 'Pièce d’identité', 'Pour obtenir le badge Identité vérifiée'], ['euro', 'Justificatif de revenus ou de bourse', 'Bulletins de salaire, attestation de bourse'], ['users', 'Garant', 'Personne physique ou garantie Visale']]
      : [['shield', 'Pièce d’identité', 'Pour obtenir le badge Identité vérifiée'], ['contract', 'Justificatif de propriété', 'Taxe foncière ou acte de propriété']]
    // Le dépôt des pièces se fait dans l'espace existant (Mon dossier, Mon profil).
    const docHref = screen === 'dossier' ? '/app/dossier' : '/app/profil'
    body = (
      <>
        <span className="eyebrow">{`${eyebrow}, facultative`}</span>
        <h1>{screen === 'dossier' ? 'Prépare ton dossier' : 'Rassure tes futurs locataires'}</h1>
        <p className="lead">{screen === 'dossier' ? 'Un dossier complet rassure les colocs et les bailleurs. Tu peux aussi le faire plus tard.' : 'Un profil vérifié reçoit plus de candidatures. Tu peux aussi le faire plus tard.'}</p>
        <div className="upl">
          {docs.map(([ic, t, s]) => (
            <div className="row" key={t}>
              <span className="ico brand"><Icon name={ic} size={18} /></span>
              <span className="grow"><span className="t">{t}</span><span className="s">{s}</span></span>
              <Link className="btn btn-glass btn-sm" href={docHref}><Icon name="upload" size={16} />Ajouter</Link>
            </div>
          ))}
        </div>
        <div className="note"><Icon name="lock" size={18} /><span>Tes documents sont stockés de façon sécurisée et ne sont montrés qu’aux personnes à qui tu envoies une demande.</span></div>
      </>
    )
    skip = <button className="btn btn-ghost" type="button" onClick={() => setScreen('pret')}>Plus tard</button>
    action = { label: 'Continuer', onClick: () => setScreen('pret'), icon: true }
  } else if (screen === 'pret') {
    body = (
      <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 16, paddingTop: 20 }}>
        <span className="okring"><Icon name="check" /></span>
        <h1>{d.first_name ? `C’est prêt, ${d.first_name}` : 'C’est prêt'}</h1>
        <p className="lead" style={{ margin: 0, maxWidth: '44ch' }}>
          {isLoueur
            ? 'Publie ta première annonce : les candidats verront leur compatibilité avec tes colocataires.'
            : 'Découvre les colocations où tu t’entendrais le mieux, avec ton score pour chaque colocataire.'}
        </p>
      </div>
    )
    action = { label: isLoueur ? 'Publier mon annonce' : 'Découvrir mes colocs', onClick: () => router.push(homeFor(d.role)), icon: true }
  }

  return (
    <SiteRoot>
      <div className="ob">
        <div className="ob-top">
          <Link className="plogo" href="/" aria-label="ISALY"><Logo /><span className="sr">isaly</span></Link>
          <div className="ob-steps" role="progressbar" aria-valuemin={1} aria-valuemax={n} aria-valuenow={si + 1} aria-label={`Étape ${si + 1} sur ${n}`}>
            {screens.map((_, k) => <i key={k} className={k < si ? 'on' : k === si ? 'now' : ''} />)}
          </div>
          <span className="saved" aria-live="polite">
            {draftState === 'saving'
              ? <><Icon name="clock" size={16} /><span>Enregistrement…</span></>
              : draftState === 'saved' ? <><Icon name="check" size={16} /><span>Enregistré</span></> : null}
          </span>
        </div>
        <main className="ob-main" id="contenu" tabIndex={-1}>
          <div className="ob-card screen enter" key={screen}>
            {resumeBanner && (
              <div className="note" role="status"><Icon name="check" size={18} /><span>On reprend où tu t’étais arrêté.</span></div>
            )}
            {body}
          </div>
        </main>
        {(action || canBack || skip) && (
          <div className="ob-foot">
            <div className="in">
              {canBack
                ? <button className="btn btn-ghost" type="button" onClick={onBack}><Icon name="back" size={18} />Retour</button>
                : <span />}
              <span className="acts">
                {skip}
                {action && (
                  <button className="btn btn-main" type="button" onClick={action.onClick} disabled={action.disabled}>
                    {action.label}
                    {action.icon && <Icon name="arrow" size={18} />}
                  </button>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </SiteRoot>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MatchingQuiz from '@/components/quiz/MatchingQuiz'
import type { MatchingData } from '@/lib/matching'
import Emoji from '@/components/ui/Emoji'
import { ROLE_CHOICES } from '@/lib/roles'
import RiseText from '@/components/motion/RiseText'
import { DUR, EASE_OUT, EASE_SPRING, INSTANT, SPRING, useMotionReduced } from '@/lib/motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  role: string
  first_name: string; last_name: string; age: string
  city: string; profession: string; status: string
  budget_min: number; budget_max: number
  move_in: string; duration: string; zones: string[]
  quiz_answers: Record<string, number>
  // ── Branche loueur (role = 'loueur') ──
  // Ces trois réponses remplacent entièrement l'étape « Ta recherche » et le
  // test de compatibilité, qui n'ont aucun sens pour quelqu'un qui loue un bien.
  owner_timing: string
  owner_cities: string[]
  owner_property_type: string
}

const DEFAULT: OnboardingData = {
  role: '',
  first_name: '', last_name: '', age: '', city: '', profession: '', status: '',
  budget_min: 400, budget_max: 1000,
  move_in: '', duration: '', zones: [],
  quiz_answers: {},
  owner_timing: '', owner_cities: [], owner_property_type: '',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = ['Étudiant', 'Salarié CDI', 'Salarié CDD', 'Freelance', 'Auto-entrepreneur', 'Autre']

// Le parcours diverge après la question de rôle de l'étape 1 : un locataire
// passe par sa recherche puis le test de compatibilité (3 étapes), un loueur
// répond à 3 questions sur son bien et part directement créer son annonce
// (2 étapes). stepCountFor() borne la reprise d'un brouillon selon le rôle.
const STEP_LABELS_LOCATAIRE = [
  'Qui es-tu ?',
  'Ta recherche',
  'Ton test de compatibilité',
]
const STEP_LABELS_LOUEUR = [
  'Qui es-tu ?',
  'Ton projet de location',
]

// Message de récompense affiché à la fin de chaque étape
const STEP_REWARDS_LOCATAIRE = [
  'Super ! Ton profil est en place 🎉',
  'Ta recherche est enregistrée ✨',
  'Ton score de compatibilité est calculé ✨',
]
const STEP_REWARDS_LOUEUR = [
  'Super ! Ton profil est en place 🎉',
  'Ton espace loueur est prêt 🏠',
]

const OWNER_TIMING_OPTS = [
  'J’ai un bien à publier maintenant',
  'Bientôt, d’ici quelques semaines',
  'Je regarde comment ça marche',
]
const OWNER_TYPE_OPTS = [
  'Appartement en colocation',
  'Maison en colocation',
  'Studio / T1',
  'Plusieurs biens',
]

/* ── Thème sombre ────────────────────────────────────────────────────────────
 * Aucune valeur inventée : toutes viennent déjà du projet.
 *   · #0A0A0A, la page — /app/quiz, la page d'accueil, l'ancienne landing ;
 *   · rgba(255,255,255,0.04) / 0.08, surfaces et bordures — la variante `dark`
 *     de MatchingQuiz (components/quiz/MatchingQuiz.tsx), que l'étape 3 rend ;
 *   · #10B981 / #059669 et rgba(16,185,129,0.10), l'accent de l'app.
 *
 * Le texte des boutons pleins est sombre et non blanc : sur #10B981, du blanc
 * plafonne autour de 2,5:1 alors que #08170F dépasse 7:1. Le contraste décide,
 * pas l'habitude.
 * /
const BG = '#0A0A0A'
const SURFACE = 'rgba(255,255,255,0.04)'
const SURFACE_SOFT = 'rgba(255,255,255,0.06)'
const BORDER = 'rgba(255,255,255,0.08)'
const BORDER_STRONG = 'rgba(255,255,255,0.15)'
const TEXT = '#fff'
const TEXT_DIM = 'rgba(255,255,255,0.62)'
const TEXT_FAINT = 'rgba(255,255,255,0.45)'
const ACCENT = '#10B981'
const ACCENT_DEEP = '#059669'
const ACCENT_SOFT = 'rgba(16,185,129,0.10)'
const ACCENT_BORDER = 'rgba(16,185,129,0.45)'
const ACCENT_INK = '#08170F'

/** Barre de progression gamifiée : cercles ✓ + segments animés (spring). * /
function ProgressSteps({ step, total }: { step: number; total: number }) {
  const TOTAL = total
  const reduced = useMotionReduced()
  return (
    <div className="flex items-center mb-3.5">
      {Array.from({ length: TOTAL }, (_, i) => {
        const done = i < step - 1
        const current = i === step - 1
        return (
          <div key={i} className="flex items-center" style={{ flex: i < TOTAL - 1 ? 1 : 'none' }}>
            <motion.div
              // Étape validée : la pastille fait un petit « pop » (ressort).
              initial={false}
              animate={{ scale: done && !reduced ? [1, 1.22, 1] : 1 }}
              transition={reduced ? INSTANT : { duration: DUR.element, ease: EASE_SPRING }}
              className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors duration-300"
              style={{
                width: 24, height: 24, fontSize: 11.5, fontWeight: 800,
                background: done ? ACCENT : current ? ACCENT_SOFT : SURFACE_SOFT,
                border: `2px solid ${done || current ? ACCENT : BORDER}`,
                // TEXT_DIM et non TEXT_FAINT : sur SURFACE_SOFT, 0.45
                // d'opacité tombe à 4,49:1, juste sous le seuil AA de 4,5.
                color: done ? ACCENT_INK : current ? ACCENT : TEXT_DIM,
              }}
            >
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </motion.div>
            {i < TOTAL - 1 && (
              <div className="flex-1 mx-1.5 rounded-full overflow-hidden" style={{ height: 3, background: BORDER }}>
                <motion.div
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={reduced ? INSTANT : SPRING.fill}
                  style={{ height: '100%', background: ACCENT, transformOrigin: 'left', borderRadius: 999 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Micro-célébration de fin d'étape : check mint + message, scale-in puis fade. * /
function StepReward({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[24px]"
      style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
        className="flex items-center justify-center rounded-full mb-4"
        style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.35)' }}
      >
        <Check size={30} color="#fff" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-[16px] font-bold text-center px-8"
        style={{ color: TEXT, fontFamily: "'Outfit', sans-serif" }}
      >
        {message}
      </motion.div>
    </motion.div>
  )
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function FieldLabel({ children, mt }: { children: string; mt?: boolean }) {
  return (
    <div
      className={`text-[11px] font-extrabold uppercase tracking-[1.5px] mb-2${mt ? ' mt-4' : ''}`}
      style={{ color: TEXT_FAINT }}
    >
      {children}
    </div>
  )
}

function TxtInput({
  placeholder, value, onChange, type = 'text',
}: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      className="dark-field w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13px] outline-none"
      style={{ borderColor: BORDER_STRONG, color: TEXT, background: SURFACE }}
      onFocus={e => (e.target.style.borderColor = ACCENT)}
      onBlur={e => (e.target.style.borderColor = BORDER_STRONG)}
    />
  )
}

function Pills({ opts, value, onSelect }: {
  opts: string[]; value: string | string[]; onSelect: (v: string) => void
}) {
  function isSelected(v: string) {
    return Array.isArray(value) ? value.includes(v) : value === v
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="px-3 py-1.5 rounded-full text-[12.5px] font-medium border cursor-pointer transition-all"
          style={{
            background: isSelected(opt) ? ACCENT_SOFT : SURFACE,
            borderColor: isSelected(opt) ? ACCENT_BORDER : BORDER,
            color: isSelected(opt) ? ACCENT : TEXT_DIM,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

type Upd = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void
type TogglePill = (k: 'zones' | 'owner_cities', v: string, max?: number) => void

function Step1({ d, upd }: { d: OnboardingData; upd: Upd }) {
  return (
    <div>
      {/* Première question de l'onboarding : elle fixe profiles.role, donc la
          navigation et le dashboard que verra ce compte. Elle est obligatoire —
          « Continuer » reste désactivé tant qu'aucun choix n'est fait. * /}
      <FieldLabel>Tu es plutôt…</FieldLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        {ROLE_CHOICES.map(r => {
          const selected = d.role === r.value
          return (
            <button
              key={r.value}
              onClick={() => upd('role', r.value)}
              aria-pressed={selected}
              className="p-4 rounded-[11px] border-2 cursor-pointer transition-all text-left"
              style={{
                borderColor: selected ? ACCENT_BORDER : BORDER,
                background: selected ? ACCENT_SOFT : SURFACE,
              }}
            >
              <div className="text-[26px] mb-1"><Emoji native={r.emoji} size="26px" /></div>
              <div className="text-[13px] font-bold" style={{ color: selected ? ACCENT : TEXT }}>
                {r.title}
              </div>
              <div className="text-[11.5px] mt-1 leading-snug" style={{ color: TEXT_FAINT }}>
                {r.description}
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <TxtInput placeholder="Prénom" value={d.first_name} onChange={v => upd('first_name', v)} />
        <TxtInput placeholder="Nom" value={d.last_name} onChange={v => upd('last_name', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <TxtInput placeholder="Âge" value={d.age} onChange={v => upd('age', v)} type="number" />
        <TxtInput placeholder="Ville" value={d.city} onChange={v => upd('city', v)} />
      </div>
      <div className="mb-3.5">
        <TxtInput placeholder="Profession" value={d.profession} onChange={v => upd('profession', v)} />
      </div>

      <FieldLabel>Statut</FieldLabel>
      <Pills opts={STATUS_OPTS} value={d.status} onSelect={v => upd('status', v)} />
    </div>
  )
}

function Step2({ d, upd, togglePill }: { d: OnboardingData; upd: Upd; togglePill: TogglePill }) {
  const [zoneInput, setZoneInput] = useState('')

  function addZone() {
    if (zoneInput.trim()) {
      togglePill('zones', zoneInput.trim())
      setZoneInput('')
    }
  }

  return (
    <div>
      <FieldLabel>Budget mensuel</FieldLabel>
      <div className="rounded-[12px] p-4 mb-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-center text-[15px] font-bold mb-3" style={{ color: ACCENT }}>
          Entre {d.budget_min}€ et {d.budget_max}€/mois
        </div>
        <div className="mb-2.5">
          <div className="flex justify-between text-[11.5px] mb-1" style={{ color: TEXT_FAINT }}>
            <span>Minimum</span><span className="font-semibold">{d.budget_min}€</span>
          </div>
          <input
            type="range" min={300} max={2000} step={50} value={d.budget_min}
            onChange={e => upd('budget_min', Math.min(Number(e.target.value), d.budget_max - 50))}
            className="w-full" style={{ accentColor: ACCENT }}
          />
        </div>
        <div>
          <div className="flex justify-between text-[11.5px] mb-1" style={{ color: TEXT_FAINT }}>
            <span>Maximum</span><span className="font-semibold">{d.budget_max}€</span>
          </div>
          <input
            type="range" min={300} max={2000} step={50} value={d.budget_max}
            onChange={e => upd('budget_max', Math.max(Number(e.target.value), d.budget_min + 50))}
            className="w-full" style={{ accentColor: ACCENT }}
          />
        </div>
      </div>

      <FieldLabel>Date d&apos;emménagement</FieldLabel>
      <Pills
        opts={["Dès maintenant", "Dans 1 mois", "Dans 2-3 mois", "Date précise"]}
        value={d.move_in}
        onSelect={v => upd('move_in', v)}
      />

      <FieldLabel mt>Durée recherchée</FieldLabel>
      <Pills
        opts={["Court terme -6 mois", "Moyen terme 6-12 mois", "Long terme +1 an"]}
        value={d.duration}
        onSelect={v => upd('duration', v)}
      />

      <FieldLabel mt>Zones souhaitées</FieldLabel>
      <div className="flex gap-2 mb-2">
        <input
          value={zoneInput}
          onChange={e => setZoneInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addZone()}
          placeholder="Ex : Lyon 2e, Part-Dieu… (Entrée)"
          className="dark-field flex-1 px-3 py-2 rounded-[9px] text-[13px] border outline-none"
          style={{ borderColor: BORDER_STRONG, color: TEXT, background: SURFACE }}
          onFocus={e => (e.target.style.borderColor = ACCENT)}
          onBlur={e => (e.target.style.borderColor = BORDER_STRONG)}
        />
        <button
          onClick={addZone}
          className="px-3 py-2 rounded-[9px] text-[13px] font-bold border-none cursor-pointer"
          style={{ background: ACCENT, color: ACCENT_INK }}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {d.zones.map(z => (
          <span
            key={z}
            className="px-2.5 py-1 rounded-full text-[12px] font-medium flex items-center gap-1"
            style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
          >
            {z}
            <button
              onClick={() => togglePill('zones', z)}
              className="border-none bg-transparent cursor-pointer ml-0.5 text-[10px] leading-none"
              style={{ color: ACCENT }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Étape 2 — branche loueur.
 *
 * Volontairement courte (3 questions) : l'objectif n'est pas de qualifier le
 * loueur en profondeur mais de le mener au plus vite à sa première annonce.
 * Aucune question orientée locataire ici (budget de recherche, date
 * d'emménagement, compatibilité colocataire) : elles ne le concernent pas.
 * /
function Step2Loueur({ d, upd, togglePill }: { d: OnboardingData; upd: Upd; togglePill: TogglePill }) {
  const [cityInput, setCityInput] = useState('')

  function addCity() {
    if (cityInput.trim()) {
      togglePill('owner_cities', cityInput.trim())
      setCityInput('')
    }
  }

  return (
    <div>
      <FieldLabel>Où en es-tu ?</FieldLabel>
      <Pills opts={OWNER_TIMING_OPTS} value={d.owner_timing} onSelect={v => upd('owner_timing', v)} />

      <FieldLabel mt>Type de bien</FieldLabel>
      <Pills opts={OWNER_TYPE_OPTS} value={d.owner_property_type} onSelect={v => upd('owner_property_type', v)} />

      <FieldLabel mt>Dans quelle(s) ville(s) ?</FieldLabel>
      <div className="flex gap-2 mb-2">
        <input
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCity()}
          placeholder="Ex : Lyon, Villeurbanne… (Entrée)"
          className="dark-field flex-1 px-3 py-2 rounded-[9px] text-[13px] border outline-none"
          style={{ borderColor: BORDER_STRONG, color: TEXT, background: SURFACE }}
          onFocus={e => (e.target.style.borderColor = ACCENT)}
          onBlur={e => (e.target.style.borderColor = BORDER_STRONG)}
        />
        <button
          onClick={addCity}
          className="px-3 py-2 rounded-[9px] text-[13px] font-bold border-none cursor-pointer"
          style={{ background: ACCENT, color: ACCENT_INK }}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {d.owner_cities.map(c => (
          <span
            key={c}
            className="px-2.5 py-1 rounded-full text-[12px] font-medium flex items-center gap-1"
            style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
          >
            {c}
            <button
              onClick={() => togglePill('owner_cities', c)}
              className="border-none bg-transparent cursor-pointer ml-0.5 text-[10px] leading-none"
              style={{ color: ACCENT }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div
        className="rounded-[12px] p-3.5 text-[12.5px] leading-relaxed"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_DIM }}
      >
        <Emoji native="🏠" size="14px" /> Juste après, on t&apos;emmène directement sur la
        création de ta première annonce. Tu pourras l&apos;enregistrer en brouillon si tu
        n&apos;as pas encore toutes les infos.
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

/** Nombre d'étapes du parcours pour un rôle donné. * /
function stepCountFor(role: string | undefined | null): number {
  return role === 'loueur' ? STEP_LABELS_LOUEUR.length : STEP_LABELS_LOCATAIRE.length
}

/**
 * Destination de fin d'onboarding.
 *
 * Un loueur part droit sur la création d'annonce (/app/annonce, le formulaire
 * mutualisé derrière « Publier une annonce ») : le dashboard swipe ne lui sert
 * à rien tant qu'il n'a rien publié.
 * /
function homeFor(role: string | undefined | null): string {
  return role === 'loueur' ? '/app/annonce' : '/app/swipe'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const motionReduced = useMotionReduced()
  const [d, setD] = useState<OnboardingData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [resumeBanner, setResumeBanner] = useState(false)
  const [reward, setReward] = useState<string | null>(null)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load: check DB draft first (if logged in), then localStorage
  useEffect(() => {
    async function loadDraft() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_draft, onboarding_step, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed) {
          router.push(homeFor(profile.role as string | undefined))
          return
        }

        if (profile?.onboarding_draft && profile.onboarding_step > 0) {
          const draft = profile.onboarding_draft as Record<string, unknown>
          const localRaw = (() => { try { return localStorage.getItem('isaly_onboarding_data') } catch { return null } })()
          const localStep = (() => { try { const p = JSON.parse(localRaw ?? '{}'); return p.onboarding_step ?? 0 } catch { return 0 } })()
          if (profile.onboarding_step >= localStep) {
            setD({ ...DEFAULT, ...(draft as Partial<OnboardingData>) })
            // Le brouillon d'un loueur ne compte que 2 étapes.
            setStep(Math.min(profile.onboarding_step, stepCountFor(draft.role as string | undefined)))
            setResumeBanner(true)
            setTimeout(() => setResumeBanner(false), 4000)
            return
          }
        }
      }

      // Fallback: localStorage
      let raw: string | null = null
      try { raw = localStorage.getItem('isaly_onboarding_data') } catch {}
      if (!raw) return
      let saved: Record<string, unknown> = {}
      try { saved = JSON.parse(raw) } catch { return }
      if (saved.onboarding_completed) {
        if (user) {
          const supabase = createClient()
          await supabase.from('profiles').upsert({
            id: user.id, email: user.email,
            first_name: (saved.first_name as string) || null,
            last_name: (saved.last_name as string) || null,
            role: (saved.role as string) || null,
            city: (saved.city as string) || null,
            budget_max: typeof saved.budget_max === 'number' ? saved.budget_max : null,
            onboarding_completed: true,
            matching_data: saved.matching_data ?? null,
          })
          try { localStorage.removeItem('isaly_onboarding_data') } catch {}
          router.push(homeFor(saved.role as string | undefined))
        }
        return
      }
      if (saved.onboarding_step && typeof saved.onboarding_step === 'number' && saved.onboarding_step > 1) {
        setD({ ...DEFAULT, ...(saved as Partial<OnboardingData>) })
        setStep(Math.min(saved.onboarding_step as number, stepCountFor(saved.role as string | undefined)))
      }
    }
    loadDraft()
  }, [router])

  // Debounced save to DB + localStorage after each step update
  function saveDraftToServer(data: OnboardingData, currentStep: number) {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = setTimeout(async () => {
      try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...data, onboarding_step: currentStep })) } catch {}
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update({
        onboarding_draft: { ...data, onboarding_step: currentStep } as Record<string, unknown>,
        onboarding_step: currentStep,
      }).eq('id', user.id)
    }, 800)
  }

  function upd<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setD(prev => {
      const next = { ...prev, [key]: value }
      saveDraftToServer(next, step)
      return next
    })
  }

  function togglePill(key: 'zones' | 'owner_cities', val: string, max?: number) {
    setD(prev => {
      const arr = prev[key]
      const has = arr.includes(val)
      if (has) return { ...prev, [key]: arr.filter(v => v !== val) }
      if (max !== undefined && arr.length >= max) return prev
      return { ...prev, [key]: [...arr, val] }
    })
  }

  async function next() {
    if (step >= total || reward) return
    const nextStep = step + 1
    try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, onboarding_step: nextStep })) } catch {}
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      supabase.from('profiles').update({
        onboarding_draft: { ...d, onboarding_step: nextStep } as Record<string, unknown>,
        onboarding_step: nextStep,
      }).eq('id', user.id).then(() => {})
    }
    // Récompense de fin d'étape, puis transition
    setReward(stepRewards[step - 1])
    setTimeout(() => {
      setReward(null)
      setStep(s => s + 1)
    }, 1600)
  }

  async function finish(matching_data: MatchingData) {
    setSaving(true)
    setReward(STEP_REWARDS_LOCATAIRE[2])
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      budget_max:  d.budget_max,
      onboarding_completed: true,
      // Trace la réponse à la question de rôle : sans elle, la garde de
      // /app/* reposerait la question à ce compte (cf. RoleGate).
      role_confirmed_at: new Date().toISOString(),
      matching_data,
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Already logged in — save directly and clear draft
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, ...payload,
        onboarding_draft: null, onboarding_step: 0,
      })
      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      // Laisse la récompense visible un instant avant la redirection
      setTimeout(() => router.push('/app/swipe'), 1400)
    } else {
      // Not yet logged in — save to localStorage and go to register
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, matching_data }))
      } catch {}
      setTimeout(() => router.push('/auth/register'), 1400)
    }
  }

  /**
   * Fin de parcours loueur.
   *
   * Pas de matching_data : le vecteur de compatibilité est un objet de
   * colocataire, il n'a pas d'équivalent côté loueur et reste donc NULL.
   * Les réponses des 3 questions partent dans profiles.owner_intent (JSONB,
   * migration 38) via une écriture séparée et best-effort : tant que la
   * migration n'est pas jouée, l'onboarding se termine quand même.
   * /
  async function finishLoueur() {
    if (saving || reward) return
    setSaving(true)
    setReward(STEP_REWARDS_LOUEUR[1])

    const ownerIntent = {
      timing: d.owner_timing || null,
      property_type: d.owner_property_type || null,
      cities: d.owner_cities,
      answered_at: new Date().toISOString(),
    }
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      onboarding_completed: true,
      role_confirmed_at: new Date().toISOString(),
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, ...payload,
        onboarding_draft: null, onboarding_step: 0,
      })
      // Colonne absente (migration 38 pas encore jouée) : on ignore l'échec.
      try {
        await supabase.from('profiles').update({ owner_intent: ownerIntent }).eq('id', user.id)
      } catch { /* noop * / }
      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      setTimeout(() => router.push('/app/annonce'), 1400)
    } else {
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, owner_intent: ownerIntent }))
      } catch {}
      setTimeout(() => router.push('/auth/register'), 1400)
    }
  }

  // Le rôle conditionne toute la suite du parcours : on ne laisse pas passer
  // l'étape 1 sans réponse.
  const isLoueur = d.role === 'loueur'
  const stepLabels = isLoueur ? STEP_LABELS_LOUEUR : STEP_LABELS_LOCATAIRE
  const stepRewards = isLoueur ? STEP_REWARDS_LOUEUR : STEP_REWARDS_LOCATAIRE
  const total = stepLabels.length
  const canProceed = step !== 1 || d.role === 'locataire' || d.role === 'loueur'
  // Dernière étape loueur : au moins la question « Où en es-tu ? » doit être
  // renseignée, les deux autres restent facultatives.
  const canFinishLoueur = d.owner_timing !== '' && !saving

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: BG }}
    >
      <div
        className="rounded-[24px] w-full relative"
        style={{
          padding: '36px 40px', maxWidth: '560px',
          background: SURFACE, border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Récompense de fin d'étape * /}
        <AnimatePresence>
          {reward && <StepReward message={reward} />}
        </AnimatePresence>

        {/* Resume banner * /}
        {resumeBanner && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: ACCENT, textAlign: 'center' }}>
            On reprend où tu t&apos;étais arrêté ✓
          </div>
        )}

        {/* Logo * /}
        <div className="flex justify-center mb-4">
          <Image
            src="/LOGO_ISALY.png" alt="ISALY" height={30} width={95}
            style={{ width: 'auto', height: '30px', objectFit: 'contain' }}
          />
        </div>

        {/* Progress bar gamifiée * /}
        <ProgressSteps step={step} total={total} />

        <div className="text-[10.5px] font-extrabold uppercase mb-1.5" style={{ letterSpacing: '2px', color: ACCENT }}>
          ÉTAPE {step} SUR {total}
        </div>
        {/* `isaly-serif` et non un fontFamily inline : globals.css force Outfit
            sur tous les h1-h6 avec !important, la déclaration inline qui vivait
            ici (DM Serif Display) n'a donc jamais été appliquée. * /}
        <h2 className="isaly-serif text-[26px] mb-4" style={{ color: TEXT, fontWeight: 500 }}>
          <RiseText key={step} mode="load" text={stepLabels[step - 1]} />
        </h2>

        {/* Scrollable step content * /}
        <div className="overflow-y-auto" style={{ maxHeight: '440px', paddingRight: '2px' }}>
          {/* Changement d'étape : le contenu monte en place (pas de sortie
              animée, pour ne jamais retarder l'étape suivante). * /}
          <motion.div
            key={step}
            initial={motionReduced ? false : { y: 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: DUR.element, ease: EASE_OUT }}
          >
          {step === 1 && <Step1 d={d} upd={upd} />}
          {/* Étape 2 : deux branches distinctes selon la réponse à la question de rôle. * /}
          {step === 2 && !isLoueur && <Step2 d={d} upd={upd} togglePill={togglePill} />}
          {step === 2 && isLoueur && (
            saving ? (
              <div className="py-10 text-center text-[14px]" style={{ color: TEXT_FAINT }}>
                Création de ton espace loueur…
              </div>
            ) : (
              <Step2Loueur d={d} upd={upd} togglePill={togglePill} />
            )
          )}
          {step === 3 && !isLoueur && (
            saving ? (
              <div className="py-10 text-center text-[14px]" style={{ color: TEXT_FAINT }}>
                Création de ton profil…
              </div>
            ) : (
              <MatchingQuiz
                dark
                initialAnswers={Object.keys(d.quiz_answers).length > 0 ? d.quiz_answers : undefined}
                onProgress={answers => upd('quiz_answers', answers)}
                onComplete={finish}
                budgetMin={d.budget_min}
              />
            )
          )}
          </motion.div>
        </div>

        {/* Navigation * /}
        {step < total && (
          <div className="flex gap-2.5 mt-5">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-full text-[13.5px] font-semibold border-[1.5px] cursor-pointer bg-transparent"
                style={{ borderColor: BORDER_STRONG, color: TEXT_DIM }}
              >
                ← Retour
              </button>
            )}
            <button
              onClick={next}
              disabled={!canProceed}
              className="py-3 rounded-full text-[13.5px] font-bold border-none transition-colors"
              style={{
                background: ACCENT, color: ACCENT_INK, flex: step > 1 ? 2 : 1,
                opacity: canProceed ? 1 : 0.45,
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (canProceed) e.currentTarget.style.background = ACCENT_DEEP }}
              onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
            >
              Continuer →
            </button>
          </div>
        )}
        {/* Dernière étape loueur : le parcours se conclut sur la création
            d'annonce, pas sur le dashboard swipe. * /}
        {step === total && isLoueur && (
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => setStep(1)}
              disabled={saving}
              className="flex-1 py-3 rounded-full text-[13.5px] font-semibold border-[1.5px] cursor-pointer bg-transparent"
              style={{ borderColor: BORDER_STRONG, color: TEXT_DIM }}
            >
              ← Retour
            </button>
            <button
              onClick={finishLoueur}
              disabled={!canFinishLoueur}
              className="py-3 rounded-full text-[13.5px] font-bold border-none transition-colors"
              style={{
                background: ACCENT, color: ACCENT_INK, flex: 2,
                opacity: canFinishLoueur ? 1 : 0.45,
                cursor: canFinishLoueur ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (canFinishLoueur) e.currentTarget.style.background = ACCENT_DEEP }}
              onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
            >
              Créer ma première annonce →
            </button>
          </div>
        )}
        {step === total && !isLoueur && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setStep(2)}
              className="cursor-pointer bg-transparent border-none text-[12.5px] font-semibold"
              style={{ color: TEXT_FAINT }}
            >
              ← Revenir à ma recherche
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
*/
