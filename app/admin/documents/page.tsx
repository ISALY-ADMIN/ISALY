import Image from 'next/image'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient, DOC_TYPE_LABELS } from '@/lib/admin/serviceClient'
import DocActions from './DocActions'

export const dynamic = 'force-dynamic'

interface PendingDoc {
  id: string
  user_id: string
  type: string
  storage_path: string | null
  file_url: string | null
  status: string
  uploaded_at: string
  profiles: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
  signedUrl: string | null
}

async function getPendingDocuments(): Promise<PendingDoc[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_documents')
    .select(`
      id, user_id, type, storage_path, file_url, status, uploaded_at,
      profiles:user_id (first_name, last_name, email, avatar_url)
    `)
    .eq('status', 'pending')
    .order('uploaded_at', { ascending: true })

  const docs = (data ?? []) as unknown as Omit<PendingDoc, 'signedUrl'>[]

  // Signed URLs bucket privé "certifications" (60 min)
  return Promise.all(docs.map(async d => {
    const path = d.storage_path ?? d.file_url ?? ''
    let signedUrl: string | null = null
    if (path) {
      const { data: signed } = await admin.storage.from('certifications').createSignedUrl(path, 3600)
      signedUrl = signed?.signedUrl ?? null
    }
    const profileRaw = d.profiles
    return {
      ...d,
      profiles: (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as PendingDoc['profiles'],
      signedUrl,
    }
  }))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminDocuments() {
  await getAdminUser()
  const docs = await getPendingDocuments()

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Validation des documents
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {docs.length} document{docs.length !== 1 ? 's' : ''} en attente de vérification
        </p>
      </div>

      {docs.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#4B5563', fontSize: '14px' }}>
          Aucun document en attente — tout est à jour ✓
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {docs.map((d, i) => {
            const p = d.profiles
            const fullName = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || '—'
            const initials = ((p?.first_name?.[0] ?? '') + (p?.last_name?.[0] ?? '')).toUpperCase() || '?'
            return (
              <div
                key={d.id}
                className="admin-doc-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 22px',
                  borderBottom: i < docs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                {/* Avatar */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {p?.avatar_url
                    ? <Image src={p.avatar_url} alt={initials} width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                    : initials}
                </div>

                {/* User */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#E5E7EB' }}>{fullName}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.email ?? '—'}</div>
                </div>

                {/* Type badge */}
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', flexShrink: 0,
                  background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)',
                }}>
                  {DOC_TYPE_LABELS[d.type] ?? d.type}
                </span>

                {/* Date */}
                <span style={{ fontSize: '12px', color: '#4B5563', flexShrink: 0, minWidth: '110px', textAlign: 'right' }}>
                  {formatDate(d.uploaded_at)}
                </span>

                {/* Actions */}
                <DocActions documentId={d.id} signedUrl={d.signedUrl} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
