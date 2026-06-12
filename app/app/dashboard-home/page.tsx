'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import ProfileCompletion from '@/components/ui/ProfileCompletion'
import Link from 'next/link'
import StaggerContainer, { StaggerItem } from '@/components/animations/StaggerContainer'

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
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Accueil" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '24px' }}
        >
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>
            Bonjour {firstName}
          </h1>
        </motion.div>

        <Link href="/app/profil" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <ProfileCompletion profile={profile} />
        </Link>

        <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Matchs', value: stats.matches, icon: '❤️', href: '/app/swipe', color: '#EF4444' },
            { label: 'Messages non lus', value: stats.messages, icon: '💬', href: '/app/messages', color: '#10B981' },
            { label: 'Favoris', value: stats.favorites, icon: '🔖', href: '/app/favoris', color: '#F59E0B' },
          ].map(s => (
            <StaggerItem key={s.label}>
              <Link href={s.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '20px 16px', border: '0.5px solid rgba(255,255,255,0.08)', textAlign: 'center', transition: 'transform 0.15s, background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{s.label}</div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <StaggerContainer staggerDelay={0.1} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StaggerItem>
            <Link href="/app/swipe" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '16px', padding: '24px', color: '#fff', cursor: 'pointer' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Continuer le swipe</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Trouve ton prochain colocataire</div>
              </div>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link href="/app/recherche" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '0.5px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Rechercher</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Parcourir toutes les annonces</div>
              </div>
            </Link>
          </StaggerItem>
        </StaggerContainer>

        {listings.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px 24px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Mes annonces</div>
              <Link href="/app/mes-annonces" style={{ fontSize: '13px', color: '#10B981', fontWeight: 600, textDecoration: 'none' }}>Voir tout →</Link>
            </div>
            {listings.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.is_active ? '#10B981' : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '14px', color: '#ffffff', fontWeight: 500 }}>{l.title || `Colocation à ${l.city}`}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{l.rent}€/mois</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
