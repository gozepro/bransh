// Bransh — service worker : installation sur l'écran d'accueil et ouverture hors-ligne.
// Il ne touche JAMAIS aux requêtes vers d'autres sites (Supabase, fonds de carte) : seuls les fichiers de l'application sont mis en cache.
const VERSION = 'bransh-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Pages : toujours la version la plus récente si on est en ligne, sinon la dernière version connue
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Fichiers de l'application (noms uniques à chaque version) : cache d'abord
  if (/^\/(assets|icons|brand)\//.test(url.pathname) || /\.(png|jpg|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(VERSION).then((cache) => cache.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
