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
      const initPouch = async () => {
        try {
          const { default: PouchDB } = await import('pouchdb-browser');
          const { default: PouchFind } = await import('pouchdb-find');
          (PouchDB as any).plugin(PouchFind);

          const dbName = user?.id ? `lifeline-local-${user.id}` : 'lifeline-local';
          // Create local database (per user when available)
          const local = new PouchDB(dbName);
          setLocalDB(local);

          // Create remote database connection
          const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || 'http://10.96.15.197:4004/pouch/status';
          if (token) {
            const remote = new PouchDB(REMOTE_DB_URL, {
              fetch: (url: any, opts: any = {}) => {
                const headers = new Headers(opts.headers || {});
                headers.set('Authorization', `Bearer ${token}`);
                headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                headers.set('Pragma', 'no-cache');
                headers.set('Expires', '0');
                
                const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                
                return (PouchDB as any).fetch(urlWithTimestamp, { ...opts, headers });
              }
                } as any);
                setRemoteDB(remote);
                // Publish as active DBs for library helpers
                setActiveDatabases(local, remote);
          } else {
            setRemoteDB(null);
            setActiveDatabases(local, local as any);
          }

          // Ensure indexes exactly once on init
          try {
            await initializeDB(local);
          } catch (e) {
            // Silently fail
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