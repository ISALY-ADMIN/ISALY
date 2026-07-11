import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Cron horaire : déclenche les alertes de recherche.
 * Pour chaque alerte active, cherche les annonces créées depuis le dernier
 * déclenchement qui matchent les critères → notification in-app + email.
 */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: alerts } = await supabase
    .from('search_alerts')
    .select('*')
    .eq('is_active', true)

  if (!alerts?.length) return NextResponse.json({ triggered: 0 })

  let triggered = 0
  const now = new Date().toISOString()

  for (const alert of alerts) {
    // Fenêtre : depuis le dernier déclenchement (ou la création de l'alerte)
    const since = alert.last_triggered_at ?? alert.created_at

    let query = supabase
      .from('listings')
      .select('id, title, city, rent, surface, rooms_available, photos, meuble, animaux_ok, non_fumeur')
      .eq('is_active', true)
      .gt('created_at', since)
      .limit(10)

    if (alert.city) query = query.ilike('city', `%${alert.city}%`)
    if (alert.budget_max) query = query.lte('rent', alert.budget_max)
    if (alert.rooms) query = query.gte('rooms_available', alert.rooms)
    if (alert.surface_min) query = query.gte('surface', alert.surface_min)
    if (alert.meuble === true) query = query.eq('meuble', true)
    if (alert.animaux_ok === true) query = query.eq('animaux_ok', true)
    if (alert.non_fumeur === true) query = query.eq('non_fumeur', true)

    const { data: listings } = await query
    if (!listings?.length) continue

    const alertLabel = alert.name || [alert.city, alert.budget_max ? `< ${alert.budget_max}€` : null].filter(Boolean).join(' ') || 'votre alerte'
    const n = listings.length

    // Notification in-app
    await supabase.from('notifications').insert({
      user_id: alert.user_id,
      type: 'alert',
      title: `${n} nouvelle${n > 1 ? 's' : ''} annonce${n > 1 ? 's' : ''} pour « ${alertLabel} »`,
      body: listings.map(l => l.title).slice(0, 3).join(' · '),
      link: '/app/recherche?alert=true',
    })

    // Push (best effort)
    if (alert.notify_push) {
      await fetch(`${APP_URL}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: alert.user_id,
          title: `🔔 ${n} nouvelle${n > 1 ? 's' : ''} annonce${n > 1 ? 's' : ''}`,
          body: `Votre alerte « ${alertLabel} » a trouvé de nouvelles annonces.`,
          url: '/app/recherche?alert=true',
        }),
      }).catch(() => {})
    }

    // Email
    if (alert.notify_email) {
      const { data: authData } = await supabase.auth.admin.getUserById(alert.user_id)
      const email = authData?.user?.email
      if (email) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `${n} nouvelle${n > 1 ? 's' : ''} annonce${n > 1 ? 's' : ''} correspond${n > 1 ? 'ent' : ''} à votre alerte 🔔`,
          html: `
            <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 40px; border-radius: 16px;">
              <h2 style="color: #10B981; font-size: 22px; margin: 0 0 8px;">🔔 Votre alerte « ${alertLabel} »</h2>
              <p style="color: rgba(255,255,255,0.6); font-size: 15px; margin: 0 0 24px;">
                <strong style="color: #fff;">${n} nouvelle${n > 1 ? 's' : ''} annonce${n > 1 ? 's' : ''}</strong> correspond${n > 1 ? 'ent' : ''} à vos critères.
              </p>
              ${listings.map(l => `
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
              <div style="margin-top: 28px; text-align: center;">
                <a href="${APP_URL}/app/recherche" style="display: inline-block; background: linear-gradient(135deg, #10B981, #059669); color: #fff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px;">
                  Voir toutes les annonces →
                </a>
              </div>
              <p style="color: rgba(255,255,255,0.2); font-size: 11px; text-align: center; margin-top: 32px;">
                Gérez vos alertes dans <a href="${APP_URL}/app/parametres" style="color: rgba(255,255,255,0.3);">vos paramètres</a>.
              </p>
            </div>
          `,
        }).catch(() => {})
      }
    }

    await supabase.from('search_alerts').update({ last_triggered_at: now }).eq('id', alert.id)
    triggered++
  }

  return NextResponse.json({ triggered, alerts: alerts.length })
}
