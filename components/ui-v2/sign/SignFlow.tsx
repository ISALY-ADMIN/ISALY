'use client'

import { useRef, useState, type ReactNode } from 'react'
import SignatureCanvas, { type SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'
import { Bubble, Icon, Pill } from '../primitives'
import { personColor } from '../colors'

export interface Signer {
  id: string
  name: string
  /** Rôle affiché (« Bailleur », « Locataire, toi »). */
  role: string
  /** Libellé de signature (« Signé le 27 septembre ») ou null si à signer. */
  signedLabel: string | null
}

/**
 * Parcours de signature du bail (vSignature de la maquette) : Relire, Signer,
 * Terminé. Le document est à gauche, les signataires et la zone de signature
 * à droite. « Signer le bail » ne s'active qu'une fois la signature dessinée
 * et la case de consentement cochée. Le dessin passe par le canevas existant
 * (SignatureCanvas) et l'envoi par la fonction onSign de l'appelant (API
 * existantes, consentement eIDAS).
 */
export function SignFlow({
  title, signers, document, onSign, onDownload, onExit, exitLabel = 'Quitter la signature', doneActions, alreadySigned,
}: {
  title: string
  signers: Signer[]
  /** Contenu du document (produit par le générateur de bail existant ou récapitulatif). */
  document: ReactNode
  /** Envoie la signature ; renvoie un message d'erreur ou null. */
  onSign: (dataUrl: string) => Promise<string | null>
  onDownload?: () => void
  onExit: () => void
  exitLabel?: string
  /** Actions de l'écran « Bail signé ». */
  doneActions?: ReactNode
  /** Le bail est déjà signé par cette personne : écran final directement. */
  alreadySigned?: boolean
}) {
  const sigRef = useRef<SignatureCanvasHandle>(null)
  const [step, setStep] = useState<1 | 2 | 3>(alreadySigned ? 3 : 1)
  const [drawn, setDrawn] = useState(false)
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function sign() {
    const data = sigRef.current?.toDataURL()
    if (!data || !drawn || !agree) return
    setSubmitting(true)
    setError('')
    const err = await onSign(data)
    setSubmitting(false)
    if (err) { setError(err); return }
    setStep(3)
  }

  const stepLabel = step === 3 ? 'terminé' : step === 1 ? 'relire' : 'signer'

  return (
    <div className="sgn">
      <div className="sgn-top">
        <button className="iconbtn" type="button" onClick={onExit} aria-label={exitLabel} style={{ width: 42, height: 42 }}>
          <Icon name="back" size={18} />
        </button>
        <span className="grow">
          <span className="t">{title}</span>
          <span className="s">{`Étape ${step} sur 3 : ${stepLabel}`}</span>
        </span>
        <Pill tone="ok" icon="shield">Signature électronique</Pill>
      </div>

      {step === 3 ? (
        <div className="pay" style={{ minHeight: 'auto', paddingTop: 48 }}>
          <div className="pay-card">
            <span className="okring"><Icon name="check" /></span>
            <h1>Bail signé</h1>
            <p>Les autres signataires sont prévenus. Le bail signé est rangé dans ton coffre-fort.</p>
            <div className="acts" style={{ justifyContent: 'center' }}>
              {onDownload && <button className="btn btn-main" type="button" onClick={onDownload}><Icon name="download" size={18} />Télécharger le PDF</button>}
              {doneActions}
            </div>
          </div>
        </div>
      ) : (
        <main className="sgn-lay" id="contenu" tabIndex={-1}>
          {document}
          <div className="sgn-side">
            {step === 1 ? (
              <>
                <section className="panel">
                  <div className="phead"><h2>Signataires</h2></div>
                  <div className="rows">
                    {signers.map(s => (
                      <div className="row" key={s.id}>
                        <Bubble name={s.name} color={personColor(s.id)} size={36} />
                        <span className="grow"><span className="t">{s.name}</span><span className="s">{s.role}</span></span>
                        {s.signedLabel ? <Pill tone="ok" icon="check">Signé</Pill> : <Pill tone="warn">À signer</Pill>}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <p className="soft">Relis le bail jusqu’au bout, puis passe à la signature. Tu peux le télécharger avant de signer.</p>
                  <div className="acts mt">
                    <button className="btn btn-main" type="button" onClick={() => setStep(2)}>Passer à la signature<Icon name="arrow" size={18} /></button>
                    {onDownload && <button className="btn btn-ghost" type="button" onClick={onDownload}><Icon name="download" size={18} />PDF</button>}
                  </div>
                </section>
              </>
            ) : (
              <section className="panel form">
                <div className="phead" style={{ margin: 0 }}>
                  <h2>Ta signature</h2>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => { sigRef.current?.clear(); setDrawn(false) }}>
                    <Icon name="eraser" size={16} />Effacer
                  </button>
                </div>
                {/* Fond blanc : le trait du canevas est sombre, lisible en thème sombre aussi. */}
                <div className="pad" style={{ background: '#FFFFFF' }}>
                  <SignatureCanvas
                    ref={sigRef}
                    bare
                    label="Zone de signature : dessine ta signature avec la souris ou le doigt"
                    onChange={setDrawn}
                  />
                  <span className="ph" hidden={drawn}>Signe ici avec ta souris ou ton doigt</span>
                  <span className="line" />
                </div>
                <label className="checkl">
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
                  <span>J’ai lu le bail et je le signe électroniquement. Ma signature a la même valeur qu’une signature manuscrite.</span>
                </label>
                {error && <div className="alert" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>}
                <button className="btn btn-main btn-block" type="button" onClick={sign} disabled={!(agree && drawn) || submitting}>
                  <Icon name="sign" size={18} />{submitting ? 'Signature en cours…' : 'Signer le bail'}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStep(1)}><Icon name="back" size={16} />Revenir au bail</button>
                <p className="hint">
                  Signature électronique simple au sens du règlement eIDAS. L’horodatage et l’adresse IP sont conservés comme preuve de consentement.
                </p>
              </section>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
