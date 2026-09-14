import { webcrypto } from 'node:crypto';

import type { Page } from '@playwright/test';
import { print } from 'graphql';

import { hashGraphqlDocument } from '../../roster-hub-api/src/graphql-document-hash';
import { GRAPHQL_QUERY_HASHES } from '../../roster-hub-api/src/graphql-query-manifest';
import {
  buildPreloadGraphQLQueries,
  preloadAllReportData,
  withGraphQLOperationHint,
} from '../../tests/utils/data-preloader';

import {
  GetDamageEventsDocument,
  GetHealingEventsDocument,
  GetPlayersForReportDocument,
  GetReportByCodeDocument,
} from './gql/graphql';

jest.mock('@playwright/test', () => ({
  expect: jest.fn(),
}));

jest.mock('../../tests/screen-sizes/utils', () => ({
  setupAuthentication: jest.fn(),
}));

jest.mock('../../tests/screen-sizes/shared-preprocessing', () => ({
  setupWithSharedPreprocessing: jest.fn(),
}));

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
}

describe('screen-size data preloader GraphQL proxy contract', () => {
  it.each([
    ['getReportByCode', GetReportByCodeDocument],
    ['getPlayersForReport', GetPlayersForReportDocument],
    ['getDamageEvents', GetDamageEventsDocument],
    ['getHealingEvents', GetHealingEventsDocument],
  ])('uses the pinned %s document', async (operationName, document) => {
    const query = print(document);
    const hash = await hashGraphqlDocument(query);

    expect(GRAPHQL_QUERY_HASHES[operationName]).toContain(hash);
  });

  it('maps every warmed query to an allowlisted operation and preserves the operation hint', () => {
    const queries = buildPreloadGraphQLQueries({
      reportCode: 'report-code',
      fightId: '5',
      tabs: ['players', 'damage', 'healing'],
    });

    expect(queries.map((query) => query.operationName)).toEqual([
      'getReportByCode',
      'getPlayersForReport',
      'getDamageEvents',
      'getHealingEvents',
    ]);
    expect(
      withGraphQLOperationHint('/roster-hub-api/graphql?existing=value', 'getDamageEvents'),
    ).toBe('/roster-hub-api/graphql?existing=value&query=getDamageEvents');
  });

  it('sends the required query hint and operationName, then propagates a proxy failure', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ errors: [{ message: 'Unknown or missing operation' }] }),
    }));
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
      writable: true,
    });

    const page = {
      addInitScript: jest.fn().mockResolvedValue(undefined),
      evaluate: jest
        .fn()
        .mockResolvedValueOnce('tab-scoped-token')
        .mockImplementationOnce(async (callback, argument) => callback(argument)),
      goto: jest.fn().mockResolvedValue(undefined),
    } as unknown as Page;

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(
        preloadAllReportData(page, {
          aggressiveWarmup: true,
          tabs: [],
          verifyLoaded: false,
        }),
      ).rejects.toThrow('Data pre-loading failed: GraphQL query failed: 400');

      expect(fetchMock).toHaveBeenCalledWith(
        '/roster-hub-api/graphql?query=getReportByCode',
        expect.objectContaining({
          body: expect.stringContaining('"operationName":"getReportByCode"'),
          headers: expect.objectContaining({ Authorization: 'Bearer tab-scoped-token' }),
          method: 'POST',
        }),
      );
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: originalFetch,
        writable: true,
      });
      consoleError.mockRestore();
    }
  });
});
