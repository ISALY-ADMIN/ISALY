'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'

interface ListingOption { id: string; title: string | null; city: string | null; rent: number | null }
interface TenantOption { id: string; name: string }

const fieldLabel = 'block text-[11.5px] font-extrabold uppercase tracking-wider mb-2'
const fieldInput = 'w-full px-4 py-2.5 rounded-[10px] text-[13.5px] outline-none'
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontFamily: "'Outfit', sans-serif",
}

export default function NouveauBailPage() {
  return (
    <Suspense fallback={null}>
      <NouveauBailInner />
    </Suspense>
  )
}

function NouveauBailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sigRef = useRef<SignatureCanvasHandle>(null)

  const [listings, setListings] = useState<ListingOption[]>([])
  const [tenant, setTenant] = useState<TenantOption | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [signNow, setSignNow] = useState(true)
  const [consent, setConsent] = useState(false)

  const [form, setForm] = useState({
    listing_id: searchParams.get('listing') ?? '',
    tenant_id: searchParams.get('tenant') ?? '',
    address: '',
    city: '',
    rent: '',
    charges: '',
    deposit: '',
    start_date: '',
    end_date: '',
    house_rules: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: myListings } = await supabase
        .from('listings')
        .select('id, title, city, rent')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setListings((myListings ?? []) as ListingOption[])

      const tenantId = searchParams.get('tenant')
      if (tenantId) {
        const { data: p } = await supabase.from('profiles').select('id, first_name, last_name').eq('id', tenantId).maybeSingle()
        if (p) setTenant({ id: p.id, name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire' })
      }
      setLoading(false)
    }
    load()
  }, [router, searchParams])

  // Pré-remplissage adresse/loyer depuis l'annonce sélectionnée
  useEffect(() => {
    const l = listings.find(x => x.id === form.listing_id)
    if (!l) return
    setForm(f => ({
      ...f,
      city: f.city || (l.city ?? ''),
      rent: f.rent || String(l.rent ?? ''),
      address: f.address || (l.title ?? ''),
    }))
  }, [form.listing_id, listings])

  const canSubmit = !!form.tenant_id && !!form.address && !!form.rent && !!form.start_date && !submitting
    && (!signNow || consent)

  async function handleSubmit() {
    if (!canSubmit) return
    if (signNow && (!sigRef.current || sigRef.current.isEmpty())) {
      setError('Merci de signer dans le cadre, ou décochez « Signer maintenant ».')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/bail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: form.tenant_id,
          listing_id: form.listing_id || null,
          address: form.address,
          city: form.city || null,
          rent: Number(form.rent),
          charges: form.charges ? Number(form.charges) : null,
          deposit: form.deposit ? Number(form.deposit) : null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          house_rules: form.house_rules || null,
          signature: signNow ? sigRef.current?.toDataURL() : null,
          consent: signNow ? consent : false,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur lors de la création du bail.'); setSubmitting(false); return }
      router.push(`/app/bail/${json.id}`)
    } catch {
      setError('Une erreur est survenue.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Établir un bail" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="📄" /></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Établir un bail" />
      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px 64px', fontFamily: "'Outfit', sans-serif" }}>

          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-[26px] font-bold m-0" style={{ color: '#fff' }}>Établir le bail</h1>
            <p className="text-[13px] mt-1 mb-7" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Le bail sera envoyé au locataire pour signature électronique.
            </p>
          </motion.div>

          <div className="rounded-[20px] p-6 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Locataire */}
            <div className="mb-4">
              <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Locataire</label>
              {tenant ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13.5px] font-semibold"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                  <Emoji native="👤" size="14px" /> {tenant.name}
                </div>
              ) : (
                <input className={fieldInput} style={inputStyle} placeholder="Identifiant du locataire (UUID)"
                  value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))} />
              )}
            </div>

            {/* Annonce */}
            <div className="mb-4">
              <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Annonce concernée</label>
              <select className={fieldInput} style={{ ...inputStyle, appearance: 'none' }}
                value={form.listing_id} onChange={e => setForm(f => ({ ...f, listing_id: e.target.value }))}>
                <option value="" style={{ background: '#1a1a1a' }}>— Aucune annonce liée —</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id} style={{ background: '#1a1a1a' }}>
                    {l.title ?? 'Annonce'}{l.city ? ` · ${l.city}` : ''}{l.rent ? ` · ${l.rent} €` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Adresse du logement</label>
                <input className={fieldInput} style={inputStyle} placeholder="12 rue des Lilas"
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Ville</label>
                <input className={fieldInput} style={inputStyle} placeholder="Lyon"
                  value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Loyer mensuel (€)</label>
                <input className={fieldInput} style={inputStyle} type="number" min="0" placeholder="650"
                  value={form.rent} onChange={e => setForm(f => ({ ...f, rent: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Charges (€)</label>
                <input className={fieldInput} style={inputStyle} type="number" min="0" placeholder="60"
                  value={form.charges} onChange={e => setForm(f => ({ ...f, charges: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Dépôt de garantie (€)</label>
                <input className={fieldInput} style={inputStyle} type="number" min="0" placeholder="650"
                  value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Date de début</label>
                <input className={fieldInput} style={{ ...inputStyle, colorScheme: 'dark' }} type="date"
                  value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Date de fin (optionnel)</label>
                <input className={fieldInput} style={{ ...inputStyle, colorScheme: 'dark' }} type="date"
                  value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className={fieldLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Règles & consignes du logement (optionnel)</label>
              <textarea className={`${fieldInput} resize-none`} style={inputStyle} rows={3}
                placeholder="Tri des déchets, calme après 22h, code wifi…"
                value={form.house_rules} onChange={e => setForm(f => ({ ...f, house_rules: e.target.value }))} />
            </div>
          </div>

          {/* Signature immédiate du loueur */}
          <div className="rounded-[20px] p-6 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <label className="flex items-center gap-3 cursor-pointer select-none mb-1">
              <input type="checkbox" checked={signNow} onChange={e => setSignNow(e.target.checked)}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: '#10B981' }} />
              <span className="text-[14px] font-bold" style={{ color: '#fff' }}>Signer le bail maintenant</span>
            </label>
            <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Le loueur signe en premier ; le locataire signera ensuite depuis son espace.
            </p>
            {signNow && (
              <>
                <div className="rounded-[14px] p-3" style={{ background: '#fff' }}>
                  <SignatureCanvas ref={sigRef} label="Votre signature (doigt ou souris)" />
                </div>
                <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 cursor-pointer" style={{ accentColor: '#10B981' }} />
                  <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                    J&apos;ai lu et j&apos;accepte les termes du bail.
                  </span>
                </label>
              </>
            )}
          </div>

          {error && <p className="text-[12.5px] mb-4" style={{ color: '#EF4444' }}>{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
              <Emoji native="📄" size="14px" /> Créer le bail et l&apos;envoyer
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>Annuler</Button>
          </div>

          <p className="text-[11.5px] mt-6" style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            Signature électronique simple au sens du règlement eIDAS. Les deux parties recevront une copie signée.
          </p>
        </div>
      </div>
    </>
  )
}
