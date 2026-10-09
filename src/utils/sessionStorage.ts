import type { StoredSessionRecord } from '../types/history';

const DB_NAME = 'mnema_session_history_db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('experimentType', 'experimentType', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a completed session record. Deduplicates by session ID.
 */
export async function saveSession(session: StoredSessionRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Put replaces if key already exists, preventing duplicate records on rerenders
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all stored sessions sorted by date descending.
 */
export async function getAllSessions(): Promise<StoredSessionRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: StoredSessionRecord[] = request.result || [];
        // Sort descending by timestamp
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load sessions from IndexedDB:', err);
    return [];
  }
}

/**
 * Deletes an individual session by ID.
 */
export async function deleteSession(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clears the entire local session history.
 */
export async function clearAllSessions(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Validates imported session JSON records.
 */
export function validateImportedSessions(jsonContent: string): { validSessions: StoredSessionRecord[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonContent);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    const validSessions: StoredSessionRecord[] = [];

    for (const item of list) {
      if (!item.id || typeof item.id !== 'string') continue;
      if (!item.experimentType || !['reaction', 'target_acquisition', 'continuous_tracking', 'diagnostics_calibration'].includes(item.experimentType)) {
        continue;
      }
      if (!item.timestamp || !item.protocolVersion) continue;

      validSessions.push(item as StoredSessionRecord);
    }

    if (validSessions.length === 0) {
      return { validSessions: [], error: 'No compatible session records found in uploaded file.' };
    }

    return { validSessions };
  } catch (err: any) {
    return { validSessions: [], error: `Invalid JSON syntax: ${err.message}` };
  }
}
