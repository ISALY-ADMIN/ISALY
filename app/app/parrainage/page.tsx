'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

export default function ParrainagePage() {
  const [code, setCode] = useState('')
  const [count, setCount] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('referral_code, referral_count').eq('id', user.id).single()
      if (data) { setCode(data.referral_code ?? ''); setCount(data.referral_count ?? 0) }
    }
    load()
  }, [])

  function copy() {
    navigator.clipboard.writeText(`https://isaly.fr/auth/register?ref=${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Parrainage" />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Parraine tes amis</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>Invite un ami sur ISALY et vous obtenez tous les deux 1 mois de boost gratuit.</p>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #E5E7EB', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>TON LIEN DE PARRAINAGE</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              isaly.fr/auth/register?ref={code}
            </div>
            <button onClick={copy} style={{ padding: '12px 20px', background: copied ? '#ECFDF5' : 'linear-gradient(135deg, #10B981, #059669)', color: copied ? '#059669' : '#fff', border: copied ? '1px solid #10B981' : 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" }}>
              {copied ? '✓ Copié !' : 'Copier'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#10B981' }}>{count}</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>ami{count > 1 ? 's' : ''} parrainé{count > 1 ? 's' : ''}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#F59E0B' }}>{count}</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>mois de boost gagné{count > 1 ? 's' : ''}</div>
          </div>
        </div>

        <div style={{ background: '#ECFDF5', borderRadius: '12px', padding: '16px 20px', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: '13px', color: '#065F46', lineHeight: 1.7 }}>
            <strong>Comment ça marche :</strong><br />
            1. Partage ton lien unique<br />
            2. Ton ami crée un compte via ce lien<br />
            3. Vous recevez tous les deux 1 mois de boost offert automatiquement
          </div>
        </div>
      </div>
    </div>
  )
}
