import { defineConfig, devices } from '@playwright/test'

/**
 * Mission 18 — tests e2e des flows critiques ISALY.
 * Lancer : npm run test:e2e (démarre le dev server si besoin).
 * Variables optionnelles : E2E_BASE_URL, E2E_USER_EMAIL / E2E_USER_PASSWORD,
 * E2E_LOUEUR_EMAIL / E2E_LOUEUR_PASSWORD (comptes de test Supabase).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
