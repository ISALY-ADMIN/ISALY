#!/usr/bin/env node
/**
 * Met à jour un ticket bug_reports dans Supabase depuis le workflow auto-fix.
 *
 * Passe par l'API REST avec la clé service_role : la policy RLS
 * bug_reports_admin_all ne couvre que les admins connectés, et le workflow
 * n'a pas de session utilisateur.
 *
 * Variables attendues :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BUG_REPORT_ID, BUG_STATUS
 * Optionnelles : AI_DIAGNOSIS, AI_PLAN, AI_REPORT, COMMIT_SHA
 */

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const id = process.env.BUG_REPORT_ID
const status = process.env.BUG_STATUS

if (!url || !key) {
  console.error('[update-bug-report] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent.')
  process.exit(1)
}
if (!id || !status) {
  console.error('[update-bug-report] BUG_REPORT_ID ou BUG_STATUS absent.')
  process.exit(1)
}

/** Postgres refuse les octets nuls dans une colonne text ; on borne aussi la taille. */
function clean(value, max = 20_000) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const stripped = value.replace(/\u0000/g, '')
  return stripped.length > max ? `${stripped.slice(0, max)}\n\n[tronqué]` : stripped
}

const patch = { status }
const diagnosis = clean(process.env.AI_DIAGNOSIS)
const plan = clean(process.env.AI_PLAN)
const report = clean(process.env.AI_REPORT)
const sha = clean(process.env.COMMIT_SHA, 64)

if (diagnosis) patch.ai_diagnosis = diagnosis
if (plan) patch.ai_plan = plan
if (report) patch.ai_report = report
if (sha) patch.commit_sha = sha

const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/bug_reports?id=eq.${encodeURIComponent(id)}`

fetch(endpoint, {
  method: 'PATCH',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  },
  body: JSON.stringify(patch),
})
  .then(async res => {
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[update-bug-report] HTTP ${res.status} — ${body.slice(0, 500)}`)
      process.exit(1)
    }
    console.log(`[update-bug-report] Ticket ${id} → status=${status}${sha ? `, commit=${sha.slice(0, 7)}` : ''}`)
  })
  .catch(e => {
    console.error(`[update-bug-report] Requête impossible : ${e.message}`)
    process.exit(1)
  })
