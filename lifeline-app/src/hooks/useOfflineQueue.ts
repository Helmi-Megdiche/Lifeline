"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { getApiUrl } from '@/lib/config';

export interface QueuedAlert {
  alertId: string;
  payload: {
    category: string;
    title: string;
    description: string;
    severity: string;
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    ttlHours?: number;
  };
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'lifeline:offline_alerts_queue';
const MAX_RETRIES = 3;
const MAX_QUEUE_SIZE = 50; // Prevent localStorage overflow

/**
 * Hook to manage offline alerts queue
 * Stores alerts in localStorage when offline and syncs when online
 */
export function useOfflineQueue() {
  const [queuedAlerts, setQueuedAlerts] = useState<QueuedAlert[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { token, user } = useAuth();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load queued alerts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedAlert[];
        setQueuedAlerts(parsed);
        console.log(`📦 Loaded ${parsed.length} queued alerts from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load queued alerts:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Connection restored - will sync queued alerts');
      // Small delay to ensure connection is stable
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncQueuedAlerts();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Connection lost - alerts will be queued');
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      if (queuedAlerts.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queuedAlerts));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error: any) {
      // Handle QuotaExceededError gracefully
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded - keeping only most recent alerts');
        // Keep only the most recent alerts
        const recent = queuedAlerts.slice(-10);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
          setQueuedAlerts(recent);
        } catch (e) {
          console.error('Failed to save even reduced queue:', e);
        }
      } else {
        console.error('Failed to save queued alerts:', error);
      }
    }
  }, [queuedAlerts]);

  /**
   * Generate unique alert ID
   */
  const generateAlertId = useCallback(() => {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Add alert to queue
   */
  const queueAlert = useCallback((payload: QueuedAlert['payload']) => {
    const alertId = generateAlertId();
    const queuedAlert: QueuedAlert = {
      alertId,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setQueuedAlerts(prev => {
      // Prevent duplicates by checking location and timestamp (within 5 seconds)
      const isDuplicate = prev.some(alert => {
        const sameLocation = 
          Math.abs(alert.payload.location.lat - payload.location.lat) < 0.0001 &&
          Math.abs(alert.payload.location.lng - payload.location.lng) < 0.0001;
        const sameTime = Math.abs(alert.timestamp - Date.now()) < 5000;
        return sameLocation && sameTime && alert.payload.title === payload.title;
      });

      if (isDuplicate) {
        console.log('⚠️ Duplicate alert detected, skipping queue');
        return prev;
      }

      // Limit queue size
      const updated = [...prev, queuedAlert];
      if (updated.length > MAX_QUEUE_SIZE) {
        console.warn(`⚠️ Queue size limit reached, removing oldest alerts`);
        return updated.slice(-MAX_QUEUE_SIZE);
      }

      return updated;
    });

    console.log(`📦 Alert queued (ID: ${alertId})`);
    return alertId;
  }, [generateAlertId]);

  /**
   * Remove alert from queue
   */
  const removeFromQueue = useCallback((alertId: string) => {
    setQueuedAlerts(prev => prev.filter(alert => alert.alertId !== alertId));
  }, []);

  /**
   * Sync all queued alerts to backend
   */
  const syncQueuedAlerts = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!token || !user?.id || queuedAlerts.length === 0 || isSyncing) {
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('📴 Still offline, cannot sync alerts');
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    let successCount = 0;
    let failedCount = 0;
    const alertsToRemove: string[] = [];
    const alertsToUpdate: QueuedAlert[] = [];

    console.log(`🔄 Syncing ${queuedAlerts.length} queued alerts...`);

    for (const alert of queuedAlerts) {
      try {
        // Skip if exceeded max retries
        if (alert.retryCount >= MAX_RETRIES) {
          console.warn(`⚠️ Alert ${alert.alertId} exceeded max retries, removing from queue`);
          alertsToRemove.push(alert.alertId);
          failedCount++;
          continue;
        }

        const response = await fetch(getApiUrl('/alerts'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(alert.payload),
        });

        if (response.ok) {
          const result = await response.json();
          const createdAlertId = result.alert?._id;
          
          console.log(`✅ Successfully synced alert ${alert.alertId}`);
          alertsToRemove.push(alert.alertId);
          successCount++;
          
          // Try to sync any cached map snapshot for this alert
          // Check if there's a temp ID that matches this alert's timestamp
          if (createdAlertId) {
            // Dispatch event to sync map snapshot for this alert ID
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('lifeline-alert-synced', {
                detail: { alertId: createdAlertId, tempId: alert.alertId }
              }));
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to sync alert ${alert.alertId}:`, response.status, errorText);
          
          // Increment retry count
          alertsToUpdate.push({
            ...alert,
            retryCount: alert.retryCount + 1,
          });
          failedCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error syncing alert ${alert.alertId}:`, error);
        
        // Only increment retry if it's a network error (not auth error)
        if (error.message?.includes('Failed to fetch') || !navigator.onLine) {
          alertsToUpdate.push({
            ...alert,
            retryCount: alert.retryCount + 1,
          });
        } else {
          // Auth errors or other non-retryable errors - remove from queue
          alertsToRemove.push(alert.alertId);
        }
        failedCount++;
      }
    }

    // Update queue: remove successful, update failed with new retry count
    setQueuedAlerts(prev => {
      const updated = prev
        .filter(alert => !alertsToRemove.includes(alert.alertId))
        .map(alert => {
          const updatedAlert = alertsToUpdate.find(u => u.alertId === alert.alertId);
          return updatedAlert || alert;
        });
      return updated;
    });

    setIsSyncing(false);
    console.log(`📊 Sync complete: ${successCount} successful, ${failedCount} failed`);

    return { success: successCount, failed: failedCount };
  }, [token, user, queuedAlerts, isSyncing]);

  /**
   * Clear all queued alerts
   */
  const clearQueue = useCallback(() => {
    setQueuedAlerts([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Cleared all queued alerts');
  }, []);

  return {
    queuedAlerts,
    queueCount: queuedAlerts.length,
    isSyncing,
    isOnline,
    queueAlert,
    removeFromQueue,
    syncQueuedAlerts,
    clearQueue,
  };
}

