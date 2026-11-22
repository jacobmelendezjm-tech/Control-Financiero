/* Orbe: service worker para abrir la app sin conexión.
   Los datos viven en el navegador (localStorage); aquí solo se guarda la app. */
const CACHE = "orbe-v3"
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/orbe.svg"]

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Páginas: primero la red (para tener siempre la última versión), si no hay, la copia.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          // Cada página con su propia copia (sin los parámetros de la URL).
          if (res.ok) caches.open(CACHE).then((c) => c.put(url.pathname, copy))
          return res
        })
        .catch(() => caches.match(url.pathname).then((r) => r || caches.match("/")).then((r) => r || Response.error()))
    )
    return
  }

  // Archivos estáticos con hash de Next e iconos: primero la copia.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
      )
    )
  }
})

/* ---------- Notificaciones (recordatorios) ---------- */
self.addEventListener("push", (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { body: e.data ? e.data.text() : "" }
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Orbe", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: d.tag || "orbe",
      renotify: false,
      data: { url: d.url || "/" },
      lang: "es",
    })
  )
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  const target = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          c.navigate(target).catch(() => {})
          return c.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
