import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { matchingEngine, profileToVector } from '@/lib/matching'
import type { Profile } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch active users with completed onboarding
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .not('city', 'is', null)
    .limit(100)

  if (!users?.length) return NextResponse.json({ sent: 0 })

  // New profiles in the last 7 days
  const { data: newProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .gte('created_at', since)
    .not('city', 'is', null)

  if (!newProfiles?.length) return NextResponse.json({ sent: 0, reason: 'no_new_profiles' })

  let sent = 0

  for (const user of users) {
    try {
      const userVector = profileToVector(user as Profile)

      // Find compatible new profiles not yet alerted
      const { data: alreadyAlerted } = await supabase
        .from('match_alert_log')
        .select('alerted_profile_id')
        .eq('user_id', user.id)

      const alertedIds = new Set((alreadyAlerted ?? []).map(r => r.alerted_profile_id))

      const compatible = newProfiles
        .filter(p => p.id !== user.id && !alertedIds.has(p.id))
        .map(p => {
          const score = matchingEngine.computeMatchScore(userVector, profileToVector(p as Profile))
          return { profile: p, score: score.score }
        })
        .filter(c => c.score >= 80)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      if (!compatible.length) continue

      const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
      const email = authUser?.user?.email
      if (!email) continue

      // Send email
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `🔥 ${compatible.length} nouveau${compatible.length > 1 ? 'x' : ''} profil${compatible.length > 1 ? 's' : ''} très compatible${compatible.length > 1 ? 's' : ''} cette semaine`,
        html: buildMatchAlertEmail(user.first_name ?? 'toi', compatible),
      })

      // Log to avoid resending
      await supabase.from('match_alert_log').insert(
        compatible.map(c => ({ user_id: user.id, alerted_profile_id: c.profile.id }))
      )

      sent++
    } catch (err) {
      console.error('[match-alerts] error for user', user.id, err)
    }
  }

  return NextResponse.json({ sent })
}

function buildMatchAlertEmail(firstName: string, matches: Array<{ profile: Profile; score: number }>) {
  return `
    <div style="background:#f7f8fa;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <div style="background:linear-gradient(135deg,#10B981,#059669);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px">ISALY</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">La colocation intelligente</p>
        </div>
        <div style="padding:36px 40px">
          <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">
            🔥 ${matches.length} profil${matches.length > 1 ? 's' : ''} très compatible${matches.length > 1 ? 's' : ''} cette semaine
          </h2>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
            Bonjour ${firstName}, voici les nouveaux profils qui te correspondent le mieux cette semaine.
          </p>
          ${matches.map(({ profile: p, score }) => `
            <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:14px">
              <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0">
                ${p.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style="flex:1">
                <div style="color:#111827;font-weight:600;font-size:14px">${p.first_name ?? 'Utilisateur'}</div>
                <div style="color:#6b7280;font-size:12px">📍 ${p.city ?? 'France'} · ${p.budget_max ?? 0}€/mois</div>
              </div>
              <div style="background:#ecfdf5;color:#059669;font-weight:700;font-size:13px;padding:6px 12px;border-radius:20px;white-space:nowrap">
                ${score}% compatible
              </div>
            </div>
          `).join('')}
          <div style="margin-top:28px;text-align:center">
            <a href="${APP_URL}/app/swipe" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px">
              Voir tous mes matchs →
            </a>
          </div>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:11.5px;color:#9ca3af">
            Tu reçois cet email car tu es inscrit sur ISALY.<br>
            <a href="${APP_URL}/app/parametres" style="color:#9ca3af">Se désabonner</a> · © 2025 ISALY
          </p>
        </div>
      </div>
    </div>
  `
}
