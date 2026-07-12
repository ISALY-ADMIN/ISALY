import 'server-only'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client service-role (bypass RLS) pour les opérations admin côté serveur.
 * À n'utiliser qu'après vérification de profiles.is_admin.
 */
export function createAdminClient(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Libellés FR des types de documents de vérification (user_documents.type). */
export const DOC_TYPE_LABELS: Record<string, string> = {
  identity_front: "Pièce d'identité (recto)",
  identity_back: "Pièce d'identité (verso)",
  selfie: 'Selfie de vérification',
  payslip: 'Justificatif de revenus',
  domicile: 'Justificatif de domicile',
  guarantor: 'Document garant',
}

/**
 * Recalcule profiles.cert_level (0→3) à partir des documents VALIDÉS
 * et de la complétion du profil — même formule que app/app/profil :
 *  N1 = profil complet · N2 = N1 + identité vérifiée · N3 = N2 + revenus + domicile vérifiés
 */
export async function recalcCertLevel(admin: SupabaseClient, userId: string): Promise<number> {
  const [{ data: profile }, { data: docs }] = await Promise.all([
    admin.from('profiles')
      .select('email, avatar_url, first_name, last_name, bio, city, budget_max')
      .eq('id', userId).single(),
    admin.from('user_documents').select('type, status').eq('user_id', userId),
  ])

  const verified = new Set(
    (docs ?? []).filter(d => d.status === 'verified').map(d => d.type as string)
  )

  const l1Done = !!profile && !!profile.avatar_url && !!profile.first_name && !!profile.last_name
    && (profile.bio ?? '').trim().length > 20 && !!profile.city && (profile.budget_max ?? 0) > 0
    && !!profile.email
  const idDone = verified.has('identity_front') && verified.has('identity_back')
  const incomeDone = verified.has('payslip') && verified.has('domicile')

  const level = (l1Done && idDone && incomeDone) ? 3 : (l1Done && idDone) ? 2 : l1Done ? 1 : 0
  await admin.from('profiles').update({ cert_level: level }).eq('id', userId)
  return level
}
