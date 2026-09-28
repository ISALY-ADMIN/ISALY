/**
 * Replis quand le SQL du dashboard v2 n'a pas encore été exécuté.
 *
 * Les migrations de /sql-migrations/ sont collées à la main dans Supabase :
 * entre le déploiement et leur exécution, une colonne ou une table peut
 * manquer. Le code doit alors se replier sur un comportement par défaut,
 * jamais renvoyer une erreur 500.
 *
 *   42703      colonne inexistante (Postgres)
 *   42P01      table inexistante (Postgres)
 *   PGRST204   colonne absente du cache de schéma (PostgREST)
 *   PGRST205   table absente du cache de schéma (PostgREST)
 */
export const MISSING_SCHEMA_CODES = ['42703', '42P01', 'PGRST204', 'PGRST205'] as const

export interface MaybePgError {
  code?: string | null
  message?: string | null
}

export function isMissingSchema(error: MaybePgError | null | undefined): boolean {
  if (!error) return false
  if (error.code && (MISSING_SCHEMA_CODES as readonly string[]).includes(error.code)) return true
  const msg = (error.message ?? '').toLowerCase()
  return (
    (msg.includes('column') && msg.includes('does not exist')) ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    msg.includes('could not find the') ||
    msg.includes('schema cache')
  )
}
