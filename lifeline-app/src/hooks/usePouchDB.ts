"use client";
import { useEffect, useState } from 'react';
import { initializeDB, setActiveDatabases } from '@/lib/pouchdb';
import { useAuth } from '@/contexts/ClientAuthContext';

export const usePouchDB = () => {
  const [isClient, setIsClient] = useState(false);
  const [localDB, setLocalDB] = useState<PouchDB.Database<any> | null>(null);
  const [remoteDB, setRemoteDB] = useState<PouchDB.Database<any> | null>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    setIsClient(true); // Mark as client-side

    if (typeof window !== 'undefined') {
      console.log('🔧 Initializing PouchDB on client...');
      console.log('👤 User from auth context:', user);
      console.log('🔑 Token from auth context:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('🔐 Token length:', token ? token.length : 0);
      console.log('🔐 Token type:', typeof token);
      
      const initPouch = async () => {
        try {
          const { default: PouchDB } = await import('pouchdb-browser');
          const { default: PouchFind } = await import('pouchdb-find');
          (PouchDB as any).plugin(PouchFind);

          const dbName = user?.id ? `lifeline-local-${user.id}` : 'lifeline-local';
          console.log('💾 Creating local database:', dbName);
          // Create local database (per user when available)
          const local = new PouchDB(dbName);
          setLocalDB(local);
          console.log('✅ Local database created:', local.name);

          // Create remote database connection
          const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || 'http://10.133.250.197:4004/pouch/status';
          console.log('🔗 Creating remote PouchDB connection to:', REMOTE_DB_URL);
          console.log('🔑 Token available:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
          if (token) {
            const remote = new PouchDB(REMOTE_DB_URL, {
              fetch: (url: any, opts: any = {}) => {
                console.log('🌐 Status PouchDB fetch request:', url);
                console.log('📋 Status fetch headers before:', opts?.headers);
                
                const headers = new Headers(opts.headers || {});
                headers.set('Authorization', `Bearer ${token}`);
                
                // Add aggressive cache-busting to prevent stale 401 responses
                headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                headers.set('Pragma', 'no-cache');
                headers.set('Expires', '0');
                
                // Add timestamp to URL to force fresh requests
                const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                
                console.log('📋 Status fetch headers after:', Object.fromEntries(headers.entries()));
                console.log('🔑 Status fetch token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
                
                return (PouchDB as any).fetch(urlWithTimestamp, { ...opts, headers }).then((response: any) => {
                  console.log('📡 Status fetch response status:', response.status, 'for URL:', url);
                  if (!response.ok) {
                    console.log('❌ Status fetch response not ok:', response.status, response.statusText);
                    // Log response body for debugging
                    response.clone().text().then((text: any) => {
                      console.log('📄 Status fetch response body:', text);
                    }).catch((e: any) => console.log('Could not read status fetch response body:', e));
                  }
                  return response;
                }).catch((error: any) => {
                  console.log('🚨 Status fetch error:', error);
                  throw error;
                });
              }
                } as any);
                setRemoteDB(remote);
                console.log('✅ Remote database created with auth');
                
                // Probe the remote to force an authenticated GET and verify connection
                const probeRemote = async () => {
                  try {
                    const info = await remote.info();
                    console.log('✅ Status remote DB info:', info);
                  } catch (e) {
                    console.error('❌ Status remote info() failed:', e);
                  }
                };
                probeRemote();
            // Publish as active DBs for library helpers
            setActiveDatabases(local, remote);
          } else {
            console.warn('❌ Pouch remote not initialized: missing user token');
            console.warn('❌ Token value:', token);
            console.warn('❌ User value:', user);
            setRemoteDB(null);
            setActiveDatabases(local, local as any);
          }

          // Ensure indexes exactly once on init (for single-doc model we still keep these generic)
          try {
            await initializeDB(local);
          } catch (e) {
            console.warn('Index initialization failed:', e);
          }

          console.log('PouchDB initialized successfully');
          console.log('Local DB name:', local.name);
          if (token) {
            console.log('Remote DB initialized');
          }
        } catch (error) {
          console.error('Failed to initialize PouchDB:', error);
        }
      };
      initPouch();
    }

    return () => {
      // Cleanup PouchDB instances if needed
      if (localDB) {
        localDB.close().catch(err => console.error('Error closing localDB:', err));
      }
      if (remoteDB) {
        remoteDB.close().catch(err => console.error('Error closing remoteDB:', err));
      }
    };
  }, [user?.id, token]);

  return { isClient, localDB, remoteDB };
};