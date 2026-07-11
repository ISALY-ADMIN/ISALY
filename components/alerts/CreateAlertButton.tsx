'use client'

import { useState } from 'react'
import { Bell, X, Check } from 'lucide-react'
import Button from '@/components/ui/Button'

export interface AlertCriteria {
  city?: string
  budget_max?: number
  rooms?: number
  surface_min?: number
  meuble?: boolean
  animaux_ok?: boolean
  non_fumeur?: boolean
}

/** Bouton + modal de création d'alerte de recherche (page recherche). */
export default function CreateAlertButton({ criteria }: { criteria: AlertCriteria }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)

  const summary = [
    criteria.city || null,
    criteria.budget_max ? `< ${criteria.budget_max}€/mois` : null,
    criteria.rooms ? `${criteria.rooms}+ chambres` : null,
    criteria.surface_min ? `${criteria.surface_min}+ m²` : null,
    criteria.meuble ? 'Meublé' : null,
    criteria.animaux_ok ? 'Animaux ok' : null,
    criteria.non_fumeur ? 'Non-fumeur' : null,
  ].filter(Boolean) as string[]

  async function create() {
    setSaving(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...criteria, name: name.trim() || null, notify_push: notifyPush, notify_email: notifyEmail }),
      })
      if (res.ok) {
        setCreated(true)
        setTimeout(() => { setOpen(false); setCreated(false); setName('') }, 2200)
      }
    } catch {}
    setSaving(false)
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Bell size={14} /> Créer une alerte
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => !saving && setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(440px, 100%)', background: '#111111',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {created ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
                }}>
                  <Check size={26} color="#fff" strokeWidth={3} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: '6px' }}>
                  Alerte créée !
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Tu seras notifié dès qu&apos;une annonce correspond.
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
                    Sois alerté des nouvelles annonces
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Fermer"
                    className="border-none cursor-pointer rounded-full flex items-center justify-center"
                    style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', margin: '0 0 16px' }}>
                  Une notification dès qu&apos;une annonce correspond à ta recherche.
                </p>

                {/* Résumé des critères */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {summary.length > 0 ? summary.map(s => (
                    <span key={s} style={{
                      fontSize: '11.5px', fontWeight: 600, padding: '5px 10px', borderRadius: '16px',
                      background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)',
                    }}>{s}</span>
                  )) : (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Toutes les nouvelles annonces</span>
                  )}
                </div>

                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='Nom de l’alerte (optionnel, ex : "T2 Paris < 800€")'
                  className="w-full outline-none"
                  style={{
                    padding: '11px 14px', borderRadius: '12px', fontSize: '13px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff',
                    marginBottom: '14px',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#10B981')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />

                {/* Canaux */}
                <div style={{ display: 'flex', gap: '18px', marginBottom: '20px' }}>
                  {[
                    { label: 'Notification push', value: notifyPush, set: setNotifyPush },
                    { label: 'Email', value: notifyEmail, set: setNotifyEmail },
                  ].map(c => (
                    <label key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                      <input
                        type="checkbox"
                        checked={c.value}
                        onChange={e => c.set(e.target.checked)}
                        style={{ accentColor: '#10B981', width: 16, height: 16 }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>

                <Button onClick={create} loading={saving} className="w-full">
                  <Bell size={15} /> Créer l&apos;alerte
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
