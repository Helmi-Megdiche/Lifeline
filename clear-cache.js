// Cache Clearing Script - Run this in your browser console

console.log('🧹 Starting cache clearing process...');

// 1. Clear localStorage
console.log('📦 Clearing localStorage...');
Object.keys(localStorage).forEach(key => {
  if (key.includes('pouchdb') || key.includes('lifeline') || key.includes('auth')) {
    console.log(`  Removing: ${key}`);
    localStorage.removeItem(key);
  }
});

// 2. Clear sessionStorage
console.log('📦 Clearing sessionStorage...');
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('pouchdb') || key.includes('lifeline') || key.includes('auth')) {
    console.log(`  Removing: ${key}`);
    sessionStorage.removeItem(key);
  }
});

// 3. Clear IndexedDB
console.log('🗄️ Clearing IndexedDB...');
if (window.indexedDB) {
  const databases = ['lifeline-local', 'lifeline-local-68f7ae94d8e811421f98b5bc'];
  databases.forEach(dbName => {
    const deleteReq = indexedDB.deleteDatabase(dbName);
    deleteReq.onsuccess = () => console.log(`  Deleted database: ${dbName}`);
    deleteReq.onerror = () => console.log(`  Error deleting database: ${dbName}`);
  });
}

// 4. Clear Service Worker cache
console.log('🔧 Clearing Service Worker cache...');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('  Unregistering service worker:', registration.scope);
      registration.unregister();
    });
  });
}

// 5. Clear Cache API
console.log('💾 Clearing Cache API...');
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      console.log(`  Deleting cache: ${cacheName}`);
      caches.delete(cacheName);
    });
  });
}

console.log('✅ Cache clearing complete! Please refresh the page.');
