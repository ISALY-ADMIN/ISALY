'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'
import { BentoCard, BentoStyles, ModuleTitle, EmptyState, Skeleton, CountUp, AvatarStack, cardBase } from '@/components/ui/Bento'

// ═══════════════ Types ═══════════════

interface MaisonLease {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  charges_amount: number | null
  start_date: string
  end_date: string | null
  owner_id: string
  house_rules: string | null
  document_url: string | null
}

interface NextRent { amount: number; dueDate: string; status: 'paid' | 'pending' | 'late' }
interface Person { id: string; name: string; avatarUrl: string | null }
interface OwnerInfo extends Person { rating: number | null; reviewCount: number }
interface MaintenanceInfo { open: number; latest: { title: string; status: string; urgency: 'low' | 'normal' | 'urgent' } | null }
interface DocItem { key: string; icon: string; label: string; sub: string; href?: string; storagePath?: string; url?: string }

interface MaisonData {
  lease: MaisonLease
  nextRent: NextRent
  roommates: Person[]
  owner: OwnerInfo | null
  maintenance: MaintenanceInfo
  documents: DocItem[]
}

// ═══════════════ Helpers ═══════════════

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function monthsRemaining(end: string | null): number | null {
  if (!end) return null
  const e = new Date(end)
  const now = new Date()
  return Math.max(0, (e.getFullYear() - now.getFullYear()) * 12 + e.getMonth() - now.getMonth())
}

/** Prochain 5 du mois (échéance par défaut si aucun paiement en attente). */
function nextDefaultDue(): string {
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), 5)
  if (due.getTime() < now.getTime()) due.setMonth(due.getMonth() + 1)
  return due.toISOString()
}

const RENT_BADGE = {
  paid: { label: '● Loyer à jour', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  pending: { label: '● À payer', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  late: { label: '● En retard', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
} as const

const MAINT_STATUS: Record<string, string> = {
  sent: 'Ouvert', received: 'Reçu', in_progress: 'En cours', resolved: 'Résolu',
}

// ═══════════════ Données de démonstration ═══════════════

const DEMO_DATA: MaisonData = {
  lease: {
    id: 'demo',
    address: '14 rue des Capucins',
    city: 'Lyon',
    monthly_rent: 620,
    charges_amount: 60,
    start_date: new Date(Date.now() - 200 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 460 * 86400000).toISOString(),
    owner_id: 'demo-owner',
    house_rules: 'Calme après 22h en semaine. Tri des déchets au sous-sol. Wifi : COLOC-14 / clé sur le frigo. Ménage des communs le dimanche, à tour de rôle.',
    document_url: null,
  },
  nextRent: { amount: 680, dueDate: new Date(Date.now() + 6 * 86400000).toISOString(), status: 'pending' },
  roommates: [
    { id: 'demo-1', name: 'Léa', avatarUrl: null },
    { id: 'demo-2', name: 'Maxime', avatarUrl: null },
  ],
  owner: { id: 'demo-owner', name: 'Catherine', avatarUrl: null, rating: 4.8, reviewCount: 12 },
  maintenance: { open: 1, latest: { title: 'Fuite sous l’évier de la cuisine', status: 'in_progress', urgency: 'normal' } },
  documents: [
    { key: 'bail', icon: '📄', label: 'Bail signé', sub: 'PDF · signé par les deux parties' },
    { key: 'q1', icon: '🧾', label: 'Quittance — juin 2026', sub: 'PDF' },
    { key: 'edl', icon: '🔑', label: 'État des lieux d’entrée', sub: 'PDF' },
  ],
}

// ═══════════════ Page ═══════════════

export default function MaisonPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MaisonData | null>(null)
  const [pendingLeaseId, setPendingLeaseId] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: leases } = await supabase
      .from('leases')
      .select('id, address, city, monthly_rent, charges_amount, start_date, end_date, owner_id, tenant_id, house_rules, document_url, status')
      .eq('tenant_id', user.id)
      .in('status', ['active', 'pending_signature'])
      .order('created_at', { ascending: false })

    const active = (leases ?? []).find(l => l.status === 'active') ?? null
    const pending = (leases ?? []).find(l => l.status === 'pending_signature') ?? null
    setPendingLeaseId(pending ? (pending.id as string) : null)

    if (!active) { setData(null); setLoading(false); return }
    const lease = active as unknown as MaisonLease

    const [paymentsRes, roommatesRes, ownerRes, reviewsRes, maintRes, edlRes] = await Promise.all([
      supabase.from('rent_payments').select('amount, month, status, due_date, paid_at, receipt_url')
        .eq('lease_id', lease.id).eq('tenant_id', user.id).order('month', { ascending: false }).limit(12),
      supabase.from('lease_roommates').select('profile_id').eq('lease_id', lease.id),
      supabase.from('profiles').select('id, first_name, last_name, avatar_url').eq('id', lease.owner_id).maybeSingle(),
      supabase.from('user_reviews').select('rating').eq('reviewed_id', lease.owner_id),
      supabase.from('maintenance_requests').select('title, status, urgency')
        .eq('lease_id', lease.id).neq('status', 'resolved').order('created_at', { ascending: false }),
      supabase.storage.from('leases').list(lease.id, { limit: 20 }),
    ])

    // Prochaine échéance : plus ancien paiement pending/late, sinon prochain 5 du mois
    const payments = paymentsRes.data ?? []
    const due = [...payments].reverse().find(p => p.status === 'pending' || p.status === 'late')
    const nextRent: NextRent = due
      ? {
          amount: (due.amount as number) ?? lease.monthly_rent,
          dueDate: (due.due_date as string) ?? (due.month as string),
          status: due.status as 'pending' | 'late',
        }
      : { amount: lease.monthly_rent + (lease.charges_amount ?? 0), dueDate: nextDefaultDue(), status: 'paid' }

    // Colocataires : membres additionnels du bail (hors moi)
    const roommateIds = ((roommatesRes.data ?? []) as { profile_id: string }[])
      .map(r => r.profile_id).filter(id => id && id !== user.id)
    let roommates: Person[] = []
    if (roommateIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles')
        .select('id, first_name, last_name, avatar_url').in('id', roommateIds)
      roommates = (profiles ?? []).map(p => ({
        id: p.id as string,
        name: `${p.first_name ?? ''}`.trim() || 'Coloc',
        avatarUrl: (p.avatar_url as string) ?? null,
      }))
    }

    const ratings = (reviewsRes.data ?? []).map(r => r.rating as number)
    const owner: OwnerInfo | null = ownerRes.data ? {
      id: ownerRes.data.id as string,
      name: `${ownerRes.data.first_name ?? ''}`.trim() || 'Propriétaire',
      avatarUrl: (ownerRes.data.avatar_url as string) ?? null,
      rating: ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      reviewCount: ratings.length,
    } : null

    const maintRows = maintRes.data ?? []
    const maintenance: MaintenanceInfo = {
      open: maintRows.length,
      latest: maintRows[0] ? {
        title: maintRows[0].title as string,
        status: maintRows[0].status as string,
        urgency: (maintRows[0].urgency as 'low' | 'normal' | 'urgent') ?? 'normal',
      } : null,
    }

    // Documents : bail signé + quittances + états des lieux (bucket privé "leases")
    const documents: DocItem[] = []
    documents.push({
      key: 'bail', icon: '📄', label: 'Bail signé',
      sub: lease.document_url ? 'PDF · signé par les deux parties' : 'Voir le contrat',
      href: `/app/bail/${lease.id}`,
    })
    for (const p of payments.filter(x => x.receipt_url)) {
      const monthLabel = new Date(p.month as string).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      documents.push({ key: `q-${p.month}`, icon: '🧾', label: `Quittance — ${monthLabel}`, sub: 'PDF', url: p.receipt_url as string })
    }
    for (const f of (edlRes.data ?? []).filter(f => f.name.startsWith('etat-des-lieux'))) {
      documents.push({
        key: f.name, icon: '🔑',
        label: f.name.includes('sortie') ? 'État des lieux de sortie' : 'État des lieux d’entrée',
        sub: f.name.split('.').pop()?.toUpperCase() ?? 'Fichier',
        storagePath: `${lease.id}/${f.name}`,
      })
    }

    setData({ lease, nextRent, roommates, owner, maintenance, documents })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const d = demo ? DEMO_DATA : data

  async function openStorageDoc(path: string) {
    const supabase = createClient()
    const { data: signed } = await supabase.storage.from('leases').createSignedUrl(path, 600)
    if (signed?.signedUrl) window.open(signed.signedUrl, '_blank')
  }

  async function uploadEdl(file: File) {
    if (!data || demo) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `${data.lease.id}/etat-des-lieux-entree-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('leases').upload(path, file)
      if (!error) await load()
    } catch {}
    setUploading(false)
  }

  // ── Header commun (titre + sous-titre + toggle démo) — même structure que dashboard-home ──
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const header = (
    <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Ma maison</h1>
          {demo && (
            <span style={{
              fontSize: '10.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '14px', letterSpacing: '0.08em',
              background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.35)',
            }}>DÉMO</span>
          )}
        </div>
        <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', textTransform: d ? undefined : 'capitalize' }}>
          {d ? <><Emoji native="📍" size="13px" /> {d.lease.address}{d.lease.city ? `, ${d.lease.city}` : ''}</> : today}
        </div>
      </div>
      {/* Toggle mode démo (état local uniquement) — même switch que Paramètres */}
      <button type="button" onClick={() => setDemo(v => !v)} role="switch" aria-checked={demo}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" }}>Mode démo</span>
        <span aria-hidden style={{
          width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0, transition: 'all 0.2s ease',
          background: demo ? '#10B981' : 'rgba(255,255,255,0.15)',
          boxShadow: demo ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
        }}>
          <span style={{
            position: 'absolute', top: 3, left: demo ? 23 : 3, width: 18, height: 18, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }} />
        </span>
      </button>
    </motion.div>
  )

  // ── Loading ──
  if (loading && !demo) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent' }}>
        <Topbar title="Ma maison" />
        <BentoStyles />
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 48px' }}>
          {header}
          <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[148px] gap-4">
            <Skeleton className="md:col-span-2" /><Skeleton /><Skeleton />
            <Skeleton className="md:col-span-2" /><Skeleton /><Skeleton />
            <Skeleton className="md:col-span-4" />
          </div>
        </div>
      </div>
    )
  }

  // ── Aucun bail actif (et démo off) ──
  if (!d) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent' }}>
        <Topbar title="Ma maison" />
        <BentoStyles />
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 48px' }}>
          {header}
          {pendingLeaseId && (
            <Link href={`/app/bail/${pendingLeaseId}`} className="bento-card no-underline"
              style={{ ...cardBase, flexDirection: 'row', alignItems: 'center', gap: '16px', marginBottom: '20px', minHeight: 0 }}>
              <span className="pulse-mint" style={{
                fontSize: '12px', fontWeight: 800, padding: '6px 14px', borderRadius: '20px', flexShrink: 0,
                background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)',
              }}>✍️ Signature en attente</span>
              <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)' }}>Un bail t&apos;attend — clique pour le consulter et le signer.</span>
            </Link>
          )}
          <div className="flex flex-col items-center text-center" style={{ padding: '72px 24px' }}>
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden style={{ marginBottom: '16px' }}>
              <circle cx="44" cy="44" r="40" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.2)" />
              <path d="M28 44 L44 30 L60 44" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M32 42 V58 H56 V42" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <rect x="40" y="48" width="8" height="10" rx="1.5" stroke="#10B981" strokeWidth="2" fill="rgba(16,185,129,0.15)" />
            </svg>
            <h2 className="text-[20px] font-bold mb-2" style={{ color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Aucun bail actif</h2>
            <p className="text-[13.5px] mb-6" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '380px', lineHeight: 1.6 }}>
              Une fois ton bail signé, tu retrouveras ici ton loyer, tes colocataires, tes documents et les signalements.
            </p>
            <Link href="/app/swipe" className="no-underline inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[13.5px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontFamily: "'Outfit', sans-serif" }}>
              <Emoji native="🔍" /> Trouver ma coloc
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Tableau de bord bail actif ──
  const { lease, nextRent, roommates, owner, maintenance, documents } = d
  const rentBadge = RENT_BADGE[nextRent.status]
  const dueIn = daysUntil(nextRent.dueDate)
  const remaining = monthsRemaining(lease.end_date)
  const bailHref = demo ? '/app/maison' : `/app/bail/${lease.id}`
  const urgencyBadge = maintenance.latest?.urgency === 'urgent'
    ? { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' }
    : maintenance.latest?.urgency === 'normal'
      ? { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' }
      : { color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)' }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Ma maison" />
      <BentoStyles />
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 48px', fontFamily: "'Outfit', sans-serif" }}>
        {header}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[148px] gap-4"
        >
          {/* MON LOYER — 2x1 */}
          <BentoCard href="/app/loyers" ariaLabel="Mon loyer — voir l'historique des paiements" className="md:col-span-2">
            <ModuleTitle icon="💶" label="MON LOYER" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  <CountUp value={nextRent.amount} />€<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>/mois</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
                  Échéance : {new Date(nextRent.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  {dueIn >= 0 && nextRent.status !== 'paid' && (
                    <span style={{ color: dueIn <= 3 ? '#F59E0B' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}> · J-{dueIn}</span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: '11.5px', fontWeight: 800, padding: '5px 12px', borderRadius: '20px',
                background: rentBadge.bg, color: rentBadge.color, border: `1px solid ${rentBadge.border}`,
              }}>{rentBadge.label}</span>
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>Voir l&apos;historique →</div>
          </BentoCard>

          {/* MON BAIL — 1x1 */}
          <BentoCard href={bailHref} ariaLabel="Mon bail — consulter le document signé">
            <ModuleTitle icon="📄" label="MON BAIL" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                Depuis le <strong style={{ color: '#fff' }}>{formatDate(lease.start_date)}</strong>
                {remaining !== null && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                    {remaining} mois restant{remaining > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>Document signé →</div>
            </div>
          </BentoCard>

          {/* MES COLOCATAIRES — 1x1 */}
          <BentoCard href="/app/colocataires" ariaLabel={`Mes ${roommates.length} colocataires — voir leurs profils`}>
            <ModuleTitle icon="👥" label="MES COLOCATAIRES" />
            {roommates.length === 0 ? (
              <EmptyState text="Personne d'autre sur ce bail pour le moment." cta="Voir la colocation" />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <AvatarStack people={roommates} />
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>
                  {roommates.map(r => r.name).join(', ')}
                </div>
              </div>
            )}
          </BentoCard>

          {/* DÉCLARER UN PROBLÈME — 2x1 */}
          <BentoCard href="/app/declarer-probleme" ariaLabel={`Déclarer un problème — ${maintenance.open} signalement(s) en cours`} className="md:col-span-2">
            <ModuleTitle icon="🔧" label="DÉCLARER UN PROBLÈME" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              {maintenance.open === 0 ? (
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  <Emoji native="✅" size="13px" /> Aucun signalement en cours — tout roule.
                </span>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <CountUp value={maintenance.open} style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
                    <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>en cours</span>
                  </div>
                  {maintenance.latest && (
                    <>
                      <span style={{
                        fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '16px',
                        background: urgencyBadge.bg, color: urgencyBadge.color, border: `1px solid ${urgencyBadge.border}`,
                      }}>{MAINT_STATUS[maintenance.latest.status] ?? maintenance.latest.status}</span>
                      <span style={{ flex: 1, minWidth: '120px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        « {maintenance.latest.title} »
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
            <div style={{
              alignSelf: 'flex-start', padding: '8px 18px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
              fontSize: '12.5px', fontWeight: 800,
            }}>Déclarer un problème →</div>
          </BentoCard>

          {/* MON PROPRIÉTAIRE — 1x1 */}
          <BentoCard
            href={demo || !owner ? '/app/messages' : `/app/messages?owner=${owner.id}`}
            ariaLabel="Mon propriétaire — le contacter en message"
          >
            <ModuleTitle icon="🏠" label="MON PROPRIÉTAIRE" />
            {owner ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 800, color: '#fff',
                  }}>
                    {owner.avatarUrl
                      ? <Image src={owner.avatarUrl} alt={owner.name} width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (owner.name[0] ?? '?').toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{owner.name}</div>
                    {owner.rating !== null && (
                      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>★ {owner.rating} · {owner.reviewCount} avis</div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>Contacter →</div>
              </div>
            ) : (
              <EmptyState text="Propriétaire non renseigné." />
            )}
          </BentoCard>

          {/* CONSIGNES & INFOS — 1x1 */}
          <BentoCard href={bailHref} ariaLabel="Consignes et infos pratiques du logement">
            <ModuleTitle icon="📋" label="CONSIGNES & INFOS" />
            {lease.house_rules ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
                <p style={{
                  fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{lease.house_rules}</p>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>Tout lire →</div>
              </div>
            ) : (
              <EmptyState text="Aucune consigne laissée par le loueur." cta="Ouvrir le bail" />
            )}
          </BentoCard>

          {/* DOCUMENTS — 4x1 */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 22 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
            }}
            className="md:col-span-4"
            style={{ minHeight: '148px' }}
          >
            <div style={{ ...cardBase }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <ModuleTitle icon="📁" label="DOCUMENTS" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => !demo && fileRef.current?.click()}
                  disabled={demo}
                  loading={uploading}
                >
                  {uploading ? 'Envoi…' : '+ Déposer l’état des lieux'}
                </Button>
                <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadEdl(f); e.target.value = '' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'auto' }}>
                {documents.map((doc, i) => {
                  const inner = (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: i < documents.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <span style={{ fontSize: '16px' }}><Emoji native={doc.icon} size="16px" /></span>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{doc.label}</span>
                      <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)' }}>{doc.sub}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>Ouvrir →</span>
                    </div>
                  )
                  if (doc.href && !demo) return <Link key={doc.key} href={doc.href} className="no-underline">{inner}</Link>
                  if (doc.url && !demo) return <a key={doc.key} href={doc.url} target="_blank" rel="noreferrer" className="no-underline">{inner}</a>
                  if (doc.storagePath && !demo) {
                    return (
                      <button key={doc.key} type="button" onClick={() => openStorageDoc(doc.storagePath!)}
                        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {inner}
                      </button>
                    )
                  }
                  return <div key={doc.key}>{inner}</div>
                })}
                {documents.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                    Tes documents (bail signé, quittances, états des lieux) apparaîtront ici.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
