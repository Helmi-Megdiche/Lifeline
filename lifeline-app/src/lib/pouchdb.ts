"use client";
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';

// Enable PouchDB plugins
PouchDB.plugin(PouchFind);

// Create local database
export const localDB = new PouchDB('lifeline-local');

// Create remote database connection
const REMOTE_DB_URL = process.env.NEXT_PUBLIC_COUCH_SYNC_URL || 'http://localhost:4004/pouch/status';
export const remoteDB = new PouchDB(REMOTE_DB_URL);

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
export const initializeDB = async () => {
  try {
    // Create indexes for efficient querying
    await localDB.createIndex({
      index: { fields: ['timestamp'] }
    });
    
    await localDB.createIndex({
      index: { fields: ['synced'] }
    });

    await localDB.createIndex({
      index: { fields: ['userId'] }
    });

    await localDB.createIndex({
      index: { fields: ['synced', 'timestamp'] }
    });

    await localDB.createIndex({
      index: { fields: ['userId', 'timestamp'] }
    });

    console.log('PouchDB indexes created successfully');
  } catch (error) {
    console.warn('PouchDB index creation failed (may already exist):', error);
  }
};

// Helper functions for status management
export const saveStatusToPouch = async (status: {
  _id?: string; // Allow PouchDB to generate if not provided
  status: 'safe' | 'help';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  userId?: string;
}) => {
  const doc = {
    _id: status._id || new Date().toISOString(), // Use provided _id or generate new one
    status: status.status,
    timestamp: status.timestamp,
    latitude: status.latitude,
    longitude: status.longitude,
    userId: status.userId,
    synced: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await localDB.put(doc);
    console.log('Status saved to PouchDB:', result);
    return result;
  } catch (error) {
    console.error('Error saving status to PouchDB:', error);
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

export const markStatusAsSynced = async (docId: string, rev: string) => {
  try {
    const doc = await localDB.get(docId);
    const updatedDoc = { ...doc, synced: true };
    await localDB.put(updatedDoc);
    console.log('Status marked as synced:', docId);
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
    let migrated = 0;
    for (const s of idbStatuses) {
      try {
        const existing = await localDB.find({ selector: { timestamp: s.timestamp, userId: currentUserId || s.userId } });
        if (existing.docs && existing.docs.length > 0) continue;
      } catch {}

      const _id = s._id || new Date(s.timestamp || Date.now()).toISOString();
      const doc = {
        _id,
        status: s.status,
        timestamp: s.timestamp,
        latitude: s.latitude,
        longitude: s.longitude,
        userId: currentUserId || s.userId,
        synced: false,
        createdAt: new Date().toISOString(),
      };
      try {
        await localDB.put(doc);
        migrated++;
      } catch (e: any) {
        if (!(e && e.status === 409)) {
          throw e;
        }
      }
    }
    return migrated;
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
    const apiUrl = 'http://localhost:4004'; // Hardcode for now to avoid env issues
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
