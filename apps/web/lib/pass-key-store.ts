/**
 * Keeps The IDEA Pass card on the device (IndexedDB) so it works offline:
 * the member number and the card key as a non-extractable CryptoKey, which
 * IndexedDB stores as is. The secret itself is never stored.
 */

export interface StoredCard {
  key: CryptoKey;
  memberNumber: number;
}

const DATABASE = "idea-pass";
const STORE = "cards";

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(
        database.transaction(STORE, mode).objectStore(STORE)
      );
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
};

/** The card saved for `userId`, if any (undefined when storage is blocked). */
export const readCard = async (
  userId: string
): Promise<StoredCard | undefined> => {
  try {
    return await run<StoredCard | undefined>("readonly", (store) =>
      store.get(userId)
    );
  } catch {
    // Storage blocked (private mode): the card is fetched instead.
  }
};

/** Saves the card for `userId`; a blocked storage only loses offline use. */
export const saveCard = async (userId: string, card: StoredCard) => {
  try {
    await run("readwrite", (store) => store.put(card, userId));
  } catch {
    // Private mode or storage blocked: the card is fetched again next time.
  }
};
