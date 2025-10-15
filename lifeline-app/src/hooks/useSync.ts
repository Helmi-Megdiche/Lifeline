"use client";
import { useEffect, useState } from 'react';
import { usePouchDB } from './usePouchDB';
import { migrateIndexedDBToPouch } from '@/lib/pouchdb';
import { getAllStatusesFromIDB } from '@/lib/indexedDB';
import { useAuth } from '@/contexts/ClientAuthContext';

export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'paused' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const { localDB, remoteDB } = usePouchDB();
  const { user } = useAuth();

  useEffect(() => {
    if (!localDB || !remoteDB) return;

    let sync: any;

    const startSync = async () => {
      setSyncStatus('syncing');
      setError(null);
      try {
        // Ensure indexes are created before starting sync
        await localDB.createIndex({ index: { fields: ['timestamp'] } });
        await localDB.createIndex({ index: { fields: ['synced'] } });
        await localDB.createIndex({ index: { fields: ['userId'] } });
        await localDB.createIndex({ index: { fields: ['synced', 'timestamp'] } });
        await localDB.createIndex({ index: { fields: ['userId', 'timestamp'] } });
        console.log('PouchDB indexes ensured before sync.');

        const markLocalDocsAsSynced = async () => {
          try {
            const result = await localDB.allDocs({ include_docs: true });
            for (const row of (result.rows as any[])) {
              const doc = row.doc as any;
              if (doc && !doc._id.startsWith('_') && doc.synced === false) {
                await localDB.put({ ...doc, synced: true });
              }
            }
            setLastSyncTime(new Date());
          } catch (e) {
            console.warn('Failed to mark local docs as synced:', e);
          }
        };

        sync = localDB.sync(remoteDB, {
          live: true,
          retry: true,
          back_off_function: (delay: number) => {
            if (delay === 0) return 1000;
            return Math.min(delay * 2, 10000);
          },
        })
          .on('change', (info: any) => {
            console.log('Sync change:', info);
            setSyncStatus('syncing');
            setLastSyncTime(new Date());
            markLocalDocsAsSynced();
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
            markLocalDocsAsSynced();
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
  }, [localDB, remoteDB]);

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
      
      // If no docs were written, let's try to force sync by checking what PouchDB thinks needs syncing
      if (replicateTo.docs_written === 0) {
        console.log('No docs written to remote. Checking what PouchDB thinks needs syncing...');
        const changes = await localDB.changes({ since: 0, include_docs: true });
        console.log('Local changes since beginning:', changes.results.length);
        changes.results.forEach((change: any) => {
          if (change.doc && !change.doc._id.startsWith('_')) {
            console.log('Change doc:', change.doc._id, change.doc.synced, change.seq);
          }
        });
        
        // Force mark all status docs as unsynced and try again
        console.log('Forcing all status docs to be unsynced and retrying...');
        for (const row of localDocs.rows) {
          if (row.doc && !row.doc._id.startsWith('_') && row.doc.status) {
            const updatedDoc = { ...row.doc, synced: false };
            await localDB.put(updatedDoc);
            console.log('Forced unsynced:', row.doc._id);
          }
        }
        
        // Try replication again
        console.log('Retrying replication TO remote after forcing unsynced...');
        const retryReplicateTo = await localDB.replicate.to(remoteDB, {
          live: false,
          retry: false,
          batch_size: 10,
          batches_limit: 1
        });
        console.log('Retry replication TO complete:', retryReplicateTo);
        console.log('Retry docs written TO remote:', retryReplicateTo.docs_written);
        console.log('Retry docs read FROM local:', retryReplicateTo.docs_read);
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

  return { syncStatus, lastSyncTime, error, manualSync };
};