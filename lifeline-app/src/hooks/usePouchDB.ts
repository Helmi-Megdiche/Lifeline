"use client";
import { useEffect, useState } from 'react';
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';
import { initializeDB, setActiveDatabases } from '@/lib/pouchdb';
import { useAuth } from '@/contexts/ClientAuthContext';

// Enable PouchDB plugins
PouchDB.plugin(PouchFind);

export const usePouchDB = () => {
  const [isClient, setIsClient] = useState(false);
  const [localDB, setLocalDB] = useState<PouchDB.Database<any> | null>(null);
  const [remoteDB, setRemoteDB] = useState<PouchDB.Database<any> | null>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    setIsClient(true); // Mark as client-side

    if (typeof window !== 'undefined') {
      console.log('Initializing PouchDB on client...');
      const initPouch = async () => {
        try {
          const dbName = user?.id ? `lifeline-local-${user.id}` : 'lifeline-local';
          // Create local database (per user when available)
          const local = new PouchDB(dbName);
          setLocalDB(local);

          // Create remote database connection
          const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || 'http://10.133.250.197:4004/pouch/status';
          console.log('Creating remote PouchDB connection to:', REMOTE_DB_URL);
          if (token) {
            const remote = new PouchDB(REMOTE_DB_URL, {
              fetch: (url: any, opts: any = {}) => {
                const headers = new Headers(opts.headers || {});
                headers.set('Authorization', `Bearer ${token}`);
                return (PouchDB as any).fetch(url, { ...opts, headers });
              }
            } as any);
            setRemoteDB(remote);
            // Publish as active DBs for library helpers
            setActiveDatabases(local, remote);
          } else {
            console.warn('Pouch remote not initialized: missing user token');
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