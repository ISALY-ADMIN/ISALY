import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import Link from 'next/link'
import { Bubble, EmptyState, Icon, Pill, personColor } from '@/components/ui-v2'
import { Tbl, Who, shortDate } from '@/components/ui-v2/admin/parts'
import VerifyActions from './VerifyActions'

async function getPendingDossiers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('dossiers')
    .select(`
      id, user_id, identity_doc_url, identity_verified, income_monthly, completion_percent, updated_at,
      profiles:user_id (first_name, last_name, email, avatar_url)
    `)
    .not('identity_doc_url', 'is', null)
    .order('updated_at', { ascending: true })
  return data ?? []
}

type P = { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
const profileOf = (raw: unknown): P => (Array.isArray(raw) ? raw[0] : raw) as P
const nameOf = (p: P) => `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Sans nom'

/** Vérifications d'identité (vAdmVerif) : file d'attente à gauche, dossier à droite. */
export default async function AdminVerifications({ searchParams }: { searchParams: { v?: string } }) {
  await getAdminUser()
  const dossiers = await getPendingDossiers()

  const pending = dossiers.filter(d => !d.identity_verified)
  const verified = dossiers.filter(d => d.identity_verified)
  const cur = pending.find(d => d.id === searchParams.v) ?? pending[0]
  const curProfile = cur ? profileOf(cur.profiles) : null

  return (
    <>
      <p className="soft" style={{ marginBottom: 16 }}>
        {`${pending.length} en attente, ${verified.length} ${verified.length > 1 ? 'vérifiées' : 'vérifiée'}`}
      </p>

      {pending.length === 0 ? (
        <EmptyState icon="shield" tone="ok" title="Aucune vérification en attente" />
      ) : (
        <div className="cands">
          <section className="panel" style={{ padding: 10 }} aria-label="File d’attente">
            {pending.map(d => {
              const p = profileOf(d.profiles)
              return (
                <Link key={d.id} className="cand" href={`/admin/verifications?v=${d.id}`} aria-current={d.id === cur?.id ? 'true' : undefined} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Bubble name={nameOf(p)} color={personColor(d.user_id)} size={40} avatar={p?.avatar_url} />
                  <span className="grow">
                    <span className="t">{nameOf(p)}</span>
                    <span className="s">{`Dossier à ${d.completion_percent ?? 0} %, envoyé le ${shortDate(d.updated_at)}`}</span>
                  </span>
                </Link>
              )
            })}
          </section>

          {cur && (
            <section className="panel">
              <div className="hrow">
                <Who id={cur.user_id ?? cur.id} name={nameOf(curProfile)} avatar={curProfile?.avatar_url} sub={curProfile?.email ?? '-'} />
                <Pill tone="warn">En attente</Pill>
              </div>
              <div className="mt">
                <span className="flabel">Pièce d’identité</span>
                <div className="docprev mt">
                  {cur.identity_doc_url
                    ? <a className="btn btn-glass btn-sm" href={cur.identity_doc_url} target="_blank" rel="noreferrer"><Icon name="eye" size={16} />Ouvrir le document</a>
                    : 'Aperçu du document'}
                </div>
              </div>
              <div className="kv mt">
                <div><span>Nom sur le profil</span><b>{nameOf(curProfile)}</b></div>
                <div><span>Revenus déclarés</span><b>{cur.income_monthly ? `${Number(cur.income_monthly).toLocaleString('fr-FR')} € par mois` : '-'}</b></div>
                <div><span>Dossier</span><b>{`${cur.completion_percent ?? 0} %`}</b></div>
                <div><span>Envoyé le</span><b>{shortDate(cur.updated_at)}</b></div>
              </div>
              <div className="mfoot" style={{ justifyContent: 'flex-start' }}>
                {cur.user_id && <VerifyActions userId={cur.user_id} alreadyVerified={false} />}
              </div>
            </section>
          )}
        </div>
      )}

      {verified.length > 0 && (
        <section className="sec">
          <h2 className="h2" style={{ fontSize: '1.3rem' }}>{`Vérifiées (${verified.length})`}</h2>
          <Tbl head={['Utilisateur', 'Statut', <span key="a" className="sr">Actions</span>]}>
            {verified.map(d => {
              const p = profileOf(d.profiles)
              return (
                <tr key={d.id}>
                  <td><Who id={d.user_id ?? d.id} name={nameOf(p)} avatar={p?.avatar_url} sub={p?.email ?? '-'} /></td>
                  <td><Pill tone="ok" icon="check">Vérifiée</Pill></td>
                  <td>{d.user_id && <VerifyActions userId={d.user_id} alreadyVerified />}</td>
                </tr>
              )
            })}
          </Tbl>
        </section>
      )}
    </>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import Image from 'next/image'
import VerifyActions from './VerifyActions'
import Emoji from '@/components/ui/Emoji'

async function getPendingDossiers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('dossiers')
    .select(`
      id, user_id, identity_doc_url, identity_verified, income_monthly, completion_percent, updated_at,
      profiles:user_id (first_name, last_name, email, avatar_url)
    `)
    .not('identity_doc_url', 'is', null)
    .order('updated_at', { ascending: true })
  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminVerifications() {
  await getAdminUser()
  const dossiers = await getPendingDossiers()

  const pending = dossiers.filter(d => !d.identity_verified)
  const verified = dossiers.filter(d => d.identity_verified)

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header * /}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Vérifications d'identité
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {pending.length} en attente · {verified.length} vérifiée{verified.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pending * /}
      {pending.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            En attente de vérification ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.map(d => {
              const profileRaw = d.profiles
              const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
              const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || '—'
              const initials = ((profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '')).toUpperCase() || '?'

              return (
                <div
                  key={d.id}
                  style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  {/* Avatar * /}
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                    {profile?.avatar_url
                      ? <Image src={profile.avatar_url} alt={initials} width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials}
                  </div>

                  {/* Info * /}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>{fullName}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{profile?.email ?? '—'} · soumis le {formatDate(d.updated_at)}</div>
                  </div>

                  {/* Doc link * /}
                  {d.identity_doc_url && (
                    <a
                      href={d.identity_doc_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#60A5FA', textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '8px', flexShrink: 0 }}
                    >
                      Voir le doc →
                    </a>
                  )}

                  {/* Actions * /}
                  {d.user_id && <VerifyActions userId={d.user_id} alreadyVerified={false} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div style={{ background: 'rgba(78,203,160,0.05)', border: '1px solid rgba(78,203,160,0.15)', borderRadius: '14px', padding: '40px', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}><Emoji native="✅" /></div>
          <p style={{ color: '#4ECBA0', fontSize: '14px', fontWeight: 600, margin: 0 }}>Aucune vérification en attente</p>
        </div>
      )}

      {/* Already verified * /}
      {verified.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            Vérifiées ({verified.length})
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            {verified.map((d, i) => {
              const profileRaw = d.profiles
              const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
              const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || '—'

              return (
                <div
                  key={d.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 20px', borderBottom: i < verified.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(78,203,160,0.12)', color: '#4ECBA0' }}>✓ Vérifiée</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>{fullName}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>{profile?.email ?? '—'}</span>
                  </div>
                  {d.user_id && <VerifyActions userId={d.user_id} alreadyVerified={true} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
*/
