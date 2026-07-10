import { redirect } from 'next/navigation'

// Route dédiée "Publier une annonce" — délègue au formulaire mutualisé
// /app/annonce (identique en création + édition via ?edit=<id>).
export default function NouvelleAnnoncePage() {
  redirect('/app/annonce')
}
