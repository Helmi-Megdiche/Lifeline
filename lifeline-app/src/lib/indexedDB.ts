export type CheckInStatus = {
  id?: number;
  status: "safe" | "help";
  timestamp: number;
  latitude?: number | null;
  longitude?: number | null;
  synced?: boolean;
  userId?: string;
};

export type StoredResource = {
  id?: number;
  savedAt: number;
  centerLat: number;
  centerLng: number;
  areaName?: string;
  resources: Array<{
    name: string;
    address: string;
    phone: string;
    lat: number;
    lng: number;
    type: "Hospital" | "Shelter" | "Police" | "Fire";
  }>;
};

const DB_NAME = "lifeline-db";
const DB_VERSION = 3;
const STORE_STATUSES = "statuses";
const STORE_QUEUE = "queue";
const STORE_SAVED_RESOURCES = "saved_resources";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATUSES)) {
        db.createObjectStore(STORE_STATUSES, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SAVED_RESOURCES)) {
        db.createObjectStore(STORE_SAVED_RESOURCES, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStatus(status: CheckInStatus): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUSES, "readwrite");
    const store = tx.objectStore(STORE_STATUSES);
    const req = store.add(status);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getLastStatus(): Promise<CheckInStatus | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUSES, "readonly");
    const store = tx.objectStore(STORE_STATUSES);
    const req = store.openCursor(null, "prev");
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        resolve(cursor.value as CheckInStatus);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function queueStatus(status: CheckInStatus): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const req = store.add(status);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedStatuses(): Promise<CheckInStatus[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const store = tx.objectStore(STORE_QUEUE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as CheckInStatus[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllStatusesFromIDB(): Promise<CheckInStatus[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUSES, "readonly");
    const store = tx.objectStore(STORE_STATUSES);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as CheckInStatus[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

// Delete a single status by timestamp and optional userId
export async function deleteStatusByTimestampUser(timestamp: number, userId?: string): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUSES, "readwrite");
    const store = tx.objectStore(STORE_STATUSES);
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const all: CheckInStatus[] = (getAllReq.result as CheckInStatus[]) ?? [];
      const match = all.find((s) => s.timestamp === timestamp && (userId ? s.userId === userId : true));
      if (!match || typeof match.id !== 'number') {
        resolve(false);
        return;
      }
      const delReq = store.delete(match.id);
      delReq.onsuccess = () => resolve(true);
      delReq.onerror = () => reject(delReq.error);
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

// Bulk delete all statuses (use cautiously)
export async function deleteAllStatusesFromIDB(): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUSES, "readwrite");
    const store = tx.objectStore(STORE_STATUSES);
    const getAllReq = store.getAllKeys();
    getAllReq.onsuccess = () => {
      const keys = (getAllReq.result as IDBValidKey[]) ?? [];
      let deleted = 0;
      if (keys.length === 0) {
        resolve(0);
        return;
      }
      keys.forEach((key) => {
        const delReq = store.delete(key);
        delReq.onsuccess = () => {
          deleted++;
          if (deleted === keys.length) resolve(deleted);
        };
        delReq.onerror = () => reject(delReq.error);
      });
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

export async function clearQueuedStatus(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveResourcesForOffline(payload: Omit<StoredResource, "id">): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED_RESOURCES, "readwrite");
    const store = tx.objectStore(STORE_SAVED_RESOURCES);
    const req = store.add(payload);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function upsertResourcesForOffline(predicate: (r: StoredResource) => boolean, update: (existing: StoredResource | null) => Omit<StoredResource, "id"> & Partial<Pick<StoredResource, "id">>): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED_RESOURCES, "readwrite");
    const store = tx.objectStore(STORE_SAVED_RESOURCES);
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const all = (getAllReq.result as StoredResource[]) || [];
      const existing = all.find(predicate) || null;
      const next = update(existing);
      const hasExistingId = !!(existing && typeof existing.id !== "undefined" && existing.id !== null);
      if (hasExistingId) {
        const toUpdate: StoredResource = { ...(existing as StoredResource), ...next, id: (existing as StoredResource).id } as StoredResource;
        const req = store.put(toUpdate);
        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
        return;
      }
      // For add, ensure no undefined id is present
      const toInsert: any = { ...next } as any;
      if (typeof toInsert.id === "undefined") {
        delete toInsert.id;
      }
      const req = store.add(toInsert as StoredResource);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

export async function getLatestSavedResources(): Promise<StoredResource | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED_RESOURCES, "readonly");
    const store = tx.objectStore(STORE_SAVED_RESOURCES);
    const req = store.openCursor(null, "prev");
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        resolve(cursor.value as StoredResource);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSavedResources(): Promise<StoredResource[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED_RESOURCES, "readonly");
    const store = tx.objectStore(STORE_SAVED_RESOURCES);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as StoredResource[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSavedResources(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED_RESOURCES, "readwrite");
    const store = tx.objectStore(STORE_SAVED_RESOURCES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}


