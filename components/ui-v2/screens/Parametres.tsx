'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Modal, Segmented, SkelPanel, Toggle, eur, useToast } from '@/components/ui-v2'
import { useShell } from '@/components/ui-v2/shell/AppShell'

type Theme = 'auto' | 'light' | 'dark'

/* Mêmes préférences que l'ancienne page (profiles.preferences), mêmes valeurs par défaut. */
const DEFAULT_PREFS: Record<string, boolean> = {
  notif_matches: true, notif_messages: true, notif_signalements: true, notif_loyers: true,
  notif_bail: true, notif_annonces: false, notif_promotions: false,
  notif_alertes: true, notif_candidatures: true,
  show_score: true, show_first_name: true, show_response_time: true,
}

const NOTIFS = {
  locataire: [
    ['notif_annonces', 'Nouvelles annonces compatibles'], ['notif_messages', 'Messages'], ['notif_matches', 'Réponses à mes demandes'],
    ['notif_alertes', 'Alertes de recherche'], ['notif_loyers', 'Rappels de loyer'],
  ],
  loueur: [
    ['notif_candidatures', 'Nouvelles candidatures'], ['notif_messages', 'Messages'], ['notif_signalements', 'Signalements de tes locataires'],
    ['notif_loyers', 'Loyers en retard'], ['notif_bail', 'Préavis et fins de bail'],
  ],
} as const

interface Alert { id: string; city: string | null; budget_max: number | null; is_active: boolean; notify_push: boolean }

function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  try { localStorage.setItem('isaly-theme', t) } catch { /* stockage indisponible */ }
}

/** Paramètres (dashboard v2), communs aux deux modes. */
export default function Parametres() {
  const router = useRouter()
  const toast = useToast()
  const { mode, switchMode } = useShell()
  const [theme, setTheme] = useState<Theme>('auto')
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null)
  const [visible, setVisible] = useState(true)
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null)
  const [pinDialog, setPinDialog] = useState<null | 'set' | 'change' | 'disable'>(null)
  const [pin, setPin] = useState({ current: '', next: '', confirm: '' })
  const [pinErr, setPinErr] = useState('')
  const [push, setPush] = useState<'unsupported' | NotificationPermission>('unsupported')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [delOpen, setDelOpen] = useState(false)
  const [delText, setDelText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setTheme((localStorage.getItem('isaly-theme') as Theme) || 'auto') } catch { /* rien */ }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setEmail(user.email ?? '')
    const { data } = await supabase.from('profiles').select('preferences, is_visible').eq('id', user.id).maybeSingle()
    setPrefs({ ...DEFAULT_PREFS, ...((data?.preferences as Record<string, boolean> | null) ?? {}) })
    setVisible(data?.is_visible !== false)
    fetch('/api/vault/pin').then(r => r.json()).then(j => setPinConfigured(!!j.configured)).catch(() => setPinConfigured(false))
    fetch('/api/alerts').then(r => r.json()).then(j => setAlerts(j.alerts ?? [])).catch(() => setAlerts([]))
    if ('Notification' in window && 'serviceWorker' in navigator) setPush(Notification.permission)
  }, [])

  useEffect(() => { load() }, [load])

  function togglePref(key: string) {
    if (!prefs || !userId) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    createClient().from('profiles').update({ preferences: next }).eq('id', userId).then(({ error }) => {
      if (error) { toast('Le réglage n’a pas pu être enregistré'); setPrefs(prefs) }
    })
  }

  async function toggleVisible(v: boolean) {
    if (!userId) return
    setVisible(v)
    const { error } = await createClient().from('profiles').update({ is_visible: v }).eq('id', userId)
    if (error) { setVisible(!v); toast('Le réglage n’a pas pu être enregistré') }
  }

  async function resetPassword() {
    if (!email) return
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/update-password` })
    toast(error ? 'L’e-mail n’a pas pu être envoyé' : `Un lien de réinitialisation a été envoyé à ${email}`)
  }

  async function submitPin() {
    setPinErr('')
    if (pinDialog !== 'disable' && pin.next !== pin.confirm) return setPinErr('Les deux codes ne correspondent pas.')
    const body = pinDialog === 'set' ? { action: 'set', pin: pin.next }
      : pinDialog === 'change' ? { action: 'change', pin: pin.current, newPin: pin.next }
      : { action: 'disable', pin: pin.current }
    setBusy(true)
    const res = await fetch('/api/vault/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setPinErr(j.error ?? 'Une erreur est survenue.')
    setPinConfigured(pinDialog !== 'disable')
    setPinDialog(null)
    toast(pinDialog === 'set' ? 'Code du coffre-fort activé' : pinDialog === 'change' ? 'Code du coffre-fort modifié' : 'Code du coffre-fort désactivé')
  }

  async function enablePush() {
    try {
      const permission = await Notification.requestPermission()
      setPush(permission)
      if (permission !== 'granted') return
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY })
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
      toast('Notifications activées sur cet appareil')
    } catch {
      toast('Les notifications n’ont pas pu être activées')
    }
  }

  async function removeAlert(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast('L’alerte n’a pas pu être supprimée')
    setAlerts(a => a.filter(x => x.id !== id))
    toast('Alerte supprimée')
  }

  async function deleteAccount() {
    setBusy(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (!res.ok) { setBusy(false); return toast('La suppression a échoué, contacte le support') }
    await createClient().auth.signOut()
    router.push('/')
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!prefs) return <div className="v-grid g2"><SkelPanel lines={3} /><SkelPanel lines={5} /><SkelPanel lines={2} /><SkelPanel lines={3} /></div>

  const other = mode === 'locataire' ? 'bailleur' : 'locataire'
  const modeLabel = mode === 'locataire' ? 'locataire' : 'bailleur'
  const privacy: [string, string, boolean, (v: boolean) => void][] = mode === 'loueur'
    ? [['show_first_name', 'Afficher mon prénom sur mes annonces', prefs.show_first_name, () => togglePref('show_first_name')],
       ['show_response_time', 'Montrer mon délai de réponse', prefs.show_response_time, () => togglePref('show_response_time')]]
    : [['is_visible', 'Montrer mon profil aux colocations', visible, v => toggleVisible(v)],
       ['show_score', 'Afficher mon ISALY Score', prefs.show_score, () => togglePref('show_score')]]

  return (
    <div className="screen">
      <div className="v-grid g2">
        <section className="panel settings">
          <h2>Apparence</h2>
          <div className="setrow">
            <span className="grow"><span className="t">Thème</span><span className="s">Automatique suit le réglage de ton appareil.</span></span>
            <Segmented options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }]} value={theme} onChange={t => { setTheme(t); applyTheme(t) }} label="Thème" />
          </div>
          <div className="setrow">
            <span className="grow"><span className="t">Mode actuel : {modeLabel}</span><span className="s">Tu peux changer de mode à tout moment.</span></span>
            <Button variant="glass" size="sm" onClick={() => switchMode(mode === 'locataire' ? 'loueur' : 'locataire', '/app/dashboard-home')}>Passer en mode {other}</Button>
          </div>
        </section>

        <section className="panel settings">
          <h2>Notifications</h2>
          {NOTIFS[mode].map(([k, l]) => (
            <div key={k} className="setrow">
              <span className="grow"><span className="t">{l}</span></span>
              <Toggle checked={!!prefs[k]} onChange={() => togglePref(k)} label={l} />
            </div>
          ))}
          {push !== 'unsupported' && (
            <div className="setrow">
              <span className="grow"><span className="t">Notifications sur cet appareil</span><span className="s">{push === 'granted' ? 'Activées' : push === 'denied' ? 'Bloquées dans les réglages du navigateur' : 'Désactivées'}</span></span>
              {push === 'default' && <Button variant="glass" size="sm" onClick={enablePush}>Activer</Button>}
            </div>
          )}
          {mode === 'locataire' && alerts.length > 0 && (
            <>
              <h2 style={{ marginTop: 18 }}>Alertes de recherche</h2>
              {alerts.map(a => (
                <div key={a.id} className="setrow">
                  <span className="grow"><span className="t">{a.city || 'Toutes les villes'}{a.budget_max ? `, jusqu’à ${eur(a.budget_max)}` : ''}</span><span className="s">{a.notify_push ? 'Dès qu’une annonce sort' : 'Une fois par jour'}</span></span>
                  <Button variant="ghost" size="sm" onClick={() => removeAlert(a.id)}>Supprimer</Button>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="panel settings">
          <h2>Confidentialité</h2>
          {privacy.map(([k, l, v, fn]) => (
            <div key={k} className="setrow">
              <span className="grow"><span className="t">{l}</span></span>
              <Toggle checked={v} onChange={fn} label={l} />
            </div>
          ))}
        </section>

        <section className="panel settings">
          <h2>Compte et sécurité</h2>
          <div className="setrow"><span className="grow"><span className="t">{email}</span><span className="s">Adresse de connexion</span></span></div>
          <div className="setrow">
            <span className="grow"><span className="t">Mot de passe</span><span className="s">Un lien de réinitialisation t’est envoyé par e-mail.</span></span>
            <Button variant="glass" size="sm" onClick={resetPassword}>Modifier</Button>
          </div>
          {mode === 'locataire' && (
            <div className="setrow">
              <span className="grow"><span className="t">Code du coffre-fort</span><span className="s">4 chiffres, demandé à chaque ouverture</span></span>
              <Button variant="glass" size="sm" onClick={() => { setPin({ current: '', next: '', confirm: '' }); setPinErr(''); setPinDialog(pinConfigured ? 'change' : 'set') }}>{pinConfigured ? 'Modifier' : 'Activer'}</Button>
            </div>
          )}
          <div className="setrow">
            <span className="grow"><span className="t">Se déconnecter</span></span>
            <Button variant="glass" size="sm" icon="logout" onClick={signOut}>Se déconnecter</Button>
          </div>
          <div className="setrow">
            <span className="grow"><span className="t">Supprimer mon compte</span><span className="s">Toutes tes données seront supprimées définitivement.</span></span>
            <Button variant="danger" size="sm" onClick={() => { setDelText(''); setDelOpen(true) }}>Supprimer</Button>
          </div>
        </section>
      </div>

      <Modal
        open={!!pinDialog}
        onClose={() => setPinDialog(null)}
        title={pinDialog === 'set' ? 'Activer le code du coffre-fort' : pinDialog === 'change' ? 'Modifier le code du coffre-fort' : 'Désactiver le code du coffre-fort'}
        footer={<>
          {pinDialog === 'change' && <Button variant="ghost" onClick={() => { setPinErr(''); setPinDialog('disable') }}>Désactiver le code</Button>}
          <Button variant="ghost" onClick={() => setPinDialog(null)}>Annuler</Button>
          <Button variant={pinDialog === 'disable' ? 'danger' : 'main'} disabled={busy} onClick={submitPin}>Enregistrer</Button>
        </>}
      >
        <div className="form mt">
          {pinDialog !== 'set' && <div className="field"><label htmlFor="pcur">Code actuel</label><input id="pcur" className="input" inputMode="numeric" maxLength={4} type="password" value={pin.current} onChange={e => setPin({ ...pin, current: e.target.value.replace(/\D/g, '') })} /></div>}
          {pinDialog !== 'disable' && (
            <div className="f2">
              <div className="field"><label htmlFor="pnew">Nouveau code</label><input id="pnew" className="input" inputMode="numeric" maxLength={4} type="password" value={pin.next} onChange={e => setPin({ ...pin, next: e.target.value.replace(/\D/g, '') })} /></div>
              <div className="field"><label htmlFor="pconf">Confirmation</label><input id="pconf" className="input" inputMode="numeric" maxLength={4} type="password" value={pin.confirm} onChange={e => setPin({ ...pin, confirm: e.target.value.replace(/\D/g, '') })} /></div>
            </div>
          )}
          {pinErr && <p className="s" role="alert" style={{ color: 'var(--bad-ink)' }}>{pinErr}</p>}
        </div>
      </Modal>

      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Supprimer ton compte"
        lead="Cette action est définitive. Écris SUPPRIMER pour confirmer."
        footer={<><Button variant="ghost" onClick={() => setDelOpen(false)}>Annuler</Button><Button variant="danger" disabled={busy || delText !== 'SUPPRIMER'} onClick={deleteAccount}>Supprimer mon compte</Button></>}
      >
        <div className="field mt"><label htmlFor="deltext" className="sr">Confirmation</label><input id="deltext" className="input" placeholder="SUPPRIMER" value={delText} onChange={e => setDelText(e.target.value)} /></div>
      </Modal>
    </div>
  )
}
