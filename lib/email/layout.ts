/**
 * Mise en page commune des e-mails ISALY (site v2), reprise de mailWrap dans
 * design/isaly-site-v2.html : tableaux et styles en ligne, compatibles avec
 * Gmail, Outlook et Apple Mail. Aucun emoji.
 *
 * Logo : version texte de la maquette (carré violet « i » et « isaly »). Aucun
 * PNG du logo A n'existe dans public/ et sharp n'est pas installé : à
 * remplacer par <img src="https://isaly.fr/email/logo.png"> quand le fichier
 * sera exporté (96 × 96 px).
 */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'

const MF = 'font-family:Arial,Helvetica,sans-serif'

/** Échappe une valeur saisie par un utilisateur avant de l'insérer dans le HTML. */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Titre principal. */
export function mH(t: string): string {
  return `<h1 style="margin:0 0 14px;${MF};font-size:24px;line-height:1.2;color:#12102E">${t}</h1>`
}

/** Paragraphe. */
export function mP(t: string): string {
  return `<p style="margin:0 0 14px;${MF};font-size:15px;line-height:1.6;color:#48437A">${t}</p>`
}

/** Petite ligne grise (mentions, expiration du lien). */
export function mSmall(t: string): string {
  return `<p style="margin:0 0 14px;${MF};font-size:13px;line-height:1.6;color:#686394">${t}</p>`
}

/** Bouton violet, un seul par e-mail. */
export function mBtn(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:#6C4DFF;border-radius:999px"><a href="${href}" style="display:inline-block;padding:14px 26px;${MF};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none">${label}</a></td></tr></table>`
}

/** Encadré violet clair (information mise en avant). */
export function mBox(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4FF;border-radius:14px;margin:0 0 14px"><tr><td style="padding:16px 18px;${MF};font-size:14px;line-height:1.6;color:#48437A">${html}</td></tr></table>`
}

/** Libellé et valeur alignés (récapitulatifs : quittance, loyer, bail). */
export function mRows(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #ECE7FF;${MF};font-size:14px;color:#48437A">${k}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #ECE7FF;${MF};font-size:14px;color:#12102E;font-weight:bold">${v}</td></tr>`)
    .join('')}</table>`
}

/** Liste d'éléments (annonces, profils) : titre, sous-titre et valeur à droite. */
export function mList(items: { title: string; sub?: string; right?: string; href?: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">${items
    .map(i => {
      const title = i.href ? `<a href="${i.href}" style="color:#12102E;text-decoration:none">${i.title}</a>` : i.title
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #ECE7FF;${MF}"><b style="font-size:15px;color:#12102E">${title}</b>${i.sub ? `<br><span style="font-size:13px;color:#686394">${i.sub}</span>` : ''}</td>${i.right ? `<td align="right" style="padding:12px 0;border-bottom:1px solid #ECE7FF;${MF};font-size:18px;font-weight:bold;color:#5A38F0">${i.right}</td>` : ''}</tr>`
    })
    .join('')}</table>`
}

/**
 * Enveloppe commune : texte d'aperçu caché, logo, carte blanche, pied de page.
 * `pre` : aperçu affiché par la messagerie à côté de l'objet.
 */
export function mailWrap(pre: string, body: string, opts?: { footer?: string }): string {
  const footer = opts?.footer ?? `Tu reçois cet e-mail car tu as un compte ISALY. <a href="${APP_URL}/app/parametres" style="color:#5A38F0">Gérer mes notifications</a><br>ISALY, la plateforme dédiée à la colocation.`
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>ISALY</title></head><body style="margin:0;padding:0;background:#F6F4FF">`
    + `<div style="display:none;max-height:0;overflow:hidden">${pre}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4FF"><tr><td align="center" style="padding:28px 14px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">`
    + `<tr><td style="padding:0 6px 18px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:34px;height:34px;border-radius:10px;background:#6C4DFF;text-align:center;${MF};font-weight:bold;color:#FFFFFF;font-size:16px">i</td><td style="padding-left:10px;${MF};font-size:20px;font-weight:bold;color:#12102E">isaly</td></tr></table></td></tr>`
    + `<tr><td style="background:#FFFFFF;border-radius:20px;padding:32px 28px;border:1px solid #ECE7FF">${body}</td></tr>`
    + `<tr><td style="padding:20px 6px;${MF};font-size:12px;line-height:1.6;color:#686394">${footer}</td></tr>`
    + `</table></td></tr></table></body></html>`
}
