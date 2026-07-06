'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, Flag, CornerDownRight } from 'lucide-react'
import Button from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────
interface Review {
  id: string
  reviewer_id: string
  reviewed_id: string
  rating: number
  comment: string | null
  created_at: string
  reply: string | null
  replied_at: string | null
  reported: boolean
  reviewer?: { first_name: string | null; avatar_url: string | null }
}

interface ReviewData {
  reviews: Review[]
  average: number | null
  count: number
  distribution: Record<number, number>
  viewer_id: string | null
  can_review: boolean
  my_review: Review | null
}

interface ReviewStarsProps {
  /** Utilisateur dont on affiche les avis reçus */
  userId: string
  /** Prénom affiché dans "Réponse de X" et les états vides */
  profileFirstName?: string
}

const TXT = { hi: '#fff', mid: 'rgba(255,255,255,0.65)', low: 'rgba(255,255,255,0.4)', faint: 'rgba(255,255,255,0.3)' }
const GOLD = '#F59E0B'

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.round(value) ? GOLD : 'none'} color={i <= Math.round(value) ? GOLD : 'rgba(255,255,255,0.18)'} />
      ))}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ══════════════════════════════════════════════════════════════
export default function ReviewStars({ userId, profileFirstName }: ReviewStarsProps) {
  const [data, setData] = useState<ReviewData | null>(null)

  // Formulaire d'avis
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Réponse aux avis (personne évaluée)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

  const [reportedLocal, setReportedLocal] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/reviews?user_id=${userId}`)
      const d: ReviewData = await res.json()
      setData(d)
      if (d.my_review) {
        setRating(d.my_review.rating)
        setComment(d.my_review.comment ?? '')
      }
    } catch { /* silencieux */ }
  }, [userId])

  useEffect(() => { load() }, [load])

  async function submitReview() {
    if (!rating || comment.trim().length < 20) return
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewed_id: userId, rating, comment: comment.trim() }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Erreur inattendue.' }))
      setFormError(error ?? 'Erreur inattendue.')
      return
    }
    setShowForm(false)
    load()
  }

  async function submitReply(reviewId: string) {
    if (!replyText.trim()) return
    setReplySubmitting(true)
    const res = await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reviewId, action: 'reply', reply: replyText.trim() }),
    })
    setReplySubmitting(false)
    if (res.ok) {
      setReplyingTo(null)
      setReplyText('')
      load()
    }
  }

  async function reportReview(reviewId: string) {
    setReportedLocal(s => new Set(s).add(reviewId))
    await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reviewId, action: 'report' }),
    }).catch(() => {})
  }

  if (!data) {
    return <div className="h-20 rounded-[14px] animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
  }

  const { reviews, average, count, distribution, viewer_id, can_review, my_review } = data
  const isOwner = viewer_id === userId
  const maxDist = Math.max(1, ...Object.values(distribution))

  return (
    <div>
      {/* ── Résumé : moyenne + distribution ── */}
      {count > 0 ? (
        <div className="flex flex-col sm:flex-row gap-5 mb-5">
          <div className="flex flex-col items-center justify-center flex-shrink-0 px-4">
            <div className="text-[38px] font-extrabold leading-none mb-1.5" style={{ color: TXT.hi, fontFamily: "'Outfit', sans-serif" }}>
              {average?.toFixed(1)}
            </div>
            <Stars value={average ?? 0} size={15} />
            <div className="text-[12px] mt-1.5" style={{ color: TXT.low }}>{count} avis</div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {[5, 4, 3, 2, 1].map(n => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[11px] font-semibold w-3 text-right" style={{ color: TXT.low }}>{n}</span>
                <Star size={10} fill={GOLD} color={GOLD} className="flex-shrink-0" />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(distribution[n] / maxDist) * 100}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }}
                  />
                </div>
                <span className="text-[11px] w-5" style={{ color: TXT.faint }}>{distribution[n]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[13px] mb-4" style={{ color: TXT.faint }}>
          {isOwner
            ? 'Aucun avis pour l’instant — vos colocataires et contacts pourront en laisser un.'
            : `${profileFirstName ?? 'Cet utilisateur'} n’a pas encore reçu d’avis.`}
        </p>
      )}

      {/* ── Bouton "Laisser un avis" ── */}
      {can_review && !showForm && (
        <div className="mb-4">
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <Star size={14} /> {my_review ? 'Modifier mon avis' : 'Laisser un avis'}
          </Button>
        </div>
      )}

      {/* ── Formulaire de dépôt / modification ── */}
      {showForm && (
        <div className="rounded-[14px] p-4 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i)}
                className="bg-transparent border-none cursor-pointer p-0.5 transition-transform duration-150 hover:scale-110"
                aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
              >
                <Star size={26} fill={i <= (hover || rating) ? GOLD : 'none'} color={i <= (hover || rating) ? GOLD : 'rgba(255,255,255,0.25)'} />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Décrivez votre expérience (20 caractères minimum)…"
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 600))}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-[10px] text-[13px] resize-none outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: TXT.hi, fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#10B981')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
          <div className="text-right text-[11px] mt-1" style={{ color: comment.trim().length >= 20 ? '#10B981' : TXT.faint }}>
            {comment.trim().length}/20 min.
          </div>
          {formError && <p className="text-[12px] mt-1 mb-0" style={{ color: '#F87171' }}>{formError}</p>}
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={submitReview} loading={submitting} disabled={!rating || comment.trim().length < 20}>
              Publier
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormError('') }}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* ── Liste des avis ── */}
      <div className="flex flex-col gap-3">
        {reviews.map(r => {
          const name = r.reviewer?.first_name ?? 'Utilisateur'
          const reported = r.reported || reportedLocal.has(r.id)
          return (
            <div key={r.id} className="p-3.5 rounded-[14px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5 mb-1.5">
                {r.reviewer?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.reviewer.avatar_url} alt={name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    {name[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: TXT.hi }}>{name}</div>
                  <div className="text-[11px]" style={{ color: TXT.faint }}>{fmtDate(r.created_at)}</div>
                </div>
                <Stars value={r.rating} size={12} />
              </div>

              {r.comment && (
                <p className="text-[13px] leading-relaxed m-0" style={{ color: TXT.mid }}>{r.comment}</p>
              )}

              {/* Réponse de la personne évaluée */}
              {r.reply && (
                <div className="mt-2.5 ml-5 pl-3 py-2 rounded-r-[10px]" style={{ borderLeft: '2px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' }}>
                  <div className="flex items-center gap-1.5 text-[11.5px] font-semibold mb-1" style={{ color: '#10B981' }}>
                    <CornerDownRight size={12} /> Réponse de {profileFirstName ?? 'l’utilisateur'}
                    {r.replied_at && <span className="font-normal" style={{ color: TXT.faint }}>· {fmtDate(r.replied_at)}</span>}
                  </div>
                  <p className="text-[12.5px] leading-relaxed m-0" style={{ color: TXT.mid }}>{r.reply}</p>
                </div>
              )}

              {/* Actions : répondre (une fois, personne évaluée) + signaler */}
              <div className="flex items-center gap-3 mt-2">
                {isOwner && !r.reply && replyingTo !== r.id && (
                  <button
                    onClick={() => { setReplyingTo(r.id); setReplyText('') }}
                    className="bg-transparent border-none cursor-pointer p-0 text-[11.5px] font-semibold transition-colors"
                    style={{ color: '#10B981' }}
                  >
                    Répondre
                  </button>
                )}
                {viewer_id && viewer_id !== r.reviewer_id && (
                  <button
                    onClick={() => !reported && reportReview(r.id)}
                    disabled={reported}
                    className="ml-auto flex items-center gap-1 bg-transparent border-none p-0 text-[11px] transition-colors"
                    style={{ color: reported ? TXT.faint : 'rgba(255,255,255,0.35)', cursor: reported ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!reported) e.currentTarget.style.color = '#F87171' }}
                    onMouseLeave={e => { if (!reported) e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                  >
                    <Flag size={10} /> {reported ? 'Signalé' : 'Signaler'}
                  </button>
                )}
              </div>

              {/* Formulaire de réponse */}
              {replyingTo === r.id && (
                <div className="mt-2.5">
                  <textarea
                    placeholder="Votre réponse (publique, une seule fois)…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value.slice(0, 400))}
                    rows={2}
                    autoFocus
                    className="w-full px-3 py-2 rounded-[10px] text-[12.5px] resize-none outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      color: TXT.hi, fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#10B981')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                  <div className="flex gap-2 mt-1.5">
                    <Button size="sm" onClick={() => submitReply(r.id)} loading={replySubmitting} disabled={!replyText.trim()}>
                      Publier la réponse
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
