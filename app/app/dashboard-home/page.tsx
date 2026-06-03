'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import ProfileCompletion from '@/components/ui/ProfileCompletion'
import Link from 'next/link'

export default function DashboardHomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ matches: 0, messages: 0, views: 0, favorites: 0 })
  const [listings, setListings] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      const [matchRes, msgRes, favRes, listRes] = await Promise.all([
        supabase.from('matches').select('id', { count: 'exact', head: true }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('read', false).neq('sender_id', user.id),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('listings').select('id, title, city, rent, is_active').eq('owner_id', user.id).limit(3),
      ])

      setStats({
        matches: matchRes.count ?? 0,
        messages: msgRes.count ?? 0,
        views: 0,
        favorites: favRes.count ?? 0,
      })
      setListings(listRes.data ?? [])
    }
    load()
  }, [router])

  if (!profile) return null

  const firstName = profile.first_name ?? 'toi'

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F0' }}>
      <Topbar title="Accueil" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            Bonjour {firstName} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <ProfileCompletion profile={profile} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Matchs', value: stats.matches, icon: '❤️', href: '/app/swipe', color: '#EF4444' },
            { label: 'Messages non lus', value: stats.messages, icon: '💬', href: '/app/messages', color: '#10B981' },
            { label: 'Favoris', value: stats.favorites, icon: '🔖', href: '/app/favoris', color: '#F59E0B' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 16px', border: '1px solid #E5E7EB', textAlign: 'center', transition: 'transform 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.transform = '')}
              >
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>{s.label}</div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Link href="/app/swipe" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '16px', padding: '24px', color: '#fff', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Continuer le swipe</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Trouve ton prochain colocataire</div>
            </div>
          </Link>
          <Link href="/app/recherche" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Rechercher</div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>Parcourir toutes les annonces</div>
            </div>
          </Link>
        </div>

        {listings.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: '#111827' }}>Mes annonces</div>
              <Link href="/app/mes-annonces" style={{ fontSize: '13px', color: '#10B981', fontWeight: 600, textDecoration: 'none' }}>Voir tout →</Link>
            </div>
            {listings.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.is_active ? '#10B981' : '#9CA3AF', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '14px', color: '#111827', fontWeight: 500 }}>{l.title || `Colocation à ${l.city}`}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>{l.rent}€/mois</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
