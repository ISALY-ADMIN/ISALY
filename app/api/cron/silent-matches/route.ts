import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/webpush'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import type { PushSubscription } from 'web-push'

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

  const now = Date.now()
  const from48h = new Date(now - 72 * 60 * 60 * 1000).toISOString()
  const to48h = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  // Matches created 48-72h ago
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, user1_id, user2_id, created_at,
      conversations (id)
    `)
    .gte('created_at', from48h)
    .lte('created_at', to48h)

  if (!matches?.length) return NextResponse.json({ processed: 0 })

  // Filter: only silent matches (no messages in their conversation)
  const silentMatches = []
  for (const match of matches) {
    const convId = (match.conversations as Array<{ id: string }>)?.[0]?.id
    if (!convId) { silentMatches.push(match); continue }
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)
    if ((count ?? 0) === 0) silentMatches.push(match)
  }

  // Filter: already reminded
  const { data: alreadyReminded } = await supabase
    .from('silent_match_log')
    .select('match_id')
    .in('match_id', silentMatches.map(m => m.id))

  const remindedIds = new Set((alreadyReminded ?? []).map(r => r.match_id))
  const toRemind = silentMatches.filter(m => !remindedIds.has(m.id))

  if (!toRemind.length) return NextResponse.json({ processed: 0, reason: 'all_reminded' })

  let processed = 0

  for (const match of toRemind) {
    for (const userId of [match.user1_id, match.user2_id]) {
      const otherId = userId === match.user1_id ? match.user2_id : match.user1_id

      // Fetch other user's first_name
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', otherId)
        .single()
      const otherName = otherProfile?.first_name ?? 'quelqu\'un'

      const notifTitle = `💬 Brise la glace avec ${otherName} !`
      const notifBody = `Votre match n'attend que ça — soyez le premier à dire bonjour.`
      const notifLink = `/app/messages`

      // Always create in-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'match',
        title: notifTitle,
        body: notifBody,
        link: notifLink,
        read: false,
      })

      // Try push notification
      const { data: pushSub } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId)
        .single()

      let pushSent = false
      if (pushSub?.subscription) {
        try {
          const sub = JSON.parse(pushSub.subscription) as PushSubscription
          pushSent = await sendPushNotification(sub, {
            title: notifTitle,
            body: notifBody,
            url: `${APP_URL}${notifLink}`,
          })
        } catch {}
      }

      // Fallback: email if no push
      if (!pushSent) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId)
          const email = authUser?.user?.email
          if (email) {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: email,
              subject: notifTitle,
              html: buildSilentMatchEmail(otherName),
            })
          }
        } catch {}
      }
    }

    // Log the reminder
    await supabase.from('silent_match_log').insert({ match_id: match.id })
    processed++
  }

  return NextResponse.json({ processed })
}

function buildSilentMatchEmail(otherName: string) {
  return `
    <div style="background:#f7f8fa;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <div style="background:linear-gradient(135deg,#10B981,#059669);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px">ISALY</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">La colocation intelligente</p>
        </div>
        <div style="padding:36px 40px;text-align:center">
          <div style="font-size:48px;margin-bottom:20px">💬</div>
          <h2 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700">
            Brise la glace avec ${otherName} !
          </h2>
          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6">
            Vous avez matché il y a 2 jours, mais personne n'a encore dit bonjour.
            Soyez le premier — c'est souvent le plus dur, mais le plus décisif.
          </p>
          <a href="${APP_URL}/app/messages" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;box-shadow:0 4px 16px rgba(16,185,129,0.35)">
            Envoyer un message →
          </a>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:11.5px;color:#9ca3af">
            Tu reçois cet email car tu as un match sur ISALY.<br>
            <a href="${APP_URL}/app/parametres" style="color:#9ca3af">Se désabonner</a> · © 2025 ISALY
          </p>
        </div>
      </div>
    </div>
  `
}
