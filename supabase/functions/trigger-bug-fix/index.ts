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
//
// Politique de codes de retour — elle pilote les réessais du webhook :
//   • 4xx renvoyé par GitHub (401/403/404…) → cause permanente, réessayer
//     n'y changerait rien : on répond 200 { ok: false } et on bascule le
//     ticket en 'besoin_precision' pour qu'il remonte dans /admin/bug-reports.
//   • Panne réseau ou 5xx GitHub → cause transitoire : on répond 502 pour
//     que Supabase rejoue le webhook.
// ═══════════════════════════════════════════════════════════════════════════

const FUNCTION_VERSION = '2026-08-26.2'
const GITHUB_OWNER = 'ISALY-ADMIN'
const GITHUB_REPO = 'ISALY'
const DISPATCH_EVENT = 'bug-report-created'

// [BOOT] Émis au chargement du module, avant tout traitement de requête.
// Sa présence dans les logs distingue « module non chargé » (aucune ligne)
// de « handler en échec » (cette ligne, puis une ligne [ERROR]).
console.log(`[trigger-bug-fix][BOOT] module chargé, version ${FUNCTION_VERSION}`)

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

/* ───────────────────────────── Journalisation ─────────────────────────────
 * Un seul point de sortie pour les logs : le corps des réponses HTTP part
 * dans le vide (le Database Webhook le jette), tout ce qui doit être
 * diagnosticable plus tard passe forcément par ici.
 * Ne jamais passer GH_PAT ni la clé service_role à ces fonctions.
 * ────────────────────────────────────────────────────────────────────────── */

function logInfo(message: string, extra?: Record<string, unknown>): void {
  console.log(`[trigger-bug-fix][INFO] ${message}${extra ? ` ${JSON.stringify(extra)}` : ''}`)
}

function logError(stage: string, message: string, extra?: Record<string, unknown>): void {
  console.error(`[trigger-bug-fix][ERROR][${stage}] ${message}${extra ? ` ${JSON.stringify(extra)}` : ''}`)
}

/* ──────────────────────── Écriture sur le ticket ────────────────────────
 * PATCH REST avec la clé service_role. Le filtre status=eq.nouveau évite
 * d'écraser une décision prise entre-temps (rejeu du webhook, ou admin qui
 * a déjà fait avancer le ticket) : 0 ligne modifiée n'est pas une erreur.
 * ───────────────────────────────────────────────────────────────────────── */

interface PatchOutcome { ok: boolean; detail: string | null }

async function patchTicket(
  supabaseUrl: string,
  serviceRoleKey: string,
  ticketId: string,
  patch: Record<string, unknown>,
): Promise<PatchOutcome> {
  const url =
    `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/bug_reports` +
    `?id=eq.${encodeURIComponent(ticketId)}&status=eq.nouveau`

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(patch),
    })

    if (!res.ok) {
      const detail = excerpt(await res.text().catch(() => ''))
      return { ok: false, detail: `HTTP ${res.status}${detail ? ` — ${detail}` : ''}` }
    }
    return { ok: true, detail: null }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

/* ───────────────────────────── Handler ───────────────────────────── */

Deno.serve(async (req: Request): Promise<Response> => {
  // ── 0. Garde de méthode ──
  if (req.method !== 'POST') {
    logError('request', `Méthode ${req.method} refusée.`)
    return json({ ok: false, stage: 'request', error: `Méthode ${req.method} non supportée, POST attendu.` }, 405)
  }

  // ── 1. Parsing du payload webhook ──
  let payload: WebhookPayload
  try {
    payload = await req.json() as WebhookPayload
  } catch {
    logError('parse', 'Corps de requête illisible (JSON attendu).')
    return json({ ok: false, stage: 'parse', error: 'Corps de requête illisible (JSON attendu).' }, 400)
  }

  const record = payload?.record

  // Le webhook est censé être câblé sur INSERT / bug_reports, mais on ne fait
  // pas confiance à la configuration du dashboard : on vérifie, et on répond
  // 200 en cas de non-correspondance pour que Supabase ne réessaie pas
  // indéfiniment un évènement qui ne nous concerne pas.
  if (payload?.type !== 'INSERT' || payload?.table !== 'bug_reports') {
    logInfo('Évènement ignoré.', { type: payload?.type ?? null, table: payload?.table ?? null })
    return json({
      ok: true,
      skipped: true,
      reason: `Évènement ignoré (type=${payload?.type ?? 'inconnu'}, table=${payload?.table ?? 'inconnue'}).`,
    }, 200)
  }

  if (!record?.id) {
    logError('parse', 'Payload sans record.id exploitable.')
    return json({ ok: false, stage: 'parse', error: 'Payload sans record.id exploitable.' }, 400)
  }

  const ticketId = record.id
  logInfo('Ticket reçu.', { bug_report_id: ticketId, page_url: record.page_url ?? null })

  // ── 2. Lecture des secrets ──
  const ghPat = Deno.env.get('GH_PAT')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // Les booléens seuls : jamais les valeurs.
  logInfo('Secrets disponibles.', {
    gh_pat: Boolean(ghPat),
    supabase_url: Boolean(supabaseUrl),
    service_role_key: Boolean(serviceRoleKey),
  })

  const canWrite = Boolean(supabaseUrl && serviceRoleKey)

  if (!ghPat) {
    // Cause permanente : inutile de faire rejouer le webhook.
    const reason = "Secret GH_PAT absent de l'environnement de la fonction."
    logError('config', reason, { bug_report_id: ticketId })

    if (canWrite) {
      await patchTicket(supabaseUrl!, serviceRoleKey!, ticketId, {
        status: 'besoin_precision',
        ai_report: `Le déclenchement automatique a échoué avant l'appel à GitHub.\n\n${reason}\n\nConfigurer le secret puis relancer manuellement.`,
      })
    }

    return json({ ok: false, stage: 'config', bug_report_id: ticketId, retryable: false, error: reason }, 200)
  }

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
          bug_report_id: ticketId,
          description: record.description,
          page_url: record.page_url,
          user_agent: record.user_agent,
          browser_context: record.browser_context,
        },
      }),
    })
  } catch (e) {
    // Panne réseau / DNS : cause transitoire, on laisse Supabase réessayer.
    const message = e instanceof Error ? e.message : String(e)
    logError('github_dispatch', `Appel GitHub impossible (réseau) : ${message}`, { bug_report_id: ticketId, retryable: true })
    return json({
      ok: false,
      stage: 'github_dispatch',
      bug_report_id: ticketId,
      retryable: true,
      error: `Appel GitHub impossible : ${message}`,
    }, 502)
  }

  // GitHub répond 204 No Content quand le dispatch est accepté.
  if (ghResponse.status !== 204) {
    const detail = excerpt(await ghResponse.text().catch(() => ''))
    const status = ghResponse.status
    const isClientError = status >= 400 && status < 500

    logError('github_dispatch', `GitHub a refusé le repository_dispatch (HTTP ${status}).`, {
      bug_report_id: ticketId,
      github_status: status,
      github_response: detail || null,
      retryable: !isClientError,
    })

    // 5xx GitHub : panne de leur côté, le rejeu a du sens.
    if (!isClientError) {
      return json({
        ok: false,
        stage: 'github_dispatch',
        bug_report_id: ticketId,
        github_status: status,
        github_response: detail || null,
        retryable: true,
        error: `GitHub indisponible (HTTP ${status}).`,
      }, 502)
    }

    // 4xx : cause permanente (token, droits, dépôt). On l'inscrit sur le
    // ticket pour qu'elle soit lisible dans /admin/bug-reports, et on répond
    // 200 pour couper la boucle de réessais.
    const hint = status === 401
      ? 'Token invalide ou expiré.'
      : status === 403
        ? "Le PAT n'a pas les droits requis (scope `repo`, ou Contents: read & write en fine-grained)."
        : status === 404
          ? "Dépôt introuvable pour ce token — en fine-grained, GitHub renvoie 404 quand l'accès au dépôt n'est pas accordé."
          : 'Requête refusée par GitHub.'

    const report =
      `Le déclenchement automatique a échoué : GitHub a refusé le repository_dispatch (HTTP ${status}).\n\n` +
      `${hint}\n\n` +
      (detail ? `Réponse GitHub : ${excerpt(detail, 800)}\n\n` : '') +
      `Aucune correction n'a été lancée. Corriger le secret GH_PAT, puis relancer le ticket manuellement.`

    if (canWrite) {
      const patched = await patchTicket(supabaseUrl!, serviceRoleKey!, ticketId, {
        status: 'besoin_precision',
        ai_report: report,
      })
      if (!patched.ok) {
        logError('ticket_update', `Impossible d'inscrire l'échec sur le ticket : ${patched.detail}`, { bug_report_id: ticketId })
      } else {
        logInfo('Ticket basculé en besoin_precision.', { bug_report_id: ticketId })
      }
    } else {
      logError('ticket_update', 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent : échec non inscrit sur le ticket.', { bug_report_id: ticketId })
    }

    return json({
      ok: false,
      stage: 'github_dispatch',
      bug_report_id: ticketId,
      github_status: status,
      github_response: detail || null,
      retryable: false,
      status_written: canWrite ? 'besoin_precision' : null,
      error: `GitHub a refusé le repository_dispatch (HTTP ${status}). ${hint}`,
    }, 200)
  }

  logInfo('repository_dispatch accepté par GitHub.', { bug_report_id: ticketId, event_type: DISPATCH_EVENT })

  // ── 4. Bascule du ticket en 'en_analyse' ──
  // Le dispatch est parti : à partir d'ici, un échec ne doit PAS renvoyer un
  // code d'erreur. Supabase rejouerait le webhook et redéclencherait le
  // workflow GitHub une seconde fois. On journalise et on répond 200.
  if (!canWrite) {
    logError('ticket_update', 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent : statut laissé à « nouveau ».', { bug_report_id: ticketId })
    return json({
      ok: true,
      bug_report_id: ticketId,
      dispatched: true,
      status_updated: false,
      warning: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent : statut laissé à « nouveau ».',
    }, 200)
  }

  const patched = await patchTicket(supabaseUrl!, serviceRoleKey!, ticketId, { status: 'en_analyse' })

  if (!patched.ok) {
    logError('ticket_update', `Mise à jour du statut impossible : ${patched.detail}`, { bug_report_id: ticketId })
    return json({
      ok: true,
      bug_report_id: ticketId,
      dispatched: true,
      status_updated: false,
      warning: `Mise à jour du statut impossible : ${patched.detail}`,
    }, 200)
  }

  // ── 5. Succès complet ──
  logInfo('Traitement terminé.', { bug_report_id: ticketId, status: 'en_analyse' })
  return json({
    ok: true,
    bug_report_id: ticketId,
    dispatched: true,
    event_type: DISPATCH_EVENT,
    status_updated: true,
    status: 'en_analyse',
  }, 200)
})
