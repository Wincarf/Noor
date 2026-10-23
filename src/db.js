/** IndexedDB wrapper — single connection, promise-based */

const DB_NAME    = 'noor-care-v3';
const DB_VERSION = 1;
let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      ['plans', 'reports', 'queue'].forEach(s => {
        if (!db.objectStoreNames.contains(s))
          db.createObjectStore(s, { keyPath: 'id' });
      });
      if (!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings');
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

export async function dbPut(store, value, key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    key === undefined
      ? tx.objectStore(store).put(value)
      : tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

export async function dbGetAll(store) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror   = () => reject(r.error);
  });
}

export async function dbGet(store, key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror   = () => reject(r.error);
  });
}
