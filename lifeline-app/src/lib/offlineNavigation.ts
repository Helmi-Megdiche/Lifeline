/**
 * Offline Navigation Helper
 * Ensures navigation works even when offline by handling failed requests gracefully
 * This module is imported in layout.tsx to initialize offline navigation support
 */

if (typeof window !== 'undefined') {
  // Add error handler for unhandled promise rejections that might block navigation
  window.addEventListener('unhandledrejection', (event) => {
    // If offline and it's a network error, prevent it from blocking navigation
    if (!navigator.onLine) {
      const error = event.reason;
      if (error && (
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.name === 'TypeError' ||
        error.name === 'NetworkError'
      )) {
        // Prevent the error from blocking navigation
        event.preventDefault();
        console.warn('Suppressed offline network error to allow navigation:', error.message);
      }
    }
  });
  
  // Ensure navigation events don't get blocked
  window.addEventListener('error', (event) => {
    // Don't block navigation on network errors when offline
    if (!navigator.onLine && event.error?.message?.includes('fetch')) {
      event.preventDefault();
      console.warn('Suppressed offline fetch error to allow navigation');
    }
  });
}

