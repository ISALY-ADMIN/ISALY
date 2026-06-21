'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Topbar from '@/components/layout/Topbar'
import { useLease } from '@/contexts/LeaseContext'
import { createClient } from '@/lib/supabase/client'

interface Roommate {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
  joined_at: string
}

function initials(fn: string | null, ln: string | null) {
  return `${(fn?.[0] ?? '')}${(ln?.[0] ?? '')}`.toUpperCase() || '?'
}

function monthsSince(iso: string): number {
  const s = new Date(iso)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth())
}

const COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ColocatairesPage() {
  const router = useRouter()
  const { lease, loading: leaseLoading } = useLease()
  const [roommates, setRoommates] = useState<Roommate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leaseLoading && !lease) router.replace('/app/swipe')
  }, [lease, leaseLoading, router])

  useEffect(() => {
    if (!lease) return
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('lease_roommates')
          .select('profile_id, joined_at, profiles(id, first_name, last_name, avatar_url, city, bio)')
          .eq('lease_id', lease!.id)

        if (data) {
          const mapped: Roommate[] = data.map((row: Record<string, unknown>) => {
            const p = row.profiles as Record<string, unknown>
            return {
              id: p?.id as string ?? '',
              first_name: p?.first_name as string | null,
              last_name: p?.last_name as string | null,
              avatar_url: p?.avatar_url as string | null,
              city: p?.city as string | null,
              bio: p?.bio as string | null,
              joined_at: row.joined_at as string,
            }
          })
          setRoommates(mapped)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [lease])

  function goMessage(name: string) {
    router.push(`/app/messages?with=${encodeURIComponent(name)}`)
  }

  if (leaseLoading || !lease) {
    return (
      <>
        <Topbar title="Mes colocataires" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>👥</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mes colocataires" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '760px' }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>
              Mes colocataires
            </h2>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {lease.nb_roommates} colocataire{lease.nb_roommates > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-[40px]" style={{ animation: 'bop 1s ease infinite' }}>👥</div>
          </div>
        ) : roommates.length === 0 ? (
          <div
            className="text-center py-16 rounded-[18px]"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
          >
            <div className="text-[52px] mb-4">🏠</div>
            <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Pas encore de colocataires ajoutés
            </h3>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280', maxWidth: '320px', margin: '0 auto 20px' }}>
              Demande à ton propriétaire d&apos;ajouter tes colocataires à votre bail sur ISALY.
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[12.5px]"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280' }}
            >
              💡 Le propriétaire gère les membres du bail
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {roommates.map((rm, i) => {
              const name = `${rm.first_name ?? ''} ${rm.last_name ?? ''}`.trim() || 'Colocataire'
              const color = COLORS[i % COLORS.length]
              const months = monthsSince(rm.joined_at)

              return (
                <div
                  key={rm.id}
                  className="rounded-[14px] p-5 flex items-center gap-4"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
                >
                  {/* Avatar */}
                  {rm.avatar_url ? (
                    <Image src={rm.avatar_url} alt={name} width={56} height={56} className="w-[56px] h-[56px] rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="w-[56px] h-[56px] rounded-full flex items-center justify-center font-extrabold text-lg text-white flex-shrink-0"
                      style={{ background: color }}
                    >
                      {initials(rm.first_name, rm.last_name)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold mb-0.5" style={{ color: '#111827' }}>{name}</div>
                    <div className="text-[12.5px] mb-1" style={{ color: '#6B7280' }}>
                      Colocataire depuis {months} mois
                      {rm.city ? ` · ${rm.city}` : ''}
                    </div>
                    {rm.bio && (
                      <p className="text-[12px]" style={{ color: '#9CA3AF', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {rm.bio}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => goMessage(name)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold text-white border-none cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
                    >
                      💬 Message
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
