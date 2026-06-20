import {
  selectWorkerTask,
  selectWorkerTaskResult,
  selectWorkerTaskLoading,
  selectWorkerTaskProgress,
  selectWorkerTaskError,
  selectWorkerTaskLastUpdated,
} from './selectors';

describe('worker_results selector factory memoization', () => {
  it('returns the same selectWorkerTask instance for a given taskName', () => {
    expect(selectWorkerTask('calculateBuffLookup')).toBe(selectWorkerTask('calculateBuffLookup'));
  });

  it('returns the same selectWorkerTaskLoading instance for a given taskName', () => {
    expect(selectWorkerTaskLoading('calculateBuffLookup')).toBe(
      selectWorkerTaskLoading('calculateBuffLookup'),
    );
  });

  it('returns the same selectWorkerTaskResult instance for a given taskName', () => {
    expect(selectWorkerTaskResult('calculateBuffLookup')).toBe(
      selectWorkerTaskResult('calculateBuffLookup'),
    );
  });

  it('returns the same selectWorkerTaskProgress instance for a given taskName', () => {
    expect(selectWorkerTaskProgress('calculateBuffLookup')).toBe(
      selectWorkerTaskProgress('calculateBuffLookup'),
    );
  });

  it('returns the same selectWorkerTaskError instance for a given taskName', () => {
    expect(selectWorkerTaskError('calculateBuffLookup')).toBe(
      selectWorkerTaskError('calculateBuffLookup'),
    );
  });

  it('returns the same selectWorkerTaskLastUpdated instance for a given taskName', () => {
    expect(selectWorkerTaskLastUpdated('calculateBuffLookup')).toBe(
      selectWorkerTaskLastUpdated('calculateBuffLookup'),
    );
  });

  it('returns distinct selector instances for different taskNames', () => {
    expect(selectWorkerTaskLoading('calculateBuffLookup')).not.toBe(
      selectWorkerTaskLoading('calculateDebuffLookup'),
    );
  });
});
