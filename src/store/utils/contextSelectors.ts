import { createSelector } from '@reduxjs/toolkit';

import type {
  ReportFightContext,
  ReportFightContextInput,
  SelectorCacheOptions,
} from '../contextTypes';

import {
  createReportFightCacheKey,
  DEFAULT_REPORT_FIGHT_SELECTOR_CACHE_LIMIT,
  normalizeReportFightContext,
} from './cacheKeys';

type ReportFightInputSelector<State, Result> = (
  state: State,
  context: ReportFightContext,
) => Result;

type SelectorResults<State, Selectors extends Array<ReportFightInputSelector<State, unknown>>> = {
  [Index in keyof Selectors]: Selectors[Index] extends ReportFightInputSelector<State, infer Result>
    ? Result
    : never;
};

/**
 * Memoizes a selector per report/fight key, avoiding the need to re-create selectors manually when
 * switching across different fights.
 */
export const createReportFightContextSelector = <
  State,
  Selectors extends Array<ReportFightInputSelector<State, unknown>>,
  Result,
>(
  inputSelectors: [...Selectors],
  combiner: (...args: [...SelectorResults<State, Selectors>, ReportFightContext]) => Result,
  options: SelectorCacheOptions = {},
): ((state: State, context: ReportFightContextInput) => Result) => {
  const cacheLimit = Math.max(1, options.cacheLimit ?? DEFAULT_REPORT_FIGHT_SELECTOR_CACHE_LIMIT);
  const selectorCache = new Map<string, (state: State) => Result>();
  const cacheOrder: string[] = [];

  return (state: State, contextInput: ReportFightContextInput) => {
    const normalizedContext = normalizeReportFightContext(contextInput);
    const cacheKey = createReportFightCacheKey(normalizedContext);

    let selector = selectorCache.get(cacheKey);
    if (!selector) {
      const stateSelectors = inputSelectors.map(
        (inputSelector) => (localState: State) => inputSelector(localState, normalizedContext),
      );
      const composedSelector = createSelector(
        [...stateSelectors, () => normalizedContext],
        (...values) => {
          const context = values[values.length - 1] as ReportFightContext;
          const resultInputs = values.slice(0, -1) as SelectorResults<State, Selectors>;
          return combiner(...resultInputs, context);
        },
      );

      selector = composedSelector;
      selectorCache.set(cacheKey, selector);
      cacheOrder.push(cacheKey);

      if (selectorCache.size > cacheLimit) {
        const oldestKey = cacheOrder.shift();
        if (oldestKey) {
          selectorCache.delete(oldestKey);
        }
      }
    }

    return selector(state);
  };
};
