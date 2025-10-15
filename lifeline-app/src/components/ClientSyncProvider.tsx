"use client";
import { useEffect, useState } from 'react';
import { usePouchDB } from '@/hooks/usePouchDB';

export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'paused' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const { localDB, remoteDB, isClient } = usePouchDB();

  useEffect(() => {
    let sync: any = undefined;

    const startSync = async () => {
      if (!isClient || !localDB || !remoteDB) {
        console.log('PouchDB not initialized on client, skipping sync setup.');
        return;
      }

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
            setLastSyncTime(new Date());
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
  }, [isClient, localDB, remoteDB]);

  const manualSync = async () => {
    if (!isClient || !localDB || !remoteDB) {
      console.log('PouchDB not initialized on client, skipping manual sync.');
      setError(new Error('PouchDB not ready for manual sync.'));
      return;
    }

    console.log('Initiating manual sync...');
    setSyncStatus('syncing');
    setError(null);
    try {
      await localDB.replicate.to(remoteDB);
      await localDB.replicate.from(remoteDB);
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

export const ClientSyncProvider = ({ children }: { children: React.ReactNode }) => {
  useSync();
  return <>{children}</>;
};