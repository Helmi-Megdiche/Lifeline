"use client";
import React, { useEffect } from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useAuth } from '@/contexts/ClientAuthContext';
import NotificationToast from './NotificationToast';

/**
 * Component that automatically syncs queued alerts when online
 * Shows toast notification during sync
 */
export default function OfflineQueueSync() {
  const { syncQueuedAlerts, queueCount, isSyncing } = useOfflineQueue();
  const { token, user } = useAuth();
  const [showSyncToast, setShowSyncToast] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<{ success: number; failed: number } | null>(null);
  const hasSyncedRef = React.useRef(false);

  // Auto-sync when coming online and authenticated
  useEffect(() => {
    if (!token || !user || queueCount === 0 || isSyncing || hasSyncedRef.current) {
      return;
    }

    // Small delay to ensure connection is stable
    const timeout = setTimeout(async () => {
      if (navigator.onLine && queueCount > 0) {
        setShowSyncToast(true);
        hasSyncedRef.current = true;
        
        const result = await syncQueuedAlerts();
        setSyncResult(result);
        
        // Hide toast after showing result
        setTimeout(() => {
          setShowSyncToast(false);
          hasSyncedRef.current = false;
        }, 3000);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [token, user, queueCount, isSyncing, syncQueuedAlerts]);

  // Reset sync flag when queue count changes (new items added)
  useEffect(() => {
    if (queueCount > 0) {
      hasSyncedRef.current = false;
    }
  }, [queueCount]);

  if (!showSyncToast) {
    return null;
  }

  const message = isSyncing
    ? `Syncing ${queueCount} alert(s)...`
    : syncResult
    ? syncResult.success > 0
      ? `✅ Synced ${syncResult.success} alert(s)${syncResult.failed > 0 ? `, ${syncResult.failed} failed` : ''}`
      : `❌ Failed to sync ${syncResult.failed} alert(s)`
    : 'Syncing alerts...';

  return (
    <NotificationToast
      isOpen={showSyncToast}
      onClose={() => setShowSyncToast(false)}
      message={message}
      type={isSyncing ? 'info' : syncResult?.success ? 'success' : 'error'}
      duration={3000}
    />
  );
}

