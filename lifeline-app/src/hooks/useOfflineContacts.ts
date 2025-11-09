"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';
import NotificationToast from '@/components/NotificationToast';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  updatedAt: string;
}

const STORAGE_KEY = 'lifeline:offline_contacts';
const MAX_CONTACTS = 5;
const MAX_RETRIES = 3;

// Simple reversible encryption for phone numbers (XOR cipher)
const ENCRYPTION_KEY = 'lifeline_emergency_2024';

function encryptPhone(phone: string): string {
  let encrypted = '';
  for (let i = 0; i < phone.length; i++) {
    const keyChar = ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
    encrypted += String.fromCharCode(phone.charCodeAt(i) ^ keyChar.charCodeAt(0));
  }
  return btoa(encrypted);
}

function decryptPhone(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const keyChar = ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ keyChar.charCodeAt(0));
    }
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt phone:', error);
    return encrypted; // Return as-is if decryption fails
  }
}

function loadContactsFromStorage(): EmergencyContact[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const contacts = JSON.parse(stored) as EmergencyContact[];
    // Decrypt phone numbers
    return contacts.map(contact => ({
      ...contact,
      phone: decryptPhone(contact.phone),
    }));
  } catch (error) {
    console.error('Failed to load contacts from storage:', error);
    return [];
  }
}

function saveContactsToStorage(contacts: EmergencyContact[]): boolean {
  try {
    // Encrypt phone numbers before saving
    const encryptedContacts = contacts.map(contact => ({
      ...contact,
      phone: encryptPhone(contact.phone),
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedContacts));
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      // Evict oldest contacts if storage is full
      const sorted = [...contacts].sort((a, b) => 
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      // Keep only the 5 most recent
      const recent = sorted.slice(-MAX_CONTACTS);
      try {
        const encryptedContacts = recent.map(contact => ({
          ...contact,
          phone: encryptPhone(contact.phone),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedContacts));
        return true;
      } catch (retryError) {
        console.error('Failed to save contacts after eviction:', retryError);
        return false;
      }
    }
    console.error('Failed to save contacts to storage:', error);
    return false;
  }
}

export function useOfflineContacts() {
  const { token, user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const hasSyncedRef = useRef(false);

  // Load contacts from storage on mount
  useEffect(() => {
    const loaded = loadContactsFromStorage();
    setContacts(loaded);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-sync when coming online
      if (token && user && contacts.length > 0 && !hasSyncedRef.current) {
        setTimeout(() => {
          syncContacts();
        }, 1000);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      hasSyncedRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, user, contacts.length]);

  const addContact = useCallback((contact: Omit<EmergencyContact, 'id' | 'updatedAt'>) => {
    if (contacts.length >= MAX_CONTACTS) {
      setToastMessage(`Maximum ${MAX_CONTACTS} contacts allowed`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return false;
    }

    const newContact: EmergencyContact = {
      ...contact,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      updatedAt: new Date().toISOString(),
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContactsToStorage(updated);

    // Try to sync if online
    if (!isOffline && token && user) {
      syncContacts();
    }

    return true;
  }, [contacts, isOffline, token, user]);

  const updateContact = useCallback((id: string, updates: Partial<Omit<EmergencyContact, 'id'>>) => {
    const updated = contacts.map(contact =>
      contact.id === id
        ? { ...contact, ...updates, updatedAt: new Date().toISOString() }
        : contact
    );
    setContacts(updated);
    saveContactsToStorage(updated);

    // Try to sync if online
    if (!isOffline && token && user) {
      syncContacts();
    }
  }, [contacts, isOffline, token, user]);

  const deleteContact = useCallback((id: string) => {
    const updated = contacts.filter(contact => contact.id !== id);
    setContacts(updated);
    saveContactsToStorage(updated);

    // Try to sync if online
    if (!isOffline && token && user) {
      syncContacts();
    }
  }, [contacts, isOffline, token, user]);

  const syncContacts = useCallback(async () => {
    if (!token || !user || isSyncing) return;

    setIsSyncing(true);
    hasSyncedRef.current = true;

    try {
      // First, fetch server copy
      const fetchResponse = await fetch(`${API_CONFIG.baseURL}/contacts/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(`Failed to fetch contacts: ${fetchResponse.statusText}`);
      }

      const serverContacts: EmergencyContact[] = await fetchResponse.json();

      // Merge local and server contacts (last-write-wins)
      const currentContacts = loadContactsFromStorage();
      const merged = mergeContacts(currentContacts, serverContacts);
      setContacts(merged);
      saveContactsToStorage(merged);

      // Push merged contacts to server
      const pushResponse = await fetch(`${API_CONFIG.baseURL}/contacts/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(merged),
      });

      if (!pushResponse.ok) {
        throw new Error(`Failed to push contacts: ${pushResponse.statusText}`);
      }

      const syncedContacts: EmergencyContact[] = await pushResponse.json();
      setContacts(syncedContacts);
      saveContactsToStorage(syncedContacts);

      setToastMessage(`✅ Synced ${syncedContacts.length} contact(s)`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error('Failed to sync contacts:', error);
      setToastMessage(`❌ Sync failed: ${error.message}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      hasSyncedRef.current = false; // Allow retry
    } finally {
      setIsSyncing(false);
    }
  }, [token, user, isSyncing]);

  // Merge contacts using last-write-wins strategy
  const mergeContacts = useCallback((local: EmergencyContact[], server: EmergencyContact[]): EmergencyContact[] => {
    const mergedMap = new Map<string, EmergencyContact>();

    // Add server contacts
    server.forEach(contact => {
      mergedMap.set(contact.id, contact);
    });

    // Merge local contacts (last-write-wins)
    local.forEach(localContact => {
      const serverContact = mergedMap.get(localContact.id);
      if (!serverContact) {
        // New local contact
        mergedMap.set(localContact.id, localContact);
      } else {
        // Conflict: use the one with latest updatedAt
        const localTime = new Date(localContact.updatedAt).getTime();
        const serverTime = new Date(serverContact.updatedAt).getTime();
        if (localTime > serverTime) {
          mergedMap.set(localContact.id, localContact);
        }
      }
    });

    return Array.from(mergedMap.values()).slice(0, MAX_CONTACTS);
  }, []);

  return {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    syncContacts,
    isOffline,
    isSyncing,
    showToast,
    toastMessage,
  };
}

