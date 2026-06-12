'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SuspenduPage() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', sans-serif",
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>🚫</div>

        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          Compte suspendu
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 32px' }}>
          Ton compte a été temporairement suspendu suite à une violation de nos conditions d'utilisation.
          Pour contester cette décision, contacte notre équipe.
        </p>

        <a
          href="mailto:contact@isaly.fr"
          style={{
            display: 'block',
            padding: '13px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '12px',
            boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
          }}
        >
          Contacter le support
        </a>

        <button
          onClick={signOut}
          style={{
            width: '100%',
            padding: '13px',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
