'use client'

interface ProfileCompletionProps {
  profile: {
    first_name?: string
    last_name?: string
    avatar_url?: string
    city?: string
    bio?: string
    budget_max?: number
    matching_data?: Record<string, unknown>
    cert_level?: number
  }
}

export default function ProfileCompletion({ profile }: ProfileCompletionProps) {
  const steps = [
    { label: 'Prénom et nom',     done: !!(profile.first_name && profile.last_name) },
    { label: 'Photo de profil',   done: !!profile.avatar_url },
    { label: 'Ville renseignée',  done: !!profile.city },
    { label: 'Bio rédigée',       done: !!(profile.bio && profile.bio.length > 20) },
    { label: 'Budget défini',     done: !!(profile.budget_max && profile.budget_max > 0) },
    { label: 'Questionnaire',     done: !!(profile.matching_data && typeof profile.matching_data.completed_at === 'string') },
    { label: 'Identité vérifiée', done: !!(profile.cert_level && profile.cert_level >= 1) },
  ]
  const done = steps.filter(s => s.done).length
  const pct = Math.round((done / steps.length) * 100)
  const color = pct < 40 ? '#EF4444' : pct < 70 ? '#F59E0B' : '#10B981'

  if (pct === 100) return null

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>Complète ton profil</div>
        <div style={{ fontWeight: 700, fontSize: '15px', color }}>{pct}%</div>
      </div>
      <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {steps.filter(s => !s.done).map(s => (
          <span key={s.label} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#FEF2F2', color: '#DC2626', fontWeight: 500 }}>
            ✗ {s.label}
          </span>
        ))}
        {steps.filter(s => s.done).map(s => (
          <span key={s.label} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#ECFDF5', color: '#059669', fontWeight: 500 }}>
            ✓ {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
