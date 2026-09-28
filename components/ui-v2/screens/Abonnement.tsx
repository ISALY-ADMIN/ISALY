'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, EmptyState, Icon, Ico, Panel, Pill, SkelPanel, dayMonth, useToast } from '@/components/ui-v2'
import { BoostModal } from '@/components/ui-v2/BoostModal'
import { StripePrice, openPortal } from '@/components/ui-v2/screens/SwiperPlus'

interface Data {
  autogestion: { required: boolean; active: boolean; status: string | null; periodEnd: string | null }
  agencies: { city: string; agency: string | null }[]
  delegated: { id: string; title: string; since: string | null; agency: string | null }[]
  boosted: { id: string; title: string; place: string; expiresAt: string | null }[]
  boostable: { id: string; label: string } | null
}

const FEATS = ['Bail en ligne et signature électronique', 'Loyers, relances et quittances', 'Maintenance et signalements', 'Préavis et fin de bail', 'Messagerie par logement']

function left(iso: string | null) {
  if (!iso) return ''
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return d <= 1 ? 'dernier jour' : `encore ${d} jours`
}

/**
 * Abonnement et options du bailleur (dashboard v2) : autogestion
 * (STRIPE_PRICE_AUTOGESTION), agence partenaire, mises en avant en cours.
 */
export default function Abonnement() {
  const toast = useToast()
  const params = useSearchParams()
  const [d, setD] = useState<Data | null>(null)
  const [price, setPrice] = useState<{ amount: number | null; interval: string | null; available: boolean } | null>(null)
  const [error, setError] = useState(false)
  const [boost, setBoost] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        fetch('/api/v2/abonnement', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/prices').then(r => r.json()).catch(() => ({})),
      ])
      setD(a)
      setPrice(p.autogestion ?? null)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    load()
    if (params.get('abonnement') === 'ok') toast('Abonnement autogestion activé')
  }, [load, params, toast])

  async function subscribe() {
    setBusy(true)
    const res = await fetch('/api/abonnement/checkout', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok && j.url) window.location.href = j.url
    else toast(j.error ?? 'L’abonnement autogestion sera bientôt disponible')
  }

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Cette page n’a pas pu se charger" actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="plans"><SkelPanel lines={6} /><SkelPanel lines={5} /></div>

  const a = d.autogestion
  const paying = a.status === 'active' || a.status === 'trialing'

  return (
    <div className="screen">
      <div className="plans">
        <section className="plan hl">
          <div className="hrow"><h2>Autogestion</h2>{a.active ? <Pill tone="ok" icon="check">Actif</Pill> : <Pill tone="bad">Inactif</Pill>}</div>
          <p className="soft">L’abonnement pour gérer tes logements avec ISALY. Il est lié à ton compte bailleur, jamais payé par tes locataires, et remplace toute commission par locataire.</p>
          <div className="hrow" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <span className="flabel">Tarif mensuel</span>
            <span className="pill info"><StripePrice price={price} per="par mois" inline /></span>
          </div>
          <ul>{FEATS.map(f => <li key={f}><Icon name="check" size={18} /><span>{f}</span></li>)}</ul>
          {paying ? (
            <>
              {a.periodEnd && (
                <div className="rows"><div className="row"><span className="ico"><Icon name="calendar" size={18} /></span><span className="grow"><span className="t">Prochain renouvellement le {dayMonth(a.periodEnd)}</span></span></div></div>
              )}
              <Button variant="glass" onClick={() => openPortal('/app/paiement', toast)}>Gérer la facturation</Button>
            </>
          ) : a.required ? (
            <Button variant="main" disabled={busy || !price?.available} onClick={subscribe}>{price?.available ? 'Activer l’abonnement' : 'Bientôt disponible'}</Button>
          ) : (
            <p className="s">Pendant le lancement, la gestion avec ISALY reste ouverte sans abonnement.</p>
          )}
        </section>
        <section className="plan">
          <div className="hrow"><h2>Agence partenaire</h2><Pill>Sans abonnement</Pill></div>
          <p className="soft">Proposé au moment où un dossier est validé, si une agence partenaire est active dans ta ville. ISALY transmet le dossier, puis l’agence gère le bail et la location.</p>
          <div className="rows">
            {d.agencies.map(x => (
              <div key={x.city} className="row"><Ico name="building" tone="warn" /><span className="grow"><span className="t">{x.city}</span><span className="s">{x.agency ? `${x.agency}, active` : 'Pas encore d’agence partenaire'}</span></span></div>
            ))}
            {d.delegated.map(x => (
              <div key={x.id} className="row"><Ico name="lock" /><span className="grow"><span className="t">{x.title}</span><span className="s">Confié{x.agency ? ` à ${x.agency}` : ''}{x.since ? ` depuis le ${dayMonth(x.since, true)}` : ''}</span></span></div>
            ))}
            {!d.agencies.length && !d.delegated.length && <p className="s">Publie une annonce pour voir si une agence partenaire est active dans ta ville.</p>}
          </div>
        </section>
      </div>

      <Panel className="mt" title="Mises en avant" action={
        d.boostable ? <Button variant="glass" size="sm" icon="bolt" onClick={() => setBoost(true)}>Mettre une annonce en avant</Button> : undefined
      }>
        <p className="soft" style={{ marginBottom: 12 }}>1, 3 ou 7 jours, en un seul paiement. La mise en avant s’arrête toute seule à la fin de la durée.</p>
        <div className="rows">
          {d.boosted.length ? d.boosted.map(b => (
            <div key={b.id} className="row"><Ico name="bolt" tone="brand" /><span className="grow"><span className="t">{b.title}, {b.place}</span><span className="s">Mise en avant, {left(b.expiresAt)}</span></span><Pill tone="brand">En cours</Pill></div>
          )) : <p className="s">Aucune mise en avant en cours.</p>}
        </div>
      </Panel>
      <BoostModal open={boost} onClose={() => setBoost(false)} listingId={d.boostable?.id ?? null} label={d.boostable?.label ?? ''} />
    </div>
  )
}
