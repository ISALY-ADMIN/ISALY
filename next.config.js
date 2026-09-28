/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  /**
   * Dashboard v2 : les anciennes routes de l'espace connecté restent en place
   * (fichiers conservés) mais redirigent vers leur nouvel onglet. Temporaire
   * (307) pour pouvoir revenir en arrière. La chaîne de requête d'origine est
   * transmise telle quelle par Next.js.
   */
  async redirects() {
    return [
      // Trouver : Rechercher, Carte et Favoris deviennent des vues.
      { source: '/app/recherche', destination: '/app/swipe?vue=liste', permanent: false },
      { source: '/app/carte', destination: '/app/swipe?vue=carte', permanent: false },
      { source: '/app/favoris', destination: '/app/swipe?vue=favoris', permanent: false },
      // Ma maison : déclarer un problème, coffre-fort, quittances, bail, colocataires.
      // Côté bailleur, Ma maison renvoie vers l'onglet équivalent de Baux.
      { source: '/app/declarer-probleme', destination: '/app/maison?onglet=signalements', permanent: false },
      { source: '/app/documents', destination: '/app/maison?onglet=coffre', permanent: false },
      { source: '/app/loyers', destination: '/app/maison?onglet=loyers', permanent: false },
      { source: '/app/bail', destination: '/app/maison?onglet=bail', permanent: false },
      { source: '/app/dashboard', destination: '/app/maison', permanent: false },
      { source: '/app/colocataires', destination: '/app/maison', permanent: false },
      // Mon profil absorbe Mon dossier.
      { source: '/app/dossier', destination: '/app/profil?section=dossier', permanent: false },
      // Baux absorbe Mes locataires.
      { source: '/app/locataires', destination: '/app/baux?onglet=colocataires', permanent: false },
      // Candidatures : un seul écran, filtré par annonce.
      { source: '/app/mes-annonces/:id/candidatures', destination: '/app/candidatures?annonce=:id', permanent: false },
      // Mises en avant : 1, 3 ou 7 jours depuis Annonces.
      { source: '/app/boost', destination: '/app/mes-annonces', permanent: false },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/landing.html' }],
    }
  },
}

module.exports = nextConfig
