import { redirect } from 'next/navigation'

// Route dédiée "Éditer une annonce" — délègue au formulaire mutualisé
// /app/annonce?edit=<id> (mêmes champs / photos / validation).
export default function EditerAnnoncePage({ params }: { params: { id: string } }) {
  redirect(`/app/annonce?edit=${encodeURIComponent(params.id)}`)
}
