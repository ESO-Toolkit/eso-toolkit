import type { ReportFightContext } from '../contextTypes';
import { createReportFightCacheKey } from './cacheKeys';
import { createReportFightContextSelector } from './contextSelectors';

interface TestState {
  valuesByKey: Record<string, number>;
  labelsByKey: Record<string, string>;
}

describe('createReportFightContextSelector', () => {
  const baseState: TestState = {
    valuesByKey: {
      'R-1::1': 10,
      'R-1::2': 20,
      'R-2::1': 5,
    },
    labelsByKey: {
      'R-1::1': 'alpha',
      'R-1::2': 'beta',
      'R-2::1': 'gamma',
    },
  };

  const selectValue: (state: TestState, context: ReportFightContext) => number = (
    state,
    context,
  ) => {
    const key = createReportFightCacheKey(context);
    return state.valuesByKey[key] ?? 0;
  };

  const selectLabel: (state: TestState, context: ReportFightContext) => string = (
    state,
    context,
  ) => {
    const key = createReportFightCacheKey(context);
    return state.labelsByKey[key] ?? 'missing';
  };

  it('memoizes selectors per context key', () => {
    const selector = createReportFightContextSelector<
      TestState,
      [typeof selectValue, typeof selectLabel],
      { value: number; label: string }
    >(
      [selectValue, selectLabel],
      (value, label) => ({ value, label }),
    );

    const context = { reportCode: 'R-1', fightId: 1 };
    const first = selector(baseState, context);
    const second = selector(baseState, context);

    expect(first).toBe(second);
    expect(first).toEqual({ value: 10, label: 'alpha' });
  });

  it('evicts the oldest selector when exceeding the cache limit', () => {
    const combiner = jest.fn((value: number) => value);
    const selector = createReportFightContextSelector<TestState, [typeof selectValue], number>(
      [selectValue],
      combiner,
      { cacheLimit: 2 },
    );

    const ctxA = { reportCode: 'R-1', fightId: 1 };
    const ctxB = { reportCode: 'R-1', fightId: 2 };
    const ctxC = { reportCode: 'R-2', fightId: 1 };

    selector(baseState, ctxA);
    selector(baseState, ctxB);

    expect(combiner).toHaveBeenCalledTimes(2);

    selector(baseState, ctxA);
    expect(combiner).toHaveBeenCalledTimes(2);

    selector(baseState, ctxC);
    expect(combiner).toHaveBeenCalledTimes(3);

    selector(baseState, ctxA);
    expect(combiner).toHaveBeenCalledTimes(4);
  });

  it('normalizes context values before caching', () => {
    const selector = createReportFightContextSelector<
      TestState,
      [typeof selectValue],
      { value: number; fightId: number | null }
    >([selectValue], (value, context) => ({ value, fightId: context.fightId }));

    const result = selector(baseState, { reportCode: 'R-1', fightId: '2' });

    expect(result).toEqual({ value: 20, fightId: 2 });
  });
});
