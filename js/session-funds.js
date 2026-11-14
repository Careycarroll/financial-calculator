/**
 * Session Funds Repository
 * Manages core presets permanently and session-scoped custom funds in IndexedDB.
 * Guarantees that only the default 5 presets persist across browser restarts,
 * while allowing 900+ temporary funds to be shared across Trading suite tools.
 */

import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { parseCSV, resampleToMonthly } from '../dca-comparator/dca-engine.js';

const DB_NAME = 'fc_session_funds_db';
const STORE_NAME = 'custom_funds';
const DB_VERSION = 1;
const SESSION_TOKEN_KEY = 'fc_active_session_token';

// In-memory cache for ultra-fast synchronous reads
let inMemoryCustomFunds = [];
let isInitialized = false;
const subscribers = new Set();

/**
 * Checks and enforces the browser session lifecycle.
 * If browser restarted (sessionStorage empty), wipes previous IndexedDB session funds.
 */
function checkSessionLifecycle() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  const activeToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!activeToken) {
    // New browser session detected! Generate token and request DB wipe
    const newToken = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(SESSION_TOKEN_KEY, newToken);
    // Mark that DB must be wiped on first open
    window._fc_must_wipe_session_db = true;
  }
}

checkSessionLifecycle();

/**
 * Opens IndexedDB connection with upgrade handler
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null); // Node.js fallback
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'ticker' });
      }
    };

    request.onsuccess = (e) => {
      const db = e.target.result;
      if (window._fc_must_wipe_session_db) {
        window._fc_must_wipe_session_db = false;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve(db);
        tx.onerror = () => resolve(db);
      } else {
        resolve(db);
      }
    };

    request.onerror = (e) => {
      console.warn('IndexedDB open error:', e);
      resolve(null);
    };
  });
}

/**
 * Loads custom funds from IndexedDB into memory
 */
export async function initSessionFunds() {
  if (isInitialized) {
    return getAllFundsSync();
  }

  const db = await openDB();
  if (!db) {
    isInitialized = true;
    return getAllFundsSync();
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        inMemoryCustomFunds = req.result || [];
        isInitialized = true;
        resolve(getAllFundsSync());
      };

      req.onerror = () => {
        isInitialized = true;
        resolve(getAllFundsSync());
      };
    } catch (err) {
      isInitialized = true;
      resolve(getAllFundsSync());
    }
  });
}

/**
 * Returns all available funds (Core 5 Presets + Session Custom Funds) synchronously from cache.
 */
export function getAllFundsSync() {
  const funds = [];

  // Core default 5 presets
  PRESET_BENCHMARKS.forEach(b => {
    funds.push({
      ticker: b.ticker.toUpperCase(),
      name: b.name,
      category: b.assetClass || 'Broad Index',
      color: b.color || '#38bdf8',
      data: b.data,
      isPreset: true,
      monthsCount: b.data ? b.data.length : 0,
      start: b.data && b.data.length > 0 ? b.data[0].date : '',
      end: b.data && b.data.length > 0 ? b.data[b.data.length - 1].date : ''
    });
  });

  // Session-scoped custom funds
  inMemoryCustomFunds.forEach(cf => {
    funds.push({
      ticker: cf.ticker.toUpperCase(),
      name: cf.name || `${cf.ticker} (Session Upload)`,
      category: cf.category || 'Custom ETF',
      color: cf.color || '#a855f7',
      data: cf.data,
      isPreset: false,
      monthsCount: cf.data ? cf.data.length : 0,
      start: cf.data && cf.data.length > 0 ? cf.data[0].date : '',
      end: cf.data && cf.data.length > 0 ? cf.data[cf.data.length - 1].date : ''
    });
  });

  return funds;
}

/**
 * Batch parses and imports an array of File objects into session storage.
 * @param {Array<File>} files
 * @param {Function} [onProgress] - (processed, total)
 * @returns {Promise<{ importedCount: number, errors: Array<string> }>}
 */
export async function importFilesToSession(files, onProgress = null) {
  const fileList = Array.from(files).filter(f => {
    const name = f.name.toLowerCase();
    return name.endsWith('.csv') || name.endsWith('.txt');
  });

  if (fileList.length === 0) {
    return { importedCount: 0, errors: ['No valid CSV or TXT files selected.'] };
  }

  const total = fileList.length;
  const CHUNK_SIZE = 50;
  const newFunds = [];
  const errors = [];

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = fileList.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.all(chunk.map(async file => {
      try {
        let text = '';
        if (typeof file.text === 'function') {
          text = await file.text();
        } else {
          text = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = ev => res(ev.target.result);
            reader.onerror = rej;
            reader.readAsText(file);
          });
        }

        const parsed = parseCSV(text, file.name);
        const monthly = resampleToMonthly(parsed.rows);
        if (monthly.length < 6) {
          return { error: `"${parsed.ticker}" has less than 6 monthly points.` };
        }

        return {
          fund: {
            ticker: parsed.ticker.toUpperCase(),
            name: `${parsed.ticker} (Session Upload)`,
            category: 'Custom ETF',
            color: '#a855f7',
            data: monthly,
            importedAt: Date.now()
          }
        };
      } catch (err) {
        return { error: `Failed to parse ${file.name}: ${err.message}` };
      }
    }));

    chunkResults.forEach(r => {
      if (r.fund) newFunds.push(r.fund);
      if (r.error) errors.push(r.error);
    });

    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, total), total);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (newFunds.length > 0) {
    // 1. Update in-memory
    const map = new Map(inMemoryCustomFunds.map(f => [f.ticker, f]));
    newFunds.forEach(f => map.set(f.ticker, f));
    inMemoryCustomFunds = Array.from(map.values());

    // 2. Persist to IndexedDB
    const db = await openDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        newFunds.forEach(f => store.put(f));
        await new Promise((res) => {
          tx.oncomplete = res;
          tx.onerror = res;
        });
      } catch (err) {
        console.warn('IndexedDB write error:', err);
      }
    }

    notifySubscribers();
  }

  return { importedCount: newFunds.length, errors: errors };
}

/**
 * Deletes a single custom fund from session storage.
 */
export async function deleteSessionFund(ticker) {
  const normTicker = ticker.toUpperCase();
  inMemoryCustomFunds = inMemoryCustomFunds.filter(f => f.ticker.toUpperCase() !== normTicker);

  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(normTicker);
      await new Promise((res) => {
        tx.oncomplete = res;
        tx.onerror = res;
      });
    } catch (err) {
      console.warn('IndexedDB delete error:', err);
    }
  }

  notifySubscribers();
  return getAllFundsSync();
}

/**
 * Resets the session repository back to the pristine default 5 benchmarks.
 */
export async function resetSessionToDefault() {
  inMemoryCustomFunds = [];

  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      await new Promise((res) => {
        tx.oncomplete = res;
        tx.onerror = res;
      });
    } catch (err) {
      console.warn('IndexedDB clear error:', err);
    }
  }

  notifySubscribers();
  return getAllFundsSync();
}

/**
 * Subscribes a listener callback to run whenever session funds change.
 */
export function subscribeSessionFunds(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers() {
  const all = getAllFundsSync();
  subscribers.forEach(cb => {
    try { cb(all); } catch (e) { console.error(e); }
  });
}
