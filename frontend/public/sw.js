// Minimal service worker: only here so the home-screen web app can show
// notifications (iOS requires one). No caching, so deploys are never stale.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients[0]
      return open ? open.focus() : self.clients.openWindow("/")
    })
  )
})
