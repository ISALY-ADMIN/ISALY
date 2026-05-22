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
