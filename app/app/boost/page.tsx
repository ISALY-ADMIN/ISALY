'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, Home as HomeIcon,
  Zap, Sparkles, Crown, ShieldCheck, CreditCard, X,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import { BentoStyles, cardBase } from '@/components/ui/Bento'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────
interface ListingLite {
  id: string
  title: string | null
  city: string | null
  neighborhood: string | null
  rent: number | null
  photos: string[] | null
  is_active: boolean
  boost_tier: string | null
  boost_expires_at: string | null
}

type BoostTier = 'featured' | 'priority'
type Step = 1 | 2 | 3

const OUTFIT = "'Outfit', sans-serif"

const TIERS: Record<BoostTier, {
  label: string
  price: string
  priceNumber: number
  desc: string
  icon: React.ReactNode
  color: string
  features: string[]
  highlight: boolean
}> = {
  featured: {
    label: 'Essentiel',
    price: '9,99€',
    priceNumber: 9.99,
    desc: 'Ton annonce vue par plus de locataires',
    icon: <Zap size={20} strokeWidth={2} />,
    color: '#818CF8',
    features: [
      'Mise en avant dans les résultats',
      'Badge « Essentiel » sur votre annonce',
      '+50% de visibilité vs. standard',
      'Accès aux dossiers certifiés',
    ],
    highlight: false,
  },
  priority: {
    label: 'Prioritaire',
    price: '24,99€',
    priceNumber: 24.99,
    desc: 'Visibilité maximale garantie',
    icon: <Crown size={20} strokeWidth={2} />,
    color: '#F59E0B',
    features: [
      'Top des résultats de recherche',
      'Badge « Prioritaire » or',
      '+200% de visibilité vs. standard',
      'Statistiques avancées de performance',
      'Support prioritaire 7j/7',
    ],
    highlight: true,
  },
}

// ─── Progress bar ────────────────────────────────────────────
function ProgressBar({ step }: { step: Step }) {
  const labels: [string, string, string] = ['Annonce', 'Formule', 'Paiement']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
      {labels.map((label, i) => {
        const idx = (i + 1) as Step
        const done = step > idx
        const active = step === idx
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0,
              opacity: active || done ? 1 : 0.55,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: done
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : active
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(255,255,255,0.06)',
                border: `1px solid ${done || active ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: done ? '#fff' : active ? '#10B981' : 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: OUTFIT, fontSize: '12px', fontWeight: 800,
                transition: 'all 0.2s ease', flexShrink: 0,
              }}>
                {done ? <Check size={13} strokeWidth={2.6} /> : idx}
              </span>
              <span style={{
                fontFamily: OUTFIT, fontSize: '12.5px', fontWeight: 700,
                color: active ? '#fff' : done ? '#10B981' : 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div style={{
                flex: 1, height: '2px', borderRadius: '2px', minWidth: '20px',
                background: step > idx
                  ? 'linear-gradient(90deg, #10B981, rgba(16,185,129,0.35))'
                  : 'rgba(255,255,255,0.08)',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Listing row (Step 1) ────────────────────────────────────
function ListingRow({ l, selected, onSelect }: {
  l: ListingLite; selected: boolean; onSelect: () => void
}) {
  const already =
    l.boost_tier && l.boost_tier !== 'standard' &&
    l.boost_expires_at && new Date(l.boost_expires_at) > new Date()
  return (
    <button
      type="button" onClick={onSelect}
      className="boost-listing-row"
      style={{
        ...cardBase, textAlign: 'left', width: '100%', padding: 0, height: 'auto',
        cursor: 'pointer',
        border: selected ? '1px solid rgba(16,185,129,0.5)' : cardBase.border,
        background: selected ? 'rgba(16,185,129,0.08)' : cardBase.background,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {/* Radio */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 4px 0 18px', flexShrink: 0,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            border: `2px solid ${selected ? '#10B981' : 'rgba(255,255,255,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: selected ? '#10B981' : 'transparent',
            transition: 'all 0.15s ease',
          }}>
            {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
          </span>
        </div>

        {/* Photo */}
        <div style={{
          width: 90, height: 70, borderRadius: '10px', overflow: 'hidden',
          margin: '14px 0 14px 14px', flexShrink: 0, position: 'relative',
          background: 'rgba(16,185,129,0.1)',
        }}>
          {l.photos?.[0] ? (
            <Image src={l.photos[0]} alt={l.title ?? 'Annonce'} fill sizes="90px" style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#10B981',
            }}>
              <HomeIcon size={24} strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: OUTFIT, fontSize: '14.5px', fontWeight: 700, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{l.title || `Colocation à ${l.city ?? '—'}`}</span>
            {already && (
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
                letterSpacing: '0.4px',
                background: 'rgba(245,158,11,0.14)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.35)',
              }}>DÉJÀ BOOSTÉ</span>
            )}
            {!l.is_active && (
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)',
              }}>INACTIVE</span>
            )}
          </div>
          <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>
            {l.city ?? '—'}{l.neighborhood ? ` · ${l.neighborhood}` : ''} · <span style={{ color: '#10B981', fontWeight: 700 }}>{l.rent ?? 0}€/mois</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Tier card (Step 2) ──────────────────────────────────────
function TierCard({ tier, selected, onSelect }: {
  tier: BoostTier; selected: boolean; onSelect: () => void
}) {
  const t = TIERS[tier]
  return (
    <button
      type="button" onClick={onSelect}
      className="boost-tier-card"
      style={{
        ...cardBase, textAlign: 'left', height: 'auto', padding: '24px 22px',
        cursor: 'pointer', position: 'relative',
        border: selected ? '1px solid rgba(16,185,129,0.55)' : cardBase.border,
        background: selected ? 'rgba(16,185,129,0.08)' : cardBase.background,
      }}
    >
      {t.highlight && (
        <span style={{
          position: 'absolute', top: -10, right: 20, background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          color: '#1C1200', fontFamily: OUTFIT, fontSize: '10px', fontWeight: 800,
          padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.6px',
        }}>MEILLEURE OFFRE</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <span style={{
          width: 44, height: 44, borderRadius: '12px',
          background: `${t.color}18`, border: `1px solid ${t.color}40`, color: t.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{t.icon}</span>
        <div>
          <div style={{ fontFamily: OUTFIT, fontSize: '11px', fontWeight: 700, color: t.color, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            {t.label}
          </div>
          <div style={{ fontFamily: OUTFIT, fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {t.price}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: '3px' }}>/mois</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '18px', lineHeight: 1.5 }}>
        {t.desc}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {t.features.map(f => (
          <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            <Check size={15} strokeWidth={2.4} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{f}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px' }}>
        <span style={{
          display: 'block', width: '100%', textAlign: 'center',
          padding: '10px', borderRadius: '10px',
          fontFamily: OUTFIT, fontSize: '13px', fontWeight: 700,
          background: selected ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.04)',
          color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 0.15s ease',
        }}>
          {selected ? '✓ Sélectionnée' : `Choisir ${t.label}`}
        </span>
      </div>
    </button>
  )
}

// ─── Main content ────────────────────────────────────────────
function BoostContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('listing')

  const [step, setStep] = useState<Step>(1)
  const [listings, setListings] = useState<ListingLite[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId)
  const [tier, setTier] = useState<BoostTier | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data } = await supabase
      .from('listings')
      .select('id, title, city, neighborhood, rent, photos, is_active, boost_tier, boost_expires_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    setListings((data ?? []) as ListingLite[])
  }, [router])

  useEffect(() => { load() }, [load])

  // Si un listing est présélectionné et existe dans la liste chargée, on saute au step 2 automatiquement
  useEffect(() => {
    if (step !== 1 || !preselectedId || !listings) return
    if (listings.some(l => l.id === preselectedId)) {
      setSelectedId(preselectedId)
      setStep(2)
    }
  }, [preselectedId, listings, step])

  const selectedListing = useMemo(
    () => (listings ?? []).find(l => l.id === selectedId) ?? null,
    [listings, selectedId],
  )

  async function handleCheckout() {
    if (!selectedListing || !tier) return
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch('/api/listings/boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: selectedListing.id, boost_tier: tier }),
      })
      const { url, error } = await res.json()
      if (error) { setError(error); setProcessing(false); return }
      if (url) {
        window.location.href = url
      } else {
        setError('URL de paiement introuvable.')
        setProcessing(false)
      }
    } catch {
      setError('Erreur de connexion au paiement. Réessayez.')
      setProcessing(false)
    }
  }

  const canNext =
    (step === 1 && selectedId != null) ||
    (step === 2 && tier != null)

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Booster une annonce" />
      <BentoStyles />

      <style>{`
        .boost-listing-row:hover { border-color: rgba(16,185,129,0.35) !important; transform: translateY(-1px); }
        .boost-tier-card:hover { border-color: rgba(16,185,129,0.45) !important; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(16,185,129,0.1); }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Revenir en arrière"
            style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div>
            <h1 style={{ fontFamily: OUTFIT, fontSize: '26px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
              Booster une annonce
            </h1>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)' }}>
              Augmentez la visibilité de votre annonce et recevez plus de candidatures.
            </div>
          </div>
        </motion.div>

        {/* ── Progress ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <ProgressBar step={step} />
        </motion.div>

        {/* ── Step content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {step === 1 && (
              <StepListing
                listings={listings}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreateListing={() => router.push('/app/mes-annonces/nouveau')}
              />
            )}
            {step === 2 && selectedListing && (
              <StepTier
                selectedListing={selectedListing}
                tier={tier}
                onSelectTier={setTier}
              />
            )}
            {step === 3 && selectedListing && tier && (
              <StepPayment
                selectedListing={selectedListing}
                tier={tier}
                processing={processing}
                error={error}
                onCheckout={handleCheckout}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Actions ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px', marginTop: '28px',
        }}>
          <Button
            variant="ghost" size="md"
            onClick={() => step === 1 ? router.push('/app/mes-annonces') : setStep((step - 1) as Step)}
            disabled={processing}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {step === 1 ? 'Annuler' : 'Précédent'}
          </Button>
          {step < 3 && (
            <Button
              variant="primary" size="md"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canNext}
            >
              Suivant
              <ArrowRight size={14} strokeWidth={2} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1 ──────────────────────────────────────────────────
function StepListing({ listings, selectedId, onSelect, onCreateListing }: {
  listings: ListingLite[] | null
  selectedId: string | null
  onSelect: (id: string) => void
  onCreateListing: () => void
}) {
  return (
    <div>
      <h2 style={{ fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
        Sélectionnez l&apos;annonce à booster
      </h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 18px' }}>
        Une seule annonce à la fois — vous pourrez booster les autres après ce paiement.
      </p>
      {listings === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="shimmer" style={{ ...cardBase, height: '98px', padding: 0 }} />
          <div className="shimmer" style={{ ...cardBase, height: '98px', padding: 0 }} />
        </div>
      ) : listings.length === 0 ? (
        <div style={{
          ...cardBase, minHeight: '200px', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '40px 24px',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '16px', marginBottom: '14px',
            background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981',
          }}>
            <HomeIcon size={24} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontFamily: OUTFIT, fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
            Aucune annonce à booster
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 18px' }}>
            Publiez une première annonce pour ensuite la mettre en avant.
          </p>
          <Button variant="primary" size="md" onClick={onCreateListing}>
            Publier une annonce
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {listings.map(l => (
            <ListingRow
              key={l.id}
              l={l}
              selected={selectedId === l.id}
              onSelect={() => onSelect(l.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step 2 ──────────────────────────────────────────────────
function StepTier({ selectedListing, tier, onSelectTier }: {
  selectedListing: ListingLite
  tier: BoostTier | null
  onSelectTier: (t: BoostTier) => void
}) {
  return (
    <div>
      <h2 style={{ fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
        Choisissez la formule
      </h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 18px' }}>
        Vous boostez <strong style={{ color: '#fff' }}>{selectedListing.title || `l'annonce à ${selectedListing.city ?? '—'}`}</strong>. Résiliation à tout moment.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <TierCard tier="featured" selected={tier === 'featured'} onSelect={() => onSelectTier('featured')} />
        <TierCard tier="priority" selected={tier === 'priority'} onSelect={() => onSelectTier('priority')} />
      </div>
    </div>
  )
}

// ─── Step 3 ──────────────────────────────────────────────────
function StepPayment({ selectedListing, tier, processing, error, onCheckout }: {
  selectedListing: ListingLite
  tier: BoostTier
  processing: boolean
  error: string | null
  onCheckout: () => void
}) {
  const t = TIERS[tier]
  const photo = selectedListing.photos?.[0]
  return (
    <div>
      <h2 style={{ fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
        Récapitulatif
      </h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 18px' }}>
        Vérifiez avant paiement — vous serez redirigé vers Stripe.
      </p>

      <div style={{ ...cardBase, padding: '22px', height: 'auto', gap: '18px' }}>
        {/* Annonce */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '12px', overflow: 'hidden',
            flexShrink: 0, position: 'relative', background: 'rgba(16,185,129,0.1)',
          }}>
            {photo ? (
              <Image src={photo} alt={selectedListing.title ?? 'Annonce'} fill sizes="72px" style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <HomeIcon size={26} strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 700 }}>
              Annonce
            </div>
            <div style={{ fontFamily: OUTFIT, fontSize: '15px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedListing.title || `Colocation à ${selectedListing.city ?? '—'}`}
            </div>
            <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>
              {selectedListing.city ?? '—'}{selectedListing.neighborhood ? ` · ${selectedListing.neighborhood}` : ''}
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

        {/* Formule */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              width: 44, height: 44, borderRadius: '12px',
              background: `${t.color}18`, border: `1px solid ${t.color}40`, color: t.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{t.icon}</span>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 700 }}>
                Formule
              </div>
              <div style={{ fontFamily: OUTFIT, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                {t.label} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>· 30 jours renouvelables</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: OUTFIT, fontSize: '24px', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
              {t.price}
            </div>
            <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>par mois, TTC</div>
          </div>
        </div>

        {/* Bouton */}
        <Button
          variant="primary" size="md"
          onClick={onCheckout}
          loading={processing}
          disabled={processing}
          className="!w-full !py-3"
        >
          <CreditCard size={16} strokeWidth={2} />
          {processing ? 'Redirection…' : 'Payer avec Stripe'}
        </Button>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#F87171', borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
          }}>
            <X size={16} strokeWidth={2.2} />
            {error}
          </div>
        )}

        {/* Sécurité */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55,
        }}>
          <ShieldCheck size={14} strokeWidth={1.8} />
          Paiement sécurisé par Stripe · Résiliation à tout moment · Sans engagement
        </div>
      </div>
    </div>
  )
}

export default function BoostPage() {
  return (
    <Suspense fallback={null}>
      <BoostContent />
    </Suspense>
  )
}
