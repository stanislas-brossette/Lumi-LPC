// Offline shell for the installed app. Phrases and API replies are never cached.
// Voice files keep their names across releases: the cache name carries the app
// and Spellophone versions so that an update replaces them (checked by tests).
const CACHE = 'lumi-0.4.7-spellophone-0.2.1';
// Filled by scripts/build.mjs: the voice must work offline right after the first visit.
const VOICE = [];
const SHELL = ['./', 'speech-sync.mjs', 'sounds.mjs', 'sound-catalog.mjs', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', ...VOICE];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

function fetchAndStore(request) {
  return fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  });
}

self.addEventListener('fetch', event => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // The voice engine and its data are large and versioned: cache first.
  if (url.pathname.includes('/assets/voice/')) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then(hit => hit || fetchAndStore(request)));
    return;
  }
  // The page and its module: network first so updates show, cache when offline.
  event.respondWith(fetchAndStore(request).catch(() => caches.match(request, { ignoreSearch: true })
    .then(hit => hit || (request.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
