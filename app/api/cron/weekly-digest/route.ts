import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { computeProfileCompletion } from '@/lib/profileCompletion'

export const runtime = 'nodejs'
export const maxDuration = 300

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const shell = (inner: string) => `
  <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 40px; border-radius: 16px;">
    ${inner}
    <p style="color: rgba(255,255,255,0.2); font-size: 11px; text-align: center; margin-top: 32px;">
      Tu reçois cet email car tu es inscrit sur ISALY. <a href="${APP_URL}/app/parametres" style="color: rgba(255,255,255,0.3);">Se désabonner</a>
    </p>
  </div>
`

const cta = (href: string, label: string) => `
  <div style="margin-top: 28px; text-align: center;">
    <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, #10B981, #059669); color: #fff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px;">
      ${label}
    </a>
  </div>
`

const statRow = (items: { value: string; label: string }[]) => `
  <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 24px;"><tr>
    ${items.map(s => `
      <td style="text-align: center; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px 8px;">
        <div style="color: #10B981; font-size: 26px; font-weight: 800;">${s.value}</div>
        <div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 4px;">${s.label}</div>
      </td>
    `).join('<td style="width: 10px;"></td>')}
  </tr></table>
`

/** Résumé hebdomadaire : version locataire et version loueur. */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, first_name, city, budget_max, role, avatar_url, last_name, bio, matching_data, cert_level')
    .eq('onboarding_completed', true)

  if (!users?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const user of users.slice(0, 100)) {
    const { data: authData } = await supabase.auth.admin.getUserById(user.id)
    const email = authData?.user?.email
    if (!email) continue

    if (user.role === 'loueur') {
      // ── Version LOUEUR : candidatures + vues + CTA boost ──
      const { data: myListings } = await supabase
        .from('listings')
        .select('id, title')
        .eq('owner_id', user.id)
        .eq('is_active', true)
      if (!myListings?.length) continue

      const [{ count: candidatures }, { count: views }] = await Promise.all([
        supabase.from('swipes').select('id', { count: 'exact', head: true })
          .eq('swiped_id', user.id).in('direction', ['right', 'super']).gte('created_at', weekAgo),
        supabase.from('listing_views').select('id', { count: 'exact', head: true })
          .in('listing_id', myListings.map(l => l.id)).gte('created_at', weekAgo),
      ])

      if ((candidatures ?? 0) === 0 && (views ?? 0) === 0) continue

      const needsBoost = (views ?? 0) < 5
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Ta semaine ISALY : ${candidatures ?? 0} candidature${(candidatures ?? 0) > 1 ? 's' : ''}, ${views ?? 0} vue${(views ?? 0) > 1 ? 's' : ''} 📊`,
        html: shell(`
          <h2 style="color: #10B981; font-size: 22px; margin: 0 0 8px;">Bonjour ${user.first_name ?? 'toi'} 👋</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 15px; margin: 0 0 24px;">Voici l'activité de tes annonces cette semaine.</p>
          ${statRow([
            { value: String(candidatures ?? 0), label: 'candidatures reçues' },
            { value: String(views ?? 0), label: 'vues sur tes annonces' },
          ])}
          ${needsBoost ? `
            <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 12px; padding: 14px 16px; color: rgba(255,255,255,0.7); font-size: 13.5px;">
              📉 Moins de 5 vues cette semaine — un boost multiplie la visibilité de ton annonce.
            </div>
            ${cta(`${APP_URL}/app/boost`, 'Booster mon annonce →')}
          ` : cta(`${APP_URL}/app/candidatures`, 'Voir mes candidatures →')}
        `),
      }).catch(() => {})
      sent++
      continue
    }

    // ── Version LOCATAIRE : matchs + annonces recommandées + complétion ──
    const [{ count: matchCount }, { data: newListings }] = await Promise.all([
      supabase.from('matches').select('id', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).gte('created_at', weekAgo),
      user.city
        ? supabase.from('listings')
            .select('id, title, city, rent, photos')
            .eq('is_active', true).ilike('city', `%${user.city}%`)
            .gte('created_at', weekAgo)
            .order('created_at', { ascending: false }).limit(3)
        : Promise.resolve({ data: [] as { id: string; title: string | null; city: string | null; rent: number | null; photos: string[] | null }[] }),
    ])

    const completion = computeProfileCompletion({
      avatarUrl: user.avatar_url, firstName: user.first_name, lastName: user.last_name,
      city: user.city, bio: user.bio, budgetMax: user.budget_max,
      matchingData: user.matching_data as Record<string, unknown> | null, certLevel: user.cert_level,
    })

    if ((matchCount ?? 0) === 0 && !newListings?.length) continue

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Ta semaine ISALY : ${matchCount ?? 0} match${(matchCount ?? 0) > 1 ? 's' : ''} et ${newListings?.length ?? 0} annonce${(newListings?.length ?? 0) > 1 ? 's' : ''} pour toi 🏠`,
      html: shell(`
        <h2 style="color: #10B981; font-size: 22px; margin: 0 0 8px;">Bonjour ${user.first_name ?? 'toi'} 👋</h2>
        <p style="color: rgba(255,255,255,0.6); font-size: 15px; margin: 0 0 24px;">Ton résumé de la semaine sur ISALY.</p>
        ${statRow([
          { value: String(matchCount ?? 0), label: 'matchs cette semaine' },
          { value: `${completion}%`, label: 'profil complété' },
        ])}
        ${newListings?.length ? `
          <div style="color: #fff; font-size: 15px; font-weight: 700; margin: 0 0 12px;">Recommandées pour toi ${user.city ? `à ${user.city}` : ''} :</div>
          ${newListings.map(l => `
            <a href="${APP_URL}/app/annonce/${l.id}" style="display: block; text-decoration: none; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
              <table cellpadding="0" cellspacing="0" style="width: 100%;"><tr>
                ${l.photos?.[0] ? `<td style="width: 72px;"><img src="${l.photos[0]}" alt="" width="60" height="46" style="border-radius: 8px; object-fit: cover; display: block;" /></td>` : ''}
                <td>
                  <div style="color: #fff; font-weight: 600; font-size: 14px;">${l.title ?? `Colocation à ${l.city}`}</div>
                  <div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 2px;">📍 ${l.city} · <span style="color: #10B981; font-weight: 700;">${l.rent ?? '—'}€/mois</span></div>
                </td>
              </tr></table>
            </a>
          `).join('')}
        ` : ''}
        ${completion < 100 ? `
          <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 14px 16px; color: rgba(255,255,255,0.7); font-size: 13.5px; margin-top: 16px;">
            ✨ Ton profil est complété à ${completion}% — un profil complet apparaît en priorité dans le swipe.
          </div>
        ` : ''}
        ${cta(`${APP_URL}/app/swipe`, 'Reprendre le swipe →')}
      `),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
