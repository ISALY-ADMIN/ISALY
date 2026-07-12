import { test, expect } from '@playwright/test'

/**
 * Mission 18 — 3 flows critiques ISALY.
 *
 * Tests 2 et 3 nécessitent des comptes de test Supabase :
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD       (locataire)
 *   E2E_LOUEUR_EMAIL / E2E_LOUEUR_PASSWORD   (loueur)
 * Ils sont automatiquement skippés si les variables sont absentes.
 */

const USER_EMAIL = process.env.E2E_USER_EMAIL
const USER_PASSWORD = process.env.E2E_USER_PASSWORD
const LOUEUR_EMAIL = process.env.E2E_LOUEUR_EMAIL
const LOUEUR_PASSWORD = process.env.E2E_LOUEUR_PASSWORD

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByPlaceholder('ton@email.com').fill(email)
  await page.getByPlaceholder('Mot de passe').fill(password)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL(/\/app\//, { timeout: 20_000 })
}

// ── Test 1 : Landing → Register → Onboarding (flow inscription) ──
test('inscription : landing → register → onboarding ou confirmation email', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/isaly/i)

  await page.goto('/auth/register')
  const email = `e2e-${Date.now()}@isaly-test.fr`
  await page.getByPlaceholder('Prénom').fill('Test')
  await page.getByPlaceholder('Nom').fill('E2E')
  await page.getByPlaceholder('ton@email.com').fill(email)
  await page.getByPlaceholder(/mot de passe/i).fill('TestE2E-motdepasse-42!')
  await page.getByRole('button', { name: /créer|inscri|commencer/i }).first().click()

  // Deux issues valides selon la config Supabase :
  // confirmation email activée → écran « email envoyé » ; sinon → /onboarding
  await Promise.race([
    page.waitForURL(/\/onboarding/, { timeout: 20_000 }),
    page.getByText(/email|confirme/i).first().waitFor({ state: 'visible', timeout: 20_000 }),
  ])
})

// ── Test 2 : Login → Swipe → Like → appel API vérifié ──
test('swipe : login → like → POST /api/swipe', async ({ page }) => {
  test.skip(!USER_EMAIL || !USER_PASSWORD, 'E2E_USER_EMAIL / E2E_USER_PASSWORD non définis')

  await login(page, USER_EMAIL!, USER_PASSWORD!)
  await page.goto('/app/swipe')

  // La pile se remplit via /api/match
  await page.waitForResponse(r => r.url().includes('/api/match') && r.ok(), { timeout: 20_000 })

  const likeButton = page.getByRole('button', { name: "J'adore" })
  await expect(likeButton).toBeVisible({ timeout: 15_000 })

  const [swipeResponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/swipe') && r.request().method() === 'POST', { timeout: 15_000 }),
    likeButton.click(),
  ])
  expect(swipeResponse.ok()).toBeTruthy()
})

// ── Test 3 : Login loueur → Mes annonces → wizard publication ──
test('annonce : login loueur → mes annonces → ouverture du wizard 5 étapes', async ({ page }) => {
  test.skip(!LOUEUR_EMAIL || !LOUEUR_PASSWORD, 'E2E_LOUEUR_EMAIL / E2E_LOUEUR_PASSWORD non définis')

  await login(page, LOUEUR_EMAIL!, LOUEUR_PASSWORD!)
  await page.goto('/app/mes-annonces')
  await expect(page).toHaveURL(/mes-annonces/)

  // Ouvre le wizard de création (modal fullscreen 5 étapes)
  await page.getByRole('button', { name: /nouvelle annonce|créer|publier/i }).first().click()
  await expect(page.getByText(/étape|adresse|logement/i).first()).toBeVisible({ timeout: 10_000 })
})
