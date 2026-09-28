'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '../primitives'
import { useToast } from '../Toast'
import { AuthLayout } from './AuthLayout'

/**
 * « Vérifie ta boîte mail » après l'inscription (vVerify de la maquette).
 * Le renvoi passe par l'envoi Resend existant (/api/email/confirm).
 */
export function VerifyEmail({ email, firstName, onEdit }: { email: string; firstName?: string; onEdit?: () => void }) {
  return (
    <AuthLayout quote="Plus qu’une étape." sub="Après la confirmation, tu fais le test de compatibilité et tu découvres tes colocs.">
      <VerifyEmailCard email={email} firstName={firstName} onEdit={onEdit} />
    </AuthLayout>
  )
}

function VerifyEmailCard({ email, firstName, onEdit }: { email: string; firstName?: string; onEdit?: () => void }) {
  const toast = useToast()
  const [sending, setSending] = useState(false)

  async function resend() {
    setSending(true)
    try {
      const res = await fetch('/api/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      })
      toast(res.ok ? 'E-mail de confirmation renvoyé' : 'Impossible de renvoyer l’e-mail. Réessaie dans un instant.')
    } catch {
      toast('Impossible de renvoyer l’e-mail. Réessaie dans un instant.')
    }
    setSending(false)
  }

  return (
    <>
      <span className="mailbig"><Icon name="mail" size={36} /></span>
      <div>
        <h1>Vérifie ta boîte mail</h1>
        <p className="sub" style={{ marginTop: 8 }}>
          On a envoyé un lien de confirmation à <b>{email}</b>. Clique dessus pour activer ton compte.
        </p>
      </div>
      <div className="note"><Icon name="info" size={18} /><span>Rien reçu&#8239;? Regarde dans les courriers indésirables, ou renvoie l’e-mail.</span></div>
      <button className="btn btn-glass btn-block" type="button" onClick={resend} disabled={sending}>
        {sending ? 'Envoi…' : 'Renvoyer l’e-mail'}
      </button>
      <Link className="btn btn-main btn-block" href="/auth/login">Aller à la connexion</Link>
      <p className="switch-l">Pas la bonne adresse&#8239;? {onEdit
          ? <button className="link" type="button" onClick={onEdit} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>Modifier</button>
          : <Link className="link" href="/auth/register">Modifier</Link>}</p>
    </>
  )
}
