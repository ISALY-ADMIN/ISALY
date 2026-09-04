import { test, expect } from '@playwright/test'

const GA_HOSTS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/

/** Toutes les requêtes réseau vers Google Analytics émises par la page. */
function trackGA(page: import('@playwright/test').Page) {
  const hits: string[] = []
  page.on('request', r => { if (GA_HOSTS.test(r.url())) hits.push(r.url()) })
  return hits
}

test('B3.1 — aucune requête GA avant consentement (contexte vierge)', async ({ page }) => {
  const hits = trackGA(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  await expect(page.getByRole('dialog', { name: /Cookies et mesure d’audience/ })).toBeVisible()
  console.log(`[B3.1] requêtes GA avant choix = ${hits.length}`, hits.slice(0, 3))
  expect(hits, `GA appelé sans consentement : ${hits.join(', ')}`).toHaveLength(0)
})

test('B3.2 — refus : toujours aucune requête GA, et pas de re-demande', async ({ page }) => {
  const hits = trackGA(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Tout refuser' }).click()
  await page.waitForTimeout(2500)
  console.log(`[B3.2] requêtes GA après refus = ${hits.length}`)
  expect(hits).toHaveLength(0)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  console.log(`[B3.2] après rechargement → bandeau réaffiché = non · requêtes GA = ${hits.length}`)
  expect(hits).toHaveLength(0)
})

test('B3.3 — acceptation : GA se charge alors, et seulement alors', async ({ page }) => {
  const hits = trackGA(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  expect(hits, 'GA parti avant le clic').toHaveLength(0)

  await page.getByRole('button', { name: 'Tout accepter' }).click()
  await expect.poll(() => hits.length, { timeout: 15_000 }).toBeGreaterThan(0)
  console.log(`[B3.3] requêtes GA après acceptation = ${hits.length}`, hits[0]?.slice(0, 80))
})

test('B3.4 — « Gérer mes cookies » rouvre le panneau et permet de revenir en arrière', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Tout accepter' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.getByRole('button', { name: 'Gérer mes cookies' }).click()
  const panel = page.getByRole('dialog', { name: 'Gérer mes cookies' })
  await expect(panel).toBeVisible()

  const toggle = panel.locator('input[type="checkbox"]')
  await expect(toggle).toBeChecked()
  await toggle.uncheck()
  await panel.getByRole('button', { name: 'Enregistrer mes choix' }).click()

  const stored = await page.evaluate(() => window.localStorage.getItem('isaly.cookie-consent.v1'))
  console.log('[B3.4] choix stocké =', stored)
  expect(stored).toContain('"analytics":false')

  // Le refus doit tenir au rechargement
  const hits = trackGA(page)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  console.log(`[B3.4] requêtes GA après retrait du consentement = ${hits.length}`)
  expect(hits).toHaveLength(0)
})
