import Link from 'next/link'
import { Logo } from '../primitives'

/** Villes de la colonne « Colocations » de la landing, vers /colocation/[ville]. */
const FOOTER_CITIES: [string, string][] = [
  ['Paris', 'paris'],
  ['Lyon', 'lyon'],
  ['Marseille', 'marseille'],
  ['Bordeaux', 'bordeaux'],
  ['Lille', 'lille'],
  ['Toulouse', 'toulouse'],
]

/** Pied de page public : les quatre colonnes de la landing. */
export function PublicFooter() {
  return (
    <footer className="pftr">
      <div className="wrap">
        <div className="pftr-grid">
          <div>
            <Link className="plogo" href="/" aria-label="ISALY, accueil">
              <Logo />
              isaly
            </Link>
            <p>La plateforme dédiée à la colocation, avec un matching de compatibilité entre colocataires.</p>
          </div>
          <div>
            <h4>Colocations</h4>
            <ul>
              {FOOTER_CITIES.map(([name, slug]) => (
                <li key={slug}><Link href={`/colocation/${slug}`}>{name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>ISALY</h4>
            <ul>
              <li><a href="/#matching">Le matching</a></li>
              <li><a href="/#bailleurs">Bailleurs</a></li>
              <li><a href="/#tarifs">Tarifs</a></li>
              <li><Link href="/blog">Blog ISALY Immo</Link></li>
            </ul>
          </div>
          <div>
            <h4>Informations</h4>
            <ul>
              {/* Pas encore de page de mentions légales : le lien mène aux CGU
                  en attendant le texte (signalé dans le rapport site v2). */}
              <li><Link href="/cgu">Mentions légales</Link></li>
              <li><Link href="/cgu">CGU</Link></li>
              <li><Link href="/confidentialite">Confidentialité</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
        <p className="legal">© 2026 ISALY</p>
      </div>
    </footer>
  )
}
