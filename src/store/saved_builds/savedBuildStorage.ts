import type { SavedBuild } from './savedBuildsSlice';

const DATABASE_NAME = 'eso-toolkit-builds';
const DATABASE_VERSION = 2;
const SAVED_BUILDS_STORE = 'savedBuilds';
const EDITOR_STATE_STORE = 'editorState';
const METADATA_STORE = 'metadata';
const CURRENT_EDITOR_STATE_KEY = 'current';
const MIGRATION_METADATA_KEY = 'saved-builds-migrated';
const SESSION_METADATA_KEY = 'storage-session-generation';
const CLEANUP_METADATA_KEY = 'storage-cleanup-generation';
const DEFAULT_SESSION_GENERATION = '0';

/** Kept only so the startup migration in buildEditorSlice can read old saves. */
export const LEGACY_BUILD_EDITOR_STORAGE_KEY = 'eso-build-editor-v1';
export const SAVED_BUILDS_MIGRATION_KEY = 'eso-saved-builds-idb-v1';
export const BUILD_STORAGE_CLEANUP_PENDING_KEY = 'eso-build-storage-cleanup-pending-v1';
export const BUILD_STORAGE_SESSION_GENERATION_KEY = 'eso-build-storage-session-v1';

export interface StoredEditorState {
  key: typeof CURRENT_EDITOR_STATE_KEY;
  savedBuildId: string;
  activeSetupIndex: number;
}

interface StoredMetadata {
  key: string;
  value: string;
}

interface StoredCleanupState {
  target: string;
  status: 'pending' | 'complete';
  version: 1;
}

/** Raised when an operation belongs to the account/session that just signed out. */
export class BuildStorageSessionChangedError extends Error {
  public constructor() {
    super('The build library changed sessions before this operation completed.');
    this.name = 'BuildStorageSessionChangedError';
  }
}

let databasePromise: Promise<IDBDatabase> | undefined;
let cleanupPendingInMemory = false;
let activeSessionGeneration: string | undefined;
let activeSessionGenerationIsAuthoritative = false;
let durableSessionGeneration: string | undefined;
let cleanupTargetGeneration: string | undefined;
let durableSessionBootstrapPromise: Promise<string> | undefined;

type LocalStorageReadResult =
  { available: true; value: string | null } | { available: false; value: null };

let localStorageAvailable: boolean | undefined;

const readLocalStorage = (key: string): LocalStorageReadResult => {
  if (localStorageAvailable === false) return { available: false, value: null };
  try {
    const value = localStorage.getItem(key);
    localStorageAvailable = true;
    return { available: true, value };
  } catch {
    localStorageAvailable = false;
    return { available: false, value: null };
  }
};

const writeLocalStorage = (key: string, value: string): void => {
  if (localStorageAvailable === false) {
    throw new Error('Browser local storage is unavailable.');
  }
  try {
    localStorage.setItem(key, value);
    localStorageAvailable = true;
  } catch (error) {
    localStorageAvailable = false;
    throw error;
  }
};

const removeLocalStorage = (key: string): void => {
  if (localStorageAvailable === false) {
    throw new Error('Browser local storage is unavailable.');
  }
  try {
    localStorage.removeItem(key);
    localStorageAvailable = true;
  } catch (error) {
    localStorageAvailable = false;
    throw error;
  }
};

/** Undefined means the capability is denied, not that generation zero was stored. */
const readSharedSessionGeneration = (): string | undefined => {
  const result = readLocalStorage(BUILD_STORAGE_SESSION_GENERATION_KEY);
  return result.available ? (result.value ?? DEFAULT_SESSION_GENERATION) : undefined;
};

const currentSessionGeneration = (): string =>
  readSharedSessionGeneration() ?? activeSessionGeneration ?? DEFAULT_SESSION_GENERATION;

const generationOrder = (generation: string | undefined): number => {
  const numericGeneration = Number(generation);
  return Number.isFinite(numericGeneration) ? numericGeneration : 0;
};

const latestGeneration = (...generations: Array<string | undefined>): string =>
  generations.reduce<string>(
    (latest, candidate) =>
      generationOrder(candidate) > generationOrder(latest) ? (candidate ?? latest) : latest,
    DEFAULT_SESSION_GENERATION,
  );

const readCleanupState = (): StoredCleanupState | undefined => {
  const result = readLocalStorage(BUILD_STORAGE_CLEANUP_PENDING_KEY);
  if (!result.available) return undefined;
  const stored = result.value;
  if (!stored) return undefined;

  // v1 briefly stored the literal string "pending". Keep it fenced until a
  // cleanup commits, using the shared generation as its target.
  if (stored === 'pending') {
    return { target: currentSessionGeneration(), status: 'pending', version: 1 };
  }

  try {
    const candidate = JSON.parse(stored) as Partial<StoredCleanupState>;
    if (
      candidate.version === 1 &&
      typeof candidate.target === 'string' &&
      (candidate.status === 'pending' || candidate.status === 'complete')
    ) {
      return candidate as StoredCleanupState;
    }
  } catch {
    // A malformed marker is safer to treat as pending than to expose old data.
  }

  return { target: currentSessionGeneration(), status: 'pending', version: 1 };
};

const writeCleanupState = (state: StoredCleanupState): void => {
  writeLocalStorage(BUILD_STORAGE_CLEANUP_PENDING_KEY, JSON.stringify(state));
};

/** Capture this before any async work that may eventually mutate the build library. */
export const captureBuildStorageSessionGeneration = (): string => {
  if (activeSessionGeneration === undefined) {
    const sharedGeneration = readSharedSessionGeneration();
    activeSessionGeneration = sharedGeneration ?? DEFAULT_SESSION_GENERATION;
    activeSessionGenerationIsAuthoritative = sharedGeneration !== undefined;
  }
  return activeSessionGeneration;
};

/** Adopt a generation after this document has synchronously cleared its live Redux state. */
export const adoptBuildStorageSessionGeneration = (generation: string): void => {
  const nextGeneration = generation || DEFAULT_SESSION_GENERATION;
  if (activeSessionGeneration !== nextGeneration) {
    durableSessionBootstrapPromise = undefined;
  }
  activeSessionGeneration = nextGeneration;
  activeSessionGenerationIsAuthoritative = true;
};

export const hasPendingBuildStorageCleanup = (): boolean => {
  if (cleanupPendingInMemory) return true;
  const cleanupState = readCleanupState();
  const sharedGeneration = readSharedSessionGeneration();
  return (
    cleanupState?.status === 'pending' ||
    (cleanupState !== undefined &&
      sharedGeneration !== undefined &&
      cleanupState.target !== sharedGeneration)
  );
};

export const isBuildStorageSessionCurrent = (expectedGeneration: string): boolean => {
  const sharedGeneration = readSharedSessionGeneration();
  return (
    !hasPendingBuildStorageCleanup() &&
    captureBuildStorageSessionGeneration() === expectedGeneration &&
    (sharedGeneration === expectedGeneration ||
      (sharedGeneration === undefined && activeSessionGenerationIsAuthoritative))
  );
};

export const assertBuildStorageSessionCurrent = (expectedGeneration: string): void => {
  if (!isBuildStorageSessionCurrent(expectedGeneration)) {
    throw new BuildStorageSessionChangedError();
  }
};

const openDatabase = (): Promise<IDBDatabase> => {
  const browserIndexedDB = globalThis.indexedDB;
  if (typeof browserIndexedDB === 'undefined') {
    return Promise.reject(new Error('Durable browser storage is unavailable.'));
  }

  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = browserIndexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let upgradeError: unknown;

    request.onupgradeneeded = (event) => {
      try {
        const database = request.result;
        if (!database.objectStoreNames.contains(SAVED_BUILDS_STORE)) {
          database.createObjectStore(SAVED_BUILDS_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(EDITOR_STATE_STORE)) {
          database.createObjectStore(EDITOR_STATE_STORE, { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains(METADATA_STORE)) {
          const metadata = database.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          metadata.put({
            key: SESSION_METADATA_KEY,
            value: currentSessionGeneration(),
          } satisfies StoredMetadata);

          // v1 used this local marker only after its IndexedDB migration commit.
          // Preserve that authority during the v2 upgrade so stale redux-persist
          // data cannot become a migration source again.
          if (
            (event as IDBVersionChangeEvent).oldVersion > 0 &&
            hasCompletedSavedBuildMigration()
          ) {
            metadata.put({
              key: MIGRATION_METADATA_KEY,
              value: 'complete',
            } satisfies StoredMetadata);
          }
        }
      } catch (error) {
        upgradeError = error;
        request.transaction?.abort();
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        databasePromise = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () =>
      reject(upgradeError ?? request.error ?? new Error('Could not open build storage.'));
    request.onblocked = () => reject(new Error('Build storage upgrade is blocked by another tab.'));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });

  return databasePromise;
};

const awaitTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Could not update build storage.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Build storage update was cancelled.'));
  });

const awaitRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not read build storage.'));
  });

const abortForSessionChange = async (
  transaction: IDBTransaction,
  completion: Promise<void>,
): Promise<never> => {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have been aborted by the browser.
  }
  await completion.catch(() => undefined);
  throw new BuildStorageSessionChangedError();
};

const storedGeneration = (metadata: StoredMetadata | undefined): string =>
  metadata?.value ?? DEFAULT_SESSION_GENERATION;

/**
 * Acquire the authoritative generation before account-bound async work. Most
 * browsers can do this synchronously through localStorage. Hardened contexts
 * that deny Web Storage bootstrap once from IndexedDB instead; until that read
 * succeeds, ordinary writes remain fail-closed.
 */
export const acquireBuildStorageSessionGeneration = async (): Promise<string> => {
  const capturedGeneration = captureBuildStorageSessionGeneration();
  if (durableSessionGeneration === capturedGeneration) {
    assertBuildStorageSessionCurrent(capturedGeneration);
    return capturedGeneration;
  }
  if (hasPendingBuildStorageCleanup()) throw new BuildStorageSessionChangedError();

  durableSessionBootstrapPromise ??= (async (): Promise<string> => {
    const database = await openDatabase();
    const transaction = database.transaction(METADATA_STORE, 'readonly');
    const completion = awaitTransaction(transaction);
    const session = await awaitRequest<StoredMetadata | undefined>(
      transaction.objectStore(METADATA_STORE).get(SESSION_METADATA_KEY),
    );
    await completion;

    // Cleanup in this document or another tab may have started while IndexedDB
    // was opening. Do not adopt a generation from either side of that boundary.
    if (
      cleanupPendingInMemory ||
      activeSessionGeneration !== capturedGeneration ||
      hasPendingBuildStorageCleanup()
    ) {
      throw new BuildStorageSessionChangedError();
    }
    const restoredSharedGeneration = readSharedSessionGeneration();
    if (restoredSharedGeneration !== undefined && restoredSharedGeneration !== capturedGeneration) {
      throw new BuildStorageSessionChangedError();
    }

    const authoritativeGeneration = storedGeneration(session);
    if (
      restoredSharedGeneration !== undefined &&
      restoredSharedGeneration !== authoritativeGeneration
    ) {
      // Web Storage can be readable but non-writable (quota, policy, private
      // contexts). Repair it when possible; otherwise degrade to the durable
      // IndexedDB authority instead of trusting a permanently stale value.
      try {
        writeLocalStorage(BUILD_STORAGE_SESSION_GENERATION_KEY, authoritativeGeneration);
      } catch {
        localStorageAvailable = false;
      }
    }
    adoptBuildStorageSessionGeneration(authoritativeGeneration);
    durableSessionGeneration = authoritativeGeneration;
    return authoritativeGeneration;
  })().catch((error: unknown) => {
    durableSessionBootstrapPromise = undefined;
    throw error;
  });

  return durableSessionBootstrapPromise;
};

const markMigrationCompleteLocally = (): void => {
  try {
    writeLocalStorage(SAVED_BUILDS_MIGRATION_KEY, 'complete');
  } catch {
    // IndexedDB metadata remains the cross-tab authority.
  }
};

const savedAtTime = (savedBuild: SavedBuild): number => {
  const parsed = Date.parse(savedBuild.savedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Serialize legacy migration with ordinary writes/deletes. The migration marker
 * and merged snapshot share one transaction, so a delayed tab can never replay
 * an old redux-persist record after another tab deletes it.
 */
export const migrateAndLoadSavedBuildRecords = async (
  legacyBuilds: SavedBuild[],
  expectedGeneration: string,
): Promise<unknown[]> => {
  assertBuildStorageSessionCurrent(expectedGeneration);
  const database = await openDatabase();
  assertBuildStorageSessionCurrent(expectedGeneration);

  const transaction = database.transaction([SAVED_BUILDS_STORE, METADATA_STORE], 'readwrite');
  const completion = awaitTransaction(transaction);
  const buildsStore = transaction.objectStore(SAVED_BUILDS_STORE);
  const metadataStore = transaction.objectStore(METADATA_STORE);
  const [durableRecords, migration, session] = await Promise.all([
    awaitRequest(buildsStore.getAll()),
    awaitRequest<StoredMetadata | undefined>(metadataStore.get(MIGRATION_METADATA_KEY)),
    awaitRequest<StoredMetadata | undefined>(metadataStore.get(SESSION_METADATA_KEY)),
  ]);

  if (
    storedGeneration(session) !== expectedGeneration ||
    !isBuildStorageSessionCurrent(expectedGeneration)
  ) {
    return abortForSessionChange(transaction, completion);
  }

  if (migration?.value === 'complete') {
    await completion;
    markMigrationCompleteLocally();
    return durableRecords as unknown[];
  }

  const merged = new Map<string, SavedBuild>();
  for (const candidate of [...(durableRecords as SavedBuild[]), ...legacyBuilds]) {
    if (
      typeof candidate?.id !== 'string' ||
      typeof candidate.savedAt !== 'string' ||
      typeof candidate.build !== 'object' ||
      candidate.build === null
    ) {
      continue;
    }
    const existing = merged.get(candidate.id);
    if (!existing || savedAtTime(candidate) >= savedAtTime(existing)) {
      merged.set(candidate.id, candidate);
    }
  }

  const migrated = [...merged.values()];
  for (const savedBuild of migrated) buildsStore.put(savedBuild);
  metadataStore.put({ key: MIGRATION_METADATA_KEY, value: 'complete' } satisfies StoredMetadata);
  metadataStore.put({
    key: SESSION_METADATA_KEY,
    value: expectedGeneration,
  } satisfies StoredMetadata);
  await completion;
  markMigrationCompleteLocally();
  return migrated;
};

export const loadStoredEditorState = async (expectedGeneration: string): Promise<unknown> => {
  assertBuildStorageSessionCurrent(expectedGeneration);
  const database = await openDatabase();
  const transaction = database.transaction([EDITOR_STATE_STORE, METADATA_STORE], 'readonly');
  const completion = awaitTransaction(transaction);
  const editorStore = transaction.objectStore(EDITOR_STATE_STORE);
  const metadataStore = transaction.objectStore(METADATA_STORE);
  const [result, session] = await Promise.all([
    awaitRequest(editorStore.get(CURRENT_EDITOR_STATE_KEY)),
    awaitRequest<StoredMetadata | undefined>(metadataStore.get(SESSION_METADATA_KEY)),
  ]);
  await completion;
  if (
    storedGeneration(session) !== expectedGeneration ||
    !isBuildStorageSessionCurrent(expectedGeneration)
  ) {
    throw new BuildStorageSessionChangedError();
  }
  return result as unknown;
};

const openFencedWrite = async (
  expectedGeneration: string,
  stores: string[],
): Promise<{
  transaction: IDBTransaction;
  completion: Promise<void>;
  metadataStore: IDBObjectStore;
}> => {
  assertBuildStorageSessionCurrent(expectedGeneration);
  const database = await openDatabase();
  assertBuildStorageSessionCurrent(expectedGeneration);
  const transaction = database.transaction([...stores, METADATA_STORE], 'readwrite');
  const completion = awaitTransaction(transaction);
  const metadataStore = transaction.objectStore(METADATA_STORE);
  const session = await awaitRequest<StoredMetadata | undefined>(
    metadataStore.get(SESSION_METADATA_KEY),
  );
  if (
    storedGeneration(session) !== expectedGeneration ||
    !isBuildStorageSessionCurrent(expectedGeneration)
  ) {
    return abortForSessionChange(transaction, completion);
  }
  return { transaction, completion, metadataStore };
};

const completeFencedWrite = async (
  metadataStore: IDBObjectStore,
  completion: Promise<void>,
  expectedGeneration: string,
): Promise<void> => {
  metadataStore.put({ key: MIGRATION_METADATA_KEY, value: 'complete' } satisfies StoredMetadata);
  metadataStore.put({
    key: SESSION_METADATA_KEY,
    value: expectedGeneration,
  } satisfies StoredMetadata);
  await completion;
  markMigrationCompleteLocally();
};

export const putSavedBuildRecord = async (
  savedBuild: SavedBuild,
  expectedGeneration: string,
): Promise<void> => {
  const { transaction, completion, metadataStore } = await openFencedWrite(expectedGeneration, [
    SAVED_BUILDS_STORE,
  ]);
  transaction.objectStore(SAVED_BUILDS_STORE).put(savedBuild);
  await completeFencedWrite(metadataStore, completion, expectedGeneration);
};

export const hasCompletedSavedBuildMigration = (): boolean =>
  readLocalStorage(SAVED_BUILDS_MIGRATION_KEY).value === 'complete';

/**
 * Fence account-bound build data synchronously before asynchronous logout
 * cleanup begins. Every outstanding operation keeps its old generation and is
 * rejected before it can commit or dispatch into the newly signed-out session.
 */
export const beginBuildStorageCleanup = (): void => {
  if (hasPendingBuildStorageCleanup()) {
    cleanupPendingInMemory = true;
    cleanupTargetGeneration = latestGeneration(
      readCleanupState()?.target,
      readSharedSessionGeneration(),
      activeSessionGeneration,
    );
    try {
      writeCleanupState({
        target: cleanupTargetGeneration,
        status: 'pending',
        version: 1,
      });
      writeLocalStorage(BUILD_STORAGE_SESSION_GENERATION_KEY, cleanupTargetGeneration);
    } catch {
      // The in-memory fence still protects this document when storage is denied.
    }
    return;
  }

  captureBuildStorageSessionGeneration();
  const currentShared = currentSessionGeneration();
  const numericGeneration = Number(currentShared);
  const proposedGeneration = String(
    Math.max(Number.isFinite(numericGeneration) ? numericGeneration + 1 : 1, Date.now()),
  );
  cleanupTargetGeneration = latestGeneration(
    proposedGeneration,
    readCleanupState()?.target,
    currentShared,
  );
  cleanupPendingInMemory = true;
  try {
    // The target-bearing record is written first. A second tab that observes
    // cleanup before the generation write can therefore join the same target.
    writeCleanupState({
      target: cleanupTargetGeneration,
      status: 'pending',
      version: 1,
    });
    writeLocalStorage(BUILD_STORAGE_SESSION_GENERATION_KEY, cleanupTargetGeneration);
  } catch {
    // The in-memory fence still protects this document when storage is denied.
  }
};

/**
 * Commit a saved build and the editor resume pointer in one transaction.
 * The pointer avoids duplicating large guide screenshots in browser storage.
 */
export const putSavedBuildAndEditorState = async (
  savedBuild: SavedBuild,
  activeSetupIndex: number,
  expectedGeneration: string,
): Promise<void> => {
  const { transaction, completion, metadataStore } = await openFencedWrite(expectedGeneration, [
    SAVED_BUILDS_STORE,
    EDITOR_STATE_STORE,
  ]);
  transaction.objectStore(SAVED_BUILDS_STORE).put(savedBuild);
  transaction.objectStore(EDITOR_STATE_STORE).put({
    key: CURRENT_EDITOR_STATE_KEY,
    savedBuildId: savedBuild.id,
    activeSetupIndex,
  } satisfies StoredEditorState);
  await completeFencedWrite(metadataStore, completion, expectedGeneration);
};

export const deleteSavedBuildRecord = async (
  savedBuildId: string,
  expectedGeneration: string,
): Promise<void> => {
  const { transaction, completion, metadataStore } = await openFencedWrite(expectedGeneration, [
    SAVED_BUILDS_STORE,
    EDITOR_STATE_STORE,
  ]);
  transaction.objectStore(SAVED_BUILDS_STORE).delete(savedBuildId);

  const editorStore = transaction.objectStore(EDITOR_STATE_STORE);
  const editorStateRequest = editorStore.get(CURRENT_EDITOR_STATE_KEY);
  editorStateRequest.onsuccess = () => {
    const editorState = editorStateRequest.result as StoredEditorState | undefined;
    if (editorState?.savedBuildId === savedBuildId) {
      editorStore.delete(CURRENT_EDITOR_STATE_KEY);
    }
  };

  await completeFencedWrite(metadataStore, completion, expectedGeneration);
};

export const clearBuildStorage = async (): Promise<void> => {
  const requestedGeneration = latestGeneration(
    cleanupTargetGeneration,
    readCleanupState()?.target,
    readSharedSessionGeneration(),
    activeSessionGeneration,
  );
  let completedGeneration: string | undefined;
  let clearedDurableStorage = false;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      [SAVED_BUILDS_STORE, EDITOR_STATE_STORE, METADATA_STORE],
      'readwrite',
    );
    const completion = awaitTransaction(transaction);
    const metadataStore = transaction.objectStore(METADATA_STORE);
    const priorCleanup = await awaitRequest<StoredMetadata | undefined>(
      metadataStore.get(CLEANUP_METADATA_KEY),
    );
    completedGeneration = latestGeneration(priorCleanup?.value, requestedGeneration);

    // Readwrite transactions are serialized by IndexedDB. Once this target (or
    // a newer one) has cleared the stores, a delayed tab becomes a no-op so it
    // cannot erase a build saved after cleanup completed.
    if (generationOrder(priorCleanup?.value) < generationOrder(requestedGeneration)) {
      transaction.objectStore(SAVED_BUILDS_STORE).clear();
      transaction.objectStore(EDITOR_STATE_STORE).clear();
      metadataStore.put({
        key: MIGRATION_METADATA_KEY,
        value: 'complete',
      } satisfies StoredMetadata);
      metadataStore.put({
        key: SESSION_METADATA_KEY,
        value: requestedGeneration,
      } satisfies StoredMetadata);
      metadataStore.put({
        key: CLEANUP_METADATA_KEY,
        value: requestedGeneration,
      } satisfies StoredMetadata);
    }
    await completion;
    clearedDurableStorage = true;
    durableSessionGeneration = completedGeneration;
  } finally {
    // Logout/privacy cleanup must also remove the crash-safe legacy fallback,
    // even when IndexedDB is unavailable or blocked.
    try {
      removeLocalStorage(LEGACY_BUILD_EDITOR_STORAGE_KEY);
      if (clearedDurableStorage) {
        const authoritativeGeneration = latestGeneration(
          completedGeneration,
          readCleanupState()?.target,
          readSharedSessionGeneration(),
          activeSessionGeneration,
        );
        writeLocalStorage(SAVED_BUILDS_MIGRATION_KEY, 'complete');
        writeLocalStorage(BUILD_STORAGE_SESSION_GENERATION_KEY, authoritativeGeneration);
        writeCleanupState({
          target: authoritativeGeneration,
          status:
            generationOrder(completedGeneration) >= generationOrder(authoritativeGeneration)
              ? 'complete'
              : 'pending',
          version: 1,
        });
        cleanupPendingInMemory = false;
        cleanupTargetGeneration = undefined;
        adoptBuildStorageSessionGeneration(authoritativeGeneration);
      } else {
        removeLocalStorage(SAVED_BUILDS_MIGRATION_KEY);
      }
    } catch {
      if (clearedDurableStorage) {
        cleanupPendingInMemory = false;
        cleanupTargetGeneration = undefined;
        adoptBuildStorageSessionGeneration(completedGeneration ?? requestedGeneration);
      }
    }
  }
};
