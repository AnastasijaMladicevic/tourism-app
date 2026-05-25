const APP_SHELL_CACHE = 'spirego-app-shell-v1';
const STATIC_ASSET_CACHE = 'spirego-static-v1';
const MAP_TILE_CACHE = 'spirego-map-tiles-v1';
const MAP_DATA_CACHE = 'spirego-map-data-v1';
const TILE_HOST_SUFFIX = '.tile.openstreetmap.org';
const APP_SHELL_ROUTES = ['/', '/map'];
const MAX_TILE_ENTRIES = 1200;
const MAX_DATA_ENTRIES = 160;
const MAX_STATIC_ASSET_ENTRIES = 220;
const MAP_API_PREFIXES = [
  '/api/destinations',
  '/api/objects',
  '/api/events',
  '/api/activities',
  '/api/localities',
  '/api/regions',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    await Promise.all(APP_SHELL_ROUTES.map((route) => precacheShellRoute(cache, route)));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(
          (name) =>
            name.startsWith('spirego-') &&
            ![APP_SHELL_CACHE, STATIC_ASSET_CACHE, MAP_TILE_CACHE, MAP_DATA_CACHE].includes(name),
        )
        .map((name) => caches.delete(name)),
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isMapTileRequest(url)) {
    event.respondWith(cacheFirstMapTile(request));
    return;
  }

  if (isMapApiRequest(url)) {
    event.respondWith(networkFirstMapData(request));
    return;
  }

  if (isSameOriginStaticAssetRequest(request, url)) {
    event.respondWith(cacheFirstStaticAsset(request));
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = {
      body: event.data.text(),
    };
  }

  const title = payload.title || 'SpireGO';
  const options = {
    body: payload.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.tag || undefined,
    data: {
      actionUrl: payload.actionUrl || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.notification?.data?.actionUrl || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of allClients) {
      if ('focus' in client) {
        if (actionUrl && client.url === actionUrl) {
          await client.focus();
          return;
        }
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(actionUrl);
    }
  })());
});

function isMapTileRequest(url) {
  return (
    url.protocol.startsWith('http') &&
    url.hostname.endsWith(TILE_HOST_SUFFIX) &&
    url.pathname.endsWith('.png')
  );
}

function isMapApiRequest(url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  const pathname = url.pathname.toLowerCase();
  return MAP_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isSameOriginStaticAssetRequest(request, url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  const destination = request.destination;
  return ['script', 'style', 'worker', 'font', 'image'].includes(destination);
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      return response;
    }
  } catch {
    // Fall back to cached shell below.
  }

  const exact = await cache.match(request);
  if (exact) {
    return exact;
  }

  const mapShell = await cache.match('/map');
  if (mapShell) {
    return mapShell;
  }

  const rootShell = await cache.match('/');
  if (rootShell) {
    return rootShell;
  }

  return Response.error();
}

async function cacheFirstStaticAsset(request) {
  const cache = await caches.open(STATIC_ASSET_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    void refreshStaticAssetInBackground(request, cache);
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
    await trimCache(cache, MAX_STATIC_ASSET_ENTRIES);
  }

  return response;
}

async function cacheFirstMapTile(request) {
  const cache = await caches.open(MAP_TILE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    void refreshTileInBackground(request, cache);
    return cached;
  }

  const networkResponse = await fetch(request);
  if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
    await cache.put(request, networkResponse.clone());
    await trimCache(cache, MAX_TILE_ENTRIES);
  }

  return networkResponse;
}

async function refreshTileInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_TILE_ENTRIES);
    }
  } catch {
    // Keep the cached tile when the network is unavailable.
  }
}

async function refreshStaticAssetInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_STATIC_ASSET_ENTRIES);
    }
  } catch {
    // Keep the cached asset when offline.
  }
}

async function networkFirstMapData(request) {
  const cache = await caches.open(MAP_DATA_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_DATA_ENTRIES);
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }

  const overflow = keys.length - maxEntries;
  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

async function precacheShellRoute(cache, route) {
  try {
    const request = new Request(route, { cache: 'reload' });
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(route, response.clone());
      await cache.put(request, response.clone());
    }
  } catch {
    // Ignore install-time failures; runtime will warm the cache online.
  }
}
