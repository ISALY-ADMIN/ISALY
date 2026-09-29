'use client'

import Link from 'next/link'
import { Icon } from '../primitives'
import { HouseOutline } from './HouseOutline'

/** Contenu de la page d'erreur (vE500 de la maquette), partagé par error.tsx et global-error.tsx. */
export function ErrorScreen({ digest, reset }: { digest?: string; reset: () => void }) {
  return (
    <div className="err">
      <div className="in">
        <HouseOutline />
        <h1>Petit souci de notre côté</h1>
        <p>Quelque chose n’a pas fonctionné. Réessaie dans un instant ; si ça continue, écris-nous.</p>
        <div className="acts" style={{ justifyContent: 'center' }}>
          <button className="btn btn-main" type="button" onClick={() => reset()}><Icon name="refresh" size={18} />Réessayer</button>
          <Link className="btn btn-glass" href="/contact">Nous écrire</Link>
        </div>
        {digest && <span className="hint">{`Code d’erreur : ${digest}`}</span>}
      </div>
    </div>
  )
}
