"use client";
import { useEffect, useState, useRef } from 'react';
import { initializeDB, setActiveDatabases } from '@/lib/pouchdb';
import { useAuth } from '@/contexts/ClientAuthContext';

// Synchronous check for IndexedDB health and corruption flag - runs BEFORE any imports
const checkIndexedDBHealth = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const indexedDBCorrupted = localStorage.getItem('lifeline:indexeddb_corrupted');
    if (indexedDBCorrupted === 'true') {
      return false; // IndexedDB is corrupted, skip PouchDB
    }
  } catch (e) {
    // If we can't read localStorage, assume corruption and skip
    return false;
  }

  if (!window.indexedDB) {
    return false; // IndexedDB not available
  }

  // IndexedDB is available and not marked as corrupted
  return true;
};

export const usePouchDB = () => {
  const [isClient, setIsClient] = useState(false);
  const [localDB, setLocalDB] = useState<PouchDB.Database<any> | null>(null);
  const [remoteDB, setRemoteDB] = useState<PouchDB.Database<any> | null>(null);
  const { user, token } = useAuth();
  const pouchDBInitializedRef = useRef(false);

  // Synchronous check BEFORE useEffect - prevents any PouchDB imports if IndexedDB is corrupted
  const isIndexedDBHealthy = typeof window !== 'undefined' ? checkIndexedDBHealth() : false;

  useEffect(() => {
    setIsClient(true); // Mark as client-side

    // CRITICAL: Skip entire initialization if IndexedDB is not healthy or already initialized
    if (!isIndexedDBHealthy || pouchDBInitializedRef.current) {
      return;
    }

    if (typeof window !== 'undefined') {
      const initPouch = async () => {
        // EARLY EXIT: Check all conditions BEFORE any async operations or imports
        // Don't initialize PouchDB if user is not authenticated
        if (!user || !token) {
          return;
        }

        // Re-check localStorage flag (in case it changed)
        try {
          const indexedDBCorrupted = localStorage.getItem('lifeline:indexeddb_corrupted');
          if (indexedDBCorrupted === 'true') {
            return;
          }
        } catch (e) {
          return;
        }

        try {
          // AGGRESSIVE PRE-CHECK: Test IndexedDB health BEFORE importing PouchDB
          // This prevents the error from being logged by Next.js/Turbopack during import
          let healthCheckPassed = false;
          try {
            const testDbName = 'lifeline-indexeddb-health-check';
            const testDbRequest = window.indexedDB.open(testDbName, 1);
            
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('IndexedDB health check timeout'));
              }, 500); // Shorter timeout
              
              testDbRequest.onsuccess = (event) => {
                clearTimeout(timeout);
                const db = (event.target as IDBOpenDBRequest).result;
                db.close();
                // Delete the test database
                try {
                  window.indexedDB.deleteDatabase(testDbName);
                } catch (e) {
                  // Ignore delete errors
                }
                resolve();
              };
              
              testDbRequest.onerror = (event) => {
                clearTimeout(timeout);
                const error = (event.target as IDBOpenDBRequest).error;
                reject(error);
              };
              
              testDbRequest.onblocked = () => {
                clearTimeout(timeout);
                // If blocked, assume it's working but just busy
                resolve();
              };
            });
            healthCheckPassed = true;
          } catch (healthCheckError: any) {
            // If health check fails, IndexedDB is likely corrupted
            // Mark as corrupted and skip PouchDB import entirely
            if (healthCheckError.name === 'QuotaExceededError' || 
                healthCheckError.name === 'indexed_db_went_bad' ||
                healthCheckError.message?.includes('indexed_db_went_bad') ||
                healthCheckError.message?.includes('QuotaExceededError')) {
              // Mark IndexedDB as corrupted in localStorage to skip future attempts
              try {
                localStorage.setItem('lifeline:indexeddb_corrupted', 'true');
              } catch (e) {
                // Ignore localStorage errors
              }
              // Return immediately - don't attempt import
              return;
            }
            // For other errors, mark as potentially corrupted but still try
            try {
              localStorage.setItem('lifeline:indexeddb_corrupted', 'true');
            } catch (e) {
              // Ignore
            }
            return; // Don't proceed if health check fails
          }

          // Only proceed with import if health check passed
          if (!healthCheckPassed) {
            return;
          }

          // Check storage quota before attempting import
          try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
              const estimate = await navigator.storage.estimate();
              // If quota is very low (< 1MB), skip PouchDB to avoid QuotaExceededError
              if (estimate.quota && estimate.quota < 1024 * 1024) {
                try {
                  localStorage.setItem('lifeline:indexeddb_corrupted', 'true');
                } catch (e) {
                  // Ignore
                }
                return;
              }
            }
          } catch (quotaCheckError: any) {
            // If quota check fails, mark as corrupted and skip
            if (quotaCheckError.name === 'QuotaExceededError') {
              try {
                localStorage.setItem('lifeline:indexeddb_corrupted', 'true');
              } catch (e) {
                // Ignore
              }
              return;
            }
          }

          let PouchDB: any;
          let PouchFind: any;
          
          try {
            const pouchModule = await import('pouchdb-browser');
            PouchDB = pouchModule.default;
          } catch (importError: any) {
            // Silently handle IndexedDB errors - don't log or throw
            if (importError.name === 'QuotaExceededError' || 
                importError.name === 'indexed_db_went_bad' ||
                importError.message?.includes('indexed_db_went_bad') ||
                importError.message?.includes('QuotaExceededError')) {
              // Mark IndexedDB as corrupted in localStorage to skip future attempts
              try {
                localStorage.setItem('lifeline:indexeddb_corrupted', 'true');
              } catch (e) {
                // Ignore localStorage errors
              }
              // Silently return - app can work without PouchDB
              return;
            }
            // Only throw non-IndexedDB errors
            throw importError;
          }
          
          try {
            const findModule = await import('pouchdb-find');
            PouchFind = findModule.default;
            (PouchDB as any).plugin(PouchFind);
          } catch (pluginError: any) {
            // Silently continue without find plugin
            // Don't log IndexedDB-related errors
            if (pluginError.name !== 'QuotaExceededError' && 
                pluginError.name !== 'indexed_db_went_bad' &&
                !pluginError.message?.includes('indexed_db_went_bad') &&
                !pluginError.message?.includes('QuotaExceededError')) {
              // Only log non-IndexedDB errors
              console.warn('Failed to load PouchDB find plugin:', pluginError);
            }
          }

          const dbName = user?.id ? `lifeline-local-${user.id}` : 'lifeline-local';
          
          // Create local database (per user when available) with error handling
          let local: any = null;
          try {
            local = new PouchDB(dbName);
            
            // Set up error handler for quota/corruption errors - silently handle
            local.on('error', (err: any) => {
              // Silently handle IndexedDB errors - don't log
              if (err.name === 'QuotaExceededError' || 
                  err.name === 'indexed_db_went_bad' ||
                  err.message?.includes('indexed_db_went_bad') ||
                  err.message?.includes('QuotaExceededError')) {
                // Silently ignore - app can continue without PouchDB
                return;
              }
            });
            
            setLocalDB(local);
          } catch (dbError: any) {
            // Silently handle IndexedDB errors
            if (dbError.name === 'QuotaExceededError' || 
                dbError.name === 'indexed_db_went_bad' ||
                dbError.message?.includes('indexed_db_went_bad') ||
                dbError.message?.includes('QuotaExceededError')) {
              // Silently return - app can still work without PouchDB
              return;
            }
            throw dbError;
          }

          // Create remote database connection - use dynamic backend URL
          const { getApiUrl } = await import('@/lib/config');
          const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || getApiUrl('/pouch/status');
          if (token && local) {
            try {
              // Enhanced fetch with better error handling for network transitions
              const customFetch = (url: any, opts: any = {}) => {
                // Check if we're online before attempting fetch
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                  return Promise.reject(new Error('Offline'));
                }
                
                const headers = new Headers(opts.headers || {});
                headers.set('Authorization', `Bearer ${token}`);
                headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                headers.set('Pragma', 'no-cache');
                headers.set('Expires', '0');
                
                const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                
                // Add timeout and retry logic for network transitions
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                
                return (PouchDB as any).fetch(urlWithTimestamp, { 
                  ...opts, 
                  headers,
                  signal: controller.signal,
                }).then((response: any) => {
                  clearTimeout(timeoutId);
                  return response;
                }).catch((error: any) => {
                  clearTimeout(timeoutId);
                  // Suppress "Failed to fetch" errors during network transitions
                  if (error.message === 'Failed to fetch' || 
                      error.message === 'NetworkError' ||
                      error.name === 'TypeError' ||
                      error.message?.includes('fetch')) {
                    // Silently handle network errors - don't log during transitions
                    return Promise.reject(new Error('Network unavailable'));
                  }
                  throw error;
                });
              };
              
              const remote = new PouchDB(REMOTE_DB_URL, {
                fetch: customFetch
              } as any);
              
              // Add error handler to suppress network transition errors
              remote.on('error', (err: any) => {
                // Suppress "Failed to fetch" errors during network transitions
                if (err.message === 'Failed to fetch' || 
                    err.message === 'NetworkError' ||
                    err.name === 'TypeError' ||
                    err.message?.includes('fetch')) {
                  // Silently ignore network errors during transitions
                  return;
                }
                // Only log non-network errors
                console.warn('PouchDB remote error:', err);
              });
              
              setRemoteDB(remote);
              // Publish as active DBs for library helpers
              setActiveDatabases(local, remote);
            } catch (remoteError: any) {
              // Silently handle remote connection errors
              setRemoteDB(null);
              setActiveDatabases(local, local as any);
            }
          } else {
            setRemoteDB(null);
            if (local) {
              setActiveDatabases(local, local as any);
            }
          }

          // Ensure indexes exactly once on init
          if (local) {
            try {
              await initializeDB(local);
            } catch (e: any) {
              // Silently fail - indexes may already exist or DB may have issues
              // Don't log IndexedDB-related errors
              if (e.name !== 'QuotaExceededError' && 
                  e.name !== 'indexed_db_went_bad' &&
                  !e.message?.includes('indexed_db_went_bad') &&
                  !e.message?.includes('QuotaExceededError')) {
                // Only log non-IndexedDB errors
                console.warn('Failed to initialize PouchDB indexes:', e);
              }
            }
          }
        } catch (error: any) {
          // Silently handle IndexedDB errors - don't log or throw
          if (error.name === 'QuotaExceededError' || 
              error.name === 'indexed_db_went_bad' ||
              error.message?.includes('indexed_db_went_bad') ||
              error.message?.includes('QuotaExceededError')) {
            // Mark as corrupted for future attempts
            try {
              localStorage.setItem('lifeline:indexeddb_corrupted', 'true');
            } catch (e) {
              // Ignore
            }
            // Silently return - app can continue without PouchDB
            return;
          }
          // Only log non-IndexedDB errors
          console.error('Failed to initialize PouchDB:', error);
          // Don't throw - app can continue without PouchDB
        } finally {
          // Mark as initialized to prevent re-initialization
          pouchDBInitializedRef.current = true;
        }
      };
      
      // Wrap in try-catch to prevent any unhandled errors
      // Also suppress console errors temporarily during initialization
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Temporarily suppress IndexedDB-related console errors and network transition errors
      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('indexed_db_went_bad') || 
            message.includes('QuotaExceededError') ||
            message.includes('QuotaExceeded') ||
            message.includes('PouchDB') ||
            message.includes('Failed to fetch') ||
            message.includes('NetworkError') ||
            args.some(arg => 
              arg?.name === 'QuotaExceededError' || 
              arg?.message?.includes('QuotaExceededError') ||
              arg?.message === 'Failed to fetch' ||
              arg?.name === 'TypeError'
            )) {
          return; // Suppress
        }
        originalError.apply(console, args);
      };
      
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('indexed_db_went_bad') || 
            message.includes('QuotaExceededError') ||
            message.includes('QuotaExceeded') ||
            message.includes('PouchDB') ||
            message.includes('Failed to fetch') ||
            message.includes('NetworkError') ||
            args.some(arg => 
              arg?.name === 'QuotaExceededError' || 
              arg?.message?.includes('QuotaExceededError') ||
              arg?.message === 'Failed to fetch' ||
              arg?.name === 'TypeError'
            )) {
          return; // Suppress
        }
        originalWarn.apply(console, args);
      };
      
      try {
        initPouch().catch(() => {
          // Silently handle any unhandled promise rejections
        }).finally(() => {
          // Restore console methods
          console.error = originalError;
          console.warn = originalWarn;
        });
      } catch (e: any) {
        // Restore console methods
        console.error = originalError;
        console.warn = originalWarn;
        
        // Silently handle any synchronous errors
        if (e.name !== 'QuotaExceededError' && 
            e.name !== 'indexed_db_went_bad' &&
            !e.message?.includes('indexed_db_went_bad') &&
            !e.message?.includes('QuotaExceededError')) {
          // Only log non-IndexedDB errors
          console.error('PouchDB initialization error:', e);
        }
      }
    }

    return () => {
      // Cleanup PouchDB instances if needed - silently handle errors
      if (localDB) {
        localDB.close().catch((err: any) => {
          // Silently handle IndexedDB errors during cleanup
          if (err.name !== 'QuotaExceededError' && 
              err.name !== 'indexed_db_went_bad' &&
              !err.message?.includes('indexed_db_went_bad') &&
              !err.message?.includes('QuotaExceededError')) {
            console.error('Error closing localDB:', err);
          }
        });
      }
      if (remoteDB) {
        remoteDB.close().catch((err: any) => {
          // Silently handle IndexedDB errors during cleanup
          if (err.name !== 'QuotaExceededError' && 
              err.name !== 'indexed_db_went_bad' &&
              !err.message?.includes('indexed_db_went_bad') &&
              !err.message?.includes('QuotaExceededError')) {
            console.error('Error closing remoteDB:', err);
          }
        });
      }
    };
  }, [user?.id, token, isIndexedDBHealthy]);

  return { isClient, localDB, remoteDB };
};