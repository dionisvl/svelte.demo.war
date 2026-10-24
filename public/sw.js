const VERSION = 'sveltewar-v2';
const ASSETS = `${VERSION}-assets`;
const SHELL = `${VERSION}-shell`;
const LEGACY = /^my-site-cache-/;
const MAX_ENTRIES = 80;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => LEGACY.test(n) || (n.startsWith('sveltewar-') && ![ASSETS, SHELL].includes(n)))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((k) => cache.delete(k)));
}

async function put(name, request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  const cache = await caches.open(name);
  await cache.put(request, response);
  await trim(cache);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await put(SHELL, request, response.clone());
    return response;
  } catch (error) {
    const cached =
      (await caches.match(request, { cacheName: SHELL })) ?? (await caches.match('/', { cacheName: SHELL }));
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: ASSETS });
  if (cached) return cached;
  const response = await fetch(request);
  await put(ASSETS, request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cached = await caches.match(request, { cacheName: SHELL });
  const refresh = fetch(request)
    .then(async (response) => {
      await put(SHELL, request, response.clone());
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith('/build/')) {
    event.respondWith(cacheFirst(request));
  } else if (/\.(?:png|svg|webp|jpg|json)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
