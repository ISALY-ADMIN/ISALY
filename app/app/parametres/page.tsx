'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Bell, ChevronRight, ExternalLink, KeyRound, LifeBuoy, Lock,
  Mail, Moon, Palette, ShieldCheck, Trash2, UserCog, X,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import ModeSwitcher from '@/components/ModeSwitcher'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useLease } from '@/contexts/LeaseContext'

// ═══════════════ Constantes ═══════════════

const OUTFIT = "'Outfit', sans-serif"

interface ToggleDef {
  key: string
  label: string
  description: string
}

const NOTIF_TOGGLES: ToggleDef[] = [
  { key: 'notif_matches',    label: 'Nouveaux matchs',         description: 'Être notifié quand vous avez un match' },
  { key: 'notif_messages',   label: 'Messages',                description: 'Recevoir une alerte à chaque message' },
  { key: 'notif_signalements', label: 'Signalements',          description: 'Suivi des problèmes déclarés dans la colocation' },
  { key: 'notif_loyers',     label: 'Loyers',                  description: 'Rappels et confirmations de paiement' },
  { key: 'notif_bail',       label: 'Mises à jour bail',       description: 'Signatures, avenants et documents du bail' },
  { key: 'notif_annonces',   label: 'Annonces similaires',     description: 'Suggestions basées sur vos critères' },
  { key: 'notif_promotions', label: 'Promotions & actualités', description: 'Offres spéciales et mises à jour ISALY' },
]

const PRIVACY_TOGGLES: ToggleDef[] = [
  { key: 'visible_swipe',     label: 'Profil visible dans le swipe',  description: 'Votre profil apparaît dans les suggestions' },
  { key: 'visible_recherche', label: 'Visible dans la recherche',     description: 'D’autres utilisateurs peuvent vous trouver' },
  { key: 'show_last_seen',    label: 'Afficher mon statut en ligne',  description: 'Les contacts voient votre dernière activité' },
  { key: 'show_location',     label: 'Afficher ma ville',             description: 'Votre ville est visible sur votre profil' },
]

const DEFAULT_PREFS: Record<string, boolean> = {
  notif_matches: true,
  notif_messages: true,
  notif_signalements: true,
  notif_loyers: true,
  notif_bail: true,
  notif_annonces: false,
  notif_promotions: false,
  visible_swipe: true,
  visible_recherche: true,
  show_last_seen: true,
  show_location: true,
}

const sectionVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

// ═══════════════ Briques UI ═══════════════

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={sectionVariants} style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', padding: '20px 22px', marginBottom: '16px', fontFamily: OUTFIT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.45)' }}>
        {icon}
        <h2 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          {title}
        </h2>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0 4px' }} />
      {children}
    </motion.section>
  )
}

/** Ligne de réglage : label + description à gauche, contrôle à droite, séparateur fin. */
function Row({ label, description, last, children }: { label: string; description?: string; last?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      padding: '13px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</div>
        {description && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{description}</div>}
      </div>
      {children}
    </div>
  )
}

/** Switch mint — même langage visuel que le reste du site. */
function Switch({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={value} aria-label={label} onClick={onChange}
      style={{
        position: 'relative', width: 44, height: 24, borderRadius: '20px', border: 'none',
        cursor: 'pointer', flexShrink: 0, transition: 'background 150ms ease, box-shadow 150ms ease',
        background: value ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.12)',
        boxShadow: value ? '0 2px 10px rgba(16,185,129,0.3)' : 'none',
      }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 150ms ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function LinkRow({ href, label, external, last }: { href: string; label: string; external?: boolean; last?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '13px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#10B981', fontFamily: OUTFIT }}>{label}</span>
        {external ? <ExternalLink size={14} style={{ color: '#10B981', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#10B981', flexShrink: 0 }} />}
      </div>
    </Link>
  )
}

function Badge({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
      fontSize: '11.5px', fontWeight: 800, padding: '5px 12px', borderRadius: '20px', fontFamily: OUTFIT,
      background: muted ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.12)',
      color: muted ? 'rgba(255,255,255,0.55)' : '#10B981',
      border: muted ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(16,185,129,0.3)',
    }}>{children}</span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '26px',
          background: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontFamily: OUTFIT,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#fff' }}>{title}</div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '10px', outline: 'none',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: '13.5px', fontFamily: OUTFIT,
}

const pinInputStyle: React.CSSProperties = {
  ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: '18px', fontWeight: 700,
}

// ═══════════════ Page ═══════════════

type PinDialog = 'set' | 'change' | 'disable' | null

export default function ParametresPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { setMode: syncContextMode } = useLease()

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [googleLinked, setGoogleLinked] = useState(false)
  const [mode, setModeState] = useState<'locataire' | 'loueur'>('locataire')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS)
  const [resetSending, setResetSending] = useState(false)

  // PIN coffre-fort
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null)
  const [pinDialog, setPinDialog] = useState<PinDialog>(null)
  const [pinFields, setPinFields] = useState({ current: '', next: '', confirm: '' })
  const [pinError, setPinError] = useState('')
  const [pinBusy, setPinBusy] = useState(false)

  // Push
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('unsupported')
  const [pushBusy, setPushBusy] = useState(false)

  // Suppression compte
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')
      setGoogleLinked((user.identities ?? []).some(i => i.provider === 'google'))
      const { data } = await supabase.from('profiles').select('role, preferences').eq('id', user.id).single()
      if (data) {
        setModeState(data.role === 'loueur' ? 'loueur' : 'locataire')
        if (data.preferences && typeof data.preferences === 'object') {
          setPrefs(p => ({ ...p, ...(data.preferences as Record<string, boolean>) }))
        }
      }
    }
    load()
    fetch('/api/vault/pin').then(r => r.json()).then((j: { configured?: boolean }) => setPinConfigured(!!j.configured)).catch(() => setPinConfigured(false))
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPushStatus(Notification.permission)
    }
  }, [])

  /** Sauvegarde immédiate d'un toggle (optimiste, toast en cas d'erreur). */
  function togglePref(key: string) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    if (!userId) return
    const supabase = createClient()
    supabase.from('profiles').update({ preferences: next }).eq('id', userId).then(({ error }) => {
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    })
  }

  /** Même mécanique que la sidebar : optimiste + contexte + PATCH silencieux. */
  function handleModeSwitch(newMode: 'locataire' | 'loueur') {
    if (newMode === mode) return
    setModeState(newMode)
    syncContextMode(newMode)
    fetch('/api/profile/mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    }).finally(() => window.location.reload())
  }

  async function sendPasswordReset() {
    if (!email) return
    setResetSending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setResetSending(false)
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    else toast({ title: 'Email envoyé', description: `Un lien de réinitialisation a été envoyé à ${email}.`, duration: 4000 })
  }

  // ── PIN ──
  function openPinDialog(d: PinDialog) {
    setPinFields({ current: '', next: '', confirm: '' })
    setPinError('')
    setPinDialog(d)
  }

  async function submitPin() {
    setPinError('')
    const { current, next, confirm } = pinFields
    if (pinDialog !== 'disable' && next !== confirm) { setPinError('Les deux codes ne correspondent pas.'); return }
    const body =
      pinDialog === 'set' ? { action: 'set', pin: next }
      : pinDialog === 'change' ? { action: 'change', pin: current, newPin: next }
      : { action: 'disable', pin: current }
    setPinBusy(true)
    const res = await fetch('/api/vault/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    setPinBusy(false)
    if (!res.ok) { setPinError(j.error ?? 'Une erreur est survenue.'); return }
    setPinConfigured(pinDialog !== 'disable')
    setPinDialog(null)
    toast({
      title: pinDialog === 'set' ? 'PIN activé' : pinDialog === 'change' ? 'PIN modifié' : 'PIN désactivé',
      description: pinDialog === 'disable' ? 'Le coffre-fort n’est plus protégé par PIN.' : 'Votre coffre-fort de documents est protégé.',
      duration: 3000,
    })
  }

  // ── Push ──
  async function enablePush() {
    setPushBusy(true)
    try {
      const permission = await Notification.requestPermission()
      setPushStatus(permission)
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        })
        toast({ title: 'Notifications push activées', duration: 3000 })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d’activer les notifications push.', variant: 'destructive' })
    }
    setPushBusy(false)
  }

  // ── Suppression ──
  async function confirmDelete() {
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (!res.ok) {
      setDeleting(false)
      toast({ title: 'Erreur', description: 'La suppression a échoué. Contactez le support.', variant: 'destructive' })
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const pinDialogTitle = pinDialog === 'set' ? 'Configurer le PIN' : pinDialog === 'change' ? 'Modifier le PIN' : 'Désactiver le PIN'

  return (
    <>
      <Topbar title="Paramètres" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ marginBottom: '28px' }}>
            <h1 style={{ fontFamily: OUTFIT, fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Paramètres</h1>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)' }}>Gérez vos préférences et votre compte.</div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}>

            {/* ── 1. Compte & sécurité ── */}
            <Section icon={<ShieldCheck size={14} />} title="Compte & sécurité">
              <Row label="Adresse email" description={email || '…'}>
                {googleLinked && <Badge><Mail size={11} /> Compte Google lié</Badge>}
              </Row>
              <Row label="Mot de passe" description="Un lien de réinitialisation vous sera envoyé par email">
                <Button size="sm" variant="secondary" loading={resetSending} onClick={sendPasswordReset}>
                  <KeyRound size={13} /> Modifier le mot de passe
                </Button>
              </Row>
              <Row label="Code PIN du coffre-fort" description="Protège l'accès à vos documents" last>
                {pinConfigured === null ? (
                  <Badge muted>…</Badge>
                ) : pinConfigured ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="secondary" onClick={() => openPinDialog('change')}>Modifier le PIN</Button>
                    <Button size="sm" variant="ghost" onClick={() => openPinDialog('disable')}>Désactiver</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => openPinDialog('set')}><Lock size={13} /> Configurer le PIN</Button>
                )}
              </Row>
              <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#F87171' }}>Supprimer mon compte</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      Toutes vos données seront supprimées définitivement.
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => { setDeleteText(''); setDeleteOpen(true) }}>
                    <Trash2 size={13} /> Supprimer
                  </Button>
                </div>
              </div>
            </Section>

            {/* ── 2. Mode & profil ── */}
            <Section icon={<UserCog size={14} />} title="Mode & profil">
              <Row label="Mode d'utilisation" description="Basculez entre la recherche de colocation et la gestion de vos annonces">
                <div style={{ width: 190, flexShrink: 0 }}>
                  <ModeSwitcher currentMode={mode} onSwitch={handleModeSwitch} />
                </div>
              </Row>
              <LinkRow href="/app/profil" label="Modifier mon profil" last />
            </Section>

            {/* ── 3. Notifications ── */}
            <Section icon={<Bell size={14} />} title="Notifications">
              {NOTIF_TOGGLES.map(t => (
                <Row key={t.key} label={t.label} description={t.description}>
                  <Switch value={prefs[t.key] ?? false} onChange={() => togglePref(t.key)} label={t.label} />
                </Row>
              ))}
              <Row label="Notifications push" description="Alertes sur cet appareil, même app fermée" last>
                {pushStatus === 'granted' ? (
                  <Badge>Activées</Badge>
                ) : pushStatus === 'denied' ? (
                  <Badge muted>Bloquées par le navigateur</Badge>
                ) : pushStatus === 'default' ? (
                  <Button size="sm" variant="secondary" loading={pushBusy} onClick={enablePush}>Activer les notifications push</Button>
                ) : (
                  <Badge muted>Non supportées</Badge>
                )}
              </Row>
            </Section>

            {/* ── 4. Confidentialité & données ── */}
            <Section icon={<Lock size={14} />} title="Confidentialité & données">
              {PRIVACY_TOGGLES.map(t => (
                <Row key={t.key} label={t.label} description={t.description}>
                  <Switch value={prefs[t.key] ?? false} onChange={() => togglePref(t.key)} label={t.label} />
                </Row>
              ))}
              <LinkRow href="/confidentialite" label="Politique de confidentialité" />
              <LinkRow href="/cgu" label="Conditions générales d'utilisation" last />
            </Section>

            {/* ── 5. Apparence ── */}
            <Section icon={<Palette size={14} />} title="Apparence">
              <Row label="Thème" description="Le mode clair arrive prochainement" last>
                <Badge><Moon size={11} /> Mode sombre</Badge>
              </Row>
            </Section>

            {/* ── 6. Support & informations ── */}
            <Section icon={<LifeBuoy size={14} />} title="Support & informations">
              <LinkRow href="/contact" label="Contacter le support" />
              <LinkRow href="/contact?sujet=bug" label="Signaler un bug" />
              <Row label="Version" last>
                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)', fontFamily: OUTFIT }}>ISALY v1.0 — isaly.fr</span>
              </Row>
            </Section>
          </motion.div>
        </div>
      </div>

      {/* ── Modale PIN ── */}
      {pinDialog && (
        <Modal title={pinDialogTitle} onClose={() => setPinDialog(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(pinDialog === 'change' || pinDialog === 'disable') && (
              <input style={pinInputStyle} type="password" inputMode="numeric" maxLength={4} placeholder="PIN actuel" autoFocus
                value={pinFields.current} onChange={e => setPinFields(f => ({ ...f, current: e.target.value.replace(/\D/g, '') }))} />
            )}
            {pinDialog !== 'disable' && (
              <>
                <input style={pinInputStyle} type="password" inputMode="numeric" maxLength={4} placeholder="Nouveau PIN" autoFocus={pinDialog === 'set'}
                  value={pinFields.next} onChange={e => setPinFields(f => ({ ...f, next: e.target.value.replace(/\D/g, '') }))} />
                <input style={pinInputStyle} type="password" inputMode="numeric" maxLength={4} placeholder="Confirmer"
                  value={pinFields.confirm} onChange={e => setPinFields(f => ({ ...f, confirm: e.target.value.replace(/\D/g, '') }))} />
              </>
            )}
            {pinError && <p style={{ fontSize: '12px', color: '#EF4444', margin: 0 }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <Button loading={pinBusy} className="flex-1"
                disabled={
                  (pinDialog !== 'set' && pinFields.current.length !== 4) ||
                  (pinDialog !== 'disable' && (pinFields.next.length !== 4 || pinFields.confirm.length !== 4))
                }
                onClick={submitPin}>
                {pinDialog === 'disable' ? 'Désactiver le PIN' : 'Valider'}
              </Button>
              <Button variant="ghost" onClick={() => setPinDialog(null)}>Annuler</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modale suppression compte ── */}
      {deleteOpen && (
        <Modal title="Supprimer mon compte" onClose={() => setDeleteOpen(false)}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 16px' }}>
            Cette action est <strong style={{ color: '#F87171' }}>irréversible</strong> : profil, annonces, messages,
            baux et documents seront définitivement supprimés.
            Tapez <strong style={{ color: '#fff' }}>SUPPRIMER</strong> pour confirmer.
          </p>
          <input style={inputStyle} placeholder="SUPPRIMER" value={deleteText} autoFocus
            onChange={e => setDeleteText(e.target.value)} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <Button variant="danger" className="flex-1" loading={deleting} disabled={deleteText !== 'SUPPRIMER'} onClick={confirmDelete}>
              <Trash2 size={14} /> Supprimer définitivement
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Annuler</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
