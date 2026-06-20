'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'

function SwiperPlusContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(false)
  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')

  useEffect(() => {
    fetch('/api/stripe/checkout').then(r => r.json()).then(j => setAvailable(!!j.swiperPlusAvailable)).catch(() => {})
  }, [])

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'swiper_plus' }),
      })
      const { url, error } = await res.json()
      if (error) { alert('Erreur : ' + error); setLoading(false); return }
      window.location.href = url
    } catch {
      alert('Erreur de connexion au paiement')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F0' }}>
      <Topbar title="Abonnements" />
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }}>

        {success && (
          <div style={{ background: '#ECFDF5', border: '1px solid #10B981', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, color: '#065F46' }}>Swiper+ activé !</div>
              <div style={{ fontSize: '13px', color: '#059669' }}>Swipes et messages illimités dès maintenant.</div>
            </div>
          </div>
        )}
        {cancelled && (
          <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ fontWeight: 700, color: '#991B1B' }}>Paiement annulé</div>
            <div style={{ fontSize: '13px', color: '#DC2626' }}>Aucun prélèvement n&apos;a été effectué.</div>
          </div>
        )}

        <div style={{ background: '#fff', border: '2px solid #4ECBA0', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#2AA87C', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Swiper+</div>
          <div style={{ fontSize: '40px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            5,99€<span style={{ fontSize: '14px', fontWeight: 400, color: '#9CA3AF' }}>/mois</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '24px 0', textAlign: 'left' }}>
            {['Swipes illimités', 'Messages illimités', 'Accès prioritaire aux nouveaux profils'].map(f => (
              <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: '#374151' }}>
                <span style={{ color: '#4ECBA0', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
              </div>
            ))}
          </div>
          <button
            onClick={handleCheckout}
            disabled={!available || loading}
            style={{
              width: '100%', padding: '14px',
              background: available ? 'linear-gradient(135deg, #4ECBA0, #2AA87C)' : '#E5E7EB',
              color: available ? '#fff' : '#9CA3AF',
              border: 'none', borderRadius: '10px', fontSize: '14.5px', fontWeight: 700,
              cursor: available ? 'pointer' : 'not-allowed',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {loading ? '⏳ Redirection...' : available ? "S'abonner →" : 'Bientôt disponible'}
          </button>
        </div>

        <div style={{ marginTop: '24px', padding: '18px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', lineHeight: 1.7 }}>
            Paiement sécurisé par <strong>Stripe</strong> · Résiliation à tout moment · Sans engagement
          </div>
        </div>
      </div>
    </div>
  )
}

function PaiementContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function handleCheckout(plan: string) {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { url, error } = await res.json()
      if (error) { alert('Erreur : ' + error); setLoading(null); return }
      window.location.href = url
    } catch {
      alert('Erreur de connexion au paiement')
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F0' }}>
      <Topbar title="Abonnements" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {success && (
          <div style={{ background: '#ECFDF5', border: '1px solid #10B981', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, color: '#065F46' }}>Abonnement activé !</div>
              <div style={{ fontSize: '13px', color: '#059669' }}>Ton boost est maintenant actif. Tes annonces sont mises en avant.</div>
            </div>
          </div>
        )}

        {cancelled && (
          <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ fontWeight: 700, color: '#991B1B' }}>Paiement annulé</div>
            <div style={{ fontSize: '13px', color: '#DC2626' }}>Aucun prélèvement n&apos;a été effectué.</div>
          </div>
        )}

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Booste la visibilité de tes annonces pour louer plus vite.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {[
            {
              id: 'featured',
              name: 'Essentiel',
              price: '9,99€',
              period: '/mois',
              desc: 'Ton annonce vue par plus de locataires',
              color: '#6366F1',
              features: ['Annonce boostée dans le feed', 'Visible en priorité dans la recherche', 'Badge "Mis en avant"', 'Accès aux dossiers certifiés', 'Messagerie directe'],
              highlighted: false,
            },
            {
              id: 'priority',
              name: 'Prioritaire',
              price: '24,99€',
              period: '/mois',
              desc: 'Visibilité maximale garantie',
              color: '#10B981',
              features: ['Tout Essentiel inclus', 'Position #1 dans le matching', 'Badge "Prioritaire" visible', 'Mis en avant sur la carte', 'Stats détaillées', 'Support 7j/7'],
              highlighted: true,
            },
          ].map(plan => (
            <div key={plan.id} style={{
              background: '#fff',
              border: plan.highlighted ? `2px solid ${plan.color}` : '1px solid #E5E7EB',
              borderRadius: '16px',
              padding: '28px',
              position: 'relative',
            }}>
              {plan.highlighted && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  MEILLEURE OFFRE
                </div>
              )}
              <div style={{ fontSize: '12px', fontWeight: 600, color: plan.color, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>{plan.name}</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{plan.price}<span style={{ fontSize: '14px', fontWeight: 400, color: '#9CA3AF' }}>{plan.period}</span></div>
              <div style={{ fontSize: '13px', color: '#6B7280', margin: '8px 0 20px' }}>{plan.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#374151' }}>
                    <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%', padding: '12px',
                  background: plan.highlighted ? `linear-gradient(135deg, ${plan.color}, #059669)` : '#fff',
                  color: plan.highlighted ? '#fff' : plan.color,
                  border: `2px solid ${plan.color}`,
                  borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                  opacity: loading === plan.id ? 0.7 : 1,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {loading === plan.id ? '⏳ Redirection...' : `Choisir ${plan.name} →`}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '32px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', lineHeight: 1.7 }}>
            Paiement sécurisé par <strong>Stripe</strong> · Résiliation à tout moment · Sans engagement · Facturation mensuelle
          </div>
        </div>
      </div>
    </div>
  )
}

function PaiementSwitch() {
  const { mode } = useLease()
  if (mode === 'locataire') return <SwiperPlusContent />
  return <PaiementContent />
}

export default function PaiementPage() {
  return <Suspense fallback={<div>Chargement...</div>}><PaiementSwitch /></Suspense>
}
