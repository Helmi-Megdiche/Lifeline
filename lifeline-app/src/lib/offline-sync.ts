'use client';

import { PendingAction, UserStatus } from '@/types/group';

const DB_NAME = 'lifeline-groups-offline';
const STORE_NAME = 'pendingActions';
const VERSION = 1;

class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addPendingAction(action: Omit<PendingAction, 'id' | 'synced'>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const pendingAction: PendingAction = {
        ...action,
        id: `${action.action}_${Date.now()}_${Math.random()}`,
        synced: false,
      };

      const request = store.add(pendingAction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<PendingAction[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result.filter((a: PendingAction) => !a.synced));
      request.onerror = () => reject(request.error);
    });
  }

  async markActionAsSynced(actionId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(actionId);
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.synced = true;
          store.put(action);
        }
        resolve();
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSyncedActions(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if ((cursor.value as PendingAction).synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAllActions(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();

// Cache for groups data (simple IndexedDB implementation)
const CACHE_DB_NAME = 'lifeline-groups-cache';
const CACHE_VERSION = 1;
const GROUPS_STORE = 'groups';
const GROUP_DETAILS_STORE = 'groupDetails';

export class GroupsCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(GROUPS_STORE)) {
          db.createObjectStore(GROUPS_STORE, { keyPath: '_id' });
        }
        
        if (!db.objectStoreNames.contains(GROUP_DETAILS_STORE)) {
          db.createObjectStore(GROUP_DETAILS_STORE, { keyPath: 'groupId' });
        }
      };
    });
  }

  async cacheGroups(groups: any[]): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GROUPS_STORE], 'readwrite');
      const store = transaction.objectStore(GROUPS_STORE);
      
      // Clear existing
      store.clear();

      // Add new
      const promises = groups.map(group => store.put(group));
      Promise.all(promises).then(() => resolve()).catch(reject);
    });
  }

  async getCachedGroups(): Promise<any[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GROUPS_STORE], 'readonly');
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheGroupDetails(groupId: string, details: any): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GROUP_DETAILS_STORE], 'readwrite');
      const store = transaction.objectStore(GROUP_DETAILS_STORE);
      
      const request = store.put({ groupId, ...details, cachedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedGroupDetails(groupId: string): Promise<any | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GROUP_DETAILS_STORE], 'readonly');
      const store = transaction.objectStore(GROUP_DETAILS_STORE);
      const request = store.get(groupId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([GROUPS_STORE, GROUP_DETAILS_STORE], 'readwrite');
      const groupsStore = transaction.objectStore(GROUPS_STORE);
      const detailsStore = transaction.objectStore(GROUP_DETAILS_STORE);
      
      groupsStore.clear();
      detailsStore.clear();
      resolve();
    });
  }
}

export const groupsCache = new GroupsCache();

