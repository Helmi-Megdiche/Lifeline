"use client";
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';

// Enable PouchDB plugins
PouchDB.plugin(PouchFind);

// Active databases (mutable to support per-user DB switching)
export let localDB: PouchDB.Database<any> = new PouchDB('lifeline-local');

// Create remote database connection
const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || 'http://localhost:4004/pouch/status';
export let remoteDB: PouchDB.Database<any> = new PouchDB(REMOTE_DB_URL);

// Allow hooks to switch the active DBs (per-user)
export const setActiveDatabases = (local: PouchDB.Database<any>, remote: PouchDB.Database<any>) => {
  localDB = local;
  remoteDB = remote;
};

// Database configuration
export const dbConfig = {
  local: localDB,
  remote: remoteDB,
  syncOptions: {
    live: true,
    retry: true,
    back_off_function: (delay: number) => {
      if (delay === 0) return 1000;
      return Math.min(delay * 2, 10000);
    },
  },
};

// Initialize database indexes
export const initializeDB = async (db?: PouchDB.Database<any>) => {
  const target = db || localDB;
  try {
    const desired = [
      { name: 'timestamp-index', fields: ['timestamp'] as string[] },
      { name: 'synced-index', fields: ['synced'] as string[] },
      { name: 'userId-index', fields: ['userId'] as string[] },
      { name: 'synced-timestamp-index', fields: ['synced', 'timestamp'] as string[] },
      { name: 'userId-timestamp-index', fields: ['userId', 'timestamp'] as string[] },
    ];

    // Create missing indexes (idempotent by name)
    const existing = await (target as any).getIndexes();
    const existingNames = new Set<string>((existing?.indexes || []).map((i: any) => i.name));
    for (const d of desired) {
      if (!existingNames.has(d.name)) {
        await target.createIndex({ index: { fields: d.fields, name: d.name } as any });
      }
    }

    // Remove unused indexes that match our naming convention but aren't desired anymore
    const desiredNames = new Set(desired.map(d => d.name));
    for (const idx of existing?.indexes || []) {
      if (!idx || !idx.name) continue;
      if (idx.name === '_all_docs') continue; // built-in
      const isOurs = /^(timestamp|synced|userId)(-|_).+index$/.test(idx.name) || idx.name.endsWith('-index');
      if (isOurs && !desiredNames.has(idx.name)) {
        try {
          await (target as any).deleteIndex(idx);
        } catch {}
      }
    }

    console.log('PouchDB indexes ensured.');
  } catch (error) {
    console.warn('PouchDB index ensure failed:', error);
  }
};

// Helper functions for status management
export const saveStatusToPouch = async (status: {
  status: 'safe' | 'help';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  userId: string;
}) => {
  const _id = `user_${status.userId}_status`;
  try {
    let existing: any;
    try { existing = await localDB.get(_id); } catch {}
    const next = {
      _id,
      _rev: existing?._rev,
      userId: status.userId,
      status: status.status,
      timestamp: status.timestamp,
      latitude: status.latitude,
      longitude: status.longitude,
      synced: false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      statusHistory: Array.isArray(existing?.statusHistory)
        ? [...existing.statusHistory, { status: status.status, timestamp: status.timestamp }]
        : [{ status: status.status, timestamp: status.timestamp }],
    } as any;
    const result = await localDB.put(next);
    console.log('Single status upserted to PouchDB:', result);
    return result;
  } catch (error) {
    console.error('Error upserting status to PouchDB:', error);
    throw error;
  }
};

export const getAllStatuses = async () => {
  try {
    // Try to use find with index first
    const result = await localDB.find({
      selector: {},
      sort: [{ timestamp: 'desc' }],
      use_index: 'timestamp-index'
    });
    return result.docs;
  } catch (error) {
    console.warn('Find query failed, using allDocs fallback:', error);
    // Fallback to allDocs if find fails
    try {
      const result = await localDB.allDocs({ include_docs: true });
      return result.rows
        .map((row: any) => row.doc)
        .filter((doc: any) => doc && !doc._id.startsWith('_'))
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }
  }
};

export const getStatusesByUser = async (userId: string) => {
  try {
    const result = await localDB.find({
      selector: { userId },
      sort: [{ timestamp: 'desc' }],
      use_index: 'userId-timestamp-index'
    });
    return result.docs;
  } catch (error) {
    console.warn('Find query failed, using allDocs fallback:', error);
    // Fallback to allDocs if find fails
    try {
      const result = await localDB.allDocs({ include_docs: true });
      return result.rows
        .map((row: any) => row.doc)
        .filter((doc: any) => doc && doc.userId === userId && !doc._id.startsWith('_'))
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }
  }
};

export const getUnsyncedStatuses = async () => {
  try {
    const result = await localDB.find({
      selector: { synced: false },
      sort: [{ timestamp: 'asc' }],
      use_index: 'synced-timestamp-index'
    });
    return result.docs;
  } catch (error) {
    console.warn('Find query failed, using allDocs fallback:', error);
    // Fallback to allDocs if find fails
    try {
      const result = await localDB.allDocs({ include_docs: true });
      return result.rows
        .map((row: any) => row.doc)
        .filter((doc: any) => doc && doc.synced === false && !doc._id.startsWith('_'))
        .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }
  }
};

export const markStatusAsSynced = async (docId: string, rev?: string) => {
  try {
    const doc = await localDB.get(docId);
    // Only flip the local flag to avoid revision churn
    const updatedDoc = { ...doc, synced: true } as any;
    await localDB.put(updatedDoc);
    console.log('Status marked as synced (flag flipped):', docId);
  } catch (error) {
    console.error('Error marking status as synced:', error);
    throw error;
  }
};

// Migrate any legacy IndexedDB statuses into PouchDB before sync
export const migrateIndexedDBToPouch = async (getAllFromIDB: () => Promise<any[]>, currentUserId?: string) => {
  try {
    const idbStatuses = await getAllFromIDB();
    if (!Array.isArray(idbStatuses) || idbStatuses.length === 0) return 0;
    // collapse into single status doc for the current user only
    const userId = currentUserId || (idbStatuses[0]?.userId as string | undefined);
    if (!userId) return 0;
    const _id = `user_${userId}_status`;
    let existing: any;
    try { existing = await localDB.get(_id); } catch {}

    // pick latest status by timestamp and build history
    const userItems = idbStatuses.filter(s => (s.userId || userId) === userId);
    if (userItems.length === 0) return 0;
    userItems.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const latest = userItems[userItems.length - 1];
    const history = userItems.map(s => ({ status: s.status, timestamp: s.timestamp }));
    const nextDoc = {
      _id,
      _rev: existing?._rev,
      userId,
      status: latest.status,
      timestamp: latest.timestamp,
      latitude: latest.latitude,
      longitude: latest.longitude,
      synced: false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      statusHistory: Array.isArray(existing?.statusHistory) ? [...existing.statusHistory, ...history] : history,
    } as any;
    await localDB.put(nextDoc);
    return 1;
  } catch (e) {
    console.warn('Migration from IndexedDB to Pouch failed:', e);
    return 0;
  }
};

// User management functions
export const saveLocalUser = async (user: {
  id: string;
  username: string;
  token: string;
  password?: string; // Store hashed password for offline login
}) => {
  const userDoc = {
    _id: `user_${user.id}`,
    type: 'user',
    id: user.id,
    username: user.username,
    token: user.token,
    password: user.password, // Store for offline validation
    synced: true,
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await localDB.put(userDoc);
    console.log('User saved to PouchDB:', result);
    return result;
  } catch (error) {
    console.error('Error saving user to PouchDB:', error);
    throw error;
  }
};

export const getLocalUser = async (): Promise<{
  id: string;
  username: string;
  token: string;
  password?: string;
} | null> => {
  try {
    const result = await localDB.find({
      selector: { type: 'user' },
      limit: 1
    });
    
    if (result.docs.length > 0) {
      const userDoc = result.docs[0] as any;
      return {
        id: userDoc.id,
        username: userDoc.username,
        token: userDoc.token,
        password: userDoc.password
      };
    }
    return null;
  } catch (error) {
    console.warn('Find query failed, using allDocs fallback:', error);
    // Fallback to allDocs if find fails
    try {
      const result = await localDB.allDocs({ include_docs: true });
      const userDoc = result.rows
        .map((row: any) => row.doc)
        .find((doc: any) => doc && doc.type === 'user');
      
      if (userDoc) {
        return {
          id: userDoc.id,
          username: userDoc.username,
          token: userDoc.token,
          password: userDoc.password
        };
      }
      return null;
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return null;
    }
  }
};

export const clearLocalUser = async () => {
  try {
    const result = await localDB.find({
      selector: { type: 'user' }
    });
    
    for (const doc of result.docs) {
      await localDB.remove(doc);
    }
    console.log('Local user cleared');
  } catch (error) {
    console.error('Error clearing local user:', error);
    throw error;
  }
};

// Online status check
export const isOnline = async (): Promise<boolean> => {
  try {
    // First check navigator.onLine
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('Navigator reports offline');
      return false;
    }
    
    // Try multiple approaches to check online status
        const apiUrl = 'http://10.133.250.197:4004'; // Use actual WiFi IP for mobile access
    console.log('Checking online status with URL:', apiUrl);
    
    // Try with a very short timeout first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500); // Very short timeout
    
    try {
      const response = await fetch(`${apiUrl}/health`, { 
        method: "GET", 
        cache: "no-cache",
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      const isOnline = response.ok;
      console.log('Online check result:', isOnline, 'Status:', response.status);
      return isOnline;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log('First fetch attempt failed:', fetchError);
      
      // Try a second time with a different approach - no CORS mode
      try {
        const response2 = await fetch(`${apiUrl}/health`, { 
          method: "GET", 
          cache: "no-cache",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const isOnline = response2.ok;
        console.log('Second online check result:', isOnline, 'Status:', response2.status);
        return isOnline;
      } catch (secondError) {
        console.log('Second fetch attempt also failed:', secondError);
        
        // Try a third time with HEAD request
        try {
          const response3 = await fetch(`${apiUrl}/health`, { 
            method: "HEAD", 
            cache: "no-cache",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          const isOnline = response3.ok;
          console.log('Third online check result:', isOnline, 'Status:', response3.status);
          return isOnline;
        } catch (thirdError) {
          console.log('All fetch attempts failed:', thirdError);
          return false;
        }
      }
    }
  } catch (error) {
    console.log('Online check failed:', error);
    return false;
  }
};
