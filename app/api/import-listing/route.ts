import { NextRequest, NextResponse } from 'next/server'
import { load, type CheerioAPI } from 'cheerio'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toNumber(text: string | undefined | null): number | null {
  if (!text) return null
  const clean = text.replace(/[\s ]/g, '')
  const match = clean.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  const n = Math.round(parseFloat(match[1].replace(',', '.')))
  return isNaN(n) ? null : n
}

function extractSurface(text: string): number | null {
  const match = text.match(/(\d+)\s*m[²2]/)
  return match ? parseInt(match[1]) : null
}

function surfaceFromPage($: CheerioAPI): number | null {
  let found: number | null = null
  $('*').each((_, el) => {
    if (found) return false
    const t = $(el).clone().children().remove().end().text()
    const s = extractSurface(t)
    if (s && s > 5 && s < 1000) found = s
  })
  return found
}

function ogImages($: CheerioAPI): string[] {
  const urls: string[] = []
  $('meta[property="og:image"]').each((_, el) => {
    const u = $(el).attr('content')
    if (u && u.startsWith('http') && urls.length < 8) urls.push(u)
  })
  return urls
}

function detectSource(url: string): string {
  if (url.includes('leboncoin.fr')) return 'Leboncoin'
  if (url.includes('seloger.com')) return 'SeLoger'
  if (url.includes('pap.fr')) return 'PAP'
  if (url.includes('logef.fr')) return 'LogeF'
  return ''
}

// ─── Leboncoin ─────────────────────────────────────────────────────────────────
// Leboncoin is a Next.js app — __NEXT_DATA__ contains all structured ad data.
// DOM selectors are kept as fallback for cases where the JSON path changes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedLbc(obj: any, ...paths: string[][]): any {
  for (const path of paths) {
    let cur = obj
    for (const key of path) {
      if (cur == null) break
      cur = cur[key]
    }
    if (cur != null) return cur
  }
  return null
}

function parseLeboncoin($: CheerioAPI) {
  let title = '', description = '', city = '', neighborhood = '',
    rent: number | null = null, surface: number | null = null, photos: string[] = []

  // ── 1. __NEXT_DATA__ (most reliable) ────────────────────────────────────────
  try {
    const raw = $('script#__NEXT_DATA__').text()
    if (raw) {
      const nd = JSON.parse(raw)
      // Leboncoin nests ad data under several possible paths across versions
      const ad = getNestedLbc(nd,
        ['props', 'pageProps', 'ad'],
        ['props', 'pageProps', 'adView', 'ad'],
        ['props', 'pageProps', 'data', 'ad'],
      )
      if (ad) {
        title = ad.subject || ''
        description = ad.body || ''
        rent = Array.isArray(ad.price) ? ad.price[0] : (ad.price ?? null)

        // Location
        const loc = ad.location || {}
        const rawCity = (loc.city || loc.label_city || '').trim()
        // Strip postal code like "69008" that may trail the city name
        city = rawCity.replace(/\s*\d{5}\s*/g, '').trim()
        neighborhood = (loc.label || '').replace(rawCity, '').replace(/[·,\s]+/g, ' ').trim()
          || (loc.area || '')

        // Surface from attributes array
        const attrs: { key: string; value: string }[] = ad.attributes || ad.attribute_values || []
        const sqAttr = attrs.find(a => a.key === 'square' || a.key === 'surface')
        surface = sqAttr ? parseInt(sqAttr.value) : null

        // Photos — try multiple image URL array paths
        const imgUrls: string[] =
          getNestedLbc(ad, ['images', 'urls_large'], ['images', 'urls'], ['images', 'urls_thumb']) || []
        photos = imgUrls.filter((u: string) => u?.startsWith('http')).slice(0, 8)
      }
    }
  } catch { /* fall through to DOM */ }

  // ── 2. DOM fallback ──────────────────────────────────────────────────────────
  if (!title)
    title = $('h1').first().text().trim()

  if (!rent)
    rent = toNumber($('[data-qa-id="adview_price"]').first().text())

  if (!description) {
    description = $('[data-qa-id="adview_description_container"]').text().trim()
      || $('[data-qa-id="adview_description_text"]').text().trim()
      || $('[data-qa-id="adview_description"]').text().trim()
      || $('[class*="AdviewDescription" i]').text().trim()
  }

  if (!city) {
    const locText = $('[data-qa-id="adview_location_informations"]').text().trim()
    // Format: "Lyon 69008 · 8e Arrondissement" — split on middle-dot
    const parts = locText.split(/\s*[·•]\s*/).map(s => s.trim())
    city = (parts[0] || '').replace(/\s*\d{5}\s*/g, '').trim()
    neighborhood = parts[1] || ''
  }

  if (!surface) {
    $('[data-qa-id*="criteria_item"], [data-qa-id*="attribute"]').each((_, el) => {
      if (!surface) surface = extractSurface($(el).text())
    })
    if (!surface) surface = surfaceFromPage($)
  }

  if (photos.length === 0) {
    // Try page <img> tags (Leboncoin uses lazy-loaded images)
    $('img').each((_, el) => {
      if (photos.length >= 8) return false
      const src = $(el).attr('src') || $(el).attr('data-src') || ''
      // Filter for real photo URLs (exclude icons/logos)
      if (src.startsWith('http') && /\.(jpg|jpeg|webp|png)/i.test(src) && !src.includes('logo')) {
        photos.push(src)
      }
    })
    // Final fallback: og:image
    if (photos.length === 0) photos = ogImages($)
  }

  return { title, description, city, neighborhood, rent, surface, photos }
}

// ─── Other parsers ─────────────────────────────────────────────────────────────

function parseSeLoger($: CheerioAPI) {
  const title = $('[class*="Title"]').first().text().trim() || $('h1').first().text().trim()
  const priceText = $('[data-test="price"]').text() || $('[class*="price" i]').first().text()
  const rent = toNumber(priceText)
  const description = $('[class*="Description"]').first().text().trim()
    || $('[class*="description" i]').first().text().trim()
  const city = $('[data-test="city"]').text().trim() || $('[class*="city" i]').first().text().trim()
  const surface = extractSurface($('[data-test="surface"]').text()) ?? surfaceFromPage($)
  const photos = ogImages($)
  return { title, description, city, neighborhood: '', rent, surface, photos }
}

function parsePAP($: CheerioAPI) {
  const title = $('h1.item-title').text().trim() || $('h1').first().text().trim()
  const rent = toNumber($('.price').first().text())
  const description = $('.description-text').text().trim()
  const city = $('.item-description-title').text().trim()
  const surface = surfaceFromPage($)
  const photos = ogImages($)
  return { title, description, city, neighborhood: '', rent, surface, photos }
}

function parseLogeF($: CheerioAPI) {
  const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim()
  const description = $('meta[property="og:description"]').attr('content') || ''
  const rent = toNumber($('[class*="price" i]').first().text())
  const city = $('[class*="city" i], [class*="ville" i]').first().text().trim()
  const surface = surfaceFromPage($)
  const photos = ogImages($)
  return { title, description, city, neighborhood: '', rent, surface, photos }
}

function parseOG($: CheerioAPI) {
  const title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || ''
  const description = $('meta[property="og:description"]').attr('content') || ''
  const rent = toNumber($('meta[property="og:price:amount"]').attr('content'))
  const photos = ogImages($)
  return { title, description, city: '', neighborhood: '', rent, surface: null, photos }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string
  try {
    ;({ url } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: "Cette URL n'est pas valide" }, { status: 422 })
  }

  const source = detectSource(url)

  let html: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      return NextResponse.json(
        { error: "Impossible d'accéder à cette annonce. Elle est peut-être privée ou supprimée." },
        { status: 502 }
      )
    }
    html = await res.text()
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      { error: isTimeout ? "L'importation prend trop de temps. Réessaie." : "Impossible d'accéder à cette annonce. Elle est peut-être privée ou supprimée." },
      { status: 502 }
    )
  }

  const $ = load(html)

  let parsed: ReturnType<typeof parseOG>
  if (source === 'Leboncoin') parsed = parseLeboncoin($)
  else if (source === 'SeLoger') parsed = parseSeLoger($)
  else if (source === 'PAP') parsed = parsePAP($)
  else if (source === 'LogeF') parsed = parseLogeF($)
  else parsed = parseOG($)

  if (!parsed.title && !parsed.description && !parsed.rent) {
    return NextResponse.json(
      { error: source ? `${source} bloque l'accès automatique. Remplis le formulaire manuellement.` : "Ce site n'est pas encore supporté. Remplis le formulaire manuellement." },
      { status: 422 }
    )
  }

  return NextResponse.json({
    title: parsed.title || '',
    description: parsed.description || '',
    city: parsed.city || '',
    neighborhood: parsed.neighborhood || '',
    rent: parsed.rent ?? null,
    charges: null,
    surface: parsed.surface ?? null,
    rooms: null,
    photos: parsed.photos || [],
    source_url: url,
    source_name: source || 'Web',
  })
}
