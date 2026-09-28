import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSwiperPlusActive } from '@/lib/swipeQuota'

export const dynamic = 'force-dynamic'

/** État de Swiper Plus du locataire (drapeau et échéance posés par le webhook). */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase
    .from('profiles')
    .select('swiper_plus_active, swiper_plus_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  const row = data as { swiper_plus_active?: boolean | null; swiper_plus_expires_at?: string | null } | null
  return NextResponse.json({ plus: isSwiperPlusActive(row), expires: row?.swiper_plus_expires_at ?? null })
}
