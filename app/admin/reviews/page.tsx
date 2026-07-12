import Image from 'next/image'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'
import ReviewActions from './ReviewActions'

export const dynamic = 'force-dynamic'

interface MiniProfile { first_name: string | null; last_name: string | null; avatar_url: string | null }

interface ReportedReview {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: MiniProfile | null
  reviewed: MiniProfile | null
}

function one(p: MiniProfile | MiniProfile[] | null): MiniProfile | null {
  return (Array.isArray(p) ? p[0] : p) ?? null
}

async function getReportedReviews(): Promise<ReportedReview[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_reviews')
    .select(`
      id, rating, comment, created_at,
      reviewer:reviewer_id (first_name, last_name, avatar_url),
      reviewed:reviewed_id (first_name, last_name, avatar_url)
    `)
    .eq('reported', true)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id as string,
    rating: r.rating as number,
    comment: r.comment as string | null,
    created_at: r.created_at as string,
    reviewer: one(r.reviewer as MiniProfile | MiniProfile[] | null),
    reviewed: one(r.reviewed as MiniProfile | MiniProfile[] | null),
  }))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function firstName(p: MiniProfile | null) {
  return p?.first_name?.trim() || '—'
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#F59E0B', fontSize: '12px', letterSpacing: '1px', flexShrink: 0 }} aria-label={`${rating}/5`}>
      {'★'.repeat(rating)}<span style={{ color: 'rgba(255,255,255,0.15)' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default async function AdminReviews() {
  await getAdminUser()
  const reviews = await getReportedReviews()

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Modération des avis
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {reviews.length} avis signalé{reviews.length !== 1 ? 's' : ''} en attente de modération
        </p>
      </div>

      {reviews.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#4B5563', fontSize: '14px' }}>
          Aucun avis signalé — rien à modérer ✓
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {reviews.map((r, i) => {
            const reviewer = firstName(r.reviewer)
            const reviewed = firstName(r.reviewed)
            const initials = (r.reviewer?.first_name?.[0] ?? '?').toUpperCase()
            const comment = (r.comment ?? '').length > 90 ? `${r.comment!.slice(0, 90)}…` : (r.comment ?? '—')
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 22px',
                  borderBottom: i < reviews.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                {/* Avatar reviewer */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {r.reviewer?.avatar_url
                    ? <Image src={r.reviewer.avatar_url} alt={initials} width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                    : initials}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#E5E7EB' }}>
                      {reviewer} <span style={{ color: '#6B7280', fontWeight: 400 }}>a évalué</span> {reviewed}
                    </span>
                    <Stars rating={r.rating} />
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#9CA3AF', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    « {comment} »
                  </div>
                </div>

                {/* Date */}
                <span style={{ fontSize: '12px', color: '#4B5563', flexShrink: 0 }}>{formatDate(r.created_at)}</span>

                {/* Actions */}
                <ReviewActions reviewId={r.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
