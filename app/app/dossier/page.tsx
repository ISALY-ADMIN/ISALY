'use client'

import { useState, useRef, useEffect } from 'react'
import Topbar from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'

function StatusBadge({ variant, children }: { variant: 'ok' | 'pending' | 'missing' | 'mint'; children: React.ReactNode }) {
  const cls =
    variant === 'ok'      ? 'bg-green-100 text-green-800 hover:bg-green-100 border-0' :
    variant === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-0' :
    variant === 'missing' ? 'bg-red-100 text-red-800 hover:bg-red-100 border-0' :
                            'bg-[#ECFDF5] text-[#059669] hover:bg-[#ECFDF5] border-0'
  return <Badge variant="secondary" className={cls}>{children}</Badge>
}
import { createClient } from '@/lib/supabase/client'
import type { Dossier, Lease } from '@/types/database'

interface ProfileSnap {
  first_name: string | null
  last_name: string | null
  budget_max: number | null
}

// ── Helpers ───────────────────────────────────────────────────
function effortColor(rate: number) {
  if (rate < 33) return '#4ECBA0'
  if (rate <= 40) return '#F59E0B'
  return '#EF4444'
}

function effortLabel(rate: number) {
  if (rate < 33) return 'Excellent'
  if (rate <= 40) return 'Acceptable'
  return 'Élevé'
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#F59E0B', fontSize: '13px', letterSpacing: '1px' }}>
      {'★'.repeat(n)}
      <span style={{ color: '#D1D5DB' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Donut chart ────────────────────────────────────────────────
function DonutChart({ percent, color }: { percent: number; color: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const filled = Math.min(percent / 100, 1) * circ
  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      <circle cx="56" cy="56" r={r} fill="none" stroke="#F3F4F6" strokeWidth="11" />
      <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} transform="rotate(-90 56 56)" style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }} />
      <text x="56" y="51" textAnchor="middle" fill="#111827" fontSize="18" fontWeight="bold" fontFamily="DM Sans, sans-serif">{Math.round(percent)}%</text>
      <text x="56" y="67" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="DM Sans, sans-serif">taux effort</text>
    </svg>
  )
}

// ── Solvency score card ────────────────────────────────────────
function ScoreCard({ income, budgetMax }: { income: number | null; budgetMax: number | null }) {
  const [tooltip, setTooltip] = useState(false)

  if (!income || !budgetMax) {
    return (
      <div className="rounded-[14px] p-5 border flex-shrink-0" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', width: '220px', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: '#111827' }}>Solvabilité</div>
        <div className="text-center py-4">
          <div className="text-[38px] mb-2">📊</div>
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Complétez votre dossier pour voir votre score</p>
        </div>
      </div>
    )
  }

  const effortRate = (budgetMax / income) * 100
  const color = effortColor(effortRate)
  const incomeRatio = (income / budgetMax).toFixed(1)

  return (
    <div className="rounded-[14px] p-5 border flex-shrink-0" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', width: '220px', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px] font-bold" style={{ color: '#111827' }}>Solvabilité</div>
        <div className="relative">
          <button onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)} className="w-[18px] h-[18px] rounded-full border-none cursor-pointer flex items-center justify-center text-[10px] font-bold" style={{ background: '#F3F4F6', color: '#6B7280' }}>?</button>
          {tooltip && (
            <div className="absolute right-0 top-6 z-20 rounded-[10px] p-3 text-[11.5px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,.12)', color: '#6B7280', width: '210px', lineHeight: 1.5 }}>
              Les propriétaires exigent que vos revenus représentent <strong style={{ color: '#111827' }}>au moins 3x le loyer</strong> mensuel.
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DonutChart percent={effortRate} color={color} />
        <div className="text-center">
          <div className="text-[12px] font-bold" style={{ color }}>{effortLabel(effortRate)} · {Math.round(effortRate)}%</div>
          <div className="text-[12px] mt-1.5" style={{ color: '#6B7280' }}>Vous gagnez <strong style={{ color: '#111827' }}>{incomeRatio}x</strong> le loyer</div>
          {parseFloat(incomeRatio) < 3 && <div className="text-[11px] mt-1" style={{ color: '#F59E0B' }}>⚠ Standard : 3x minimum</div>}
        </div>
      </div>
    </div>
  )
}

// ── Readiness banner ──────────────────────────────────────────
function ReadinessBanner({ completion }: { completion: number }) {
  if (completion >= 90) {
    return (
      <div className="rounded-[12px] px-5 py-3.5 mb-5 flex items-center gap-3" style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0' }}>
        <span className="text-xl flex-shrink-0">✅</span>
        <div>
          <div className="text-[13.5px] font-bold" style={{ color: '#059669' }}>Dossier complet — vous pouvez postuler</div>
          <div className="text-[12px]" style={{ color: '#6B7280' }}>Tous les documents essentiels sont présents</div>
        </div>
      </div>
    )
  }
  if (completion >= 60) {
    return (
      <div className="rounded-[12px] px-5 py-3.5 mb-5" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div className="text-[13.5px] font-bold" style={{ color: '#D97706' }}>Dossier incomplet ({completion}%) — documents manquants</div>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-[12px] px-5 py-3.5 mb-5 flex items-center gap-3" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
      <span className="text-xl flex-shrink-0">🚨</span>
      <div>
        <div className="text-[13.5px] font-bold" style={{ color: '#DC2626' }}>Dossier insuffisant — candidature impossible</div>
        <div className="text-[12px]" style={{ color: '#6B7280' }}>Les propriétaires ne pourront pas valider votre candidature</div>
      </div>
    </div>
  )
}

// ── Share modal ────────────────────────────────────────────────
function ShareModal({ onClose }: { onClose: () => void }) {
  const [token] = useState(() => Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6))
  const [copied, setCopied] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const url = `isaly.fr/dossier/${token}`
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  const expiresStr = expires.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  function copy() { navigator.clipboard?.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.82)' }} onClick={onClose}>
      <div className="rounded-[20px] p-7" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-[18px] mb-0.5" style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}>Partager mon dossier</h3>
            <p className="text-[12px]" style={{ color: '#6B7280' }}>Lien sécurisé · expire dans 7 jours</p>
          </div>
          <button onClick={onClose} className="text-[18px] cursor-pointer border-none bg-transparent leading-none" style={{ color: '#6B7280' }}>✕</button>
        </div>
        {disabled ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Ce lien a été désactivé.</p>
            <button onClick={() => setDisabled(false)} className="mt-3 px-4 py-2 rounded-full text-[12.5px] font-semibold border-none cursor-pointer" style={{ background: '#4ECBA0', color: '#fff' }}>Générer un nouveau lien</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 px-3 py-2.5 rounded-[9px] text-[12.5px] overflow-hidden text-ellipsis whitespace-nowrap select-all" style={{ background: '#252525', color: '#9CA3AF', border: '1px solid #2D2D2D' }}>{url}</div>
              <button onClick={copy} className="px-4 py-2.5 rounded-[9px] text-[12.5px] font-bold border-none cursor-pointer flex-shrink-0 transition-colors" style={{ background: copied ? '#0E2B1E' : '#4ECBA0', color: copied ? '#4ECBA0' : '#fff' }}>{copied ? '✓ Copié' : 'Copier'}</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[{ label: 'Expire le', value: expiresStr }, { label: 'Vues', value: '0' }].map(s => (
                <div key={s.label} className="rounded-[9px] p-3 text-center" style={{ background: '#252525' }}>
                  <div className="text-[15px] font-bold" style={{ color: '#E5E7EB' }}>{s.value}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-[9px] px-3.5 py-2.5 text-[12px] mb-5" style={{ background: '#0A2118', color: '#6B7280' }}>🔒 Ce lien masque les données sensibles (pièce d&apos;identité, coordonnées bancaires).</div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold border-none cursor-pointer" style={{ background: '#2D2D2D', color: '#E5E7EB' }}>Fermer</button>
              <button onClick={() => setDisabled(true)} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold border-[1.5px] cursor-pointer bg-transparent transition-colors" style={{ borderColor: '#EF4444', color: '#EF4444' }} onMouseEnter={e => (e.currentTarget.style.background = '#1A0000')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Désactiver le lien</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Optional document row ──────────────────────────────────────
function OptDocRow({ emoji, label, uploaded, onUpload }: { emoji: string; label: string; uploaded: boolean; onUpload: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-base">{emoji}</span>
        <span className="text-[13px]" style={{ color: '#374151' }}>{label}</span>
      </div>
      {uploaded ? (
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>✓ Ajouté · +5%</span>
      ) : (
        <>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onUpload} />
          <button onClick={() => inputRef.current?.click()} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border-[1.5px] cursor-pointer bg-transparent transition-all" style={{ borderColor: '#E5E7EB', color: '#6B7280' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.color = '#4ECBA0' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}>+ Ajouter (PDF)</button>
        </>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function DossierPage() {
  const [showShare, setShowShare] = useState(false)
  const [optDocs, setOptDocs] = useState({ motivation: false, references: false, attestation: false })
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [profile, setProfile] = useState<ProfileSnap | null>(null)
  const [currentLease, setCurrentLease] = useState<Lease | null>(null)
  const [pastLeases, setPastLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [dossierRes, profileRes, activeLeaseRes, pastLeasesRes] = await Promise.all([
        supabase.from('dossiers').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('first_name, last_name, budget_max').eq('id', user.id).single(),
        supabase.from('leases').select('*').eq('tenant_id', user.id).eq('status', 'active').maybeSingle(),
        supabase.from('leases').select('*').eq('tenant_id', user.id).eq('status', 'ended').order('end_date', { ascending: false }),
      ])

      setDossier(dossierRes.data ?? null)
      setProfile(profileRes.data ?? null)
      setCurrentLease(activeLeaseRes.data ?? null)
      setPastLeases(pastLeasesRes.data ?? [])
    } catch {}
    setLoading(false)
  }

  const optCount = Object.values(optDocs).filter(Boolean).length
  const baseCompletion = dossier?.completion_percent ?? 0
  const completion = baseCompletion + optCount * 5
  const completionColor = completion >= 90 ? '#4ECBA0' : completion >= 60 ? '#F59E0B' : '#EF4444'

  const income = dossier?.income_monthly ?? null
  const budgetMax = profile?.budget_max ?? null
  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || null

  if (loading) {
    return (
      <>
        <Topbar title="Mon dossier" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[44px] mb-3 animate-pulse">📁</div>
            <p className="text-[14px]" style={{ color: '#6B7280' }}>Chargement du dossier…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mon dossier" />
      <div className="flex-1 overflow-y-auto p-8" style={{ maxWidth: '960px' }}>

        <ReadinessBanner completion={completion} />

        {/* Header row */}
        <div className="flex justify-between items-start gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-[28px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Mon dossier</h1>
            <p className="text-[13.5px] mb-4" style={{ color: '#6B7280' }}>Gérez vos documents et partagez votre dossier en toute sécurité</p>
            <button onClick={() => setShowShare(true)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white border-none cursor-pointer transition-colors" style={{ background: '#4ECBA0' }} onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')} onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}>
              📤 Partager mon dossier
            </button>
          </div>
          <ScoreCard income={income} budgetMax={budgetMax} />
        </div>

        {/* Completion bar */}
        <div className="flex justify-between text-sm mb-2">
          <span className="font-bold" style={{ color: '#111827' }}>Complétude</span>
          <span className="font-extrabold" style={{ color: completionColor }}>{completion}%</span>
        </div>
        <div className="h-1.5 rounded-full mb-7 overflow-hidden" style={{ background: '#F3F4F6' }}>
          <div className="h-full rounded-full" style={{ width: `${completion}%`, background: completionColor, transition: 'width 0.5s ease, background 0.3s' }} />
        </div>

        {/* 2×2 document grid */}
        <div className="grid grid-cols-2 gap-3.5 mb-5">
          {/* Identité */}
          <div className="rounded-[14px] p-5 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>📋 Identité</div>
              <StatusBadge variant={dossier?.identity_verified ? 'ok' : 'pending'}>
                {dossier?.identity_verified ? '✓ Vérifiée' : '⏳ En attente'}
              </StatusBadge>
            </div>
            {[
              { label: 'Nom complet', value: fullName || '—', bold: true },
              { label: "Pièce d'identité", value: dossier?.identity_doc_url ? '✓ Uploadée' : '✗ Manquante', mint: !!dossier?.identity_doc_url },
            ].map((r, i, arr) => (
              <div key={r.label} className="flex justify-between items-center py-2 text-[13px]" style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <span style={{ color: '#6B7280' }}>{r.label}</span>
                <span style={{ color: r.mint ? '#4ECBA0' : '#111827', fontWeight: r.bold || r.mint ? 600 : undefined }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Revenus */}
          <div className="rounded-[14px] p-5 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>💰 Revenus</div>
              <StatusBadge variant={income ? 'ok' : 'missing'}>{income ? '✓ Renseigné' : '✗ Absent'}</StatusBadge>
            </div>
            {[
              { label: 'Revenus mensuels', value: income ? `${income.toLocaleString('fr-FR')} €` : '—', bold: true },
              { label: 'Type de contrat', value: dossier?.contract_type ?? '—' },
              { label: 'Fiches de paie', value: dossier?.payslips_urls?.length ? `✓ ${dossier.payslips_urls.length} uploadée(s)` : '✗ Manquantes', mint: !!(dossier?.payslips_urls?.length) },
            ].map((r, i, arr) => (
              <div key={r.label} className="flex justify-between items-center py-2 text-[13px]" style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <span style={{ color: '#6B7280' }}>{r.label}</span>
                <span style={{ color: r.mint ? '#4ECBA0' : '#111827', fontWeight: r.bold || r.mint ? 600 : undefined }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Logement actuel */}
          <div className="rounded-[14px] p-5 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>🏠 Logement actuel</div>
              <StatusBadge variant={dossier?.rent_receipts_urls?.length ? 'pending' : 'missing'}>
                {dossier?.rent_receipts_urls?.length ? `${dossier.rent_receipts_urls.length}/3 docs` : '✗ Absent'}
              </StatusBadge>
            </div>
            <div className="flex justify-between items-center py-2 text-[13px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>Quittances loyer</span>
              <span className="font-bold" style={{ color: dossier?.rent_receipts_urls?.length ? '#F59E0B' : '#EF4444' }}>
                {dossier?.rent_receipts_urls?.length ? `${dossier.rent_receipts_urls.length}/3 docs` : '✗ Manquantes'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 text-[13px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>Attestation assurance</span>
              <span style={{ color: dossier?.insurance_url ? '#4ECBA0' : '#EF4444' }}>
                {dossier?.insurance_url ? '✓ Uploadée' : '✗ Manquante'}
              </span>
            </div>
            <div className="border-2 border-dashed rounded-[9px] p-4 text-center cursor-pointer transition-all mt-2.5" style={{ borderColor: '#E5E7EB' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.background = '#ECFDF5' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '' }}>
              <div className="text-[22px]">📎</div>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Glisser-déposer ou cliquer</p>
            </div>
          </div>

          {/* Garant */}
          <div className="rounded-[14px] p-5 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>🏦 Garant</div>
              <StatusBadge variant={dossier?.guarantor_name ? 'ok' : 'missing'}>{dossier?.guarantor_name ? '✓ Ajouté' : '✗ Absent'}</StatusBadge>
            </div>
            {dossier?.guarantor_name ? (
              <div className="py-2 text-[13px]">
                <div className="text-[13px] font-semibold" style={{ color: '#111827' }}>{dossier.guarantor_name}</div>
                <div className="text-[12px] mt-1" style={{ color: '#6B7280' }}>Document : {dossier.guarantor_doc_url ? '✓ Uploadé' : '✗ Manquant'}</div>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="text-[38px] mb-2">👨‍👩‍👧</div>
                <p className="text-[13px] mb-3" style={{ color: '#6B7280' }}>Un garant renforce votre dossier</p>
                <button className="px-5 py-2 rounded-full text-sm font-semibold border-[1.5px] cursor-pointer transition-all bg-transparent" style={{ borderColor: '#E5E7EB', color: '#374151' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.color = '#4ECBA0' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}>+ Ajouter</button>
              </div>
            )}
          </div>
        </div>

        {/* Bail en cours */}
        <div className="rounded-[14px] p-5 border mb-5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[17px]" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>🏠 Bail en cours</h3>
            <StatusBadge variant={currentLease ? 'ok' : 'missing'}>{currentLease ? '🟢 Actif' : '✗ Aucun bail'}</StatusBadge>
          </div>
          {currentLease ? (
            <>
              <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
                {currentLease.address ?? '—'}{currentLease.city ? `, ${currentLease.city}` : ''} · Depuis le {formatDate(currentLease.start_date)}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { value: currentLease.monthly_rent ? `${currentLease.monthly_rent}€` : '—', label: 'Loyer/mois', hl: false },
                  { value: currentLease.nb_roommates ? `${currentLease.nb_roommates}` : '—', label: 'Colocataires', hl: false },
                  { value: currentLease.end_date ? formatDate(currentLease.end_date) : 'Indéterminé', label: 'Fin du bail', hl: true },
                ].map((s, i) => (
                  <div key={i} className="rounded-[9px] p-3 text-center" style={{ background: s.hl ? '#ECFDF5' : '#F9FAFB' }}>
                    <div className="text-[19px] font-bold" style={{ color: s.hl ? '#059669' : '#111827' }}>{s.value}</div>
                    <div className="text-[11px] mt-1" style={{ color: s.hl ? '#4ECBA0' : '#6B7280' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {['📄 Voir le bail', '🔑 État des lieux'].map(btn => (
                  <button key={btn} className="px-4 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all bg-transparent" style={{ borderColor: '#E5E7EB', color: '#374151' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.color = '#4ECBA0' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}>{btn}</button>
                ))}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-[38px] mb-2">🏡</div>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun bail actif enregistré</p>
            </div>
          )}
        </div>

        {/* Documents optionnels */}
        <div className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] mb-2.5" style={{ color: '#9CA3AF' }}>Documents optionnels</div>
        <div className="rounded-[14px] p-5 border mb-5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Ces documents sont facultatifs mais renforcent votre candidature.</p>
            {optCount > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>+{optCount * 5}% complétude</span>}
          </div>
          <div className="mt-3">
            <OptDocRow emoji="✉️" label="Lettre de motivation" uploaded={optDocs.motivation} onUpload={() => setOptDocs(d => ({ ...d, motivation: true }))} />
            <OptDocRow emoji="📝" label="Références d'anciens propriétaires" uploaded={optDocs.references} onUpload={() => setOptDocs(d => ({ ...d, references: true }))} />
            <div style={{ borderBottom: 'none' }}>
              <OptDocRow emoji="🏢" label="Attestation employeur" uploaded={optDocs.attestation} onUpload={() => setOptDocs(d => ({ ...d, attestation: true }))} />
            </div>
          </div>
        </div>

        {/* Historique des colocations */}
        <div className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] mb-2.5" style={{ color: '#9CA3AF' }}>Historique des colocations</div>
        <div className="rounded-[14px] border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          {pastLeases.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[36px] mb-3">🏡</div>
              <p className="text-[13.5px] font-semibold mb-1" style={{ color: '#111827' }}>Aucune colocation passée</p>
              <p className="text-[12.5px]" style={{ color: '#6B7280' }}>Votre historique se construira ici après vos premières colocations.</p>
            </div>
          ) : (
            pastLeases.map((lease, i) => (
              <div key={lease.id} className="p-5" style={{ borderBottom: i < pastLeases.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[12px] text-white flex-shrink-0" style={{ background: '#6B7280' }}>
                    🏠
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div>
                        <div className="text-[13.5px] font-semibold" style={{ color: '#111827' }}>{lease.address ?? '—'}</div>
                        <div className="text-[12px]" style={{ color: '#6B7280' }}>
                          {lease.city ?? ''} · {formatDate(lease.start_date)} — {formatDate(lease.end_date)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <Stars n={0} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </>
  )
}
