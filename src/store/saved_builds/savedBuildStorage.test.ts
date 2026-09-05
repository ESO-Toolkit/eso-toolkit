import { deserialize, serialize } from 'node:v8';

import { IDBFactory } from 'fake-indexeddb';

import type { SavedBuild } from './savedBuildsSlice';

const makeSavedBuild = (id: string, savedAt = '2026-08-31T00:00:00.000Z'): SavedBuild => ({
  id,
  savedAt,
  build: { name: id } as SavedBuild['build'],
});

const loadStorage = async () => import('./savedBuildStorage');

const seedUnmigratedSavedBuild = async (savedBuild: SavedBuild): Promise<void> => {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('eso-toolkit-builds', 2);
    request.onupgradeneeded = () => {
      const upgradeDatabase = request.result;
      upgradeDatabase.createObjectStore('savedBuilds', { keyPath: 'id' });
      upgradeDatabase.createObjectStore('editorState', { keyPath: 'key' });
      upgradeDatabase.createObjectStore('metadata', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not seed build storage.'));
  });

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(['savedBuilds', 'metadata'], 'readwrite');
    transaction.objectStore('savedBuilds').put(savedBuild);
    transaction.objectStore('metadata').put({ key: 'storage-session-generation', value: '0' });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Could not seed build storage.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Build storage seed was cancelled.'));
  });
  database.close();
};

describe('savedBuildStorage transaction fencing', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'structuredClone', {
      configurable: true,
      writable: true,
      value: <T>(value: T): T => deserialize(serialize(value)) as T,
    });
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: new IDBFactory(),
    });
    localStorage.clear();
    jest.resetModules();
  });

  it('does not replay a legacy record when deletion wins the migration transaction race', async () => {
    const stale = makeSavedBuild('stale');
    await seedUnmigratedSavedBuild(stale);

    const storage = await loadStorage();
    const generation = storage.captureBuildStorageSessionGeneration();

    const deletion = storage.deleteSavedBuildRecord(stale.id, generation);
    const delayedMigration = storage.migrateAndLoadSavedBuildRecords([stale], generation);
    await Promise.all([deletion, delayedMigration]);

    await expect(storage.migrateAndLoadSavedBuildRecords([], generation)).resolves.toEqual([]);
  });

  it('serializes deletion after a migration that starts first', async () => {
    const storage = await loadStorage();
    const generation = storage.captureBuildStorageSessionGeneration();
    const legacy = makeSavedBuild('legacy');

    const migration = storage.migrateAndLoadSavedBuildRecords([legacy], generation);
    const deletion = storage.deleteSavedBuildRecord(legacy.id, generation);
    await Promise.all([migration, deletion]);

    await expect(storage.migrateAndLoadSavedBuildRecords([], generation)).resolves.toEqual([]);
  });

  it('rejects an old-session writer after logout cleanup rotates the generation', async () => {
    const storage = await loadStorage();
    const oldGeneration = storage.captureBuildStorageSessionGeneration();

    storage.beginBuildStorageCleanup();
    await expect(
      storage.putSavedBuildRecord(makeSavedBuild('stale'), oldGeneration),
    ).rejects.toBeInstanceOf(storage.BuildStorageSessionChangedError);

    await storage.clearBuildStorage();
    const newGeneration = storage.captureBuildStorageSessionGeneration();
    expect(newGeneration).not.toBe(oldGeneration);
    await expect(storage.migrateAndLoadSavedBuildRecords([], newGeneration)).resolves.toEqual([]);
  });

  it('keeps repeated cleanup requests on one generation until cleanup commits', async () => {
    const storage = await loadStorage();
    const oldGeneration = storage.captureBuildStorageSessionGeneration();

    storage.beginBuildStorageCleanup();
    const firstTarget = localStorage.getItem(storage.BUILD_STORAGE_SESSION_GENERATION_KEY);
    storage.beginBuildStorageCleanup();

    expect(localStorage.getItem(storage.BUILD_STORAGE_SESSION_GENERATION_KEY)).toBe(firstTarget);
    await storage.clearBuildStorage();
    expect(storage.captureBuildStorageSessionGeneration()).toBe(firstTarget);
    expect(storage.captureBuildStorageSessionGeneration()).not.toBe(oldGeneration);
  });

  it('makes a delayed second-tab cleanup a no-op after a fresh save', async () => {
    const firstTab = await loadStorage();
    jest.resetModules();
    const secondTab = await loadStorage();

    firstTab.beginBuildStorageCleanup();
    secondTab.beginBuildStorageCleanup();
    await firstTab.clearBuildStorage();

    const currentGeneration = firstTab.captureBuildStorageSessionGeneration();
    const freshBuild = makeSavedBuild('fresh-after-cleanup');
    await firstTab.putSavedBuildRecord(freshBuild, currentGeneration);

    await secondTab.clearBuildStorage();

    await expect(firstTab.migrateAndLoadSavedBuildRecords([], currentGeneration)).resolves.toEqual([
      freshBuild,
    ]);
    expect(secondTab.hasPendingBuildStorageCleanup()).toBe(false);
  });

  it('does not let an older tab erase data saved after a newer cleanup generation', async () => {
    const olderTab = await loadStorage();
    jest.resetModules();
    const activeTab = await loadStorage();

    olderTab.beginBuildStorageCleanup();
    activeTab.beginBuildStorageCleanup();
    await activeTab.clearBuildStorage();

    activeTab.beginBuildStorageCleanup();
    await activeTab.clearBuildStorage();
    const newestGeneration = activeTab.captureBuildStorageSessionGeneration();
    const freshBuild = makeSavedBuild('fresh-after-newer-cleanup');
    await activeTab.putSavedBuildRecord(freshBuild, newestGeneration);

    await olderTab.clearBuildStorage();

    expect(localStorage.getItem(activeTab.BUILD_STORAGE_SESSION_GENERATION_KEY)).toBe(
      newestGeneration,
    );
    await expect(activeTab.migrateAndLoadSavedBuildRecords([], newestGeneration)).resolves.toEqual([
      freshBuild,
    ]);
  });

  it('restores the durable generation when Web Storage is denied after cleanup', async () => {
    const denyWebStorage = (): never => {
      throw new DOMException('Web Storage is denied.', 'SecurityError');
    };
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(denyWebStorage);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(denyWebStorage);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(denyWebStorage);

    const cleanupTab = await loadStorage();
    const initialGeneration = await cleanupTab.acquireBuildStorageSessionGeneration();
    cleanupTab.beginBuildStorageCleanup();
    await cleanupTab.clearBuildStorage();

    const currentGeneration = await cleanupTab.acquireBuildStorageSessionGeneration();
    expect(currentGeneration).not.toBe(initialGeneration);

    const freshBuild = makeSavedBuild('fresh-without-web-storage');
    await cleanupTab.putSavedBuildRecord(freshBuild, currentGeneration);

    jest.resetModules();
    const reloadedTab = await loadStorage();
    const restoredGeneration = await reloadedTab.acquireBuildStorageSessionGeneration();

    expect(restoredGeneration).toBe(currentGeneration);
    await expect(
      reloadedTab.migrateAndLoadSavedBuildRecords([], restoredGeneration),
    ).resolves.toEqual([freshBuild]);
  });

  it('restores the durable generation when Web Storage is readable but not writable', async () => {
    localStorage.setItem('eso-build-storage-session-v1', '0');
    const denyWebStorageWrite = (): never => {
      throw new DOMException('Web Storage is read-only.', 'QuotaExceededError');
    };
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(denyWebStorageWrite);

    const cleanupTab = await loadStorage();
    const initialGeneration = await cleanupTab.acquireBuildStorageSessionGeneration();
    cleanupTab.beginBuildStorageCleanup();
    await cleanupTab.clearBuildStorage();

    const currentGeneration = await cleanupTab.acquireBuildStorageSessionGeneration();
    expect(currentGeneration).not.toBe(initialGeneration);

    const freshBuild = makeSavedBuild('fresh-with-read-only-web-storage');
    await cleanupTab.putSavedBuildRecord(freshBuild, currentGeneration);

    jest.resetModules();
    const reloadedTab = await loadStorage();
    const restoredGeneration = await reloadedTab.acquireBuildStorageSessionGeneration();

    expect(restoredGeneration).toBe(currentGeneration);
    await expect(
      reloadedTab.migrateAndLoadSavedBuildRecords([], restoredGeneration),
    ).resolves.toEqual([freshBuild]);
  });
});
