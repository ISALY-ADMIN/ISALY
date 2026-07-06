'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import Emoji from '@/components/ui/Emoji'

/** Résout le bail le plus pertinent de l'utilisateur et redirige vers /app/bail/[id]. */
export default function BailIndexPage() {
  const router = useRouter()
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    async function resolve() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data } = await supabase
        .from('leases')
        .select('id, status')
        .or(`tenant_id.eq.${user.id},owner_id.eq.${user.id}`)
        .in('status', ['pending_signature', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) router.replace(`/app/bail/${data.id}`)
      else setEmpty(true)
    }
    resolve()
  }, [router])

  if (empty) {
    return (
      <>
        <Topbar title="Mon bail" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[52px] mb-4"><Emoji native="📄" /></div>
          <h3 className="text-[18px] mb-2 font-bold" style={{ color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Aucun bail pour le moment</h3>
          <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Ton bail apparaîtra ici dès qu&apos;il aura été établi.
          </p>
          <Link href="/app/swipe" className="no-underline inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[13.5px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontFamily: "'Outfit', sans-serif" }}>
            <Emoji native="🔍" /> Trouver ma coloc
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mon bail" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="📄" /></div>
      </div>
    </>
  )
}
