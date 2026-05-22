'use client'

import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'

const PLANS = [
  {
    id: 'assurance',
    icon: '🛡️',
    name: 'Assurance dossier',
    desc: 'Dossier certifié + gestion bail',
    price: '3%',
    unit: ' loyer/mois',
  },
  {
    id: 'featured',
    icon: '🚀',
    name: 'Annonce mise en avant',
    desc: '2× plus de contacts · Badge',
    price: '9,99€',
    unit: '/mois',
  },
  {
    id: 'priority',
    icon: '⭐',
    name: 'Annonce prioritaire',
    desc: 'Top du fil · Analytics',
    price: '24,99€',
    unit: '/mois',
  },
]

export default function PaiementPage() {
  const [selected, setSelected] = useState('featured')
  const [paid, setPaid] = useState(false)

  function handlePay() {
    setPaid(true)
    setTimeout(() => setPaid(false), 3000)
    alert('✅ Paiement simulé — connectez votre clé Stripe pour activer les paiements réels.')
  }

  return (
    <>
      <Topbar title="Paiement" />
      <div className="flex-1 overflow-y-auto p-8">
        <div style={{ maxWidth: '580px' }}>
          <h1 className="text-[28px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}>
            Paiement
          </h1>
          <p className="text-[13.5px] mb-6" style={{ color: '#6B7280' }}>
            Choisissez votre formule
          </p>

          {/* Plans */}
          <div className="rounded-[14px] p-5 border mb-3.5" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <div className="font-extrabold text-[13.5px] mb-3.5" style={{ color: '#E5E7EB' }}>Choisir une formule</div>
            {PLANS.map(plan => (
              <div
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className="flex items-center gap-3.5 p-3.5 rounded-[9px] cursor-pointer transition-all mb-2.5 border-2"
                style={{
                  borderColor: selected === plan.id ? '#4ECBA0' : '#2D2D2D',
                  background: selected === plan.id ? '#0E2B1E' : '#161616',
                }}
              >
                <div className="text-2xl">{plan.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-[13.5px]" style={{ color: '#E5E7EB' }}>{plan.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{plan.desc}</div>
                </div>
                <div className="text-[17px] font-bold" style={{ color: '#F1F5F9' }}>
                  {plan.price}
                  <span className="text-xs font-normal" style={{ color: '#6B7280' }}>{plan.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment form */}
          <div className="rounded-[14px] p-5 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            <div className="font-extrabold text-[13.5px] mb-3.5" style={{ color: '#E5E7EB' }}>Informations de paiement</div>

            <Field label="Titulaire">
              <TextInput placeholder="Alex Martin" />
            </Field>
            <Field label="Numéro de carte">
              <TextInput placeholder="1234 5678 9012 3456" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiration">
                <TextInput placeholder="MM/AA" />
              </Field>
              <Field label="CVV">
                <input
                  type="password"
                  placeholder="123"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={{ background: '#161616', borderColor: '#2D2D2D', color: '#E5E7EB' }}
                  onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                  onBlur={e => (e.target.style.borderColor = '#2D2D2D')}
                />
              </Field>
            </div>

            {/* Stripe badge */}
            <div
              className="flex items-center gap-2 text-xs rounded-lg px-3 py-2.5 mt-3"
              style={{ background: '#252525', color: '#6B7280' }}
            >
              <span className="font-black text-[13px]" style={{ color: '#635BFF' }}>stripe</span>
              Paiement sécurisé — données chiffrées
            </div>

            <button
              onClick={handlePay}
              className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer transition-colors mt-3.5"
              style={{ background: '#4ECBA0' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')}
              onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
            >
              Payer maintenant 🔒
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ placeholder }: { placeholder: string }) {
  return (
    <input
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
      style={{ background: '#161616', borderColor: '#2D2D2D', color: '#E5E7EB' }}
      onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
      onBlur={e => (e.target.style.borderColor = '#2D2D2D')}
    />
  )
}
