'use client'

import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Icon } from './primitives'
import { NNBSP } from './format'
import { useShell } from './shell/AppShell'

/**
 * « Déposer une annonce » côté locataire : fenêtre en 2 étapes (mDepose de la
 * maquette) qui bascule l'espace en mode bailleur (écriture de profiles.role
 * par la logique existante) puis ouvre l'assistant de publication.
 */
export function DeposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const { switchMode } = useShell()
  const close = () => {
    setStep(0)
    onClose()
  }
  if (step === 0) {
    return (
      <Modal
        open={open}
        onClose={close}
        head={
          <span className="ico brand" style={{ width: 52, height: 52, borderRadius: 18, marginBottom: 14 }}>
            <Icon name="building" size={24} />
          </span>
        }
        title={<>Tu as un logement à louer{NNBSP}?</>}
        lead="Dépose ton annonce en colocation : tes futurs locataires verront leur compatibilité avec les colocataires déjà en place, et tu choisiras ensuite comment gérer le logement."
        footer={
          <>
            <Button variant="ghost" onClick={close}>Plus tard</Button>
            <Button variant="main" onClick={() => setStep(1)}>Continuer</Button>
          </>
        }
      />
    )
  }
  return (
    <Modal
      open={open}
      onClose={close}
      title={<>Passer en mode bailleur{NNBSP}?</>}
      lead="Pour déposer une annonce, ton espace passe en mode bailleur. Tu pourras revenir en mode locataire à tout moment depuis le sélecteur en haut du menu."
      footer={
        <>
          <Button variant="ghost" onClick={close}>Non, rester locataire</Button>
          <Button
            variant="main"
            onClick={() => {
              close()
              switchMode('loueur', '/app/mes-annonces?publier=1')
            }}
          >
            Oui, passer en mode bailleur
          </Button>
        </>
      }
    />
  )
}
