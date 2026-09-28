// [HIDDEN] Route redirigée vers /app/baux?onglet=colocataires (dashboard v2)
import { redirect } from 'next/navigation'

export default function LocatairesPage() {
  redirect('/app/baux?tab=locataires')
}
