'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'
import { Bubble, Icon, Logo, Meter } from '../primitives'
import { Modal } from '../Modal'
import { ToastProvider, useToast } from '../Toast'
import { SvgDefs } from '../SvgDefs'
import { COL } from '../colors'
import { agoLabel, dayMonth } from '../format'
import type { IconName } from '../icons'
import { NAV, activeItem, isItem, isV2Screen, routeForMode, type BadgeKey, type Mode, type NavItem } from './nav'

/* ── Données de la coque ──────────────────────────────────────────── */
export interface ShellData {
  user: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null; isAdmin: boolean }
  mode: Mode
  badges: Record<BadgeKey, number>
  swipes: { used: number; limit: number; plus: boolean }
  autogestion: { required: boolean; active: boolean; status: string | null; periodEnd: string | null }
}

interface ShellCtx {
  data: ShellData | null
  mode: Mode
  refresh: () => void
  /** Change de mode (écrit profiles.role) puis ouvre la route voulue. */
  switchMode: (mode: Mode, route?: string) => Promise<void>
  /** Titre de la barre du haut imposé par l'écran (sinon celui de la navigation). */
  setTitle: (t: string | null) => void
}

const Ctx = createContext<ShellCtx>({
  data: null,
  mode: 'locataire',
  refresh: () => {},
  switchMode: async () => {},
  setTitle: () => {},
})

export function useShell() {
  return useContext(Ctx)
}

/** Un écran impose son titre dans la barre du haut. */
export function useShellTitle(title: string | null | undefined) {
  const { setTitle } = useShell()
  useEffect(() => {
    if (!title) return
    setTitle(title)
    return () => setTitle(null)
  }, [title, setTitle])
}

const EMOJI = new RegExp('[\\p{Extended_Pictographic}\\uFE0F\\u200D\\u2713\\u2714]', 'gu')
/** Aucun emoji à l'écran : les titres de notifications anciens en contiennent. */
export const noEmoji = (s: string) => s.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim()

/* ── Coque ────────────────────────────────────────────────────────── */
export default function AppShell({ children, fontClass }: { children: ReactNode; fontClass: string }) {
  return (
    <div className={`ui-v2 ${fontClass}`}>
      <ToastProvider>
        <ShellInner>{children}</ShellInner>
      </ToastProvider>
    </div>
  )
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/app/dashboard-home'
  const router = useRouter()
  const toast = useToast()
  const { setMode: syncLeaseMode, mode: leaseMode } = useLease()
  const [data, setData] = useState<ShellData | null>(null)
  const [mode, setModeState] = useState<Mode>(leaseMode)
  const [title, setTitleState] = useState<string | null>(null)
  const [pop, setPop] = useState<null | 'bell' | 'me'>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/shell', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as ShellData
      setData(json)
      setModeState(json.mode)
      syncLeaseMode(json.mode)
    } catch {
      /* la coque reste utilisable sans ses compteurs */
    }
  }, [syncLeaseMode])

  useEffect(() => {
    load()
  }, [load, pathname])

  // Pastille des messages en temps réel + événements des anciens écrans.
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let alive = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !alive) return
      channel = supabase
        .channel(`shell-unread:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const m = payload.new as { sender_id: string; read: boolean }
          if (m.sender_id !== user.id && !m.read) {
            setData(d => (d ? { ...d, badges: { ...d.badges, messages: d.badges.messages + 1 } } : d))
          }
        })
        .subscribe()
    })
    function onMessagesRead() {
      load()
    }
    /** Repris de l'ancienne barre latérale : la visite d'un signalement marque ses notifications comme lues. */
    async function onMaintenanceSeen() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      await supabase.from('notifications').update({ read: true }).eq('user_id', u.id).eq('type', 'maintenance').eq('read', false)
    }
    window.addEventListener('messages-read', onMessagesRead)
    window.addEventListener('maintenance-seen', onMaintenanceSeen)
    return () => {
      alive = false
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('messages-read', onMessagesRead)
      window.removeEventListener('maintenance-seen', onMaintenanceSeen)
    }
  }, [load])

  // Thème automatique : suit l'appareil tant que le choix est « auto ».
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      let t = 'auto'
      try {
        t = localStorage.getItem('isaly-theme') || 'auto'
      } catch {
        /* stockage indisponible */
      }
      if (t === 'auto') document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Échap ferme les menus ; clic en dehors aussi.
  useEffect(() => {
    if (!pop) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPop(null)
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.pop') && !t.closest('[data-pop-trigger]')) setPop(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [pop])

  useEffect(() => {
    setPop(null)
    setMenuOpen(false)
  }, [pathname])

  const switchMode = useCallback(
    async (next: Mode, route?: string) => {
      if (switching) return
      setSwitching(true)
      const target = route ?? routeForMode(next, pathname)
      if (next !== mode) {
        setModeState(next)
        syncLeaseMode(next)
        toast(next === 'loueur' ? 'Mode bailleur activé' : 'Mode locataire activé')
        // Même écriture que l'ancien sélecteur : PATCH /api/profile/mode -> profiles.role.
        try {
          await fetch('/api/profile/mode', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: next }),
          })
        } catch {
          /* l'écran suivant relira le rôle en base */
        }
      }
      setPop(null)
      setMenuOpen(false)
      router.push(target)
      router.refresh()
      setSwitching(false)
    },
    [mode, pathname, router, switching, syncLeaseMode, toast],
  )

  const setTitle = useCallback((t: string | null) => setTitleState(t), [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const current = activeItem(mode, pathname)
  const barTitle = title ?? current?.title ?? 'ISALY'
  const legacy = !isV2Screen(pathname, mode)

  const ctx = useMemo<ShellCtx>(() => ({ data, mode, refresh: load, switchMode, setTitle }), [data, mode, load, switchMode, setTitle])

  return (
    <Ctx.Provider value={ctx}>
      <SvgDefs />
      <a className="skip" href="#contenu">Aller au contenu</a>
      <div className="app">
        <aside className="side">
          <Link className="brand" href="/app/dashboard-home" aria-label="ISALY, tableau de bord">
            <Logo />isaly
          </Link>
          <ModeSwitch mode={mode} onSwitch={m => switchMode(m)} busy={switching} />
          <nav className="nav" aria-label="Navigation principale">
            <NavLinks mode={mode} current={current} badges={data?.badges} isAdmin={data?.user.isAdmin} pathname={pathname} />
          </nav>
          <SideCard mode={mode} data={data} />
          <div className="side-me">
            <Bubble name={data?.user.firstName || data?.user.email || '?'} color={COL.violet} size={38} avatar={data?.user.avatarUrl} />
            <div className="grow">
              <b>{fullName(data) || 'Mon profil'}</b>
              <span>{data?.user.email ?? ''}</span>
            </div>
            <button className="iconbtn" type="button" aria-label="Se déconnecter" style={{ width: 38, height: 38 }} onClick={signOut}>
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="bar">
            <span className="logo-m"><Logo /></span>
            <h1>{barTitle}</h1>
            <span className="sp" />
            <div className="anchor">
              <Bell open={pop === 'bell'} onToggle={() => setPop(p => (p === 'bell' ? null : 'bell'))} onClose={() => setPop(null)} />
            </div>
            <div className="anchor">
              <button
                className="avatar-btn"
                type="button"
                aria-label="Mon compte"
                aria-expanded={pop === 'me'}
                data-pop-trigger
                onClick={() => setPop(p => (p === 'me' ? null : 'me'))}
              >
                <Bubble name={data?.user.firstName || '?'} color={COL.violet} size={44} avatar={data?.user.avatarUrl} />
              </button>
              {pop === 'me' && (
                <div className="pop sm" role="menu">
                  <Link className="item" role="menuitem" href="/app/profil" onClick={() => setPop(null)}>
                    <Icon name="user" size={18} /><span>Mon profil</span>
                  </Link>
                  <Link className="item" role="menuitem" href="/app/parametres" onClick={() => setPop(null)}>
                    <Icon name="gear" size={18} /><span>Paramètres</span>
                  </Link>
                  <button className="item" type="button" role="menuitem" onClick={() => switchMode(mode === 'locataire' ? 'loueur' : 'locataire')}>
                    <Icon name="house" size={18} />
                    <span>Passer en mode {mode === 'locataire' ? 'bailleur' : 'locataire'}</span>
                  </button>
                  <button className="item" type="button" role="menuitem" onClick={signOut}>
                    <Icon name="logout" size={18} /><span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          </header>
          <main className={legacy ? 'view is-legacy' : 'view'} id="contenu" tabIndex={-1}>
            {legacy ? <div className="ui-legacy">{children}</div> : children}
          </main>
        </div>

        <nav className="tabbar" aria-label="Navigation principale">
          {NAV[mode].filter(isItem).filter(it => it.tab).map(it => {
            const b = it.badge ? data?.badges[it.badge] ?? 0 : 0
            return (
              <Link key={it.id} href={it.href} aria-current={current?.id === it.id ? 'page' : undefined}>
                <Icon name={it.ic} size={22} />
                <span>{it.tab}</span>
                {b > 0 && <span className="count">{b}</span>}
              </Link>
            )
          })}
          <button type="button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={22} />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div className="mt">
          <ModeSwitch mode={mode} onSwitch={m => switchMode(m)} busy={switching} />
        </div>
        <nav className="menu-nav" aria-label="Toutes les rubriques">
          <NavLinks mode={mode} current={current} badges={data?.badges} isAdmin={data?.user.isAdmin} pathname={pathname} inMenu />
        </nav>
      </Modal>

      <div id="ui-v2-portal" />
    </Ctx.Provider>
  )
}

function fullName(d: ShellData | null) {
  if (!d) return ''
  return `${d.user.firstName} ${d.user.lastName}`.trim()
}

/* ── Sélecteur Locataire / Bailleur ───────────────────────────────── */
function ModeSwitch({ mode, onSwitch, busy }: { mode: Mode; onSwitch: (m: Mode) => void; busy: boolean }) {
  return (
    <div className="modeswitch" data-mode={mode === 'loueur' ? 'bailleur' : 'locataire'} role="group" aria-label="Mode de l’espace">
      <span className="knob" aria-hidden="true" />
      <button type="button" aria-pressed={mode === 'locataire'} disabled={busy} onClick={() => onSwitch('locataire')}>Locataire</button>
      <button type="button" aria-pressed={mode === 'loueur'} disabled={busy} onClick={() => onSwitch('loueur')}>Bailleur</button>
    </div>
  )
}

/* ── Liens de navigation (barre latérale et menu mobile) ──────────── */
function NavLinks({
  mode, current, badges, isAdmin, pathname, inMenu,
}: {
  mode: Mode
  current: NavItem | null
  badges?: Record<BadgeKey, number>
  isAdmin?: boolean
  pathname: string
  inMenu?: boolean
}) {
  return (
    <>
      {NAV[mode].map((it, i) => {
        if (!isItem(it)) return inMenu ? <h3 key={`g${i}`}>{it.group}</h3> : <h2 key={`g${i}`}>{it.group}</h2>
        const b = it.badge ? badges?.[it.badge] ?? 0 : 0
        return (
          <Link key={it.id} href={it.href} aria-current={current?.id === it.id ? 'page' : undefined}>
            <Icon name={it.ic} />
            <span>{it.label}</span>
            {b > 0 && <span className="count" aria-label={`${b} à voir`}>{b}</span>}
          </Link>
        )
      })}
      {isAdmin && (
        <Link href="/admin" aria-current={pathname.startsWith('/admin') ? 'page' : undefined}>
          <Icon name="shield" />
          <span>Administration</span>
        </Link>
      )}
    </>
  )
}

/* ── Carte d'état en bas de la barre latérale ─────────────────────── */
function SideCard({ mode, data }: { mode: Mode; data: ShellData | null }) {
  if (!data) return <div className="side-card" aria-hidden="true" style={{ minHeight: 86 }} />
  if (mode === 'locataire') {
    if (data.swipes.plus) {
      return (
        <div className="side-card">
          <b>Swiper Plus actif</b>
          <p>Swipes sans limite, demandes prioritaires.</p>
        </div>
      )
    }
    const left = Math.max(0, data.swipes.limit - data.swipes.used)
    return (
      <div className="side-card">
        <b>{left} swipe{left > 1 ? 's' : ''} sur {data.swipes.limit} aujourd’hui</b>
        <p>Ils reviennent chaque jour.</p>
        <Meter value={(left / (data.swipes.limit || 10)) * 100} />
        <Link className="link" href="/app/paiement" style={{ display: 'inline-block', marginTop: 10 }}>Passer à Swiper Plus</Link>
      </div>
    )
  }
  if (data.autogestion.active) {
    return (
      <div className="side-card">
        <b>Autogestion active</b>
        {data.autogestion.periodEnd && <p>Renouvellement le {dayMonth(data.autogestion.periodEnd)}.</p>}
        <Link className="link" href="/app/paiement">Gérer l’abonnement</Link>
      </div>
    )
  }
  return (
    <div className="side-card">
      <b>Abonnement inactif</b>
      <p>Tes logements en autogestion sont en lecture seule.</p>
      <Link className="link" href="/app/paiement">Réactiver</Link>
    </div>
  )
}

/* ── Cloche : notifications existantes (remplace l'onglet Alertes) ── */
interface Notif {
  id: string
  type: string | null
  title: string
  body: string | null
  read: boolean
  link: string | null
  created_at: string
}

const NOTIF_ICON: Record<string, [IconName, string]> = {
  message: ['chat', 'brand'],
  match: ['spark', 'ok'],
  listing: ['building', 'info'],
  maintenance: ['wrench', 'bad'],
  boost: ['bolt', 'brand'],
  visit: ['calendar', 'brand'],
  candidature: ['inbox', 'brand'],
  loyer: ['euro', 'warn'],
  rent: ['euro', 'warn'],
  preavis: ['door', 'info'],
  system: ['info', 'info'],
}

function Bell({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [items, setItems] = useState<Notif[]>([])
  const [loaded, setLoaded] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const unread = items.filter(n => !n.read).length

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      const json = await res.json()
      setItems((json.notifications ?? []) as Notif[])
    } catch {
      /* cloche vide plutôt qu'une erreur */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let alive = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !alive) return
      // Callback .on() enregistré avant .subscribe().
      channel = supabase
        .channel(`shell-notifs:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
          if (payload?.new) setItems(prev => [payload.new as Notif, ...prev])
        })
        .subscribe()
    })
    return () => {
      alive = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchAll])

  async function readAll() {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    onClose()
    toast('Notifications marquées comme lues')
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'all' }) }).catch(() => {})
  }

  async function openItem(n: Notif) {
    setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)))
    onClose()
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
    if (n.link) router.push(n.link)
  }

  return (
    <>
      <button ref={btn} className="iconbtn" type="button" aria-label="Notifications" aria-expanded={open} data-pop-trigger onClick={onToggle}>
        <Icon name="bell" />
        {unread > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="pop" role="dialog" aria-label="Notifications">
          <div className="hrow" style={{ padding: '4px 6px 4px 10px' }}>
            <h3 style={{ padding: '4px 0' }}>Notifications</h3>
            {unread > 0 && <button className="link" type="button" onClick={readAll}>Tout marquer comme lu</button>}
          </div>
          <div style={{ maxHeight: 'min(60vh,480px)', overflowY: 'auto' }}>
            {loaded && items.length === 0 && <p className="s" style={{ padding: '10px' }}>Aucune notification pour le moment.</p>}
            {items.map(n => {
              const [ic, k] = NOTIF_ICON[n.type ?? ''] ?? ['bell', '']
              return (
                <button key={n.id} className="item" type="button" onClick={() => openItem(n)}>
                  <span className={k ? `ico ${k}` : 'ico'}><Icon name={ic} size={18} /></span>
                  <span className="grow">
                    <span className="t" style={{ fontSize: 14.5, fontWeight: n.read ? 500 : 600 }}>{noEmoji(n.title)}</span>
                    <span className="s">{agoLabel(n.created_at)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
