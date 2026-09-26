import { test, expect, type Page } from '@playwright/test'

/**
 * Motion design — accessibilité du mouvement.
 *
 * Avec prefers-reduced-motion: reduce, rien ne doit bouger : les titres
 * animés (RiseText, DropText) sont lisibles dès le premier affichage, sans
 * transformation ni opacité réduite, et aucune animation n'est en cours.
 * Sans préférence, les animations d'entrée doivent être terminées en
 * moins de 1,2 s et laisser le texte à sa place définitive.
 */

async function motionState(page: Page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(
      '.m-rise-word, .m-drop-char, .m-logo-cover',
    ))
    return els.map(el => {
      const cs = getComputedStyle(el)
      return {
        cls: el.className,
        opacity: cs.opacity,
        transform: cs.transform,
        display: cs.display,
        animation: cs.animationName,
        running: el.getAnimations().length,
      }
    })
  })
}

test('mouvement réduit : le titre de l’accueil est visible immédiatement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/Trouve un logement.*personnes.*dedans/)

  // Mesure au plus tôt, sans attendre la fin d'une éventuelle animation.
  const state = await motionState(page)
  expect(state.length).toBeGreaterThan(0)
  for (const s of state) {
    if (s.cls.includes('m-logo-cover')) {
      expect(s.display, 'le calque du logo est masqué').toBe('none')
      continue
    }
    expect(s.opacity, `${s.cls} opaque`).toBe('1')
    expect(s.transform, `${s.cls} sans transformation`).toBe('none')
    expect(s.animation, `${s.cls} sans animation`).toBe('none')
    expect(s.running, `${s.cls} aucune animation en cours`).toBe(0)
  }

  // Les titres de section (révélés au défilement) aussi.
  const h2 = page.getByRole('heading', { name: /tout le monde sait le trouver/ })
  await expect(h2).toBeVisible()
  const words = h2.locator('.m-rise-word')
  await expect(words.first()).toHaveCSS('opacity', '1')
  await expect(words.first()).toHaveCSS('transform', 'none')
})

test('sans préférence : les entrées se terminent en moins de 1,2 s', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1300)

  // Le hero joue au premier affichage (CSS pur) ; les titres plus bas ne
  // partent qu'à leur apparition, ils ne sont donc pas mesurés ici.
  const running = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1 .m-rise-word, h1 .m-drop-char'))
      // fill-mode both : une animation finie reste listée, d'où le filtre.
      .reduce((n, el) => n + el.getAnimations().filter(a => a.playState === 'running').length, 0))
  expect(running, 'animations du titre encore en cours après 1,3 s').toBe(0)
  const h1Words = page.locator('h1 .m-rise-word, h1 .m-drop-char')
  const n = await h1Words.count()
  expect(n).toBeGreaterThan(0)
  for (let i = 0; i < n; i++) {
    await expect(h1Words.nth(i)).toHaveCSS('opacity', '1')
  }
})
