import { createClient } from '@/lib/supabase/client'

export const VAULT_CATEGORIES = [
  { id: 'bail', label: 'Bail', icon: '📄' },
  { id: 'quittances', label: 'Quittances', icon: '🧾' },
  { id: 'etat_des_lieux', label: 'État des lieux', icon: '🔑' },
  { id: 'identite', label: "Pièce d'identité", icon: '🪪' },
  { id: 'revenus', label: 'Justificatifs revenus', icon: '💶' },
  { id: 'autres', label: 'Autres', icon: '📎' },
] as const

export type VaultCategory = (typeof VAULT_CATEGORIES)[number]['id']

export interface VaultDoc {
  id: string
  user_id: string
  lease_id: string | null
  name: string
  category: VaultCategory
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

/** Upload un fichier dans le bucket privé "vault" + insère la ligne documents (RLS owner-only). */
export async function depositToVault(
  file: Blob,
  name: string,
  category: VaultCategory,
  opts?: { leaseId?: string | null; mimeType?: string }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const safe = name.replace(/[^\w.\-àâäéèêëîïôöùûüç ]/gi, '').replace(/\s+/g, '-').slice(0, 80) || 'document'
  const path = `${user.id}/${Date.now()}-${safe}`
  const mime = opts?.mimeType ?? (file instanceof File ? file.type : 'application/pdf')

  const { error: upErr } = await supabase.storage.from('vault').upload(path, file, { contentType: mime })
  if (upErr) return { error: upErr.message }

  const { error: insErr } = await supabase.from('documents').insert({
    user_id: user.id,
    lease_id: opts?.leaseId ?? null,
    name,
    category,
    file_path: path,
    file_size: file.size,
    mime_type: mime,
  })
  if (insErr) {
    await supabase.storage.from('vault').remove([path])
    return { error: insErr.message }
  }
  return { error: null }
}
