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

        sync = localDB.sync(remoteDB, {
          live: true,
          retry: true,
          back_off_function: (delay: number) => {
            if (delay === 0) return 1000;
            return Math.min(delay * 2, 10000);
          },
        })
          .on('change', () => {
            setSyncStatus('syncing');
            setLastSyncTime(new Date());
          })
          .on('paused', (err: any) => {
            if (err) {
              // Suppress network transition errors
              const isNetworkError = err?.message === 'Failed to fetch' || 
                                    err?.message?.includes('fetch') ||
                                    err?.name === 'TypeError' ||
                                    err?.name === 'NetworkError';
              
              if (!isNetworkError) {
                console.error('Status sync paused with error:', err);
                setSyncStatus('error');
                setError(err);
              } else {
                // Network error - just pause, don't set error state
                setSyncStatus('paused');
                setLastSyncTime(new Date());
              }
            } else {
              setSyncStatus('paused');
              setLastSyncTime(new Date());
            }
          })
          .on('active', () => {
            setSyncStatus('syncing');
          })
          .on('denied', (err: any) => {
            // Suppress network transition errors
            const isNetworkError = err?.message === 'Failed to fetch' || 
                                  err?.message?.includes('fetch') ||
                                  err?.name === 'TypeError' ||
                                  err?.name === 'NetworkError';
            
            if (!isNetworkError) {
              console.error('Status sync denied:', err);
              setSyncStatus('error');
              setError(err);
            }
            // Silently ignore network errors during transitions
          })
          .on('complete', () => {
            setSyncStatus('idle');
            setLastSyncTime(new Date());
          })
          .on('error', (err: any) => {
            // Suppress network transition errors
            const isNetworkError = err?.message === 'Failed to fetch' || 
                                  err?.message?.includes('fetch') ||
                                  err?.name === 'TypeError' ||
                                  err?.name === 'NetworkError';
            
            if (!isNetworkError) {
              console.error('Status sync error:', err);
              setSyncStatus('error');
              setError(err);
            }
            // Silently ignore network errors during transitions
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
        sync.cancel();
      }
    };
  }, [isClient, localDB, remoteDB]);

  const manualSync = async () => {
    if (!isClient || !localDB || !remoteDB) {
      setError(new Error('PouchDB not ready for manual sync.'));
      return;
    }

    setSyncStatus('syncing');
    setError(null);
    try {
      await localDB.replicate.to(remoteDB);
      await localDB.replicate.from(remoteDB);
      setSyncStatus('idle');
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Manual status sync failed:', err);
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