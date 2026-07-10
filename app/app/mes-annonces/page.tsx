'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit3, Trash2, Zap, ExternalLink,
  Home as HomeIcon, MapPin, Ruler, DoorOpen, Users, X, CheckCircle2,
  Inbox,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { listingOccupancy } from '@/lib/utils'
import { BentoStyles, CountUp, cardBase } from '@/components/ui/Bento'
import { useModeChangeRefresh } from '@/hooks/useModeChangeRefresh'

// ─── Types ───────────────────────────────────────────────────
interface Listing {
  id: string
  title: string | null
  city: string | null
  neighborhood: string | null
  rent: number | null
  surface: number | null
  rooms_available: number | null
  occupants_current: number | null
  capacity_total: number | null
  photos: string[] | null
  is_active: boolean
  boost_type: string | null
  boost_tier: string | null
  boost_expires_at: string | null
  created_at: string
  description: string | null
}

type BoostTier = 'standard' | 'featured' | 'priority'

// ─── Helpers ─────────────────────────────────────────────────
function boostState(l: Listing): { tier: BoostTier; active: boolean; expiresAt: Date | null } {
  const tier = ((l.boost_tier ?? l.boost_type ?? 'standard') as BoostTier)
  const expiresAt = l.boost_expires_at ? new Date(l.boost_expires_at) : null
  const active = tier !== 'standard' && (!expiresAt || expiresAt > new Date())
  return { tier, active, expiresAt }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 30 * 86400) return `il y a ${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Toast ───────────────────────────────────────────────────
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: 'fixed', top: '76px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(16,185,129,0.14)', color: '#4ECBA0',
        border: '1px solid rgba(16,185,129,0.35)',
        borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: 600,
        zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Outfit', sans-serif",
      }}
    >
      <CheckCircle2 size={16} strokeWidth={2.2} />
      <span>{msg}</span>
      <button
        onClick={onClose}
        aria-label="Fermer"
        style={{ background: 'none', border: 'none', color: '#4ECBA0', cursor: 'pointer', display: 'flex', padding: '2px' }}
      ><X size={14} /></button>
    </motion.div>
  )
}

// ─── Toggle switch (mint) ────────────────────────────────────
function ToggleSwitch({ active, onToggle, disabled, label }: {
  active: boolean; onToggle: () => void; disabled?: boolean; label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 12, flexShrink: 0,
        background: active ? '#10B981' : 'rgba(255,255,255,0.12)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.14)'}`,
        padding: 2, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'block', width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transform: `translateX(${active ? 18 : 0}px)`,
          transition: 'transform 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      />
    </button>
  )
}

// ─── Stats card ──────────────────────────────────────────────
function StatCard({ icon, label, value, tint }: {
  icon: React.ReactNode; label: string; value: number; tint?: string
}) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      style={{ ...cardBase, minHeight: '96px', padding: '18px 22px', flexDirection: 'row', alignItems: 'center', gap: '16px' }}
    >
      <span style={{
        width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
        background: tint ? `${tint}18` : 'rgba(16,185,129,0.12)',
        border: `1px solid ${tint ? `${tint}40` : 'rgba(16,185,129,0.28)'}`,
        color: tint ?? '#10B981',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <CountUp value={value} style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
        <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
      </div>
    </motion.div>
  )
}

// ─── Delete confirmation modal (2 steps) ─────────────────────
function DeleteModal({ listing, step, busy, onCancel, onNext, onConfirm }: {
  listing: Listing
  step: 1 | 2
  busy: boolean
  onCancel: () => void
  onNext: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px', backdropFilter: 'blur(6px)',
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0F1214', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '28px', maxWidth: '460px', width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '14px', marginBottom: '16px',
          background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trash2 size={22} color="#F87171" />
        </div>

        <h2 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700,
          color: '#fff', margin: '0 0 8px',
        }}>
          {step === 1 ? 'Supprimer cette annonce ?' : 'Confirmer la suppression'}
        </h2>

        <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: '0 0 20px' }}>
          {step === 1 ? (
            <>Vous êtes sur le point de supprimer <strong style={{ color: '#fff' }}>« {listing.title || `Annonce à ${listing.city}`} »</strong>.</>
          ) : (
            <>Cette action est <strong style={{ color: '#F87171' }}>irréversible</strong>. L&apos;annonce, ses photos et toute la visibilité associée seront définitivement perdues.</>
          )}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          {step === 1 ? (
            <Button variant="danger" size="sm" onClick={onNext}>
              Continuer
            </Button>
          ) : (
            <Button
              variant="danger" size="sm" onClick={onConfirm} loading={busy}
              style={{ background: '#EF4444', color: '#fff', borderColor: '#EF4444' }}
            >
              Supprimer définitivement
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Listing card (horizontal) ───────────────────────────────
function ListingCard({ l, onToggle, onDelete, busy, candidatesCount }: {
  l: Listing
  onToggle: () => void
  onDelete: () => void
  busy: boolean
  candidatesCount: number
}) {
  const router = useRouter()
  const { tier, active: boostActive, expiresAt } = boostState(l)
  const occ = listingOccupancy(l)
  const photo = l.photos?.[0] ?? null
  const title = l.title || `Colocation à ${l.city ?? 'ville inconnue'}`

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
      className="mes-annonces-card"
      style={{ ...cardBase, padding: 0, height: 'auto' }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: '0', alignItems: 'stretch' }} className="mes-annonces-row">
        {/* ── Photo ────────────────────────────────────────── */}
        <div style={{
          width: 170, minWidth: 170, height: 130, borderRadius: '12px',
          margin: '16px 0 16px 16px', overflow: 'hidden', flexShrink: 0,
          position: 'relative', background: 'rgba(16,185,129,0.08)',
        }}>
          {photo ? (
            // unoptimized: certaines photos peuvent venir d'un domaine externe
            // (import Leboncoin/SeLoger/PAP) non whitelisté dans next.config.
            <Image
              src={photo} alt={title} fill sizes="170px"
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#10B981',
            }}>
              <HomeIcon size={36} strokeWidth={1.5} />
            </div>
          )}
          {!l.is_active && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10.5px', fontWeight: 800, color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase', letterSpacing: '1.5px',
            }}>
              Inactive
            </div>
          )}
        </div>

        {/* ── Centre : infos ───────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center',
        }}>
          {/* Ligne 1 : titre + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700,
              color: '#fff', margin: 0, lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>{title}</h3>

            <span style={{
              fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
              letterSpacing: '0.4px', flexShrink: 0,
              ...(l.is_active
                ? { background: 'rgba(16,185,129,0.14)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }),
            }}>
              {l.is_active ? '● ACTIF' : '○ INACTIF'}
            </span>

            {boostActive && (
              <span style={{
                fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                letterSpacing: '0.4px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
                ...(tier === 'priority'
                  ? { background: 'rgba(245,158,11,0.14)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }
                  : { background: 'rgba(99,102,241,0.14)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.4)' }),
              }}>
                <Zap size={10} strokeWidth={2.5} />
                {tier === 'priority' ? 'PRIORITAIRE' : 'ESSENTIEL'}
              </span>
            )}
          </div>

          {/* Ligne 2 : ville · surface · chambres · places */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '14px',
            fontSize: '13px', color: 'rgba(255,255,255,0.6)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={13} strokeWidth={1.75} />
              {l.city ?? '—'}{l.neighborhood ? ` · ${l.neighborhood}` : ''}
            </span>
            {(l.surface ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Ruler size={13} strokeWidth={1.75} />
                {l.surface} m²
              </span>
            )}
            {(l.rooms_available ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <DoorOpen size={13} strokeWidth={1.75} />
                {l.rooms_available} chambre{(l.rooms_available ?? 0) > 1 ? 's' : ''}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Users size={13} strokeWidth={1.75} />
              {occ.current}/{occ.total} places
            </span>
          </div>

          {/* Ligne 3 : loyer + date */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
              {l.rent ?? 0}€
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: '3px' }}>/mois</span>
            </span>
            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)' }}>
              Créée {timeAgo(l.created_at)}
              {boostActive && expiresAt && (
                <> · Boost jusqu&apos;au {expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</>
              )}
            </span>
          </div>
        </div>

        {/* ── Actions (droite) ─────────────────────────────── */}
        <div style={{
          flexShrink: 0, padding: '16px 18px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: '10px',
          justifyContent: 'center', minWidth: '160px',
        }} className="mes-annonces-actions">
          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ToggleSwitch
              active={l.is_active}
              onToggle={onToggle}
              disabled={busy}
              label={l.is_active ? "Désactiver l'annonce" : "Réactiver l'annonce"}
            />
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: l.is_active ? '#10B981' : 'rgba(255,255,255,0.4)' }}>
              {l.is_active ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>

          {/* Boutons rangée : Edit + Boost + Voir + Delete */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <Button
              variant="secondary" size="sm"
              onClick={() => router.push(`/app/mes-annonces/${l.id}/editer`)}
              aria-label="Modifier l'annonce"
              className="!px-2.5 !py-1.5"
            >
              <Edit3 size={13} strokeWidth={2} />
              <span style={{ fontSize: '12px' }}>Modifier</span>
            </Button>

            {!boostActive && (
              <Button
                variant="ghost" size="sm"
                onClick={() => router.push(`/app/boost?listing=${l.id}`)}
                aria-label="Booster l'annonce"
                className="!px-2.5 !py-1.5"
                style={{ color: '#818CF8' }}
              >
                <Zap size={13} strokeWidth={2} />
                <span style={{ fontSize: '12px' }}>Boost</span>
              </Button>
            )}

            <Button
              variant="ghost" size="sm"
              onClick={() => router.push(`/app/annonce/${l.id}`)}
              aria-label="Voir l'annonce publique"
              className="!px-2.5 !py-1.5"
              title="Voir la page publique"
            >
              <ExternalLink size={13} strokeWidth={2} />
              <span style={{ fontSize: '12px' }}>Voir</span>
            </Button>

            <Button
              variant="ghost" size="sm"
              onClick={onDelete}
              aria-label="Supprimer l'annonce"
              className="!px-2.5 !py-1.5 hover:!bg-[rgba(239,68,68,0.08)] hover:!text-[#F87171]"
              disabled={busy}
              title="Supprimer"
            >
              <Trash2 size={13} strokeWidth={2} />
            </Button>
          </div>

          {/* Lien discret candidatures */}
          {candidatesCount > 0 && (
            <Link
              href={`/app/candidatures?listing=${l.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                textDecoration: 'none',
                fontSize: '11.5px', fontWeight: 600, color: '#10B981',
                marginTop: '2px', width: 'fit-content',
              }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
            >
              <Inbox size={11} strokeWidth={2} />
              {candidatesCount} candidature{candidatesCount > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{
        ...cardBase, minHeight: '280px', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '48px 32px',
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: '20px', marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <HomeIcon size={32} color="#10B981" strokeWidth={1.5} />
      </div>
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
        Aucune annonce publiée
      </h3>
      <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: '0 0 24px', maxWidth: '380px' }}>
        Publiez votre première annonce pour trouver des colocataires compatibles sur ISALY.
      </p>
      <Button variant="primary" size="md" onClick={onCreate}>
        <Plus size={16} strokeWidth={2.2} />
        Publier une annonce
      </Button>
    </motion.div>
  )
}

// ─── Loading skeleton ────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shimmer" style={{ ...cardBase, height: '162px', padding: 0 }} />
  )
}

// ─── Main page ───────────────────────────────────────────────
function MesAnnoncesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useModeChangeRefresh()

  const initialToast =
    searchParams.get('created') === '1' ? 'Annonce publiée avec succès'
    : searchParams.get('updated') === '1' ? 'Annonce mise à jour'
    : searchParams.get('boost_success') === 'true' ? 'Boost activé — votre annonce sera mise en avant sous peu'
    : ''

  const [listings, setListings] = useState<Listing[] | null>(null)
  const [candidatesCount, setCandidatesCount] = useState(0)
  const [candidatesByListing, setCandidatesByListing] = useState<Record<string, number>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [toast, setToast] = useState<string>(initialToast)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [listRes, myListingIdsRes] = await Promise.all([
      supabase.from('listings').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('listings').select('id').eq('owner_id', user.id),
    ])
    setListings((listRes.data ?? []) as Listing[])

    const myIds = (myListingIdsRes.data ?? []).map(l => l.id as string)
    if (myIds.length > 0) {
      const { count } = await supabase
        .from('swipes').select('id', { count: 'exact', head: true })
        .eq('swiped_id', user.id).in('direction', ['right', 'super'])
      setCandidatesCount(count ?? 0)

      // Comptage par annonce (nécessite swipes.listing_id — sinon renvoie {})
      const { data: perListing } = await supabase
        .from('swipes').select('listing_id')
        .eq('swiped_id', user.id).in('direction', ['right', 'super'])
      const grouped: Record<string, number> = {}
      for (const row of (perListing ?? []) as { listing_id: string | null }[]) {
        if (!row.listing_id) continue
        grouped[row.listing_id] = (grouped[row.listing_id] ?? 0) + 1
      }
      setCandidatesByListing(grouped)
    } else {
      setCandidatesCount(0)
      setCandidatesByListing({})
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4200)
    return () => clearTimeout(t)
  }, [toast])

  const stats = useMemo(() => {
    const arr = listings ?? []
    return {
      total: arr.length,
      active: arr.filter(l => l.is_active).length,
      candidates: candidatesCount,
    }
  }, [listings, candidatesCount])

  async function handleToggle(l: Listing) {
    if (pendingId) return
    setPendingId(l.id)
    const next = !l.is_active
    // Optimistic
    setListings(prev => (prev ?? []).map(x => x.id === l.id ? { ...x, is_active: next } : x))
    const supabase = createClient()
    const { error } = await supabase.from('listings').update({ is_active: next }).eq('id', l.id)
    if (error) {
      // rollback
      setListings(prev => (prev ?? []).map(x => x.id === l.id ? { ...x, is_active: !next } : x))
      setToast(`Erreur : ${error.message}`)
    } else {
      setToast(next ? 'Annonce réactivée' : 'Annonce désactivée')
    }
    setPendingId(null)
  }

  function openDelete(l: Listing) {
    setDeleteTarget(l)
    setDeleteStep(1)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setPendingId(deleteTarget.id)
    const supabase = createClient()
    const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id)
    if (error) {
      setToast(`Erreur : ${error.message}`)
      setPendingId(null)
      return
    }
    setListings(prev => (prev ?? []).filter(x => x.id !== deleteTarget.id))
    setToast('Annonce supprimée')
    setDeleteTarget(null)
    setDeleteStep(1)
    setPendingId(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Mes annonces" />
      <BentoStyles />

      <style>{`
        .mes-annonces-card:hover { border-color: rgba(16,185,129,0.35) !important; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.28); }
        @media (max-width: 820px) {
          .mes-annonces-row { flex-direction: column !important; }
          .mes-annonces-row > div:first-child { width: 100% !important; min-width: 0 !important; height: 200px !important; margin: 12px 12px 0 12px !important; }
          .mes-annonces-actions { border-left: none !important; border-top: 1px solid rgba(255,255,255,0.06) !important; min-width: 0 !important; flex-direction: row !important; justify-content: space-between !important; flex-wrap: wrap; }
        }
      `}</style>

      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      </AnimatePresence>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', marginBottom: '28px', flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700,
              color: '#fff', margin: '0 0 4px',
            }}>
              Mes annonces
            </h1>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)' }}>
              Gérez vos biens en location
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => router.push('/app/mes-annonces/nouveau')}>
            <Plus size={16} strokeWidth={2.2} />
            Publier une annonce
          </Button>
        </motion.div>

        {/* ── Stats row ── */}
        {listings !== null && listings.length > 0 && (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px', marginBottom: '20px',
            }}
          >
            <StatCard icon={<HomeIcon size={20} strokeWidth={1.8} />} label={stats.total > 1 ? 'annonces publiées' : 'annonce publiée'} value={stats.total} />
            <StatCard icon={<CheckCircle2 size={20} strokeWidth={1.8} />} label={stats.active > 1 ? 'annonces actives' : 'annonce active'} value={stats.active} />
            <StatCard icon={<Users size={20} strokeWidth={1.8} />} label={stats.candidates > 1 ? 'candidatures reçues' : 'candidature reçue'} value={stats.candidates} tint="#818CF8" />
          </motion.div>
        )}

        {/* ── Liste ── */}
        {listings === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SkeletonCard /><SkeletonCard />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState onCreate={() => router.push('/app/mes-annonces/nouveau')} />
        ) : (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {listings.map(l => (
              <ListingCard
                key={l.id}
                l={l}
                busy={pendingId === l.id}
                candidatesCount={candidatesByListing[l.id] ?? 0}
                onToggle={() => handleToggle(l)}
                onDelete={() => openDelete(l)}
              />
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            listing={deleteTarget}
            step={deleteStep}
            busy={pendingId === deleteTarget.id}
            onCancel={() => { setDeleteTarget(null); setDeleteStep(1) }}
            onNext={() => setDeleteStep(2)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MesAnnoncesPage() {
  return (
    <Suspense fallback={null}>
      <MesAnnoncesContent />
    </Suspense>
  )
}
