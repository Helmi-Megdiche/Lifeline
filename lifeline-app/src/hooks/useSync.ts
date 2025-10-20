"use client";
import { useEffect, useState } from 'react';
import { usePouchDB } from './usePouchDB';
import { migrateIndexedDBToPouch } from '@/lib/pouchdb';
import { getAllStatusesFromIDB, deleteStatusByTimestampUser } from '@/lib/indexedDB';
import { useAuth } from '@/contexts/ClientAuthContext';

export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'paused' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const { localDB, remoteDB } = usePouchDB();
  const { user, token, isOnline } = useAuth();

  const manualSync = async () => {
    console.log('=== MANUAL SYNC BUTTON CLICKED ===');
    if (!localDB || !remoteDB) {
      console.error('Manual sync failed: PouchDB not initialized', { localDB: !!localDB, remoteDB: !!remoteDB });
      return;
    }
    
    console.log('Initiating manual sync...');
    console.log('Local DB:', localDB.name);
    console.log('Remote DB URL:', remoteDB.name);
    setSyncStatus('syncing');
    setError(null);
    
    // Test remote connection first
    try {
      console.log('Testing remote connection...');
      const remoteInfo = await remoteDB.info();
      console.log('Remote DB info:', remoteInfo);
    } catch (remoteError) {
      console.error('Remote connection failed:', remoteError);
      throw new Error('Cannot connect to remote database');
    }
    
    try {
      // Migrate any legacy IndexedDB items into Pouch first
      try {
        const migrated = await migrateIndexedDBToPouch(getAllStatusesFromIDB, user?.id);
        if (migrated > 0) {
          console.log(`Migrated ${migrated} legacy IndexedDB statuses to Pouch before sync.`);
        }
      } catch (e) {
        console.warn('Migration step failed before manual sync:', e);
      }

      // Check what's in local DB before sync
      const localDocs = await localDB.allDocs({ include_docs: true });
      console.log('Local docs before sync:', localDocs.rows.length);
      console.log('Local docs:', localDocs.rows.map(r => ({ id: r.id, synced: r.doc?.synced })));
      localDocs.rows.forEach((row: any) => {
        if (row.doc && !row.doc._id.startsWith('_')) {
          console.log('Local doc:', row.doc._id, row.doc.status, row.doc.synced);
        }
      });

      // Check for unsynced documents specifically
      const unsyncedDocs = localDocs.rows.filter((row: any) => 
        row.doc && !row.doc._id.startsWith('_') && row.doc.synced === false
      );
      console.log('Unsynced docs found:', unsyncedDocs.length);
      unsyncedDocs.forEach((row: any) => {
        console.log('Unsynced doc:', row.doc._id, row.doc.status, row.doc.synced);
      });

      console.log('Starting replication TO remote...');
      const replicateTo = await localDB.replicate.to(remoteDB, {
        live: false,
        retry: false,
        batch_size: 10,
        batches_limit: 1
      });
      console.log('Replication TO complete:', replicateTo);
      console.log('Docs written TO remote:', replicateTo.docs_written);
      console.log('Docs read FROM local:', replicateTo.docs_read);
      
      // If no docs were written, just log – avoid forcing unsynced to reduce churn
      if (replicateTo.docs_written === 0) {
        console.log('No docs written to remote during manual sync. Nothing new to push.');
      }

      console.log('Starting replication FROM remote...');
      const replicateFrom = await localDB.replicate.from(remoteDB, {
        live: false,
        retry: false,
        batch_size: 10,
        batches_limit: 1
      });
      console.log('Replication FROM complete:', replicateFrom);
      console.log('Docs written TO local:', replicateFrom.docs_written);
      console.log('Docs read FROM remote:', replicateFrom.docs_read);

      setSyncStatus('idle');
      setLastSyncTime(new Date());
      console.log('Manual sync complete.');
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncStatus('error');
      setError(err);
    }
  };

  // Trigger sync when coming back online
  useEffect(() => {
    console.log('Sync trigger check:', { isOnline, hasLocalDB: !!localDB, hasRemoteDB: !!remoteDB, hasToken: !!token, syncStatus });
    
    if (isOnline && localDB && remoteDB && token) {
      console.log('All conditions met for sync, current status:', syncStatus);
      
      // If we're idle or in error state, trigger sync
      if (syncStatus === 'idle' || syncStatus === 'error') {
        console.log('Came back online, triggering sync...');
        manualSync();
      } else {
        console.log('Sync already in progress, skipping automatic trigger');
      }
    }
  }, [isOnline, localDB, remoteDB, token, syncStatus]);

  useEffect(() => {
    if (!localDB || !remoteDB || !token) return;

    let sync: any;

    const startSync = async () => {
      setSyncStatus('syncing');
      setError(null);
      try {
        // Indexes are ensured during PouchDB init; no need to re-create here
        console.log('PouchDB indexes already ensured at init.');

        const markDocsAsSynced = async (docs: any[]) => {
          try {
            for (const doc of docs) {
              if (doc && !doc._id?.startsWith('_') && doc.synced === false) {
                try {
                  await localDB.put({ ...doc, synced: true });
                } catch (conflictError: any) {
                  // Handle conflicts by getting the latest version and updating
                  if (conflictError.status === 409) {
                    console.log('Conflict detected, resolving for doc:', doc._id);
                    try {
                      const latestDoc = await localDB.get(doc._id);
                      await localDB.put({ ...latestDoc, synced: true });
                    } catch (resolveError) {
                      console.warn('Failed to resolve conflict for doc:', doc._id, resolveError);
                    }
                  } else {
                    console.warn('Error marking doc as synced:', doc._id, conflictError);
                  }
                }
              }
            }
            setLastSyncTime(new Date());
          } catch (e) {
            console.warn('Failed to mark docs as synced:', e);
          }
        };

        sync = localDB.sync(remoteDB, {
          live: true,
          retry: true,
          batch_size: 10, // Smaller batches for better responsiveness
          batches_limit: 1,
          heartbeat: 30000, // Check for changes every 30 seconds instead of default 10s
          back_off_function: (delay: number) => {
            if (delay === 0) return 2000; // Start with 2s delay
            return Math.min(delay * 2, 30000); // Max 30s delay
          },
        })
          .on('change', async (info: any) => {
            console.log('Sync change:', info);
            setSyncStatus('syncing');
            setLastSyncTime(new Date());
            if (info?.direction === 'push' && info?.change?.docs) {
              await markDocsAsSynced(info.change.docs as any[]);
            }
            // Clean legacy IDB for pushed docs
            try {
              const docs = (info?.change?.docs || []) as any[];
              for (const d of docs) {
                if (info.direction === 'push' && d && !d._deleted && typeof d.timestamp === 'number') {
                  await deleteStatusByTimestampUser(d.timestamp, d.userId);
                }
              }
            } catch (e) {
              console.warn('IDB cleanup on change failed:', e);
            }
          })
          .on('paused', () => {
            console.log('Sync paused');
            setSyncStatus('paused');
            setLastSyncTime(new Date());
          })
          .on('active', () => {
            console.log('Sync active');
            setSyncStatus('syncing');
          })
          .on('denied', (err: any) => {
            console.error('Sync denied:', err);
            setSyncStatus('error');
            setError(err);
          })
          .on('complete', (info: any) => {
            console.log('Sync complete:', info);
            setSyncStatus('idle');
            // no global allDocs flip here
          })
          .on('error', (err: any) => {
            console.error('Sync error:', err);
            setSyncStatus('error');
            setError(err);
          });
      } catch (indexError) {
        console.error('Error ensuring PouchDB indexes:', indexError);
        setSyncStatus('error');
        setError(indexError);
      }
    };

    startSync();

    return () => {
      if (sync) {
        console.log('Cancelling PouchDB sync...');
        sync.cancel();
      }
    };
  }, [localDB, remoteDB, token]);

  return { syncStatus, lastSyncTime, error, manualSync };
};