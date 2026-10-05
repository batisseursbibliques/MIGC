// Service worker MIGC : l'application s'ouvre et se consulte sans connexion.
// Les données (Firestore, authentification) ne passent jamais par ce cache : elles sont gardées par Firestore lui-même.
// VERSION et PRECACHE sont renseignés à chaque construction (scripts/precache.mjs).
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const CACHE = `migc-${VERSION}`
const BIBLES = 'migc-bibles-v1'
const POLICES = 'migc-polices-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE && c !== BIBLES && c !== POLICES).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

const garder = (nom, req, rep) => caches.open(nom).then((c) => c.put(req, rep))

// Cache d'abord, réseau ensuite (et on garde la copie)
const cacheDabord = (req, nom) =>
  caches.match(req).then((hit) => hit || fetch(req).then((rep) => { if (rep.ok) garder(nom, req, rep.clone()); return rep }))

// Réseau d'abord avec délai : sur une mauvaise connexion on bascule vite sur la copie locale
const reseauPuisCache = (req) =>
  new Promise((resolve) => {
    let fini = false
    const secours = () => caches.match('/index.html').then((hit) => resolve(hit || Response.error()))
    const minuteur = setTimeout(() => { if (!fini) { fini = true; secours() } }, 4000)
    fetch(req).then((rep) => {
      if (fini) return
      fini = true; clearTimeout(minuteur)
      if (rep.ok) garder(CACHE, '/index.html', rep.clone())
      resolve(rep)
    }).catch(() => { if (!fini) { fini = true; clearTimeout(minuteur); secours() } })
  })

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Polices : copie gardée pour l'affichage hors ligne
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(POLICES).then((c) => c.match(req).then((hit) => {
        const reseau = fetch(req).then((rep) => { if (rep.ok || rep.type === 'opaque') c.put(req, rep.clone()); return rep }).catch(() => hit)
        return hit || reseau
      })),
    )
    return
  }
  if (url.origin !== self.location.origin) return // Firebase et le reste : réseau direct

  if (url.pathname.startsWith('/bibles/')) { e.respondWith(cacheDabord(req, BIBLES)); return }
  if (req.mode === 'navigate') { e.respondWith(reseauPuisCache(req)); return }
  e.respondWith(cacheDabord(req, CACHE))
})
