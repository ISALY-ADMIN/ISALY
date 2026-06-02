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
