'use client'
import { useState, useEffect } from 'react'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  reviewer?: { first_name: string; avatar_url?: string }
}

interface ReviewStarsProps {
  userId: string
  canReview?: boolean
  reviewedId?: string
}

export default function ReviewStars({ userId, canReview, reviewedId }: ReviewStarsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/reviews?user_id=${userId}`)
      .then(r => r.json())
      .then(({ reviews, average, count }) => {
        setReviews(reviews ?? [])
        setAverage(average)
        setCount(count ?? 0)
      })
  }, [userId])

  async function submitReview() {
    if (!rating || !reviewedId) return
    setSubmitting(true)
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewed_id: reviewedId, rating, comment }),
    })
    setShowForm(false)
    setSubmitting(false)
    const res = await fetch(`/api/reviews?user_id=${userId}`)
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setAverage(data.average)
    setCount(data.count ?? 0)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ fontSize: '18px', color: average && i <= Math.round(average) ? '#F59E0B' : '#E5E7EB' }}>★</span>
          ))}
        </div>
        {average !== null && (
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{average.toFixed(1)}</span>
        )}
        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>({count} avis)</span>
        {canReview && !showForm && (
          <button onClick={() => setShowForm(true)} style={{ marginLeft: 'auto', fontSize: '12px', color: '#10B981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            + Laisser un avis
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[1,2,3,4,5].map(i => (
              <button key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i)}
                style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', color: i <= (hover || rating) ? '#F59E0B' : '#E5E7EB', transition: 'color 0.1s' }}
              >★</button>
            ))}
          </div>
          <textarea
            placeholder="Décris ton expérience de colocation... (optionnel)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={submitReview} disabled={!rating || submitting}
              style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: !rating ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}>
              {submitting ? 'Envoi...' : 'Publier'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ padding: '10px 16px', background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {count === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '13px' }}>
          Aucun avis pour l&apos;instant — vos colocataires pourront en laisser un après votre colocation.
        </div>
      )}

      {reviews.slice(0, 3).map(r => (
        <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              {r.reviewer?.first_name?.[0] ?? '?'}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{r.reviewer?.first_name ?? 'Anonyme'}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1px' }}>
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{ fontSize: '12px', color: i <= r.rating ? '#F59E0B' : '#E5E7EB' }}>★</span>
              ))}
            </div>
          </div>
          {r.comment && <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{r.comment}</p>}
        </div>
      ))}
    </div>
  )
}
