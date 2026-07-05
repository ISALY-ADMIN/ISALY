'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import type { DashboardData } from '@/app/api/dashboard/route'

// ═══════════════ Helpers ═══════════════

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

const NOTIF_ICONS: Record<string, string> = {
  match: '❤️', message: '💬', system: '🔔', alert: '🏠', view: '👁️',
}

/** Count-up animé au premier affichage (rAF, ~700 ms, ease-out). */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (done.current) { setValue(target); return }
    done.current = true
    if (target === 0) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / 700, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

function CountUp({ value, style }: { value: number; style?: React.CSSProperties }) {
  const n = useCountUp(value)
  return <span style={style}>{n}</span>
}

// ═══════════════ Building blocks ═══════════════

const cardBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '20px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
  overflow: 'hidden',
  position: 'relative',
}

/** Module bento : entièrement cliquable, hover mint + lift + glow, focus visible. */
function BentoCard({ href, ariaLabel, className, children, gradient }: {
  href: string
  ariaLabel: string
  className?: string
  children: React.ReactNode
  gradient?: boolean
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 22 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
      }}
      className={className}
      style={{ minHeight: '148px' }}
    >
      <Link
        href={href}
        aria-label={ariaLabel}
        className="bento-card"
        style={{
          ...cardBase,
          textDecoration: 'none',
          ...(gradient ? { background: 'linear-gradient(135deg, #10B981, #059669)', border: '1px solid rgba(255,255,255,0.15)' } : {}),
        }}
      >
        {children}
      </Link>
    </motion.div>
  )
}

function ModuleTitle({ icon, label, light }: { icon: string; label: string; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <span style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 700,
        letterSpacing: '0.02em', color: light ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
      }}>{label}</span>
    </div>
  )
}

function EmptyState({ text, cta }: { text: string; cta: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{text}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{cta} →</div>
    </div>
  )
}

/** Progress ring mint pour la complétude profil. */
function CompletionRing({ pct }: { pct: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }} title={`Profil complété à ${pct}%`}>
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={r} fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: '#10B981',
      }}>{pct}%</span>
    </div>
  )
}

function AvatarStack({ people }: { people: { name: string; avatarUrl: string | null }[] }) {
  return (
    <div style={{ display: 'flex' }}>
      {people.map((p, i) => (
        <div key={i} style={{
          width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          marginLeft: i > 0 ? '-10px' : 0, border: '2px solid #0A0A0A',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 800, color: '#fff', zIndex: people.length - i,
          position: 'relative',
        }}>
          {p.avatarUrl
            ? <Image src={p.avatarUrl} alt={p.name} width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (p.name[0] ?? '?').toUpperCase()}
        </div>
      ))}
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={className} style={{ minHeight: '148px' }}>
      <div className="shimmer" style={{ ...cardBase, border: '1px solid rgba(255,255,255,0.05)' }} />
    </div>
  )
}

// ═══════════════ Page ═══════════════

export default function DashboardHomePage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.status === 401) { router.push('/auth/login'); return }
      if (res.ok) setData(await res.json())
    } catch {}
  }, [router])

  useEffect(() => { load() }, [load])

  // Realtime : nouveaux messages / notifications → refetch débouncé
  useEffect(() => {
    const supabase = createClient()
    const refetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      refetchTimer.current = setTimeout(load, 800)
    }
    const channel = supabase
      .channel('dashboard-home-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, refetch)
      .subscribe()
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      supabase.removeChannel(channel)
    }
  }, [load])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Accueil" />
      <style>{`
        .bento-card:hover { transform: translateY(-2px); border-color: rgba(16,185,129,0.45) !important; box-shadow: 0 8px 32px rgba(16,185,129,0.12); }
        .bento-card:focus-visible { outline: 2px solid #10B981; outline-offset: 2px; }
        .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px' }}
        >
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
              Bonjour {data ? (data.profile.firstName || 'toi') : '…'}
            </h1>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{today}</div>
          </div>
          {data && (data.mode === 'loueur' ? (
            <span style={{
              fontSize: '12px', fontWeight: 800, padding: '6px 14px', borderRadius: '20px',
              background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
            }}>🏠 Mode Loueur</span>
          ) : (
            <Link href="/app/profil" aria-label="Compléter mon profil" style={{ textDecoration: 'none' }}>
              <CompletionRing pct={data.profile.completion} />
            </Link>
          ))}
        </motion.div>

        {/* ── Bento grid ── */}
        {!data ? (
          <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[148px] gap-4">
            <Skeleton className="md:col-span-2 md:row-span-2" />
            <Skeleton /><Skeleton />
            <Skeleton className="md:col-span-2" />
            <Skeleton /><Skeleton />
            <Skeleton className="md:col-span-2" />
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[148px] gap-4"
          >
            {data.mode === 'locataire' ? <LocataireGrid d={data} /> : <LoueurGrid d={data} />}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ═══════════════ Grille LOCATAIRE ═══════════════

function LocataireGrid({ d }: { d: DashboardData }) {
  const swipe = d.swipe ?? { newListings: 0, preview: [] }
  return (
    <>
      {/* SWIPE — 2x2 */}
      <BentoCard href="/app/swipe" ariaLabel="Reprendre le swipe" className="md:col-span-2 md:row-span-2" gradient>
        <ModuleTitle icon="🔥" label="REPRENDRE LE SWIPE" light />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '34px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
              <CountUp value={swipe.newListings} />
              <span style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginLeft: '10px' }}>
                nouvelle{swipe.newListings > 1 ? 's' : ''} annonce{swipe.newListings > 1 ? 's' : ''} compatible{swipe.newListings > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Éventail des 3 prochaines cartes */}
          {swipe.preview.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 20px', minHeight: '120px' }}>
              {swipe.preview.map((l, i) => (
                <div key={l.id} style={{
                  width: '92px', height: '116px', borderRadius: '14px', overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.25)',
                  transform: `rotate(${(i - 1) * 8}deg) translateY(${Math.abs(i - 1) * 8}px)`,
                  marginLeft: i > 0 ? '-22px' : 0, zIndex: 3 - Math.abs(i - 1),
                  position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}>
                  {l.photo ? (
                    <Image src={l.photo} alt={l.title} width={92} height={116} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🏠</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', fontSize: '9px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.rent}€ · {l.city}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>
              Tu as tout vu pour le moment — reviens plus tard ou élargis tes filtres.
            </div>
          )}

          <div style={{
            alignSelf: 'flex-start', padding: '10px 22px', borderRadius: '24px',
            background: '#fff', color: '#059669', fontSize: '14px', fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
          }}>
            Swiper maintenant →
          </div>
        </div>
      </BentoCard>

      {/* MATCHS — 1x1 */}
      <BentoCard href="/app/messages" ariaLabel={`${d.matches.count} matchs — voir les messages`}>
        <ModuleTitle icon="❤️" label="MATCHS" />
        {d.matches.count === 0 ? (
          <EmptyState text="Pas encore de match." cta="Swipe pour matcher" />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CountUp value={d.matches.count} style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
            <AvatarStack people={d.matches.latest} />
          </div>
        )}
      </BentoCard>

      {/* MESSAGES — 1x1 */}
      <UnreadCard unread={d.unread} />

      {/* BAIL — 2x1 */}
      {d.lease ? (
        <BentoCard href="/app/dashboard" ariaLabel="Mon bail — gestion locataire" className="md:col-span-2">
          <ModuleTitle icon="📄" label="MON BAIL" />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 800, color: '#fff' }}>{d.lease.monthlyRent}€<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>/mois</span></div>
              {d.lease.nextDue && (
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                  Prochaine échéance : {new Date(d.lease.nextDue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '11.5px', fontWeight: 800, padding: '5px 12px', borderRadius: '20px',
              ...(d.lease.paymentStatus === 'paid'
                ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                : d.lease.paymentStatus === 'late'
                  ? { background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }
                  : { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }),
            }}>
              {d.lease.paymentStatus === 'paid' ? '● Loyer à jour' : d.lease.paymentStatus === 'late' ? '● En retard' : '● À payer'}
            </span>
          </div>
        </BentoCard>
      ) : (
        <BentoCard href="/app/swipe" ariaLabel="Trouve ta coloc — commencer à swiper" className="md:col-span-2">
          <ModuleTitle icon="🏠" label="TROUVE TA COLOC" />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, maxWidth: '340px' }}>
              Pas encore de bail actif. Swipe les annonces compatibles et trouve ta prochaine coloc.
            </div>
            <div style={{
              padding: '9px 18px', borderRadius: '22px', flexShrink: 0,
              background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
              fontSize: '13px', fontWeight: 800, fontFamily: "'Outfit', sans-serif",
            }}>Swiper →</div>
          </div>
        </BentoCard>
      )}

      {/* FAVORIS — 1x1 */}
      <BentoCard href="/app/favoris" ariaLabel={`${d.favorites?.count ?? 0} favoris`}>
        <ModuleTitle icon="🔖" label="FAVORIS" />
        {(d.favorites?.count ?? 0) === 0 ? (
          <EmptyState text="Aucun favori sauvegardé." cta="Explorer les annonces" />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CountUp value={d.favorites!.count} style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
            <div style={{ display: 'flex', gap: '6px' }}>
              {d.favorites!.photos.map((p, i) => (
                <div key={i} style={{ width: 44, height: 34, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Image src={p} alt="Favori" width={44} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </BentoCard>

      {/* PARRAINAGE — 1x1 */}
      <BentoCard href="/app/parrainage" ariaLabel="Mon code parrainage">
        <ModuleTitle icon="🎁" label="PARRAINAGE" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, letterSpacing: '0.12em',
            color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px dashed rgba(16,185,129,0.35)',
            borderRadius: '10px', padding: '7px 10px', alignSelf: 'flex-start',
          }}>
            {d.profile.referralCode || '· · · · · ·'}
          </div>
          <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)' }}>
            {d.profile.referralCount > 0
              ? <><strong style={{ color: '#fff' }}>{d.profile.referralCount}</strong> filleul{d.profile.referralCount > 1 ? 's' : ''} parrainé{d.profile.referralCount > 1 ? 's' : ''}</>
              : 'Invite tes amis, gagne des avantages'}
          </div>
        </div>
      </BentoCard>

      {/* ACTIVITÉ — 2x1 */}
      <ActivityCard notifications={d.notifications} />
    </>
  )
}

// ═══════════════ Grille LOUEUR ═══════════════

function LoueurGrid({ d }: { d: DashboardData }) {
  const listings = d.listings ?? { total: 0, items: [] }
  const maintenance = d.maintenance ?? { unresolved: 0, latest: null }
  return (
    <>
      {/* MES ANNONCES — 2x2 */}
      <BentoCard href="/app/mes-annonces" ariaLabel={`Mes ${listings.total} annonces`} className="md:col-span-2 md:row-span-2">
        <ModuleTitle icon="📢" label="MES ANNONCES" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          {listings.items.length === 0 ? (
            <EmptyState text="Aucune annonce en ligne pour le moment." cta="Publie ta première annonce" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
              {listings.items.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 44, height: 34, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {l.photo
                      ? <Image src={l.photo} alt={l.title} width={44} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🏠'}
                  </div>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: l.isActive ? '#10B981' : 'rgba(255,255,255,0.22)' }} title={l.isActive ? 'Active' : 'Inactive'} />
                  <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.title}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>👥 {l.current}/{l.total}</span>
                  {l.boostTier !== 'standard' && (
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', flexShrink: 0,
                      background: l.boostTier === 'priority' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                      color: l.boostTier === 'priority' ? '#F59E0B' : '#818CF8',
                    }}>
                      {l.boostTier === 'priority' ? '⚡ Prioritaire' : '✨ Essentiel'}
                    </span>
                  )}
                </div>
              ))}
              {listings.total > listings.items.length && (
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981', paddingTop: '8px' }}>
                  + {listings.total - listings.items.length} autre{listings.total - listings.items.length > 1 ? 's' : ''} →
                </div>
              )}
            </div>
          )}
          <div style={{
            alignSelf: 'flex-start', padding: '10px 22px', borderRadius: '24px', marginTop: '12px',
            background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
            fontSize: '14px', fontWeight: 800, fontFamily: "'Outfit', sans-serif",
          }}>
            Publier une annonce →
          </div>
        </div>
      </BentoCard>

      {/* CANDIDATURES — 1x1 */}
      <BentoCard href="/app/messages" ariaLabel={`${d.likesReceived?.count ?? 0} candidatures reçues — voir les candidats`}>
        <ModuleTitle icon="💚" label="CANDIDATURES" />
        {(d.likesReceived?.count ?? 0) === 0 ? (
          <EmptyState text="Aucune candidature pour l'instant." cta="Boost ton annonce pour plus de visibilité" />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CountUp value={d.likesReceived!.count} style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
            <AvatarStack people={d.likesReceived!.latest ?? []} />
          </div>
        )}
      </BentoCard>

      {/* MESSAGES — 1x1 */}
      <UnreadCard unread={d.unread} />

      {/* SIGNALEMENTS — 2x1 */}
      <BentoCard href="/app/maintenance" ariaLabel={`${maintenance.unresolved} signalements non traités`} className="md:col-span-2">
        <ModuleTitle icon="🛠️" label="SIGNALEMENTS REÇUS" />
        {maintenance.unresolved === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span aria-hidden style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0, fontSize: '18px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✅</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Aucun problème signalé</div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Tes locataires n&apos;ont rien remonté — tout roule.</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <CountUp value={maintenance.unresolved} style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>non traité{maintenance.unresolved > 1 ? 's' : ''}</span>
            </div>
            {maintenance.latest && (
              <>
                <span style={{
                  fontSize: '11.5px', fontWeight: 800, padding: '5px 12px', borderRadius: '20px',
                  ...(maintenance.latest.urgency === 'urgent'
                    ? { background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }
                    : maintenance.latest.urgency === 'normal'
                      ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }),
                }}>
                  {maintenance.latest.urgency === 'urgent' ? '● Urgent' : maintenance.latest.urgency === 'normal' ? '● Normal' : '● Mineur'}
                </span>
                <span style={{ flex: 1, minWidth: '140px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  « {maintenance.latest.title} » · {timeAgo(maintenance.latest.createdAt)}
                </span>
              </>
            )}
          </div>
        )}
      </BentoCard>

      {/* BOOST — 1x1 */}
      <BentoCard href="/app/paiement" ariaLabel="Statut boost et abonnement">
        <ModuleTitle icon="🚀" label="BOOST" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {d.boost?.tier === 'standard' ? (
            <>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Aucun boost actif.</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>Passer en avant →</div>
            </>
          ) : (
            <>
              <span style={{
                alignSelf: 'flex-start', fontSize: '12px', fontWeight: 800, padding: '5px 12px', borderRadius: '16px',
                background: d.boost?.tier === 'priority' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                color: d.boost?.tier === 'priority' ? '#F59E0B' : '#818CF8',
              }}>
                {d.boost?.tier === 'priority' ? '⚡ Prioritaire' : '✨ Essentiel'}
              </span>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                {d.boost?.expiresAt
                  ? `Expire le ${new Date(d.boost.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                  : 'Abonnement actif'}
              </div>
            </>
          )}
        </div>
      </BentoCard>

      {/* AVIS — 1x1 */}
      <BentoCard href={`/app/profil-public/${d.profile.id}`} ariaLabel={`${d.reviews?.count ?? 0} avis reçus — voir mon profil public`}>
        <ModuleTitle icon="⭐" label="AVIS REÇUS" />
        {(d.reviews?.count ?? 0) === 0 ? (
          <EmptyState text="Pas encore d'avis." cta="Voir mon profil" />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '30px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{d.reviews!.average}</span>
              <span aria-hidden style={{ fontSize: '14px', letterSpacing: '1px' }}>
                {'★'.repeat(Math.round(d.reviews!.average ?? 0))}<span style={{ opacity: 0.25 }}>{'★'.repeat(5 - Math.round(d.reviews!.average ?? 0))}</span>
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{d.reviews!.count} avis</div>
          </div>
        )}
      </BentoCard>

      {/* ACTIVITÉ — 2x1 */}
      <ActivityCard notifications={d.notifications} />
    </>
  )
}

// ═══════════════ Modules partagés ═══════════════

function UnreadCard({ unread }: { unread: DashboardData['unread'] }) {
  return (
    <BentoCard href="/app/messages" ariaLabel={`${unread.count} messages non lus`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <ModuleTitle icon="💬" label="MESSAGES" />
        {unread.count > 0 && (
          <span style={{
            minWidth: 22, height: 22, borderRadius: '11px', padding: '0 7px',
            background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread.count}</span>
        )}
      </div>
      {unread.count === 0 ? (
        <EmptyState text="Aucun message non lu." cta="Ouvrir la messagerie" />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <CountUp value={unread.count} style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
          {unread.preview && (
            <div style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              « {unread.preview} »
            </div>
          )}
        </div>
      )}
    </BentoCard>
  )
}

function ActivityCard({ notifications }: { notifications: DashboardData['notifications'] }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 22 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
      }}
      className="md:col-span-2"
      style={{ minHeight: '148px' }}
    >
      <div style={{ ...cardBase }}>
        <ModuleTitle icon="🕐" label="ACTIVITÉ RÉCENTE" />
        {notifications.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Ton activité récente s&apos;affichera ici — matchs, messages, alertes.
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
            {notifications.map((n, i) => {
              const inner = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0, fontSize: '12px',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                  <span style={{ flex: 1, fontSize: '12.5px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                </div>
              )
              return n.link ? (
                <Link key={i} href={n.link} aria-label={n.title} style={{ textDecoration: 'none' }} className="activity-row">
                  {inner}
                </Link>
              ) : (
                <div key={i}>{inner}</div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
