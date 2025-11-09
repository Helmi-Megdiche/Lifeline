"use client";

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useMapSnapshotCache } from '@/hooks/useMapSnapshotCache';
import { getApiUrl } from '@/lib/config';
import NotificationToast from './NotificationToast';

/**
 * Component to automatically sync cached map snapshots when online
 */
export default function MapSnapshotSync() {
  const { token, user } = useAuth();
  const { syncCachedSnapshots, cacheCount, isSyncing, getCachedSnapshot, removeCachedSnapshot, cacheMapSnapshot } = useMapSnapshotCache();
  const hasSyncedRef = useRef(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Listen for alert sync events to map queued alert IDs to real alert IDs
  useEffect(() => {
    const handleAlertSynced = async (event: CustomEvent<{ alertId: string; tempId: string }>) => {
      const { alertId, tempId } = event.detail;
      
      // Check if there's a cached snapshot with the queued alert ID (tempId)
      const cached = getCachedSnapshot(tempId);
      if (cached) {
        // Remove old cache entry and add new one with real alert ID
        removeCachedSnapshot(tempId);
        cacheMapSnapshot(alertId, cached.snapshot);
        console.log(`🗺️ Mapped map snapshot from queued ID ${tempId} to alert ${alertId}`);
        
        // Immediately try to sync the map snapshot with the real alert ID
        if (token && navigator.onLine) {
          try {
            const response = await fetch(getApiUrl(`/alerts/${alertId}/map`), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                lat: cached.snapshot.lat,
                lng: cached.snapshot.lng,
                mapImage: cached.snapshot.mapImage,
                timestamp: cached.snapshot.timestamp,
                locationUnavailable: cached.snapshot.locationUnavailable,
              }),
            });
            
            if (response.ok) {
              console.log(`✅ Successfully synced map snapshot for alert ${alertId} after mapping`);
              removeCachedSnapshot(alertId); // Remove from cache after successful sync
            } else {
              console.warn(`⚠️ Failed to sync mapped snapshot for alert ${alertId}:`, response.status);
            }
          } catch (error) {
            console.error(`❌ Error syncing mapped snapshot for alert ${alertId}:`, error);
          }
        }
      }
    };

    window.addEventListener('lifeline-alert-synced', handleAlertSynced as EventListener);
    return () => {
      window.removeEventListener('lifeline-alert-synced', handleAlertSynced as EventListener);
    };
  }, [getCachedSnapshot, removeCachedSnapshot, cacheMapSnapshot, token]);

  useEffect(() => {
    if (!token || !user?.id || cacheCount === 0 || isSyncing || hasSyncedRef.current) {
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    // Wait a bit for stable connection
    const timeoutId = setTimeout(async () => {
      hasSyncedRef.current = true;
      
      if (cacheCount > 0) {
        setToast({ message: `Syncing ${cacheCount} map snapshot(s)...`, type: 'info' });
        
        const result = await syncCachedSnapshots();
        
        if (result.success > 0 || result.failed > 0) {
          if (result.failed === 0) {
            setToast({ message: `✅ Synced ${result.success} map snapshot(s)`, type: 'success' });
          } else {
            setToast({ 
              message: `✅ Synced ${result.success} map snapshot(s), ${result.failed} failed`, 
              type: result.success > 0 ? 'success' : 'error' 
            });
          }
        }
        
        // Reset after 3 seconds to allow re-sync if needed
        setTimeout(() => {
          hasSyncedRef.current = false;
        }, 3000);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [token, user, cacheCount, isSyncing, syncCachedSnapshots]);

  // Reset sync flag when cache count changes (new snapshots added)
  useEffect(() => {
    if (cacheCount > 0) {
      hasSyncedRef.current = false;
    }
  }, [cacheCount]);

  if (!toast) return null;

  return (
    <NotificationToast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  );
}

