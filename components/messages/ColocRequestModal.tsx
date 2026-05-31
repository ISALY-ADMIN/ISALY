'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ColocRequestModalProps {
  onClose: () => void
  otherUserId: string
  otherName: string
  currentUserId: string
  conversationId: string
}

export default function ColocRequestModal({ onClose, otherUserId, otherName, currentUserId, conversationId }: ColocRequestModalProps) {
  const [step, setStep] = useState<'form' | 'sending' | 'sent'>('form')
  const [form, setForm] = useState({
    address: '',
    rent: '',
    charges: '',
    start_date: '',
    duration: '12',
    rooms: '1',
    message: `Bonjour ! Je souhaite officialiser notre colocation. Voici les détails du logement.`,
  })

  async function handleSend() {
    setStep('sending')
    const supabase = createClient()

    const { data, error } = await supabase.from('coloc_requests').insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      conversation_id: conversationId,
      address: form.address,
      rent: Number(form.rent),
      charges: Number(form.charges),
      start_date: form.start_date,
      duration_months: Number(form.duration),
      rooms: Number(form.rooms),
      status: 'pending',
    }).select().single()

    if (!error && data) {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: `🏠 **Demande de colocation envoyée**\n📍 ${form.address}\n💰 ${form.rent}€/mois + ${form.charges}€ charges\n📅 À partir du ${new Date(form.start_date).toLocaleDateString('fr-FR')}\n⏱ Pour ${form.duration} mois\n\n${form.message}`,
          type: 'coloc_request',
          request_id: data.id,
        }),
      })

      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'coloc_request',
        title: `Demande de colocation de ${otherName}`,
        body: `📍 ${form.address} — ${form.rent}€/mois`,
        read: false,
        link: '/app/messages',
      })
    }
    setStep('sent')
  }

  if (step === 'sent') return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '380px', width: '100%' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: '#111827', marginBottom: '8px' }}>Demande envoyée !</div>
        <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
          {otherName} recevra ta demande de colocation et pourra l&apos;accepter ou la refuser.
        </div>
        <button
          onClick={onClose}
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
        >
          Retour aux messages
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '20px', color: '#111827' }}>Demande de colocation</div>
            <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>Proposer à {otherName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px' }}>
          {([
            { label: '📍 Adresse du logement', key: 'address', placeholder: '12 rue de la Paix, Lyon 69006', type: 'text' },
            { label: '💰 Loyer (€/mois)', key: 'rent', placeholder: '700', type: 'number' },
            { label: '⚡ Charges (€/mois)', key: 'charges', placeholder: '80', type: 'number' },
            { label: "📅 Date d'entrée", key: 'start_date', placeholder: '', type: 'date' },
          ] as { label: string; key: keyof typeof form; placeholder: string; type: string }[]).map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#10B981')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>⏱ Durée (mois)</label>
              <select
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
              >
                {['1', '3', '6', '12', '24'].map(d => <option key={d} value={d}>{d} mois</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>🚪 Chambres dispo</label>
              <select
                value={form.rooms}
                onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
              >
                {['1', '2', '3', '4', '5'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>💬 Message accompagnateur</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#10B981')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={step === 'sending' || !form.address || !form.rent || !form.start_date}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              opacity: (!form.address || !form.rent || !form.start_date) ? 0.6 : 1,
            }}
          >
            {step === 'sending' ? '⏳ Envoi...' : '🏠 Envoyer la demande de colocation'}
          </button>
        </div>
      </div>
    </div>
  )
}
