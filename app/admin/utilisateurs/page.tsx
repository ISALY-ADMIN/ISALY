import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import Link from 'next/link'
import { Pill } from '@/components/ui-v2'
import { SearchBox, SegLinks, Tbl, Who, shortDate } from '@/components/ui-v2/admin/parts'
import SuspendButton from './[id]/SuspendButton'

async function getUsers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at, is_admin, suspended, avatar_url, onboarding_completed')
    .order('created_at', { ascending: false })
  return data ?? []
}

const PER_PAGE = 50
const FILTERS: [string, string][] = [['all', 'Tous'], ['loc', 'Locataires'], ['bail', 'Bailleurs'], ['susp', 'Suspendus']]

export default async function AdminUtilisateurs({ searchParams }: { searchParams: { q?: string; f?: string; page?: string } }) {
  await getAdminUser()
  const users = await getUsers()

  const q = (searchParams.q ?? '').trim().toLowerCase()
  const f = FILTERS.some(([v]) => v === searchParams.f) ? searchParams.f! : 'all'
  const filtered = users.filter(u => {
    if (f === 'loc' && u.role !== 'locataire') return false
    if (f === 'bail' && u.role !== 'loueur') return false
    if (f === 'susp' && !u.suspended) return false
    if (!q) return true
    return [u.first_name, u.last_name, u.email].filter(Boolean).join(' ').toLowerCase().includes(q)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const page = Math.min(pages, Math.max(1, Number(searchParams.page) || 1))
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pageHref = (p: number) => {
    const sp = new URLSearchParams()
    if (searchParams.q) sp.set('q', searchParams.q)
    if (f !== 'all') sp.set('f', f)
    sp.set('page', String(p))
    return `/admin/utilisateurs?${sp.toString()}`
  }

  return (
    <>
      <div className="tbar">
        <SearchBox placeholder="Rechercher un nom ou un e-mail" q={searchParams.q} keep={{ f: f !== 'all' ? f : undefined }} />
        <SegLinks base="/admin/utilisateurs" param="f" value={f} options={FILTERS} label="Filtrer" keep={{ q: searchParams.q }} />
      </div>

      <Tbl head={['Utilisateur', 'Mode', 'Statut', 'Inscrit le', <span key="a" className="sr">Actions</span>]} empty={rows.length === 0 ? 'Aucun utilisateur' : undefined}>
        {rows.map(u => {
          const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
          return (
            <tr key={u.id}>
              <td>
                <Who id={u.id} name={name} avatar={u.avatar_url} sub={u.email ?? '-'} />
              </td>
              <td>
                {u.role === 'loueur' ? <Pill tone="brand">Bailleur</Pill> : u.role === 'locataire' ? <Pill>Locataire</Pill> : <span className="muted">-</span>}
                {u.is_admin && <> <Pill tone="info">Admin</Pill></>}
              </td>
              <td>
                {u.suspended
                  ? <Pill tone="bad">Suspendu</Pill>
                  : u.onboarding_completed ? <Pill tone="ok" icon="check">Actif</Pill> : <Pill tone="warn">Incomplet</Pill>}
              </td>
              <td className="num">{shortDate(u.created_at)}</td>
              <td>
                <span className="acts">
                  <Link className="btn btn-glass btn-sm" href={`/admin/utilisateurs/${u.id}`}>Voir</Link>
                  {!u.is_admin && <SuspendButton userId={u.id} suspended={u.suspended ?? false} compact />}
                </span>
              </td>
            </tr>
          )
        })}
      </Tbl>

      <div className="hrow mt">
        <span className="s">{`${rows.length} sur ${filtered.length.toLocaleString('fr-FR')} utilisateurs`}</span>
        <span className="acts">
          {page > 1
            ? <Link className="btn btn-glass btn-sm" href={pageHref(page - 1)}>Précédent</Link>
            : <button className="btn btn-glass btn-sm" type="button" disabled>Précédent</button>}
          {page < pages
            ? <Link className="btn btn-glass btn-sm" href={pageHref(page + 1)}>Suivant</Link>
            : <button className="btn btn-glass btn-sm" type="button" disabled>Suivant</button>}
        </span>
      </div>
    </>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import Link from 'next/link'
import Image from 'next/image'

async function getUsers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at, is_admin, suspended, avatar_url, onboarding_completed')
    .order('created_at', { ascending: false })
  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminUtilisateurs() {
  await getAdminUser()
  const users = await getUsers()

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header * /}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            Utilisateurs
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
            {users.length} compte{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Table * /}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Head * /}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 120px', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px' }}>
          {['Utilisateur', 'Rôle', 'Inscrit le', 'Statut', 'Action'].map(h => (
            <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
          ))}
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#4B5563' }}>Aucun utilisateur</div>
        ) : (
          users.map((user, i) => (
            <div
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1fr 1fr 120px',
                gap: '0',
                padding: '14px 20px',
                borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
              }}
            >
              {/* User * /}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt="" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>
                    {user.first_name || user.last_name
                      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                      : '—'}
                    {user.is_admin && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{user.email ?? '—'}</div>
                </div>
              </div>

              {/* Role * /}
              <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'capitalize' }}>
                {user.role ?? '—'}
              </div>

              {/* Date * /}
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {formatDate(user.created_at)}
              </div>

              {/* Status * /}
              <div>
                {user.suspended ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                    Suspendu
                  </span>
                ) : user.onboarding_completed ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(78,203,160,0.12)', color: '#4ECBA0' }}>
                    Actif
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                    Incomplet
                  </span>
                )}
              </div>

              {/* Action * /}
              <Link
                href={`/admin/utilisateurs/${user.id}`}
                style={{ fontSize: '12px', fontWeight: 600, color: '#4ECBA0', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(78,203,160,0.3)', borderRadius: '8px', display: 'inline-block', textAlign: 'center' }}
              >
                Voir →
              </Link>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
*/
