'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Art, Button, EmptyState, Icon, Modal, Note, Pill, Segmented, SkelPanel, dayMonth, eur, plural, useToast,
} from '@/components/ui-v2'
import AnnonceWizardV2 from '@/components/ui-v2/AnnonceWizardV2'
import { BoostModal } from '@/components/ui-v2/BoostModal'

interface L {
  id: string
  title: string
  city: string
  neighborhood: string | null
  rent: number
  charges: number
  photo: string | null
  isActive: boolean
  views: number
  likes: number
  requests: number
  boostExpiresAt: string | null
  boosted: boolean
  mode: 'autogestion' | 'delegue' | null
}

type F = 'all' | 'pub' | 'draft'

function daysLeft(iso: string | null) {
  if (!iso) return ''
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return d <= 1 ? 'dernier jour' : `encore ${d} jours`
}

export default function Annonces() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const toast = useToast()
  const [list, setList] = useState<L[] | null>(null)
  const [error, setError] = useState(false)
  const [f, setF] = useState<F>('all')
  const [wizard, setWizard] = useState(false)
  const [boost, setBoost] = useState<L | null>(null)
  const [del, setDel] = useState<L | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('click', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc) }
  }, [menu])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/annonces', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setList((await res.json()).listings)
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // ?publier=1 (tableau de bord, « Déposer une annonce ») ouvre l'assistant ;
  // retour de Stripe après une mise en avant.
  useEffect(() => {
    if (params.get('publier') === '1') {
      setWizard(true)
      router.replace(pathname, { scroll: false })
    }
    if (params.get('mise_en_avant') === 'ok') toast('Mise en avant activée')
  }, [params, pathname, router, toast])

  const shown = useMemo(() => (list ?? []).filter(l => f === 'all' || (f === 'pub' ? l.isActive : !l.isActive)), [list, f])

  async function toggle(l: L) {
    setBusy(l.id)
    const { error: e } = await createClient().from('listings').update({ is_active: !l.isActive }).eq('id', l.id)
    setBusy(null)
    if (e) return toast('L’annonce n’a pas pu être mise à jour')
    toast(l.isActive ? 'Annonce dépubliée' : 'Annonce publiée')
    load()
  }

  async function remove() {
    if (!del) return
    setBusy(del.id)
    const { error: e } = await createClient().from('listings').delete().eq('id', del.id)
    setBusy(null)
    setDel(null)
    if (e) return toast('L’annonce n’a pas pu être supprimée')
    toast('Annonce supprimée')
    load()
  }

  if (error && !list) return <EmptyState icon="alert" tone="bad" title="Tes annonces n’ont pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />

  const count = (k: F) => (list ?? []).filter(l => k === 'all' || (k === 'pub' ? l.isActive : !l.isActive)).length

  return (
    <div className="screen">
      <div className="toolbar">
        <Segmented
          options={[
            { value: 'all', label: <>Toutes <span className="n">{count('all')}</span></> },
            { value: 'pub', label: <>Publiées <span className="n">{count('pub')}</span></> },
            { value: 'draft', label: <>Brouillons <span className="n">{count('draft')}</span></> },
          ]}
          value={f}
          onChange={setF}
          label="Filtrer les annonces"
        />
        <Button variant="main" icon="plus" onClick={() => setWizard(true)}>Publier une annonce</Button>
      </div>

      <div className="stackv">
        {!list && <><SkelPanel lines={3} /><SkelPanel lines={3} /></>}
        {list && shown.length === 0 && (
          <EmptyState icon="building" title="Aucune annonce ici"
            text="Publie une annonce pour recevoir des candidatures compatibles avec tes colocataires."
            actions={<Button variant="main" onClick={() => setWizard(true)}>Publier une annonce</Button>} />
        )}
        {shown.map(l => {
          const place = [l.neighborhood, l.city].filter(Boolean).join(', ')
          const ro = l.mode === 'delegue'
          return (
            <article key={l.id} className="lrow">
              <Art id={l.id} photo={l.photo} />
              <div className="grow">
                <div className="acts" style={{ gap: 8 }}>
                  {l.isActive ? <Pill tone="ok">Publiée</Pill> : <Pill>Brouillon</Pill>}
                  {l.boosted && <Pill tone="brand" icon="bolt">Mise en avant, {daysLeft(l.boostExpiresAt)}</Pill>}
                  {ro && <Pill tone="warn" icon="lock">Agence partenaire</Pill>}
                </div>
                <h3 style={{ marginTop: 8 }}>{l.title}</h3>
                <span className="s">{place}. {eur(l.rent + l.charges)} par mois charges comprises.</span>
                {l.isActive ? (
                  <div className="lstats">
                    <span><b className="num">{l.views.toLocaleString('fr-FR')}</b> {plural(l.views, 'vue', 'vues')}</span>
                    <span><b className="num">{l.likes}</b> {plural(l.likes, 'swipe à droite', 'swipes à droite')}</span>
                    <span><b className="num">{l.requests}</b> {plural(l.requests, 'demande', 'demandes')}</span>
                  </div>
                ) : <p className="s" style={{ marginTop: 6 }}>Cette annonce n’est pas visible par les locataires.</p>}
              </div>
              <div className="acts">
                {l.isActive ? (
                  <>
                    <Button variant="glass" size="sm" href={`/app/candidatures?annonce=${l.id}`}>Candidatures</Button>
                    {!l.boosted && !ro && <Button variant="glass" size="sm" icon="bolt" onClick={() => setBoost(l)}>Mettre en avant</Button>}
                    <Button variant="ghost" size="sm" icon="edit" href={`/app/mes-annonces/${l.id}/editer`}>Modifier</Button>
                    <span className="anchor">
                      <button className="iconbtn" type="button" aria-label="Plus d’actions" aria-expanded={menu === l.id} style={{ width: 36, height: 36 }}
                        onClick={e => { e.stopPropagation(); setMenu(m => (m === l.id ? null : l.id)) }}>
                        <Icon name="more" size={18} />
                      </button>
                      {menu === l.id && (
                        <div className="pop sm" role="menu" onClick={e => e.stopPropagation()}>
                          <a className="item" role="menuitem" href={`/app/annonces/${l.id}/creneaux`}><Icon name="calendar" size={18} /><span>Créneaux de visite</span></a>
                          <a className="item" role="menuitem" href={`/app/annonce/${l.id}`}><Icon name="eye" size={18} /><span>Voir l’annonce</span></a>
                          <button className="item" type="button" role="menuitem" disabled={busy === l.id} onClick={() => { setMenu(null); toggle(l) }}><Icon name="lock" size={18} /><span>Dépublier</span></button>
                        </div>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Button variant="main" size="sm" disabled={busy === l.id} onClick={() => toggle(l)}>Publier</Button>
                    <Button variant="ghost" size="sm" icon="edit" href={`/app/mes-annonces/${l.id}/editer`}>Modifier</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDel(l)}>Supprimer</Button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <Note icon="bolt" className="mt"><b>Mise en avant :</b> ton annonce est montrée en priorité dans les swipes et la liste pendant 1, 3 ou 7 jours. Un seul paiement, sans abonnement.</Note>

      <AnnonceWizardV2
        open={wizard}
        onClose={() => setWizard(false)}
        onSuccess={(_, mode) => { setWizard(false); toast(mode === 'published' ? 'Annonce publiée' : 'Brouillon enregistré'); load() }}
      />
      <BoostModal open={!!boost} onClose={() => setBoost(null)} listingId={boost?.id ?? null} label={boost ? `${boost.title}, ${[boost.neighborhood, boost.city].filter(Boolean).join(', ')}` : ''} />
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title="Supprimer cette annonce"
        lead={del ? `${del.title} sera supprimée définitivement${del.boostExpiresAt ? `, y compris sa mise en avant jusqu’au ${dayMonth(del.boostExpiresAt)}` : ''}.` : ''}
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Annuler</Button><Button variant="danger" disabled={!!busy} onClick={remove}>Supprimer l’annonce</Button></>}
      />
    </div>
  )
}
