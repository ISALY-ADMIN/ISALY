import Link from 'next/link'

export default function ConfidentialitePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>
      <nav style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ← Retour
        </Link>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>ISALY</span>
        <div style={{ width: '60px' }} />
      </nav>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>LÉGAL</div>
        <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '48px', letterSpacing: '-1px' }}>Politique de confidentialité</h1>
        {[
          { title: '1. Collecte des données', content: "ISALY collecte les informations que vous nous fournissez lors de votre inscription : nom, prénom, adresse email, et les données de votre questionnaire de compatibilité. Ces informations sont nécessaires au fonctionnement du service de matching." },
          { title: '2. Utilisation des données', content: "Vos données sont utilisées exclusivement pour vous proposer des profils compatibles, gérer votre compte, et améliorer notre algorithme de matching. Nous ne vendons jamais vos données à des tiers." },
          { title: '3. Stockage et sécurité', content: "Vos données sont hébergées sur des serveurs sécurisés (Supabase) situés en Europe. Nous utilisons des protocoles de chiffrement SSL/TLS pour protéger vos données en transit." },
          { title: '4. Vos droits', content: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Vous pouvez exercer ces droits depuis les paramètres de votre compte ou en nous contactant." },
          { title: '5. Cookies', content: "ISALY utilise des cookies fonctionnels nécessaires au bon fonctionnement du service (authentification, préférences). Aucun cookie publicitaire n'est utilisé." },
          { title: '6. Contact', content: "Pour toute question relative à vos données personnelles, vous pouvez nous contacter via le formulaire de contact disponible sur le site." },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '40px', paddingBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>{section.title}</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
          </div>
        ))}
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Dernière mise à jour : juin 2025</p>
      </div>
    </div>
  )
}
