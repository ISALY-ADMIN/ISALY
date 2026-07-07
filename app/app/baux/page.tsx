'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import Emoji, { EmojiText } from '@/components/ui/Emoji'

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  charges_amount: number | null
  deposit_amount: number | null
  start_date: string
  end_date: string | null
  status: string
  nb_roommates: number
  tenant_id: string | null
}

interface TenantCard {
  id: string
  name: string
  avatarUrl: string | null
  joinedAt: string
  rentShare: number
  identityVerified: boolean
  completionPercent: number
}

interface PaymentRow {
  id: string
  tenant_id: string | null
  amount: number
  month: string
  status: 'pending' | 'paid' | 'late'
  paid_at: string | null
}

interface DisplayRow {
  id: string
  tenant_id: string
  name: string
  amount: number
  status: 'pending' | 'paid' | 'late'
  paidAt: string | null
}

interface LeaseDoc {
  name: string
  path: string
  createdAt: string | null
  sizeBytes: number | null
  category: 'edl_entree' | 'edl_sortie' | 'other'
}

const COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function initials(name: string) {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function pad(n: number) { return String(n).padStart(2, '0') }
function monthKeyOf(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function BauxPage() {
  return (
    <Suspense fallback={null}>
      <BauxPageInner />
    </Suspense>
  )
}

function BauxPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [leases, setLeases] = useState<LeaseRow[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [signatureStatus, setSignatureStatus] = useState<string | null>(null)
  const [tenants, setTenants] = useState<TenantCard[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [relanceId, setRelanceId] = useState<string | null>(null)
  const [leaseDocs, setLeaseDocs] = useState<LeaseDoc[]>([])
  const [uploadingDoc, setUploadingDoc] = useState<null | 'edl_entree' | 'edl_sortie' | 'other'>(null)
  const [newDocsCount, setNewDocsCount] = useState(0)

  const locatairesRef = useRef<HTMLDivElement>(null)
  const loyersRef = useRef<HTMLDivElement>(null)
  const docsRef = useRef<HTMLDivElement>(null)
  const edlEntreeInputRef = useRef<HTMLInputElement>(null)
  const edlSortieInputRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)

  const selectedLease = leases.find(l => l.id === selectedLeaseId) ?? null
  const selectedMonth = new Date()
  const monthKey = monthKeyOf(selectedMonth)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      let rows: LeaseRow[] = []
      const { data, error } = await supabase
        .from('leases')
        .select('id, address, city, monthly_rent, charges_amount, deposit_amount, start_date, end_date, status, nb_roommates, tenant_id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback gracieux si charges_amount / deposit_amount n'existent pas encore en base
        const { data: basic } = await supabase
          .from('leases')
          .select('id, address, city, monthly_rent, start_date, end_date, status, nb_roommates, tenant_id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
        rows = ((basic ?? []) as Omit<LeaseRow, 'charges_amount' | 'deposit_amount'>[]).map(l => ({ ...l, charges_amount: null, deposit_amount: null }))
      } else {
        rows = (data ?? []) as LeaseRow[]
      }

      setLeases(rows)
      const activeRows = rows.filter(l => l.status === 'active')
      if (activeRows.length > 0) setSelectedLeaseId(activeRows[0].id)
      else if (rows.length > 0) setSelectedLeaseId(rows[0].id)
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab || loading) return
    const target = tab === 'locataires' ? locatairesRef.current
      : tab === 'loyers' ? loyersRef.current
      : tab === 'documents' ? docsRef.current
      : null
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [searchParams, loading])

  const loadLeaseData = useCallback(async () => {
    if (!selectedLease) { setTenants([]); setPayments([]); setSignatureStatus(null); return }
    const supabase = createClient()

    const { data: roommateRows } = await supabase
      .from('lease_roommates')
      .select('profile_id, joined_at')
      .eq('lease_id', selectedLease.id)

    const memberIds = [
      ...(selectedLease.tenant_id ? [{ id: selectedLease.tenant_id, joined_at: selectedLease.start_date }] : []),
      ...((roommateRows ?? []) as { profile_id: string; joined_at: string }[]).map(r => ({ id: r.profile_id, joined_at: r.joined_at })),
    ]

    if (memberIds.length > 0) {
      const ids = memberIds.map(m => m.id)
      const [{ data: profiles }, { data: dossiers }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', ids),
        supabase.from('dossiers').select('user_id, identity_verified, completion_percent').in('user_id', ids),
      ])
      const rentShare = Math.round((selectedLease.monthly_rent ?? 0) / Math.max(memberIds.length, 1))
      setTenants(memberIds.map(m => {
        const p = (profiles ?? []).find((p: { id: string }) => p.id === m.id)
        const d = (dossiers ?? []).find((d: { user_id: string }) => d.user_id === m.id)
        const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire' : 'Locataire'
        return {
          id: m.id, name, avatarUrl: p?.avatar_url ?? null, joinedAt: m.joined_at,
          rentShare, identityVerified: d?.identity_verified ?? false, completionPercent: d?.completion_percent ?? 0,
        }
      }))
    } else {
      setTenants([])
    }

    const { data: pmts } = await supabase
      .from('rent_payments')
      .select('id, tenant_id, amount, month, status, paid_at')
      .eq('lease_id', selectedLease.id)
      .order('month', { ascending: false })
    setPayments((pmts ?? []) as PaymentRow[])

    const { data: doc } = await supabase
      .from('lease_documents')
      .select('status')
      .eq('lease_id', selectedLease.id)
      .eq('document_type', 'bail_genere')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSignatureStatus(doc?.status ?? null)

    // Documents du bail (bucket privé "leases", path {lease_id}/*)
    // — les deux parties y accèdent via RLS leases_bucket_parties_select
    const { data: files } = await supabase.storage.from('leases').list(selectedLease.id, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    const docs: LeaseDoc[] = (files ?? [])
      .filter(f => f.name && !f.name.startsWith('.'))
      .map(f => {
        const category: LeaseDoc['category'] =
          f.name.startsWith('etat-des-lieux-entree') ? 'edl_entree'
          : f.name.startsWith('etat-des-lieux-sortie') ? 'edl_sortie'
          : 'other'
        const createdAt = (f.created_at as string | undefined)
          ?? ((f as { updated_at?: string }).updated_at ?? null)
        const sizeBytes = ((f as { metadata?: { size?: number } }).metadata?.size ?? null)
        return { name: f.name, path: `${selectedLease.id}/${f.name}`, createdAt, sizeBytes, category }
      })
    setLeaseDocs(docs)

    // Badge "nouveaux depuis la dernière visite" (par bail)
    let lastSeen = 0
    try { lastSeen = Number(localStorage.getItem(`lease_docs_last_seen_${selectedLease.id}`) ?? 0) } catch {}
    const fresh = docs.filter(d => d.createdAt && new Date(d.createdAt).getTime() > lastSeen).length
    setNewDocsCount(fresh)
  }, [selectedLease])

  useEffect(() => { loadLeaseData() }, [loadLeaseData])

  if (loading) {
    return (
      <>
        <Topbar title="Mes baux" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="📋" /></div>
        </div>
      </>
    )
  }

  if (leases.length === 0) {
    return (
      <>
        <Topbar title="Mes baux" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[52px] mb-4"><Emoji native="📋" /></div>
          <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>Aucun bail pour le moment</h3>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Vos baux apparaîtront ici une fois un contrat créé sur l&apos;un de vos biens.</p>
        </div>
      </>
    )
  }

  const lease = selectedLease!
  const todayKey = monthKeyOf(new Date())
  const rentShare = tenants.length > 0 ? Math.round((lease.monthly_rent ?? 0) / tenants.length) : (lease.monthly_rent ?? 0)
  const rows: DisplayRow[] = tenants.map(t => {
    const existing = payments.find(p => p.tenant_id === t.id && p.month?.startsWith(monthKey))
    if (existing) return { id: existing.id, tenant_id: t.id, name: t.name, amount: existing.amount, status: existing.status, paidAt: existing.paid_at }
    return { id: 'new', tenant_id: t.id, name: t.name, amount: rentShare, status: 'pending', paidAt: null }
  })

  let statutLabel = '🟢 Actif'
  let statutBg = '#ECFDF5'
  let statutColor = '#059669'
  if (lease.status !== 'active') {
    statutLabel = '⚪ Résilié'
    statutBg = '#F3F4F6'
    statutColor = '#6B7280'
  } else if (signatureStatus === 'pending_signature') {
    statutLabel = '🟡 En cours de signature'
    statutBg = '#FFFBEB'
    statutColor = '#D97706'
  }

  const expiresInDays = lease.end_date ? daysUntil(lease.end_date) : null
  const preavisDate = lease.end_date ? new Date(new Date(lease.end_date).setMonth(new Date(lease.end_date).getMonth() - 6)) : null

  async function markPaid(row: DisplayRow) {
    setBusyId(row.id === 'new' ? row.tenant_id : row.id)
    try {
      const res = await fetch(`/api/loyers/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_id: lease.id, tenant_id: row.tenant_id, month: `${monthKey}-01`, amount: row.amount }),
      })
      if (res.ok) await loadLeaseData()
    } catch {}
    setBusyId(null)
  }

  async function openLeaseDoc(path: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('leases').createSignedUrl(path, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function uploadLeaseDoc(file: File, category: 'edl_entree' | 'edl_sortie' | 'other') {
    if (!lease) return
    setUploadingDoc(category)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
      const prefix = category === 'edl_entree' ? 'etat-des-lieux-entree'
        : category === 'edl_sortie' ? 'etat-des-lieux-sortie'
        : 'doc'
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')
      const path = category === 'other'
        ? `${lease.id}/${safe}-${Date.now()}.${ext}`
        : `${lease.id}/${prefix}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('leases').upload(path, file, { cacheControl: '3600', upsert: false })
      if (!error) await loadLeaseData()
    } catch {}
    setUploadingDoc(null)
  }

  function markDocsSeen() {
    if (!lease) return
    try { localStorage.setItem(`lease_docs_last_seen_${lease.id}`, String(Date.now())) } catch {}
    setNewDocsCount(0)
  }

  async function relancer(row: DisplayRow) {
    setRelanceId(row.id === 'new' ? row.tenant_id : row.id)
    try {
      await fetch('/api/loyers/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_id: lease.id, tenant_id: row.tenant_id, month: `${monthKey}-01`, amount: row.amount }),
      })
    } catch {}
    setRelanceId(null)
  }

  return (
    <>
      <Topbar title="Mes baux" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '880px' }}>

        <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>Mes baux</h2>
        <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Tout sur votre contrat de location, par bien.</p>

        {leases.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {leases.map(l => (
              <button
                key={l.id}
                onClick={() => setSelectedLeaseId(l.id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
                style={selectedLeaseId === l.id ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' } : { background: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                {l.address}{l.city ? `, ${l.city}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* a. Infos générales */}
        <div className="rounded-[14px] overflow-hidden mb-7" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h3 className="text-[15px] font-bold" style={{ color: '#111827' }}>Informations générales</h3>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: statutBg, color: statutColor }}><EmojiText text={statutLabel} size="11px" /></span>
          </div>
          {[
            { label: 'Adresse', value: `${lease.address}${lease.city ? `, ${lease.city}` : ''}` },
            { label: 'Date de début', value: formatDate(lease.start_date) },
            { label: 'Date de fin / renouvellement', value: lease.end_date ? formatDate(lease.end_date) : 'Non définie' },
            { label: 'Loyer mensuel', value: `${lease.monthly_rent ?? 0} €` },
            { label: 'Charges', value: lease.charges_amount != null ? `${lease.charges_amount} €` : '—' },
            { label: 'Dépôt de garantie', value: lease.deposit_amount != null ? `${lease.deposit_amount} €` : '—' },
          ].map((row, i, arr) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3 text-[13.5px]" style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span className="font-semibold" style={{ color: '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* e. Échéances clés */}
        {lease.end_date && (
          <div
            className="rounded-[14px] p-5 mb-7"
            style={{
              background: expiresInDays !== null && expiresInDays < 60 ? '#FEF2F2' : '#FFFFFF',
              border: `1px solid ${expiresInDays !== null && expiresInDays < 60 ? '#FCA5A5' : '#E5E7EB'}`,
            }}
          >
            <h3 className="text-[15px] font-bold mb-3" style={{ color: '#111827' }}><Emoji native="📅" /> Échéances clés</h3>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>Renouvellement tacite</span>
                <span className="font-semibold" style={{ color: '#111827' }}>{formatDate(lease.end_date)}</span>
              </div>
              {preavisDate && (
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280' }}>Date limite de préavis (bailleur)</span>
                  <span className="font-semibold" style={{ color: '#111827' }}>{formatDate(preavisDate.toISOString())}</span>
                </div>
              )}
            </div>
            {expiresInDays !== null && expiresInDays < 60 && (
              <p className="text-[12.5px] font-semibold mt-3" style={{ color: '#DC2626' }}>
                <Emoji native="⚠️" /> Ce bail arrive à échéance dans {expiresInDays} jour{expiresInDays > 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}

        {/* b. Locataires */}
        <div ref={locatairesRef} className="mb-7">
          <h3 className="text-[15px] font-bold mb-3" style={{ color: '#fff' }}>Locataires</h3>
          {tenants.length === 0 ? (
            <div className="text-center py-10 rounded-[14px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun locataire rattaché à ce bail.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tenants.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/app/locataires/${t.id}?lease=${selectedLeaseId}`)}
                  className="flex items-center gap-4 p-4 rounded-[14px] w-full text-left border-none cursor-pointer"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
                >
                  {t.avatarUrl ? (
                    <Image src={t.avatarUrl} alt={t.name} width={48} height={48} className="w-[48px] h-[48px] rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center font-extrabold text-[15px] text-white flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                      {initials(t.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold" style={{ color: '#111827' }}>{t.name}</span>
                      {t.identityVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>✓ Vérifié</span>
                      )}
                    </div>
                    <div className="text-[12px]" style={{ color: '#6B7280' }}>Entré le {formatDate(t.joinedAt)} · {t.rentShare} €/mois</div>
                  </div>
                  <span style={{ color: '#4ECBA0', fontSize: '18px' }}>›</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* c. Loyers */}
        <div ref={loyersRef} className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold" style={{ color: '#fff' }}>Loyers — {MONTHS_FR[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</h3>
            <Link href="/app/loyers" className="no-underline text-[12px] font-semibold" style={{ color: '#4ECBA0' }}>Voir l&apos;historique complet →</Link>
          </div>
          <div className="rounded-[14px] overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            {rows.length === 0 ? (
              <div className="text-center py-10"><p className="text-[13px]" style={{ color: '#9CA3AF' }}>Aucun locataire rattaché à ce bail.</p></div>
            ) : (
              rows.map((row, i) => (
                <div key={row.tenant_id} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: i < rows.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div>
                    <div className="text-[13.5px] font-semibold" style={{ color: '#111827' }}>{row.name}</div>
                    {row.paidAt && <div className="text-[11.5px] mt-0.5" style={{ color: '#9CA3AF' }}>Payé le {new Date(row.paidAt).toLocaleDateString('fr-FR')}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-bold" style={{ color: '#111827' }}>{row.amount} €</span>
                    {row.status === 'paid' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>✓ Payé</span>}
                    {row.status === 'pending' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}><Emoji native="⏳" /> Attente</span>}
                    {row.status === 'late' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}><Emoji native="🔴" /> Retard</span>}
                    {row.status !== 'paid' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => markPaid(row)}
                          disabled={busyId === (row.id === 'new' ? row.tenant_id : row.id)}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-full border-none cursor-pointer text-white disabled:opacity-50"
                          style={{ background: '#4ECBA0' }}
                        >
                          Marquer reçu
                        </button>
                        {row.status === 'late' && (
                          <button
                            onClick={() => relancer(row)}
                            disabled={relanceId === (row.id === 'new' ? row.tenant_id : row.id)}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full border cursor-pointer disabled:opacity-50"
                            style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#374151' }}
                          >
                            {relanceId === (row.id === 'new' ? row.tenant_id : row.id) ? 'Envoi…' : <><Emoji native="✉️" /> Relancer</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* d. Documents du bail — inclut EDL déposé par le locataire (bucket privé partagé) */}
        <div ref={docsRef} className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold" style={{ color: '#fff' }}>Documents du bail</h3>
              {newDocsCount > 0 && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  {newDocsCount} nouveau{newDocsCount > 1 ? 'x' : ''}
                </span>
              )}
            </div>
            {newDocsCount > 0 && (
              <button
                onClick={markDocsSeen}
                className="text-[11.5px] font-semibold cursor-pointer border-none rounded-full px-2.5 py-1"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              >
                Marquer comme vus
              </button>
            )}
          </div>

          <div className="rounded-[14px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            {([
              { key: 'edl_entree' as const, icon: '🔑', label: 'État des lieux d\'entrée', ref: edlEntreeInputRef },
              { key: 'edl_sortie' as const, icon: '🚪', label: 'État des lieux de sortie', ref: edlSortieInputRef },
              { key: 'other'      as const, icon: '📎', label: 'Autres documents',         ref: otherInputRef      },
            ]).map((section, sIdx, sArr) => {
              const docsInCat = leaseDocs.filter(d => d.category === section.key)
              return (
                <div key={section.key} style={{ borderBottom: sIdx < sArr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]"><Emoji native={section.icon} size="18px" /></span>
                      <div>
                        <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>{section.label}</div>
                        <div className="text-[11.5px]" style={{ color: '#9CA3AF' }}>
                          {docsInCat.length === 0 ? 'Aucun fichier' : `${docsInCat.length} fichier${docsInCat.length > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>
                    <div>
                      <input
                        ref={section.ref}
                        type="file"
                        accept="application/pdf,image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) uploadLeaseDoc(f, section.key)
                          if (e.target) e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => section.ref.current?.click()}
                        disabled={uploadingDoc === section.key}
                        className="text-[11.5px] font-bold px-3 py-1.5 rounded-full border-none cursor-pointer text-white disabled:opacity-50"
                        style={{ background: '#4ECBA0' }}
                      >
                        {uploadingDoc === section.key ? 'Envoi…' : <><Emoji native="⬆" /> Déposer</>}
                      </button>
                    </div>
                  </div>
                  {docsInCat.length > 0 && (
                    <div className="px-5 pb-3">
                      {docsInCat.map((d, i) => {
                        const lastSeen = (() => { try { return Number(localStorage.getItem(`lease_docs_last_seen_${lease.id}`) ?? 0) } catch { return 0 } })()
                        const isNew = !!d.createdAt && new Date(d.createdAt).getTime() > lastSeen
                        return (
                          <button
                            key={d.path}
                            onClick={() => openLeaseDoc(d.path)}
                            className="w-full flex items-center justify-between text-left py-2.5 border-none cursor-pointer bg-transparent"
                            style={{ borderTop: i > 0 ? '1px solid #F9FAFB' : 'none' }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[15px]"><Emoji native="📄" size="15px" /></span>
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-semibold truncate" style={{ color: '#111827' }}>
                                  {d.name}
                                  {isNew && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" style={{ background: '#FEF2F2', color: '#DC2626' }}>NOUVEAU</span>}
                                </div>
                                <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                                  {d.createdAt ? `Déposé le ${formatDate(d.createdAt)}` : 'Date inconnue'}
                                  {d.sizeBytes != null ? ` · ${Math.max(1, Math.round(d.sizeBytes / 1024))} Ko` : ''}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: '#ECFDF5', color: '#059669' }}>
                              Ouvrir
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[11.5px] mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Les fichiers déposés ici sont partagés entre le loueur et le(s) locataire(s) du bail.
          </p>
        </div>

        {/* Coffre-fort personnel du loueur */}
        <div className="mb-4">
          <Link
            href="/app/documents"
            className="flex items-center justify-between p-5 rounded-[14px] no-underline"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[22px]"><Emoji native="🔐" /></span>
              <div>
                <div className="text-[14px] font-bold" style={{ color: '#111827' }}>Mon coffre-fort personnel</div>
                <div className="text-[12px]" style={{ color: '#6B7280' }}>Vos justificatifs privés (non partagés)</div>
              </div>
            </div>
            <span style={{ color: '#4ECBA0', fontSize: '20px' }}>›</span>
          </Link>
        </div>

      </div>
    </>
  )
}
