/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Enable PWA in dev so you can test offline navigation. Set back to true if undesired.
  disable: false,
  fallback: {
    document: '/offline.html',
  },
  runtimeCaching: [
    // Ensure page navigations work offline (after first visit)
    {
      urlPattern: ({ request }: any) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'lifeline-pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: ({ request }: any) => request.destination === 'document' || request.destination === 'style' || request.destination === 'script',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'lifeline-pages-assets',
      },
    },
    {
      urlPattern: ({ url }: any) => url.href.includes('localhost:4000/status') || url.pathname.startsWith('/api/status'),
      handler: 'NetworkOnly',
      options: {
        backgroundSync: {
          name: 'lifeline-status-queue',
          options: {
            maxRetentionTime: 24 * 60, // minutes
          },
        },
      },
    },
    // PouchDB sync endpoints
    {
      urlPattern: ({ url }: any) => url.href.includes('localhost:4000/pouch/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'lifeline-pouch-sync',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1 hour
        backgroundSync: {
          name: 'lifeline-pouch-sync-queue',
          options: {
            maxRetentionTime: 24 * 60, // minutes
          },
        },
      },
    },
    // Best-effort Leaflet tile caching (optional offline support)
    {
      // Match https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
      urlPattern: ({ url }: any) => /^(https?:)\/\/(a|b|c)\.tile\.openstreetmap\.org\/.+\.png$/.test(url.href),
      handler: 'CacheFirst',
      options: {
        cacheName: 'lifeline-osm-tiles',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: ({ request }: any) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'lifeline-images',
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
});
