import { test, expect } from '@playwright/test'

const LISTING = '/annonce/007b12d4-6226-47cf-81bc-389d2cd7caaa'

/** Contraste WCAG entre deux couleurs CSS rgb()/rgba(). */
function parse(c: string): [number, number, number] {
  const m = c.match(/(\d+(?:\.\d+)?)/g) ?? []
  return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)]
}
function luminance(c: string) {
  const [r, g, b] = parse(c).map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(fg: string, bg: string) {
  const a = luminance(fg), b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test('A6.1 — la carte de la home charge et ne reste pas sur le placeholder', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  // La section carte est en bas de page : il faut l'atteindre pour la monter
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  // Leaflet est importé dynamiquement : on attend le conteneur rendu
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Chargement de la carte...')).toHaveCount(0)
  const tiles = await page.locator('.leaflet-tile-loaded').count()
  const markers = await page.locator('.leaflet-marker-icon').count()
  console.log(`[A6.1] tuiles chargées=${tiles} marqueurs=${markers}`)
  expect(tiles).toBeGreaterThan(0)
  await page.screenshot({ path: 'e2e/a6/shots/home-map.png', fullPage: false })
})

for (const route of ['/auth/register', '/auth/login']) {
  test(`A6.2 — ${route} : texte saisi lisible (pas de blanc sur clair)`, async ({ page }) => {
    await page.goto(route)
    const email = page.locator('input[type="email"]').first()
    const pwd = page.locator('input[type="password"]').first()
    await email.fill('lisibilite@test.fr')
    await pwd.fill('MotDePasse123')

    for (const [name, el] of [['email', email], ['password', pwd]] as const) {
      const { color, bg } = await el.evaluate(node => {
        const rgba = (c: string): [number, number, number, number] => {
          const m = c.match(/[\d.]+/g) ?? []
          return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0), m[3] === undefined ? 1 : Number(m[3])]
        }
        // Empile les fonds des ancêtres et compose l'alpha : un fond
        // rgba(255,255,255,0.05) sur du #0A0A0A reste sombre à l'écran.
        const stack: [number, number, number, number][] = []
        let p: HTMLElement | null = node as HTMLElement
        while (p) {
          stack.push(rgba(getComputedStyle(p).backgroundColor))
          p = p.parentElement
        }
        stack.push([255, 255, 255, 1]) // canvas navigateur par défaut
        let [r, g, b] = stack[stack.length - 1]
        for (let i = stack.length - 2; i >= 0; i--) {
          const [sr, sg, sb, sa] = stack[i]
          r = sr * sa + r * (1 - sa)
          g = sg * sa + g * (1 - sa)
          b = sb * sa + b * (1 - sa)
        }
        return {
          color: getComputedStyle(node as HTMLElement).color,
          bg: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
        }
      })
      const ratio = contrast(color, bg)
      console.log(`[A6.2] ${route} ${name} → color=${color} bg=${bg} contraste=${ratio.toFixed(2)}:1`)
      expect(ratio, `${route} ${name} illisible (${color} sur ${bg})`).toBeGreaterThan(4.5)
    }
    await page.screenshot({ path: `e2e/a6/shots/${route.replace(/\//g, '_')}.png` })
  })
}

test('A6.3 — badge « +N photos » sur la fiche annonce', async ({ page }) => {
  await page.goto(LISTING)
  const badge = page.getByText(/\+\d+ photos?/).first()
  const present = await badge.count()
  console.log(`[A6.3] badge présent=${present}`)
  if (present) {
    await expect(badge).toBeVisible()
    const box = await badge.boundingBox()
    const before = page.url()
    await badge.click({ force: true })
    await page.waitForTimeout(1200)
    const imgs = await page.locator('img').count()
    const dialog = await page.locator('[role="dialog"], .lightbox, .modal').count()
    console.log(`[A6.3] après clic → url identique=${page.url() === before} dialogues=${dialog} images=${imgs} box=${JSON.stringify(box)}`)
  }
  await page.screenshot({ path: 'e2e/a6/shots/annonce-photos.png' })
})
