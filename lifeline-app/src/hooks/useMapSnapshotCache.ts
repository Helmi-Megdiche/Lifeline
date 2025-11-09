"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { getApiUrl } from '@/lib/config';
import { MapSnapshotData } from '@/lib/mapSnapshot';

export interface CachedMapSnapshot {
  alertId: string;
  snapshot: MapSnapshotData;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'lifeline:offline_map_snapshots';
const MAX_RETRIES = 3;

/**
 * Hook to manage offline map snapshot cache
 * Stores map snapshots in localStorage when offline and syncs when online
 */
export function useMapSnapshotCache() {
  const [cachedSnapshots, setCachedSnapshots] = useState<CachedMapSnapshot[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { token, user } = useAuth();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached snapshots from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CachedMapSnapshot[];
        setCachedSnapshots(parsed);
        console.log(`🗺️ Loaded ${parsed.length} cached map snapshots from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load cached map snapshots:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Wait 1 second for stable connection, then sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncCachedSnapshots();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((snapshots: CachedMapSnapshot[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage full. Keeping only 10 most recent map snapshots.');
        // Keep only 10 most recent
        const recent = snapshots.slice(-10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
        setCachedSnapshots(recent);
      } else {
        console.error('Failed to save cached map snapshots:', error);
      }
    }
  }, []);

  /**
   * Cache a map snapshot for an alert
   */
  const cacheMapSnapshot = useCallback((alertId: string, snapshot: MapSnapshotData) => {
    const cached: CachedMapSnapshot = {
      alertId,
      snapshot,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setCachedSnapshots((prev) => {
      // Remove existing snapshot for this alert if any
      const filtered = prev.filter((c) => c.alertId !== alertId);
      const updated = [...filtered, cached];
      saveToStorage(updated);
      return updated;
    });

    console.log(`🗺️ Cached map snapshot for alert ${alertId}`);
  }, [saveToStorage]);

  /**
   * Remove cached snapshot
   */
  const removeCachedSnapshot = useCallback((alertId: string) => {
    setCachedSnapshots((prev) => {
      const updated = prev.filter((c) => c.alertId !== alertId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  /**
   * Sync all cached map snapshots to backend
   */
  const syncCachedSnapshots = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!token || !user?.id || cachedSnapshots.length === 0 || isSyncing) {
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('📴 Still offline, cannot sync map snapshots');
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    let successCount = 0;
    let failedCount = 0;
    const snapshotsToRemove: string[] = [];
    const snapshotsToUpdate: CachedMapSnapshot[] = [];

    console.log(`🔄 Syncing ${cachedSnapshots.length} cached map snapshots...`);

    for (const cached of cachedSnapshots) {
      try {
        // Skip if exceeded max retries
        if (cached.retryCount >= MAX_RETRIES) {
          console.warn(`⚠️ Map snapshot for alert ${cached.alertId} exceeded max retries, removing from cache`);
          snapshotsToRemove.push(cached.alertId);
          failedCount++;
          continue;
        }

        // Skip if alert ID starts with "temp_" or "alert_" (queued alert IDs)
        // These will be mapped to real IDs via the lifeline-alert-synced event
        if (cached.alertId.startsWith('temp_') || cached.alertId.startsWith('alert_')) {
          console.log(`⏭️ Skipping map snapshot sync for queued alert ${cached.alertId} (will sync after alert is synced)`);
          // Don't increment retry count, just skip for now
          continue;
        }

        // Send map snapshot to backend
        const response = await fetch(getApiUrl(`/alerts/${cached.alertId}/map`), {
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
          console.log(`✅ Successfully synced map snapshot for alert ${cached.alertId}`);
          snapshotsToRemove.push(cached.alertId);
          successCount++;
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to sync map snapshot for alert ${cached.alertId}:`, response.status, errorText);
          
          // Only retry if it's not a 404 (alert not found - might be queued)
          if (response.status === 404) {
            console.log(`⏭️ Alert ${cached.alertId} not found (might be queued), will retry after alert sync`);
            // Don't increment retry count for 404, wait for alert to sync
            continue;
          }
          
          // Increment retry count for other errors
          snapshotsToUpdate.push({
            ...cached,
            retryCount: cached.retryCount + 1,
          });
          failedCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error syncing map snapshot for alert ${cached.alertId}:`, error);
        
        // Network error - increment retry count
        if (error.message?.includes('Failed to fetch') || !navigator.onLine) {
          snapshotsToUpdate.push({
            ...cached,
            retryCount: cached.retryCount + 1,
          });
        } else {
          // Auth error - remove (non-retryable)
          snapshotsToRemove.push(cached.alertId);
        }
        failedCount++;
      }
    }

    // Update cache: remove successful, update failed
    setCachedSnapshots((prev) => {
      const updated = prev
        .filter((c) => !snapshotsToRemove.includes(c.alertId))
        .map((c) => {
          const updatedSnapshot = snapshotsToUpdate.find((u) => u.alertId === c.alertId);
          return updatedSnapshot || c;
        });
      saveToStorage(updated);
      return updated;
    });

    setIsSyncing(false);
    
    if (successCount > 0 || failedCount > 0) {
      console.log(`🗺️ Map snapshot sync complete: ${successCount} success, ${failedCount} failed`);
    }
    
    return { success: successCount, failed: failedCount };
  }, [token, user, cachedSnapshots, isSyncing]);

  /**
   * Get cached snapshot for an alert
   */
  const getCachedSnapshot = useCallback((alertId: string): CachedMapSnapshot | null => {
    return cachedSnapshots.find((c) => c.alertId === alertId) || null;
  }, [cachedSnapshots]);

  /**
   * Clear all cached snapshots
   */
  const clearCache = useCallback(() => {
    setCachedSnapshots([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    cachedSnapshots,
    cacheCount: cachedSnapshots.length,
    isSyncing,
    isOnline,
    cacheMapSnapshot,
    removeCachedSnapshot,
    syncCachedSnapshots,
    getCachedSnapshot,
    clearCache,
  };
}

