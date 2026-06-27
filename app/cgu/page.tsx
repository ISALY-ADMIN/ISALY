'use client'
import Link from 'next/link'

export default function CguPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>
      <nav style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#fff', textDecoration: 'none', padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', transition: 'background 0.15s, border-color 0.15s', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >← Retour</Link>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>ISALY</span>
        <div style={{ width: '60px' }} />
      </nav>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>LÉGAL</div>
        <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '48px', letterSpacing: '-1px' }}>Conditions Générales d&apos;Utilisation</h1>
        {[
          { title: '1. Objet', content: "Les présentes CGU définissent les conditions d'utilisation de la plateforme ISALY, service de mise en relation pour la colocation. En créant un compte, vous acceptez ces conditions." },
          { title: '2. Inscription', content: "L'accès au service nécessite la création d'un compte. Vous vous engagez à fournir des informations exactes et à les maintenir à jour. Tout compte créé avec de fausses informations peut être supprimé." },
          { title: '3. Utilisation du service', content: "ISALY est une plateforme de mise en relation. Nous ne sommes pas responsables des accords conclus entre utilisateurs. Vous vous engagez à ne pas utiliser le service à des fins illicites ou contraires aux bonnes mœurs." },
          { title: '4. Contenu utilisateur', content: "Vous êtes responsable des informations publiées sur votre profil et vos annonces. Tout contenu inapproprié, offensant ou trompeur entraînera la suppression du compte." },
          { title: '5. Tarification', content: "Le service de base est gratuit. Les options payantes (mise en avant d'annonces, assurance dossier) font l'objet d'une facturation clairement indiquée avant tout achat." },
          { title: '6. Résiliation', content: "Vous pouvez supprimer votre compte à tout moment depuis les paramètres. ISALY se réserve le droit de suspendre tout compte en cas de violation des présentes CGU." },
          { title: '7. Droit applicable', content: "Les présentes CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux français." },
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
