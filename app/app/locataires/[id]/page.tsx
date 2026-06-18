'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
}

interface DossierRow {
  identity_doc_url: string | null
  identity_verified: boolean
  income_monthly: number | null
  contract_type: string | null
  payslips_urls: string[] | null
  guarantor_name: string | null
  guarantor_doc_url: string | null
  completion_percent: number
}

interface RentPaymentRow {
  id: string
  amount: number
  month: string
  status: string
  paid_at: string | null
}

interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: { first_name: string | null; avatar_url: string | null } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function LocataireDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tenantId = params.id as string
  const leaseId = searchParams.get('lease')

  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [dossier, setDossier] = useState<DossierRow | null>(null)
  const [payments, setPayments] = useState<RentPaymentRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [reviewAvg, setReviewAvg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      if (leaseId) {
        const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', leaseId).maybeSingle()
        if (!lease || lease.owner_id !== user.id) { setAuthorized(false); setLoading(false); return }
      }
      setAuthorized(true)

      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, avatar_url, city, bio').eq('id', tenantId).maybeSingle(),
        supabase.from('dossiers').select('*').eq('user_id', tenantId).maybeSingle(),
      ])
      setProfile((p as ProfileRow) ?? null)
      setDossier((d as DossierRow) ?? null)

      if (leaseId) {
        const { data: rp } = await supabase
          .from('rent_payments')
          .select('id, amount, month, status, paid_at')
          .eq('lease_id', leaseId)
          .eq('tenant_id', tenantId)
          .order('month', { ascending: false })
        setPayments((rp ?? []) as RentPaymentRow[])
      }

      try {
        const res = await fetch(`/api/reviews?user_id=${tenantId}`)
        const json = await res.json()
        setReviews(json.reviews ?? [])
        setReviewAvg(json.average ?? null)
      } catch {}

      setLoading(false)
    }
    load()
  }, [tenantId, leaseId, router])

  if (loading) {
    return (
      <>
        <Topbar title="Locataire" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>👤</div>
        </div>
      </>
    )
  }

  if (authorized === false || !profile) {
    return (
      <>
        <Topbar title="Locataire" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[44px] mb-3">🚫</div>
          <p className="text-[14px]" style={{ color: '#6B7280' }}>Vous n&apos;avez pas accès à ce profil.</p>
        </div>
      </>
    )
  }

  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Locataire'
  const initials = (`${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`).toUpperCase() || '?'

  return (
    <>
      <Topbar title={name} />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '720px' }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 p-5 rounded-[16px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="w-[72px] h-[72px] rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center font-extrabold text-xl text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-extrabold" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>{name}</div>
            <div className="text-[13px] mt-0.5" style={{ color: '#6B7280' }}>
              {profile.city ?? 'Ville non renseignée'}
              {reviewAvg !== null && <span> · ⭐ {reviewAvg}/5 ({reviews.length} avis)</span>}
            </div>
            {dossier?.identity_verified && (
              <span className="inline-flex mt-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>
                ✓ Identité vérifiée
              </span>
            )}
          </div>
          <button
            onClick={() => router.push(`/app/messages?owner=${tenantId}`)}
            className="px-4 py-2.5 rounded-full text-[12.5px] font-bold text-white border-none cursor-pointer flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
          >
            💬 Contacter
          </button>
        </div>

        {profile.bio && (
          <p className="text-[13px] mb-6" style={{ color: '#6B7280', lineHeight: 1.6 }}>{profile.bio}</p>
        )}

        {/* Historique des paiements */}
        {leaseId && (
          <div className="mb-6">
            <h3 className="text-[15px] font-bold mb-3" style={{ color: '#111827' }}>💳 Historique des paiements</h3>
            {payments.length === 0 ? (
              <div className="text-center py-6 rounded-[12px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <p className="text-[13px]" style={{ color: '#9CA3AF' }}>Aucun paiement enregistré.</p>
              </div>
            ) : (
              <div className="rounded-[14px] overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                {payments.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: i < payments.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <span className="text-[13px] font-semibold capitalize" style={{ color: '#111827' }}>{monthLabel(p.month)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13.5px] font-bold" style={{ color: '#111827' }}>{p.amount} €</span>
                      <span
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
                        style={
                          p.status === 'paid' ? { background: '#ECFDF5', color: '#059669' }
                          : p.status === 'late' ? { background: '#FEF2F2', color: '#DC2626' }
                          : { background: '#FFFBEB', color: '#D97706' }
                        }
                      >
                        {p.status === 'paid' ? '✓ Payé' : p.status === 'late' ? '✗ Retard' : '⏳ Attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="mb-6">
          <h3 className="text-[15px] font-bold mb-3" style={{ color: '#111827' }}>📄 Documents fournis</h3>
          {!dossier ? (
            <div className="text-center py-6 rounded-[12px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p className="text-[13px]" style={{ color: '#9CA3AF' }}>Aucun dossier soumis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Pièce d'identité", url: dossier.identity_doc_url },
                ...(dossier.payslips_urls ?? []).map((u, i) => ({ label: `Fiche de paie ${i + 1}`, url: u })),
                { label: 'Garant', url: dossier.guarantor_doc_url },
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-[10px]" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <span className="text-[12.5px] font-medium" style={{ color: '#374151' }}>{doc.label}</span>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full no-underline" style={{ background: '#4ECBA0', color: '#fff' }}>
                      Voir
                    </a>
                  ) : (
                    <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>Absent</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avis reçus */}
        <div className="mb-6">
          <h3 className="text-[15px] font-bold mb-3" style={{ color: '#111827' }}>⭐ Avis reçus</h3>
          {reviews.length === 0 ? (
            <div className="text-center py-6 rounded-[12px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p className="text-[13px]" style={{ color: '#9CA3AF' }}>Aucun avis pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reviews.map(r => (
                <div key={r.id} className="p-4 rounded-[12px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] font-semibold" style={{ color: '#111827' }}>{r.reviewer?.first_name ?? 'Anonyme'}</span>
                    <span style={{ color: '#F59E0B', fontSize: '12px' }}>{'★'.repeat(r.rating)}<span style={{ color: '#E5E7EB' }}>{'★'.repeat(5 - r.rating)}</span></span>
                  </div>
                  {r.comment && <p className="text-[12.5px]" style={{ color: '#6B7280' }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}

export default function LocataireDetailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Chargement…</div>}>
      <LocataireDetailContent />
    </Suspense>
  )
}
