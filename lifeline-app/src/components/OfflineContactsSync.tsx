"use client";

import React, { useEffect, useRef } from 'react';
import { useOfflineContacts } from '@/hooks/useOfflineContacts';
import { useAuth } from '@/contexts/ClientAuthContext';

/**
 * Component that automatically syncs offline contacts when online
 * Similar to OfflineQueueSync but for emergency contacts
 */
export default function OfflineContactsSync() {
  const { syncContacts, contacts, isOffline } = useOfflineContacts();
  const { token, user } = useAuth();
  const hasSyncedRef = useRef(false);

  // Auto-sync when coming online and authenticated
  useEffect(() => {
    if (!token || !user || isOffline || contacts.length === 0 || hasSyncedRef.current) {
      return;
    }

    // Small delay to ensure connection is stable
    const timeout = setTimeout(async () => {
      if (navigator.onLine && contacts.length > 0) {
        hasSyncedRef.current = true;
        await syncContacts();
        // Reset after sync completes
        setTimeout(() => {
          hasSyncedRef.current = false;
        }, 5000);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [token, user, isOffline, contacts.length, syncContacts]);

  // Reset sync flag when contacts change (new items added)
  useEffect(() => {
    if (contacts.length > 0) {
      hasSyncedRef.current = false;
    }
  }, [contacts.length]);

  return null; // This component doesn't render anything
}

