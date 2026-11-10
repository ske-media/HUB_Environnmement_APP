/**
 * Petite couche IndexedDB dédiée au stockage des blobs de photos en attente
 * de synchronisation (mode offline). Le localStorage n'étant pas adapté aux
 * fichiers binaires volumineux, on persiste les photos sous forme de `Blob`
 * dans une base IndexedDB locale, avec une clé explicite générée côté appelant.
 */

const DB_NAME = 'hub-shield-offline';
const DB_VERSION = 1;
const STORE_NAME = 'photo_blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

export function supportsIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  if (!supportsIndexedDb()) {
    return Promise.reject(new Error('IndexedDB indisponible dans cet environnement'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Ouverture IndexedDB impossible'));
    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = runner(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Opération IndexedDB en échec'));
  });
}

export async function putPhotoBlob(key: string, blob: Blob): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) => store.put(blob, key));
}

export async function getPhotoBlob(key: string): Promise<Blob | null> {
  try {
    const result = await withStore<Blob | undefined>('readonly', (store) => store.get(key));
    return result ?? null;
  } catch (err) {
    console.warn('[indexedDbPhotos] lecture impossible', key, err);
    return null;
  }
}

export async function deletePhotoBlob(key: string): Promise<void> {
  try {
    await withStore<undefined>('readwrite', (store) => store.delete(key));
  } catch (err) {
    console.warn('[indexedDbPhotos] suppression impossible', key, err);
  }
}

export async function listPhotoKeys(): Promise<string[]> {
  try {
    const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
    return keys.map((k) => String(k));
  } catch {
    return [];
  }
}

/**
 * Supprime les blobs qui ne sont plus référencés par aucune entrée de la file
 * d'attente (fiche déjà synchronisée, queue purgée manuellement, crash entre
 * deux écritures). Sans ce nettoyage, le quota IndexedDB de l'appareil se
 * remplit de photos devenues inutiles.
 *
 * @param referencedKeys clés encore utilisées par la file d'attente.
 * @returns nombre de blobs supprimés.
 */
export async function pruneOrphanPhotoBlobs(referencedKeys: Iterable<string>): Promise<number> {
  if (!supportsIndexedDb()) return 0;

  const keep = new Set(referencedKeys);
  const keys = await listPhotoKeys();
  const orphans = keys.filter((key) => !keep.has(key));

  for (const key of orphans) {
    await deletePhotoBlob(key);
  }

  return orphans.length;
}
