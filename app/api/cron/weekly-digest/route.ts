import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL } from '@/lib/resend'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, first_name, city, budget_max, preferences')
    .not('city', 'is', null)

  if (!users?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const user of users.slice(0, 50)) {
    const { data: authData } = await supabase.auth.admin.getUserById(user.id)
    const email = authData?.user?.email
    if (!email) continue

    const { data: newProfiles } = await supabase
      .from('profiles')
      .select('first_name, city, budget_max')
      .eq('city', user.city)
      .neq('id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5)

    if (!newProfiles?.length) continue

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${newProfiles.length} nouveau${newProfiles.length > 1 ? 'x' : ''} profil${newProfiles.length > 1 ? 's' : ''} compatible${newProfiles.length > 1 ? 's' : ''} à ${user.city} 🏠`,
      html: `
        <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 40px; border-radius: 16px;">
          <h2 style="color: #10B981; font-size: 24px; margin: 0 0 8px;">Bonjour ${user.first_name ?? 'toi'} 👋</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 15px; margin: 0 0 24px;">
            Cette semaine, <strong style="color: #fff;">${newProfiles.length} nouveau${newProfiles.length > 1 ? 'x' : ''} profil${newProfiles.length > 1 ? 's' : ''}</strong> compatible${newProfiles.length > 1 ? 's' : ''} ont rejoint ISALY à ${user.city}.
          </p>
          ${newProfiles.map(p => `
            <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10B981, #059669); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 16px; flex-shrink: 0;">${p.first_name?.[0] ?? '?'}</div>
                <div>
                  <div style="color: #fff; font-weight: 600; font-size: 14px;">${p.first_name ?? 'Utilisateur'}</div>
                  <div style="color: rgba(255,255,255,0.5); font-size: 12px;">📍 ${p.city} · ${p.budget_max ?? 0}€/mois</div>
                </div>
              </div>
            </div>
          `).join('')}
          <div style="margin-top: 28px; text-align: center;">
            <a href="https://isaly.fr/app/swipe" style="display: inline-block; background: linear-gradient(135deg, #10B981, #059669); color: #fff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px;">
              Voir les profils →
            </a>
          </div>
          <p style="color: rgba(255,255,255,0.2); font-size: 11px; text-align: center; margin-top: 32px;">
            Tu reçois cet email car tu es inscrit sur ISALY. <a href="https://isaly.fr/app/parametres" style="color: rgba(255,255,255,0.3);">Se désabonner</a>
          </p>
        </div>
      `,
    })
    sent++
  }

  return NextResponse.json({ sent })
}
