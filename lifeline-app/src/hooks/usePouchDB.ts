"use client";
import { useEffect, useState } from 'react';
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';

// Enable PouchDB plugins
PouchDB.plugin(PouchFind);

export const usePouchDB = () => {
  const [isClient, setIsClient] = useState(false);
  const [localDB, setLocalDB] = useState<PouchDB.Database<any> | null>(null);
  const [remoteDB, setRemoteDB] = useState<PouchDB.Database<any> | null>(null);

  useEffect(() => {
    setIsClient(true); // Mark as client-side

    if (typeof window !== 'undefined' && !localDB && !remoteDB) {
      console.log('Initializing PouchDB on client...');
      const initPouch = async () => {
        try {
          // Create local database
          const local = new PouchDB('lifeline-local');
          setLocalDB(local);

          // Create remote database connection
          const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || 'http://localhost:4004/pouch/status';
          console.log('Creating remote PouchDB connection to:', REMOTE_DB_URL);
          const remote = new PouchDB(REMOTE_DB_URL);
          setRemoteDB(remote);

          console.log('PouchDB initialized successfully');
          console.log('Local DB name:', local.name);
          console.log('Remote DB name:', remote.name);
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
  }, []); // Empty dependency array ensures this runs once on mount

  return { isClient, localDB, remoteDB };
};