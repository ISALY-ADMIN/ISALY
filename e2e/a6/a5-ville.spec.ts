import { test, expect } from '@playwright/test'

test('A5 — /auth/register?ville=paris consomme le paramètre', async ({ page }) => {
  await page.goto('/auth/register?ville=paris')
  const banner = page.getByText(/Une alerte .*sera créée/)
  await expect(banner).toBeVisible({ timeout: 10_000 })
  console.log('[A5] bandeau =', (await banner.innerText()).replace(/\s+/g, ' '))

  // slug inconnu → nom dérivé du slug, pas de crash
  await page.goto('/auth/register?ville=saint-etienne')
  console.log('[A5] saint-etienne =', (await page.getByText(/Une alerte .*sera créée/).innerText()).replace(/\s+/g, ' '))

  // sans paramètre → pas de bandeau
  await page.goto('/auth/register')
  await expect(page.getByText(/Une alerte .*sera créée/)).toHaveCount(0)
  console.log('[A5] sans ville → aucun bandeau OK')
})

test('A5 — le CTA de /colocation/paris pointe bien vers ?ville=', async ({ page }) => {
  await page.goto('/colocation/paris')
  const hrefs = await page.locator('a[href*="/auth/register"]').evaluateAll(
    els => els.map(e => (e as HTMLAnchorElement).getAttribute('href'))
  )
  console.log('[A5] liens register depuis /colocation/paris =', JSON.stringify(hrefs))
  expect(hrefs.some(h => h?.includes('ville=paris'))).toBe(true)
})
