import type { SupabaseClient } from '@supabase/supabase-js'
import { generateQuittancePdf } from './quittancePdf'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'

/**
 * Mission 17 — génération + distribution serveur d'une quittance de loyer.
 * Upload dans le bucket privé "vault" (une copie locataire + une copie bailleur,
 * chemin {user_id}/... pour respecter les policies storage), insertion dans la
 * table documents (category='quittances'), email Resend au locataire avec le PDF
 * en pièce jointe et notification in-app.
 *
 * Nécessite un client service role (appelé depuis cron / API loueur).
 */

export interface QuittanceLease {
  id: string
  tenant_id: string | null
  owner_id: string | null
  address: string | null
  city: string | null
  monthly_rent: number | null
  charges_amount: number | null
}

export type QuittanceResult = 'created' | 'skipped' | 'error'

export async function generateAndDeliverQuittance(
  admin: SupabaseClient,
  lease: QuittanceLease,
  monthDate: Date,
): Promise<QuittanceResult> {
  if (!lease.tenant_id || !lease.owner_id) return 'error'

  const moisLabel = monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const docName = `Quittance — ${moisLabel}`

  // Déjà générée pour ce bail / ce mois ? (idempotent — le cron repasse chaque mois)
  const { data: existing } = await admin
    .from('documents')
    .select('id')
    .eq('lease_id', lease.id)
    .eq('category', 'quittances')
    .eq('name', docName)
    .limit(1)
  if (existing && existing.length > 0) return 'skipped'

  const { data: people } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', [lease.tenant_id, lease.owner_id])
  const owner = people?.find(p => p.id === lease.owner_id)
  const tenant = people?.find(p => p.id === lease.tenant_id)
  if (!owner || !tenant) return 'error'

  const fullName = (p: { first_name: string | null; last_name: string | null }) =>
    `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Non renseigné'

  const doc = generateQuittancePdf({
    bailleurNom: fullName(owner),
    bailleurAdresse: '',
    locataireNom: fullName(tenant),
    adresseLogement: `${lease.address ?? ''}${lease.city ? `, ${lease.city}` : ''}`.trim() || '—',
    moisLabel,
    loyerHC: lease.monthly_rent ?? 0,
    charges: lease.charges_amount ?? 0,
    lieu: lease.city ?? '',
  })
  const pdf = Buffer.from(doc.output('arraybuffer'))
  const monthSlug = `${String(monthDate.getMonth() + 1).padStart(2, '0')}-${monthDate.getFullYear()}`

  // Une copie par partie : les policies du bucket vault sont owner-only ({user_id}/…)
  const recipients = Array.from(new Set([lease.tenant_id, lease.owner_id]))
  for (const uid of recipients) {
    const path = `${uid}/quittance-${lease.id}-${monthSlug}.pdf`
    const { error: upErr } = await admin.storage.from('vault').upload(path, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (upErr) {
      console.error('Quittance upload error:', upErr)
      return 'error'
    }
    await admin.from('documents').insert({
      user_id: uid,
      lease_id: lease.id,
      name: docName,
      category: 'quittances',
      file_path: path,
      file_size: pdf.length,
      mime_type: 'application/pdf',
    })
  }

  // Notification in-app au locataire
  await admin.from('notifications').insert({
    user_id: lease.tenant_id,
    type: 'system',
    title: `Quittance de ${moisLabel} disponible 🧾`,
    body: 'Votre quittance de loyer est disponible dans vos documents.',
    link: '/app/documents',
  })

  // Email Resend au locataire avec le PDF en pièce jointe
  if (tenant.email) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: tenant.email,
        subject: `Votre quittance de ${moisLabel} est disponible — ISALY`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #10B981; margin-bottom: 8px;">Quittance de loyer — ${moisLabel}</h2>
            <p style="color: #374151; line-height: 1.6;">
              Bonjour ${tenant.first_name ?? ''},<br/><br/>
              Votre quittance de loyer pour <strong>${moisLabel}</strong> est disponible.
              Vous la trouverez en pièce jointe et dans votre coffre-fort de documents ISALY.
            </p>
            <a href="${APP_URL}/app/documents" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;">
              Voir mes documents
            </a>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
              Cette quittance est à conserver 3 ans (article 7-1 de la loi n°89-462).
            </p>
          </div>`,
        attachments: [{ filename: `quittance-${monthSlug}.pdf`, content: pdf }],
      })
    } catch (err) {
      console.error('Quittance email error:', err)
    }
  }

  return 'created'
}
