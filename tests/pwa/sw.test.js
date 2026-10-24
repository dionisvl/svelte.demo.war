import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function makeCaches(initial = {}) {
  const stores = new Map(Object.entries(initial).map(([n, e]) => [n, new Map(Object.entries(e))]));
  const keyOf = (r) => (typeof r === 'string' ? r : new URL(r.url).pathname);
  const cacheApi = (store) => ({
    put: async (r, res) => { store.set(keyOf(r), res); },
    keys: async () => [...store.keys()].map((k) => ({ url: `https://x.test${k}` })),
    delete: async (r) => store.delete(typeof r === 'string' ? r : new URL(r.url).pathname),
  });
  return {
    stores,
    keys: async () => [...stores.keys()],
    delete: async (n) => stores.delete(n),
    open: async (n) => { if (!stores.has(n)) stores.set(n, new Map()); return cacheApi(stores.get(n)); },
    match: async (r, opts = {}) => {
      const names = opts.cacheName ? [opts.cacheName] : [...stores.keys()];
      for (const n of names) {
        const hit = stores.get(n)?.get(keyOf(r));
        if (hit) return hit;
      }
      return undefined;
    },
  };
}

function load({ caches, fetch }) {
  const handlers = {};
  const self = {
    location: { origin: 'https://x.test' },
    skipWaiting: () => { self.skipped = true; },
    clients: { claim: async () => { self.claimed = true; } },
    addEventListener: (t, h) => { handlers[t] = h; },
  };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, caches, fetch, URL, Promise });
  return { self, handlers };
}

const res = (body) => ({ status: 200, type: 'basic', body, clone() { return this; } });
const req = (path, mode = 'cors', method = 'GET') => ({ url: `https://x.test${path}`, mode, method });

async function dispatchFetch(handlers, request) {
  let promise;
  const waits = [];
  handlers.fetch({ request, respondWith: (p) => { promise = p; }, waitUntil: (p) => waits.push(p) });
  return promise ? await promise : undefined;
}

describe('service worker', () => {
  it('takes over immediately and purges only legacy/own old caches on activate', async () => {
    const caches = makeCaches({
      'my-site-cache-v1': { '/': res('old ui') },
      'sveltewar-v1-assets': {},
      'unrelated-site-cache': { '/': res('keep') },
    });
    const { self, handlers } = load({ caches, fetch: async () => res('n') });
    handlers.install();
    expect(self.skipped).toBe(true);
    let work;
    handlers.activate({ waitUntil: (p) => { work = p; } });
    await work;
    expect(self.claimed).toBe(true);
    expect([...caches.stores.keys()]).toEqual(['unrelated-site-cache']);
  });

  it('serves fresh navigations from the network, not a stale cached shell', async () => {
    const caches = makeCaches({ 'my-site-cache-v1': { '/': res('old ui') } });
    const { handlers } = load({ caches, fetch: async () => res('new ui') });
    const out = await dispatchFetch(handlers, req('/', 'navigate'));
    expect(out.body).toBe('new ui');
  });

  it('falls back to the cached shell when offline', async () => {
    const caches = makeCaches();
    let online = true;
    const { handlers } = load({ caches, fetch: async () => { if (!online) throw new Error('offline'); return res('shell'); } });
    await dispatchFetch(handlers, req('/', 'navigate'));
    online = false;
    const out = await dispatchFetch(handlers, req('/', 'navigate'));
    expect(out.body).toBe('shell');
  });

  it('does not overwrite the cached shell with another navigation', async () => {
    const caches = makeCaches();
    let online = true;
    const pages = { '/': 'shell', '/pwa_start_url.html': 'redirect' };
    const { handlers } = load({
      caches,
      fetch: async (r) => { if (!online) throw new Error('offline'); return res(pages[new URL(r.url).pathname]); },
    });
    await dispatchFetch(handlers, req('/', 'navigate'));
    await dispatchFetch(handlers, req('/pwa_start_url.html', 'navigate'));
    online = false;
    expect((await dispatchFetch(handlers, req('/', 'navigate'))).body).toBe('shell');
  });

  it('caches hashed build assets cache-first', async () => {
    const caches = makeCaches();
    let calls = 0;
    const { handlers } = load({ caches, fetch: async () => { calls++; return res('js'); } });
    await dispatchFetch(handlers, req('/build/index-abc.js'));
    await dispatchFetch(handlers, req('/build/index-abc.js'));
    expect(calls).toBe(1);
  });

  it('ignores non-GET, cross-origin and sw.js requests', async () => {
    const { handlers } = load({ caches: makeCaches(), fetch: async () => res('x') });
    expect(await dispatchFetch(handlers, req('/x', 'cors', 'POST'))).toBeUndefined();
    expect(await dispatchFetch(handlers, { url: 'https://other.test/a.png', mode: 'cors', method: 'GET' })).toBeUndefined();
    expect(await dispatchFetch(handlers, req('/sw.js'))).toBeUndefined();
  });
});
