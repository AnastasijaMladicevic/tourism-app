const APP_SHELL_CACHE = 'spirego-app-shell-v2';
const STATIC_ASSET_CACHE = 'spirego-static-v2';
const MAP_TILE_CACHE = 'spirego-map-tiles-v1';
const MAP_DATA_CACHE = 'spirego-map-data-v1';
const TILE_HOST_SUFFIX = '.tile.openstreetmap.org';
const APP_SHELL_ROUTES = ['/', '/map'];
const KNOWN_APP_ASSETS = ['/styles.css', '/scripts.js', '/main.js', '/@vite/client', '/favicon.ico'];
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
    const shellCache = await caches.open(APP_SHELL_CACHE);
    const staticCache = await caches.open(STATIC_ASSET_CACHE);

    await Promise.all(APP_SHELL_ROUTES.map((route) => precacheShellRoute(shellCache, staticCache, route)));
    await Promise.all(KNOWN_APP_ASSETS.map((asset) => precacheStaticAsset(staticCache, asset)));
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

  const pathname = url.pathname.toLowerCase();
  if (pathname.startsWith('/api/') || pathname.startsWith('/hubs/')) {
    return false;
  }

  if (request.destination === 'document') {
    return false;
  }

  const destination = request.destination;
  return (
    ['script', 'style', 'worker', 'font', 'image', 'manifest'].includes(destination) ||
    pathname === '/component' ||
    pathname.endsWith('.json') ||
    destination === 'fetch' ||
    destination === ''
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const staticCache = await caches.open(STATIC_ASSET_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await cacheDiscoveredAssetsFromHtml(response.clone(), staticCache);
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

async function precacheShellRoute(shellCache, staticCache, route) {
  try {
    const request = new Request(route, { cache: 'reload' });
    const response = await fetch(request);
    if (response && response.ok) {
      await shellCache.put(route, response.clone());
      await shellCache.put(request, response.clone());
      await cacheDiscoveredAssetsFromHtml(response.clone(), staticCache);
    }
  } catch {
    // Ignore install-time failures; runtime will warm the cache online.
  }
}

async function precacheStaticAsset(cache, assetPath) {
  try {
    const request = new Request(assetPath, { cache: 'reload' });
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await cache.put(assetPath, response.clone());
    }
  } catch {
    // Ignore install-time failures for optional dev assets.
  }
}

async function cacheDiscoveredAssetsFromHtml(response, cache) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return;
  }

  let html = '';
  try {
    html = await response.text();
  } catch {
    return;
  }

  const assetUrls = new Set(KNOWN_APP_ASSETS);
  const attrRegex = /(?:src|href)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(html)) !== null) {
    const rawValue = match[1];
    if (!rawValue || rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
      continue;
    }

    if (rawValue.startsWith('data:') || rawValue.startsWith('blob:')) {
      continue;
    }

    const normalized = rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
    assetUrls.add(normalized);
  }

  await Promise.all([...assetUrls].map((asset) => precacheStaticAsset(cache, asset)));
}
