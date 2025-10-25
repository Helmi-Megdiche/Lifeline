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

        console.log('🔄 Starting status sync with remote DB...');
        sync = localDB.sync(remoteDB, {
          live: true,
          retry: true,
          back_off_function: (delay: number) => {
            if (delay === 0) return 1000;
            return Math.min(delay * 2, 10000);
          },
        })
          .on('change', (info: any) => {
            console.log('📊 Status sync change:', info);
            setSyncStatus('syncing');
            setLastSyncTime(new Date());
          })
          .on('paused', (err: any) => {
            if (err) {
              console.error('⏸️ Status sync paused with error:', err);
              console.error('⏸️ Paused error details:', JSON.stringify(err, null, 2));
              setSyncStatus('error');
              setError(err);
            } else {
              console.log('⏸️ Status sync paused (idle)');
              setSyncStatus('paused');
              setLastSyncTime(new Date());
            }
          })
          .on('active', () => {
            console.log('🔄 Status sync active');
            setSyncStatus('syncing');
          })
          .on('denied', (err: any) => {
            console.error('❌ Status sync denied:', err);
            console.error('❌ Denied error details:', JSON.stringify(err, null, 2));
            setSyncStatus('error');
            setError(err);
          })
          .on('complete', (info: any) => {
            console.log('✅ Status sync complete:', info);
            setSyncStatus('idle');
            setLastSyncTime(new Date());
          })
          .on('error', (err: any) => {
            console.error('❌ Status sync error:', err);
            console.error('❌ Error details:', JSON.stringify(err, null, 2));
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

    console.log('🔄 Initiating manual status sync...');
    console.log('💾 Local DB:', localDB.name);
    console.log('🌐 Remote DB URL:', remoteDB.name);
    setSyncStatus('syncing');
    setError(null);
    try {
      console.log('📤 Pushing local changes to remote...');
      await localDB.replicate.to(remoteDB);
      console.log('📥 Pulling remote changes to local...');
      await localDB.replicate.from(remoteDB);
      setSyncStatus('idle');
      setLastSyncTime(new Date());
      console.log('✅ Manual status sync complete.');
    } catch (err) {
      console.error('❌ Manual status sync failed:', err);
      console.error('❌ Manual sync error details:', JSON.stringify(err, null, 2));
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