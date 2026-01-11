// IndexedDB wrapper for offline data storage

const DB_NAME = 'cridergpt-offline';
const DB_VERSION = 1;

interface OfflineStore {
  name: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
}

const STORES: OfflineStore[] = [
  { 
    name: 'calculator-results', 
    keyPath: 'id',
    indexes: [
      { name: 'type', keyPath: 'calculatorType' },
      { name: 'timestamp', keyPath: 'timestamp' }
    ]
  },
  { 
    name: 'invoices', 
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'synced', keyPath: 'synced' }
    ]
  },
  { 
    name: 'events', 
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'eventDate' },
      { name: 'synced', keyPath: 'synced' }
    ]
  },
  { 
    name: 'settings', 
    keyPath: 'key' 
  },
  {
    name: 'pending-sync',
    keyPath: 'id',
    indexes: [
      { name: 'type', keyPath: 'type' },
      { name: 'timestamp', keyPath: 'timestamp' }
    ]
  },
  {
    name: 'cached-data',
    keyPath: 'key',
    indexes: [
      { name: 'expiry', keyPath: 'expiresAt' }
    ]
  }
];

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
            
            store.indexes?.forEach((index) => {
              objectStore.createIndex(index.name, index.keyPath, { unique: index.unique || false });
            });
            
            console.log(`[OfflineStorage] Created store: ${store.name}`);
          }
        });
      };
    });

    return this.dbPromise;
  }

  async set<T>(storeName: string, data: T): Promise<void> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(storeName: string, key: string | number): Promise<T | undefined> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName: string, key: string | number): Promise<void> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Add item to pending sync queue
  async addToPendingSync(type: string, data: any): Promise<void> {
    const syncItem = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    await this.set('pending-sync', syncItem);
  }

  // Get all pending sync items
  async getPendingSync(): Promise<any[]> {
    return this.getAll('pending-sync');
  }

  // Clear pending sync after successful sync
  async clearPendingSync(): Promise<void> {
    return this.clear('pending-sync');
  }

  // Cache data with expiry
  async cacheData(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    const cacheItem = {
      key,
      data,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
    };
    
    await this.set('cached-data', cacheItem);
  }

  // Get cached data (returns undefined if expired)
  async getCachedData<T>(key: string): Promise<T | undefined> {
    const cached = await this.get<{ key: string; data: T; expiresAt: string }>('cached-data', key);
    
    if (!cached) return undefined;
    
    if (new Date(cached.expiresAt) < new Date()) {
      await this.delete('cached-data', key);
      return undefined;
    }
    
    return cached.data;
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    const all = await this.getAll<{ key: string; expiresAt: string }>('cached-data');
    const now = new Date();
    
    for (const item of all) {
      if (new Date(item.expiresAt) < now) {
        await this.delete('cached-data', item.key);
      }
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on import
offlineStorage.init().catch(console.error);

// Calculator result storage helpers
export interface CalculatorResult {
  id: string;
  calculatorType: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  timestamp: string;
}

export async function saveCalculatorResult(result: Omit<CalculatorResult, 'id' | 'timestamp'>): Promise<void> {
  const fullResult: CalculatorResult = {
    ...result,
    id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };
  
  await offlineStorage.set('calculator-results', fullResult);
}

export async function getCalculatorHistory(type?: string): Promise<CalculatorResult[]> {
  if (type) {
    return offlineStorage.getByIndex('calculator-results', 'type', type);
  }
  return offlineStorage.getAll('calculator-results');
}

export async function clearCalculatorHistory(): Promise<void> {
  return offlineStorage.clear('calculator-results');
}

// Invoice storage helpers
export interface OfflineInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  items: any[];
  total: number;
  status: 'draft' | 'pending' | 'sent';
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function saveInvoiceOffline(invoice: Omit<OfflineInvoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<OfflineInvoice> {
  const now = new Date().toISOString();
  const fullInvoice: OfflineInvoice = {
    ...invoice,
    id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    synced: false,
    createdAt: now,
    updatedAt: now
  };
  
  await offlineStorage.set('invoices', fullInvoice);
  
  // Add to pending sync
  await offlineStorage.addToPendingSync('invoice', fullInvoice);
  
  return fullInvoice;
}

export async function getOfflineInvoices(): Promise<OfflineInvoice[]> {
  return offlineStorage.getAll('invoices');
}

// Event storage helpers
export interface OfflineEvent {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  synced: boolean;
  createdAt: string;
}

export async function saveEventOffline(event: Omit<OfflineEvent, 'id' | 'createdAt' | 'synced'>): Promise<OfflineEvent> {
  const fullEvent: OfflineEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    synced: false,
    createdAt: new Date().toISOString()
  };
  
  await offlineStorage.set('events', fullEvent);
  await offlineStorage.addToPendingSync('event', fullEvent);
  
  return fullEvent;
}

export async function getOfflineEvents(): Promise<OfflineEvent[]> {
  return offlineStorage.getAll('events');
}

// Settings storage
export async function saveSetting(key: string, value: any): Promise<void> {
  await offlineStorage.set('settings', { key, value });
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const setting = await offlineStorage.get<{ key: string; value: T }>('settings', key);
  return setting?.value;
}
