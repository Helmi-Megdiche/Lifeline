const CACHE_VERSION = 'lifeline-v1';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for app pages, cache-first for static assets/tiles
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET
  if (request.method !== 'GET') return;

  // Handle map tiles cache-first with short TTL semantics
  if (/tile\.openstreetmap\.org\//.test(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchAndCache = fetch(request, { mode: 'cors' })
          .then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fetchAndCache;
      })
    );
    return;
  }

  // Handle RSC (React Server Components) requests - these are what block navigation
  if (url.searchParams.has('_rsc') || url.pathname.includes('_rsc')) {
    event.respondWith(
      (async () => {
        // If offline, try cache first
        if (!navigator.onLine) {
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // If no cache, return empty RSC payload to allow navigation
          return new Response('{}', {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
        }
        
        // Try network with very short timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 500);
          
          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          // Cache successful responses
          if (response.ok) {
            const resClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, resClone)).catch(() => {});
          }
          
          return response;
        } catch (error) {
          // Network failed - try cache
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // Return empty RSC payload to prevent blocking navigation
          return new Response('{}', {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
        }
      })()
    );
    return;
  }

  // App shell/pages: network-first with offline fallback
  event.respondWith(
    (async () => {
      // If offline, try cache first for faster response
      if (!navigator.onLine) {
        const cached = await caches.match(request);
        if (cached) return cached;
      }
      
      // Try network with short timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
        
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        // Cache successful responses
        if (response.ok) {
          const resClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, resClone)).catch(() => {});
        }
        
        return response;
      } catch (error) {
        // Network failed - try cache
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // For navigation requests, return offline page
        if (request.mode === 'navigate') {
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
        }
        
        // Return a basic response to prevent blocking
        return new Response('Offline', { 
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});


