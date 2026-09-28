'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Icon, Panel, Pill, SkelPanel, dayMonth, eurCents, useToast } from '@/components/ui-v2'

interface Price { amount: number | null; interval: string | null; available: boolean }

/** Prix lu dans Stripe (price.unit_amount), jamais codé en dur. */
export function StripePrice({ price, per = 'par mois', inline }: { price: Price | null | undefined; per?: string; inline?: boolean }) {
  if (!price || price.amount == null) return <span className={inline ? undefined : 'soft'} style={{ fontSize: inline ? 'inherit' : 16, fontWeight: inline ? 'inherit' : 600, letterSpacing: 0 }}>Tarif bientôt disponible</span>
  return <>{eurCents(price.amount)} <small>{per}</small></>
}

export async function openPortal(returnPath: string, toast: (m: string) => void) {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_url: `${window.location.origin}${returnPath}` }),
  })
  const j = await res.json().catch(() => ({}))
  if (res.ok && j.url) window.location.href = j.url
  else toast(j.error ?? 'Le portail de facturation n’a pas pu s’ouvrir')
}

/**
 * Swiper Plus (dashboard v2). Promesse : plus de limite quotidienne de swipes
 * (offre gratuite : 10 par jour) et demandes prioritaires. Abonnement
 * existant (STRIPE_PRICE_SWIPER_PLUS, /api/stripe/checkout).
 */
export default function SwiperPlus() {
  const toast = useToast()
  const params = useSearchParams()
  const [state, setState] = useState<{ plus: boolean; expires: string | null; price: Price | null; available: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [p, c, prices] = await Promise.all([
      fetch('/api/v2/profil-plus', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
      fetch('/api/stripe/checkout').then(r => r.json()).catch(() => ({})),
      fetch('/api/prices').then(r => r.json()).catch(() => ({})),
    ])
    setState({
      plus: !!p.plus,
      expires: p.expires ?? null,
      price: prices.swiperPlus ?? null,
      available: !!c.swiperPlusAvailable,
    })
  }, [])

  useEffect(() => {
    load()
    if (params.get('success') === 'true') toast('Swiper Plus est activé')
  }, [load, params, toast])

  async function subscribe() {
    setBusy(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'swiper_plus' }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok && j.url) window.location.href = j.url
    else toast(j.error ?? 'Swiper Plus sera bientôt disponible')
  }

  if (!state) return <div className="plans"><SkelPanel lines={5} /><SkelPanel lines={5} /></div>

  if (state.plus) {
    return (
      <div className="screen">
        <div className="v-grid wide-l">
          <section className="plan hl">
            <div className="hrow"><h2>Swiper Plus</h2><Pill tone="ok" icon="check">Actif</Pill></div>
            <div className="price num"><StripePrice price={state.price} /></div>
            <ul>
              <li><Icon name="check" size={18} /><span><b>Plus de limite quotidienne</b> de swipes</span></li>
              <li><Icon name="check" size={18} /><span><b>Demandes prioritaires</b> chez les colocs</span></li>
              <li><Icon name="check" size={18} /><span>Tout ISALY inclus</span></li>
            </ul>
            {state.expires && (
              <div className="rows">
                <div className="row"><span className="ico"><Icon name="calendar" size={18} /></span><span className="grow"><span className="t">Prochain renouvellement le {dayMonth(state.expires)}</span></span></div>
              </div>
            )}
            <Button variant="glass" onClick={() => openPortal('/app/paiement', toast)}>Gérer mon abonnement</Button>
          </section>
          <Panel title="Ce qui change pour toi">
            <p className="soft">Tes demandes apparaissent en tête chez les colocs, avec la mention Prioritaire. Swipe autant que tu veux.</p>
          </Panel>
        </div>
      </div>
    )
  }

  const canBuy = state.available && !!state.price?.available
  return (
    <div className="screen">
      <div className="plans">
        <section className="plan">
          <div className="hrow"><h2>ISALY</h2><Pill>Ton offre</Pill></div>
          <div className="price">Gratuit</div>
          <ul>
            <li><Icon name="check" size={18} /><span><b>10 swipes</b> par jour</span></li>
            <li><Icon name="check" size={18} /><span>Profil de compatibilité</span></li>
            <li><Icon name="check" size={18} /><span>Demandes et messagerie</span></li>
            <li><Icon name="check" size={18} /><span>Espace Ma maison</span></li>
          </ul>
        </section>
        <section className="plan hl">
          <div className="hrow"><h2>Swiper Plus</h2><Pill tone="brand" icon="spark">Sans limite</Pill></div>
          <div className="price num"><StripePrice price={state.price} /></div>
          <ul>
            <li><Icon name="check" size={18} /><span><b>Plus de limite quotidienne</b> de swipes</span></li>
            <li><Icon name="check" size={18} /><span><b>Demandes prioritaires</b> chez les colocs</span></li>
            <li><Icon name="check" size={18} /><span>Tout ISALY inclus</span></li>
          </ul>
          {canBuy
            ? <Button variant="main" disabled={busy} onClick={subscribe}>Passer à Swiper Plus</Button>
            : <Button variant="main" disabled>Bientôt disponible</Button>}
        </section>
      </div>
    </div>
  )
}
