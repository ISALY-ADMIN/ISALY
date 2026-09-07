import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import { computeCompatibility } from '@/lib/matching'

/**
 * GET : compatibilité détaillée entre le visiteur et UNE personne.
 *
 * Sert la section « Compatibilité » de /app/profil-public/[id] : même détail
 * par dimension que la modale du swipe, mais pour un seul colocataire au lieu
 * d'une moyenne.
 *
 * Le calcul est fait ici, jamais dans le navigateur : `matching_data` de la
 * personne consultée ne quitte pas le serveur, seuls les scores en sortent.
 * `available: false` = l'un des deux tests n'est pas complété → l'UI affiche
 * une invitation à passer le quiz, jamais un pourcentage inventé.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.id === params.id) {
    return NextResponse.json({ available: false, reason: 'self' })
  }

  const { data: pair } = await supabase
    .from('profiles')
    .select('id, matching_data')
    .in('id', [user.id, params.id])

  const me = pair?.find(p => p.id === user.id)
  const other = pair?.find(p => p.id === params.id)

  if (!me || !other) {
    return NextResponse.json({ available: false, reason: 'not_found' })
  }

  const compat = computeCompatibility(me.matching_data, other.matching_data)
  if (!compat) {
    return NextResponse.json({ available: false, reason: 'test_incomplete' })
  }

  return NextResponse.json({
    available: true,
    score: compat.score,
    dimensions: compat.dimensions,
    conflicts: compat.conflicts,
  })
}
