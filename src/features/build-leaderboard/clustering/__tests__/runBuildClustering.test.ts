import { workerManager } from '../../../../workers';
import { runBuildClustering } from '../runBuildClustering';

const EMPTY_INPUT = { vectors: [] };
const manager = workerManager as typeof workerManager & {
  executeTask?: jest.Mock;
};
const originalNodeEnv = process.env.NODE_ENV;
const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');

function setWorker(value: unknown): void {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  Reflect.deleteProperty(manager, 'executeTask');
  if (originalWorker) {
    Object.defineProperty(globalThis, 'Worker', originalWorker);
  } else {
    Reflect.deleteProperty(globalThis, 'Worker');
  }
  jest.restoreAllMocks();
});

describe('runBuildClustering', () => {
  it('keeps synchronous clustering explicit and test-only', async () => {
    process.env.NODE_ENV = 'test';
    manager.executeTask = jest.fn();

    const result = await runBuildClustering(EMPTY_INPUT);

    expect(result.totalParses).toBe(0);
    expect(manager.executeTask).not.toHaveBeenCalled();
  });

  it('keeps Jest deterministic when NODE_ENV is overridden to development', async () => {
    process.env.NODE_ENV = 'development';
    manager.executeTask = jest.fn();

    const result = await runBuildClustering(EMPTY_INPUT);

    expect(result.totalParses).toBe(0);
    expect(manager.executeTask).not.toHaveBeenCalled();
  });

  it('rejects actionably when a production browser has no Worker', async () => {
    process.env.NODE_ENV = 'production';
    setWorker(undefined);

    await expect(runBuildClustering(EMPTY_INPUT)).rejects.toThrow(/background worker.*browser/i);
  });

  it('rejects actionably when the production worker manager is unavailable', async () => {
    process.env.NODE_ENV = 'production';
    setWorker(class WorkerStub {});
    Reflect.deleteProperty(manager, 'executeTask');

    await expect(runBuildClustering(EMPTY_INPUT)).rejects.toThrow(/background worker.*reload/i);
  });

  it('rejects actionably when the worker fails instead of retrying on the main thread', async () => {
    process.env.NODE_ENV = 'production';
    setWorker(class WorkerStub {});
    const cause = new Error('worker crashed');
    manager.executeTask = jest.fn().mockRejectedValue(cause);

    await expect(runBuildClustering(EMPTY_INPUT)).rejects.toMatchObject({
      message: expect.stringMatching(/background worker.*retry/i),
      cause,
    });
    expect(manager.executeTask).toHaveBeenCalledWith(
      'clusterDpsBuilds',
      EMPTY_INPUT,
      undefined,
      'build-leaderboard',
    );
  });
});
