const CACHE_VERSION = 'isaly-v1'
const STATIC_ASSETS = ['/favicon.png', '/LOGO_ISALY.png']

// Never cache these patterns
const NO_CACHE = ['/api/', '/auth/callback', '/_next/data/', 'supabase.co', 'realtime']

function shouldCache(url) {
  return !NO_CACHE.some(pattern => url.includes(pattern))
}

// ── Install: pre-cache static assets ──────────────────────────
self.addEventListener('install', function(event) {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
})

// ── Activate: clean old caches ─────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: network-first for pages/API, cache-first for static ─
self.addEventListener('fetch', function(event) {
  const url = event.request.url

  // Skip non-GET and uncacheable
  if (event.request.method !== 'GET' || !shouldCache(url)) return

  // Static assets: cache-first
  if (url.includes('/_next/static/') || url.includes('/favicon') || url.includes('/LOGO')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Everything else: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
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
