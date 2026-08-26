// ═══════════════════════════════════════════════════════════════════════════
// Edge Function : trigger-bug-fix
//
// Déclencheur : Database Webhook Supabase sur INSERT dans public.bug_reports.
// Rôle : relayer le nouveau ticket vers GitHub (repository_dispatch) pour que
// le workflow de correction assistée par IA démarre, puis basculer le ticket
// en 'en_analyse'.
//
// Secrets attendus dans l'environnement de la fonction :
//   • GH_PAT                     — PAT GitHub (scope repo / contents+actions)
//   • SUPABASE_URL               — injecté automatiquement par Supabase
//   • SUPABASE_SERVICE_ROLE_KEY  — injecté automatiquement par Supabase
// Aucune de ces valeurs n'est journalisée.
// ═══════════════════════════════════════════════════════════════════════════

const GITHUB_OWNER = 'ISALY-ADMIN'
const GITHUB_REPO = 'ISALY'
const DISPATCH_EVENT = 'bug-report-created'

/** Colonnes du ticket utiles au workflow de correction. */
interface BugReportRecord {
  id: string
  description: string | null
  page_url: string | null
  user_agent: string | null
  browser_context: Record<string, unknown> | null
  status?: string | null
}

/** Payload standard d'un Database Webhook Supabase. */
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: BugReportRecord | null
  old_record: BugReportRecord | null
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Tronque un corps d'erreur distant : assez pour debugger, pas de quoi noyer les logs. */
function excerpt(text: string, max = 500): string {
  const clean = text.trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

Deno.serve(async (req: Request): Promise<Response> => {
  // ── 0. Garde de méthode ──
  if (req.method !== 'POST') {
    return json({ ok: false, stage: 'request', error: `Méthode ${req.method} non supportée, POST attendu.` }, 405)
  }

  // ── 1. Parsing du payload webhook ──
  let payload: WebhookPayload
  try {
    payload = await req.json() as WebhookPayload
  } catch {
    return json({ ok: false, stage: 'parse', error: 'Corps de requête illisible (JSON attendu).' }, 400)
  }

  const record = payload?.record

  // Le webhook est censé être câblé sur INSERT / bug_reports, mais on ne fait
  // pas confiance à la configuration du dashboard : on vérifie, et on répond
  // 200 en cas de non-correspondance pour que Supabase ne réessaie pas
  // indéfiniment un évènement qui ne nous concerne pas.
  if (payload?.type !== 'INSERT' || payload?.table !== 'bug_reports') {
    return json({
      ok: true,
      skipped: true,
      reason: `Évènement ignoré (type=${payload?.type ?? 'inconnu'}, table=${payload?.table ?? 'inconnue'}).`,
    }, 200)
  }

  if (!record?.id) {
    return json({ ok: false, stage: 'parse', error: 'Payload sans record.id exploitable.' }, 400)
  }

  // ── 2. Lecture des secrets ──
  const ghPat = Deno.env.get('GH_PAT')
  if (!ghPat) {
    return json({
      ok: false,
      stage: 'config',
      bug_report_id: record.id,
      error: "Secret GH_PAT absent de l'environnement de la fonction.",
    }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // ── 3. repository_dispatch vers GitHub ──
  const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`

  let ghResponse: Response
  try {
    ghResponse = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghPat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'isaly-trigger-bug-fix',
      },
      body: JSON.stringify({
        event_type: DISPATCH_EVENT,
        client_payload: {
          bug_report_id: record.id,
          description: record.description,
          page_url: record.page_url,
          user_agent: record.user_agent,
          browser_context: record.browser_context,
        },
      }),
    })
  } catch (e) {
    // Panne réseau / DNS : rien n'a été déclenché, le ticket reste 'nouveau'.
    return json({
      ok: false,
      stage: 'github_dispatch',
      bug_report_id: record.id,
      error: `Appel GitHub impossible : ${e instanceof Error ? e.message : String(e)}`,
    }, 502)
  }

  // GitHub répond 204 No Content quand le dispatch est accepté.
  if (ghResponse.status !== 204) {
    const detail = excerpt(await ghResponse.text().catch(() => ''))
    return json({
      ok: false,
      stage: 'github_dispatch',
      bug_report_id: record.id,
      github_status: ghResponse.status,
      error: `GitHub a refusé le repository_dispatch (HTTP ${ghResponse.status}).`,
      github_response: detail || null,
    }, 502)
  }

  // ── 4. Bascule du ticket en 'en_analyse' ──
  // Le dispatch est parti : à partir d'ici, un échec ne doit PAS renvoyer un
  // code d'erreur. Supabase rejouerait le webhook et redéclencherait le
  // workflow GitHub une seconde fois. On signale donc l'anomalie dans le corps
  // de la réponse, avec un code 200.
  if (!supabaseUrl || !serviceRoleKey) {
    return json({
      ok: true,
      bug_report_id: record.id,
      dispatched: true,
      status_updated: false,
      warning: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent : statut laissé à « nouveau ».',
    }, 200)
  }

  // Filtre status=eq.nouveau : si le webhook est rejoué ou si un admin a déjà
  // fait avancer le ticket, on ne le ramène pas en arrière (0 ligne modifiée,
  // ce qui n'est pas une erreur).
  const patchUrl =
    `${supabaseUrl}/rest/v1/bug_reports?id=eq.${encodeURIComponent(record.id)}&status=eq.nouveau`

  try {
    const patch = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'en_analyse' }),
    })

    if (!patch.ok) {
      const detail = excerpt(await patch.text().catch(() => ''))
      return json({
        ok: true,
        bug_report_id: record.id,
        dispatched: true,
        status_updated: false,
        warning: `Mise à jour du statut refusée (HTTP ${patch.status}).`,
        supabase_response: detail || null,
      }, 200)
    }
  } catch (e) {
    return json({
      ok: true,
      bug_report_id: record.id,
      dispatched: true,
      status_updated: false,
      warning: `Mise à jour du statut impossible : ${e instanceof Error ? e.message : String(e)}`,
    }, 200)
  }

  // ── 5. Succès complet ──
  return json({
    ok: true,
    bug_report_id: record.id,
    dispatched: true,
    event_type: DISPATCH_EVENT,
    status_updated: true,
    status: 'en_analyse',
  }, 200)
})
