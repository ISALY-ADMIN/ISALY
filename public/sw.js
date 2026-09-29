// ── Cache statique (PWA) ───────────────────────────────────────
// v2 : ajout de la page hors ligne (site v2).
const CACHE_NAME = 'isaly-static-v2'
const OFFLINE_URL = '/offline.html'
const PRECACHE = [
  '/app/dashboard-home',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/LOGO_ISALY.png',
  OFFLINE_URL,
]

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // La page hors ligne d'abord, seule : addAll échoue en bloc si une URL échoue.
      .then(cache => cache.add(OFFLINE_URL).catch(() => {}).then(() => cache.addAll(PRECACHE)))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  if (url.origin === self.location.origin) {
    return url.pathname.startsWith('/_next/static/')
      || /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf)$/.test(url.pathname)
  }
  // Google Fonts (stylesheet + fichiers de police)
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
}

self.addEventListener('fetch', function(event) {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Assets statiques : cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached
        return fetch(req).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {})
          }
          return res
        })
      })
    )
    return
  }

  // Dashboard : network-first, fallback cache pour un accès hors-ligne basique
  if (url.origin === self.location.origin && url.pathname === '/app/dashboard-home' && req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match(OFFLINE_URL)).then(r => r || Response.error()))
    )
    return
  }

  // Autres pages du site : réseau d'abord ; sans connexion, page hors ligne
  // (public/offline.html, préchargée à l'installation).
  if (url.origin === self.location.origin && req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then(r => r || Response.error()))
    )
  }
})

// ── Push notifications ─────────────────────────────────────────
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'Nouvelle notification ISALY',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.url || '/app/swipe' },
    actions: [
      { action: 'open', title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ISALY', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/app/swipe')
    )
  }
})
