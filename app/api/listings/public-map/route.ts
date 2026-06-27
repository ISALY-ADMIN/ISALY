import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CITY_COORDS: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522],
  'lyon': [45.7640, 4.8357],
  'marseille': [43.2965, 5.3698],
  'toulouse': [43.6047, 1.4442],
  'nice': [43.7102, 7.2620],
  'nantes': [47.2184, -1.5536],
  'strasbourg': [48.5734, 7.7521],
  'montpellier': [43.6119, 3.8772],
  'bordeaux': [44.8378, -0.5792],
  'lille': [50.6292, 3.0573],
  'rennes': [48.1173, -1.6778],
  'reims': [49.2583, 4.0317],
  'grenoble': [45.1885, 5.7245],
  'dijon': [47.3220, 5.0415],
  'angers': [47.4784, -0.5632],
  'clermont-ferrand': [45.7772, 3.0870],
  'toulon': [43.1242, 5.9280],
  'saint-etienne': [45.4397, 4.3872],
  'le-havre': [49.4944, 0.1079],
  'nimes': [43.8367, 4.3601],
}

function getCoordsForCity(city: string): [number, number] | null {
  const normalized = city.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords
  }
  return null
}

export async function GET() {
  const supabase = createClient()
  const { data } = await supabase
    .from('listings')
    .select('id, title, city, rent, photos')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const listings = (data ?? [])
    .map(l => {
      const coords = getCoordsForCity(l.city ?? '')
      if (!coords) return null
      return {
        id: l.id as string,
        title: l.title as string | null,
        city: l.city as string | null,
        price: l.rent as number | null,
        lat: coords[0],
        lng: coords[1],
        photo: ((l.photos as string[] | null)?.[0]) ?? null,
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)

  return NextResponse.json(listings, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
