import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
  const returnUrl = (body as { return_url?: string }).return_url ?? `${baseUrl}/app/mes-annonces`

  // Find Stripe customer by email
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
  if (!customers.data.length) {
    return NextResponse.json({ error: 'Aucun compte de facturation trouvé' }, { status: 404 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
