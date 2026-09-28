'use client'

import { useEffect, useState } from 'react'
import { Bubble, Button, EmptyState, Panel, Pill, SkelPanel, personColor, useToast } from '@/components/ui-v2'

interface Data { code: string; count: number; kids: { id: string; firstName: string; signed: boolean }[] }

/** Parrainage (dashboard v2) : code, lien, étapes et filleuls. */
export default function Parrainage() {
  const toast = useToast()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)

  const load = () => {
    fetch('/api/v2/parrainage', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(j => { setD(j); setError(false) })
      .catch(() => setError(true))
  }
  useEffect(load, [])

  async function copy(v: string) {
    try {
      await navigator.clipboard.writeText(v)
      toast('Copié')
    } catch {
      toast('La copie n’a pas fonctionné, sélectionne le texte')
    }
  }

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Le parrainage n’a pas pu se charger" actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="v-grid wide-l"><SkelPanel lines={4} /><SkelPanel lines={4} /></div>

  // Même lien que l'ancienne page : inscription avec le code.
  const link = `https://isaly.fr/auth/register?ref=${d.code}`
  const rewards = d.kids.filter(k => k.signed).length

  return (
    <div className="screen">
      <div className="v-grid wide-l">
        <div className="stackv">
          <Panel title="Invite tes amis">
            <p className="soft">Partage ton lien. Quand un ami inscrit grâce à toi signe son premier bail sur ISALY, ta récompense est débloquée.</p>
            <div className="code mt">
              <span><span className="s">Ton code</span><b>{d.code || '-'}</b></span>
              <Button variant="main" size="sm" disabled={!d.code} onClick={() => copy(d.code)}>Copier le code</Button>
            </div>
            <div className="field mt">
              <label htmlFor="rlink">Ton lien</label>
              <div className="acts" style={{ flexWrap: 'nowrap' }}>
                <input id="rlink" className="input" readOnly value={link.replace('https://', '')} onFocus={e => e.currentTarget.select()} />
                <Button variant="glass" disabled={!d.code} onClick={() => copy(link)}>Copier</Button>
              </div>
            </div>
          </Panel>
          <ol className="seq">
            <li><b>Partage ton lien</b>Par message, en story ou de vive voix.</li>
            <li><b>Ton ami s’inscrit</b>Il crée son profil et fait le test.</li>
            <li><b>Il signe son bail</b>Ta récompense est débloquée.</li>
          </ol>
        </div>
        <div className="stackv">
          <div className="stats">
            <div className="stat"><b className="num">{d.count}</b><span>{d.count > 1 ? 'inscrits' : 'inscrit'}</span></div>
            <div className="stat"><b className="num">{rewards}</b><span>{rewards > 1 ? 'baux signés' : 'bail signé'}</span></div>
            <div className="stat"><b className="num">{rewards}</b><span>{rewards > 1 ? 'récompenses' : 'récompense'}</span></div>
          </div>
          <Panel title="Tes filleuls">
            {d.kids.length ? (
              <div className="rows">
                {d.kids.map(k => (
                  <div key={k.id} className="row">
                    <Bubble name={k.firstName} color={personColor(k.id)} size={36} />
                    <span className="grow"><span className="t">{k.firstName}</span><span className="s">{k.signed ? 'Bail signé, récompense débloquée' : 'Inscrit, en recherche'}</span></span>
                    {k.signed && <Pill tone="ok" icon="gift">Récompense</Pill>}
                  </div>
                ))}
              </div>
            ) : <p className="soft">Tes filleuls apparaîtront ici dès leur inscription avec ton code.</p>}
          </Panel>
        </div>
      </div>
    </div>
  )
}
