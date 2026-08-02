/*
 * Service worker.
 *
 * The whole point of this app is that it works on a phone that is roaming and
 * has given up. Two caches, two strategies:
 *
 *   app    — the shell and its build assets. Cache first, because they are
 *            content-hashed and a network round trip buys nothing.
 *   tiles  — map imagery. Cache first as well, capped, because a tile you
 *            already looked at is worth keeping and a tile you have not is not
 *            worth blocking on.
 *
 * Everything else — the trip data, distances, the running order, the advisor —
 * is compiled into the bundle and needs no network at all.
 */

const VERSION = 'v2';
const APP_CACHE = `batam-app-${VERSION}`;
const TILE_CACHE = `batam-tiles-${VERSION}`;
const MAX_TILES = 700;

/**
 * The routes that must open with no signal.
 *
 * This said `/lines` until the rework renamed the section to `/days`, so the
 * one screen the app is built around was the one screen not in the offline
 * shell. Anything listed here that 404s is skipped silently on install, which
 * is why that went unnoticed.
 */
const SHELL = ['/', '/map', '/days', '/places', '/costs', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      // Individually, so one 404 does not fail the whole install.
      .then((cache) =>
        Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_CACHE && key !== TILE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isTile = (url) =>
  url.hostname.includes('basemaps.cartocdn.com') || url.pathname.endsWith('.pbf');

async function trimTiles() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  if (keys.length <= MAX_TILES) return;
  // Oldest first — insertion order is good enough for imagery.
  await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isTile(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
            trimTiles();
          }
          return response;
        } catch {
          // No tile, no error page — the map draws paper where it would be.
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigations: network first so a fresh deploy is picked up, falling back to
  // whatever shell we have. An app that opens stale beats one that does not.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/')) ??
          new Response('Offline', { status: 503 })),
    );
    return;
  }

  // Build assets under /_next/static are content-hashed: a given URL can only
  // ever mean one thing, so a cache hit is always correct and always current.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else same-origin keeps a stable URL across deploys — the icons,
  // the manifest, the worker's own siblings. Cache-first on those meant a
  // redeploy could never dislodge what an old visit had already stored, which
  // is how a phone ends up running last month's app off a fresh deployment.
  // Serve the copy we have, then quietly replace it for next time.
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);
      return hit ?? (await fresh) ?? new Response('', { status: 504, statusText: 'Offline' });
    }),
  );
});
