/**
 * Modèles d'e-mails envoyés par Resend. Site v2 : mise en page commune
 * (lib/email/layout.ts, tableaux et styles en ligne) ; mêmes fonctions, mêmes
 * paramètres et mêmes textes qu'avant, sans emoji. Les valeurs saisies par
 * les utilisateurs sont échappées.
 */
import { esc, mBox, mBtn, mH, mP, mRows, mSmall, mailWrap } from './email/layout'

const eur = (n: number) => `${Number(n ?? 0).toLocaleString('fr-FR')} €`

export function confirmEmailTemplate(confirmUrl: string): string {
  return mailWrap(
    'Plus qu’une étape pour activer ton compte',
    mH('Confirme ton adresse e-mail')
      + mP('Bienvenue sur ISALY ! Clique sur le bouton ci-dessous pour activer ton compte et accéder à la plateforme.')
      + mBtn('Confirmer mon adresse', confirmUrl)
      + mSmall('Ce lien expire dans 24 heures. Si tu n’as pas créé de compte, ignore cet e-mail.'),
  )
}

export function identityVerifiedTemplate(firstName: string): string {
  return mailWrap(
    'Ton profil est maintenant certifié',
    mH('Identité vérifiée')
      + mP(`Bonjour ${esc(firstName) || 'toi'} ! Ton identité a été vérifiée par l’équipe ISALY. Ton dossier est maintenant certifié et visible par les propriétaires.`)
      + mBox('<b style="color:#0B7A5E">Ton profil est maintenant certifié.</b>')
      + mBtn('Voir mon dossier', 'https://isaly.fr/app/dossier'),
  )
}

export function identityRejectedTemplate(firstName: string): string {
  return mailWrap(
    'Merci de renvoyer une pièce d’identité lisible',
    mH('Vérification d’identité')
      + mP(`Bonjour ${esc(firstName) || 'toi'}, nous n’avons pas pu vérifier ton identité avec les documents fournis. Merci de soumettre à nouveau une pièce d’identité lisible.`)
      + mBox('Assure-toi que le document est net, non rogné et en cours de validité.')
      + mBtn('Mettre à jour mon dossier', 'https://isaly.fr/app/dossier'),
  )
}

export function rentReminderTemplate(firstName: string, monthLabel: string, amount: number): string {
  return mailWrap(
    `Loyer de ${esc(monthLabel)} en attente`,
    mH('Rappel de loyer')
      + mP(`Bonjour ${esc(firstName) || 'toi'}, ton loyer de <strong>${esc(monthLabel)}</strong> (${eur(amount)}) est toujours en attente. Merci de régulariser ta situation auprès de ton propriétaire dès que possible.`)
      + mRows([[`Loyer de ${esc(monthLabel)}`, eur(amount)]])
      + mBtn('Voir mes loyers', 'https://isaly.fr/app/loyers'),
  )
}

export function maintenanceRequestTemplate(title: string, category: string, description: string, maintenanceUrl: string): string {
  return mailWrap(
    `Nouveau signalement : ${esc(title)}`,
    mH('Nouveau signalement')
      + mP(`Un locataire vient de signaler un problème (<strong>${esc(category)}</strong>) sur l’un de vos biens.`)
      + mBox(`<b style="color:#12102E">${esc(title)}</b><br>${esc(description)}`)
      + mBtn('Voir le signalement', maintenanceUrl),
  )
}

export function bailSignatureRequestTemplate(firstName: string, signUrl: string): string {
  return mailWrap(
    'Ton contrat de location t’attend',
    mH('Votre bail est prêt à signer')
      + mP(`Bonjour ${esc(firstName) || 'toi'}, ton propriétaire a préparé ton contrat de location. Clique ci-dessous pour le consulter et le signer électroniquement.`)
      + mBtn('Consulter et signer', signUrl),
  )
}

export function bailActiveTemplate(firstName: string, address: string, rent: number, bailUrl: string): string {
  return mailWrap(
    'Les deux parties ont signé le contrat',
    mH('Votre bail est actif')
      + mP(`Bonjour ${esc(firstName) || 'toi'}, les deux parties ont signé électroniquement le contrat de location. Le bail est désormais actif : vous pouvez consulter et télécharger votre exemplaire signé à tout moment.`)
      + mRows([['Logement', esc(address)], ['Loyer mensuel', eur(rent)]])
      + mSmall('Signature électronique simple au sens du règlement eIDAS. Une copie signée est conservée pour chaque partie.')
      + mBtn('Voir mon bail signé', bailUrl),
  )
}

export function resetPasswordTemplate(resetUrl: string): string {
  return mailWrap(
    'Lien valable 1 heure',
    mH('Réinitialise ton mot de passe')
      + mP('Tu as demandé à réinitialiser ton mot de passe. Clique ci-dessous pour en choisir un nouveau.')
      + mBtn('Choisir un nouveau mot de passe', resetUrl)
      + mSmall('Ce lien expire dans 1 heure. Si tu n’as pas fait cette demande, ignore cet e-mail : ton mot de passe reste inchangé.'),
  )
}

/** Préavis déposé par un locataire — notification au loueur (C2, migration 39). */
export function preavisDeposeTemplate(
  ownerFirstName: string,
  tenantName: string,
  address: string,
  typeLogementLabel: string,
  delaiMois: number,
  dateFinLabel: string,
  leaseUrl: string,
): string {
  return mailWrap(
    `Fin du bail pour ce locataire : ${esc(dateFinLabel)}`,
    mH('Un préavis a été déposé')
      + mP(`Bonjour ${esc(ownerFirstName) || 'à vous'}, ${esc(tenantName)} vient de déclarer son préavis depuis son espace ISALY.`)
      + mRows([
        ['Logement', esc(address)],
        ['Préavis légal', `Logement ${esc(typeLogementLabel)}, ${delaiMois} mois`],
        ['Fin du bail pour ce locataire', esc(dateFinLabel)],
      ])
      // [HIDDEN] commission de 2,5 % supprimée (dashboard v2) :
      // À cette date, la part de commission ISALY de ce locataire s'arrête automatiquement.
      + mSmall('S’il s’agit d’une colocation, les autres colocataires ne sont pas concernés. Le locataire peut se rétracter tant que cette date n’est pas atteinte : vous en seriez informé.')
      + mBtn('Voir le bail concerné', leaseUrl),
  )
}

/** Préavis rétracté avant sa date d'effet — notification au loueur. */
export function preavisAnnuleTemplate(
  ownerFirstName: string,
  tenantName: string,
  address: string,
  dateFinLabel: string,
  leaseUrl: string,
): string {
  return mailWrap(
    'Le bail se poursuit normalement',
    mH('Un préavis a été retiré')
      + mP(`Bonjour ${esc(ownerFirstName) || 'à vous'}, ${esc(tenantName)} a annulé le préavis qu’il avait déposé. La fin de bail qui était prévue le ${esc(dateFinLabel)} n’aura pas lieu : le bail se poursuit normalement.`)
      + mBox(`<b style="color:#12102E">${esc(address)}</b>`)
      + mBtn('Voir le bail concerné', leaseUrl),
  )
}

/**
 * Dashboard v2 : notification à l'agence partenaire quand un bailleur lui
 * confie un logement. Aucune pièce jointe : le dossier lui-même n'est pas
 * envoyé par ce message (voir le rapport de mise en production).
 */
export function agencyDelegationTemplate(input: {
  agencyName: string
  address: string
  city: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string | null
  tenantName: string | null
}): string {
  const rows: [string, string][] = [
    ['Logement', `${esc(input.address)}, ${esc(input.city)}`],
    ['Bailleur', `${esc(input.ownerName)}, ${esc(input.ownerEmail)}${input.ownerPhone ? `, ${esc(input.ownerPhone)}` : ''}`],
  ]
  if (input.tenantName) rows.push(['Dossier validé', esc(input.tenantName)])
  return mailWrap(
    'Un bailleur ISALY vous confie un logement',
    mH('Un logement vous est confié')
      + mP(`Bonjour ${esc(input.agencyName)}, un bailleur ISALY vous confie la gestion de son logement en colocation.`)
      + mRows(rows)
      + mSmall('L’équipe ISALY vous contacte pour la transmission du dossier. La commission de mise en relation vous est facturée par ISALY, jamais au bailleur ni au locataire.'),
    { footer: 'Vous recevez cet e-mail en tant qu’agence partenaire d’ISALY.<br>ISALY, la plateforme dédiée à la colocation.' },
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
const BASE = `
  <div style="background:#f7f8fa;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4ECBA0,#2AA87C);padding:32px 40px;text-align:center">
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px">ISALY</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">La colocation intelligente</p>
      </div>
      <!-- Body -->
      {{BODY}}
      <!-- Footer -->
      <div style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center">
        <p style="margin:0;font-size:11.5px;color:#9ca3af">
          Tu reçois cet email car tu as créé un compte sur ISALY.<br>
          © 2025 ISALY — Paris, France
        </p>
      </div>
    </div>
  </div>
`

export function confirmEmailTemplate(confirmUrl: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Confirme ton adresse email 📬</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Bienvenue sur ISALY ! Clique sur le bouton ci-dessous pour activer ton compte et accéder à la plateforme.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${confirmUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          ✉️ Confirmer mon email
        </a>
      </div>
      <p style="margin:20px 0 0;font-size:12.5px;color:#9ca3af;text-align:center">
        Ce lien expire dans 24 heures. Si tu n'as pas créé de compte, ignore cet email.
      </p>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function identityVerifiedTemplate(firstName: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Identité vérifiée ✅</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${firstName || 'toi'} ! Ton identité a été vérifiée par l'équipe ISALY.
        Ton dossier est maintenant certifié et visible par les propriétaires.
      </p>
      <div style="background:#ecfdf5;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;color:#059669;font-weight:600">🎉 Ton profil est maintenant certifié !</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="https://isaly.fr/app/dossier"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          Voir mon dossier
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function identityRejectedTemplate(firstName: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Vérification d'identité ❌</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${firstName || 'toi'}, nous n'avons pas pu vérifier ton identité avec les documents fournis.
        Merci de soumettre à nouveau une pièce d'identité lisible.
      </p>
      <div style="background:#fef2f2;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#dc2626">Assure-toi que le document est net, non rogné et en cours de validité.</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="https://isaly.fr/app/dossier"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          Mettre à jour mon dossier
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function rentReminderTemplate(firstName: string, monthLabel: string, amount: number): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Rappel de loyer 📅</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${firstName || 'toi'}, ton loyer de <strong>${monthLabel}</strong> (${amount} €) est toujours en attente.
        Merci de régulariser ta situation auprès de ton propriétaire dès que possible.
      </p>
      <div style="background:#fffbeb;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#92400e">⏳ Loyer de ${monthLabel} en attente — ${amount} €</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="https://isaly.fr/app/loyers"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          Voir mes loyers
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function maintenanceRequestTemplate(title: string, category: string, description: string, maintenanceUrl: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Nouveau signalement 🔧</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
        Un locataire vient de signaler un problème (<strong>${category}</strong>) sur l'un de vos biens.
      </p>
      <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #f3f4f6">
        <p style="margin:0 0 6px;font-size:14px;color:#111827;font-weight:700">${title}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5">${description}</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${maintenanceUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          Voir le signalement
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function bailSignatureRequestTemplate(firstName: string, signUrl: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Votre bail est prêt à signer ✍️</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${firstName || 'toi'}, ton propriétaire a préparé ton contrat de location.
        Clique ci-dessous pour le consulter et le signer électroniquement.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${signUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          ✍️ Consulter et signer
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function bailActiveTemplate(firstName: string, address: string, rent: number, bailUrl: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Votre bail est actif 🎉</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${firstName || 'toi'}, les deux parties ont signé électroniquement le contrat de location.
        Le bail est désormais actif — vous pouvez consulter et télécharger votre exemplaire signé à tout moment.
      </p>
      <div style="background:#f0fdf9;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #c6f0de">
        <p style="margin:0 0 4px;font-size:14px;color:#111827;font-weight:700">${address}</p>
        <p style="margin:0;font-size:13px;color:#6b7280">Loyer mensuel : ${rent} €</p>
      </div>
      <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.5">
        Signature électronique simple au sens du règlement eIDAS. Une copie signée est conservée pour chaque partie.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${bailUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          📄 Voir mon bail signé
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

export function resetPasswordTemplate(resetUrl: string): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Réinitialise ton mot de passe 🔐</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
        Tu as demandé à réinitialiser ton mot de passe. Clique ci-dessous pour en choisir un nouveau.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          🔑 Choisir un nouveau mot de passe
        </a>
      </div>
      <p style="margin:20px 0 0;font-size:12.5px;color:#9ca3af;text-align:center">
        Ce lien expire dans 1 heure. Si tu n'as pas fait cette demande, ignore cet email.
      </p>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

/** Préavis déposé par un locataire — notification au loueur (C2, migration 39). * /
export function preavisDeposeTemplate(
  ownerFirstName: string,
  tenantName: string,
  address: string,
  typeLogementLabel: string,
  delaiMois: number,
  dateFinLabel: string,
  leaseUrl: string,
): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Un préavis a été déposé 📤</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${ownerFirstName || 'à vous'}, ${tenantName} vient de déclarer son préavis depuis son espace ISALY.
      </p>
      <div style="background:#fffbeb;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #fde68a">
        <p style="margin:0 0 6px;font-size:14px;color:#111827;font-weight:700">${address}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280">
          Logement ${typeLogementLabel} — préavis légal de ${delaiMois} mois
        </p>
        <p style="margin:0;font-size:15px;color:#111827;font-weight:700">
          Fin du bail pour ce locataire : ${dateFinLabel}
        </p>
      </div>
      <p style="margin:0 0 20px;font-size:12.5px;color:#9ca3af;line-height:1.55">
        <!-- [HIDDEN] commission de 2,5 % supprimée (dashboard v2) :
        À cette date, la part de commission ISALY de ce locataire s'arrête automatiquement. -->
        S'il s'agit d'une colocation, les autres colocataires ne sont pas concernés.
        Le locataire peut se rétracter tant que cette date n'est pas atteinte — vous en seriez informé.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${leaseUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          📄 Voir le bail concerné
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

/** Préavis rétracté avant sa date d'effet — notification au loueur. * /
export function preavisAnnuleTemplate(
  ownerFirstName: string,
  tenantName: string,
  address: string,
  dateFinLabel: string,
  leaseUrl: string,
): string {
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Un préavis a été retiré ↩️</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${ownerFirstName || 'à vous'}, ${tenantName} a annulé le préavis qu'il avait déposé.
        La fin de bail qui était prévue le ${dateFinLabel} n'aura pas lieu : le bail se poursuit normalement.
      </p>
      <div style="background:#f0fdf9;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #c6f0de">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:700">${address}</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${leaseUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4ECBA0,#2AA87C);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 16px rgba(78,203,160,.35)">
          📄 Voir le bail concerné
        </a>
      </div>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}

/**
 * Dashboard v2 : notification à l'agence partenaire quand un bailleur lui
 * confie un logement. Aucune pièce jointe : le dossier lui-même n'est pas
 * envoyé par ce message (voir le rapport de mise en production).
 * /
export function agencyDelegationTemplate(input: {
  agencyName: string
  address: string
  city: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string | null
  tenantName: string | null
}): string {
  const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const body = `
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700">Un logement vous est confié</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
        Bonjour ${esc(input.agencyName)}, un bailleur ISALY vous confie la gestion de son logement en colocation.
      </p>
      <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #ddd6fe">
        <p style="margin:0 0 6px;font-size:14px;color:#111827;font-weight:700">${esc(input.address)}, ${esc(input.city)}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Bailleur : ${esc(input.ownerName)}, ${esc(input.ownerEmail)}${input.ownerPhone ? `, ${esc(input.ownerPhone)}` : ''}</p>
        ${input.tenantName ? `<p style="margin:0;font-size:13px;color:#6b7280">Dossier validé : ${esc(input.tenantName)}</p>` : ''}
      </div>
      <p style="margin:0;font-size:12.5px;color:#9ca3af;line-height:1.55">
        L'équipe ISALY vous contacte pour la transmission du dossier. La commission de mise en relation vous est facturée par ISALY, jamais au bailleur ni au locataire.
      </p>
    </div>
  `
  return BASE.replace('{{BODY}}', body)
}
*/
