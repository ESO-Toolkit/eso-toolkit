import { gql } from '@apollo/client';
import type { DocumentNode } from 'graphql';

import { EsoLogsClient } from '../../esologsClient';
import { GraphqlTestHarness } from './graphqlTestHarness';

const createStubClient = () => {
  const apolloQuery = jest.fn();
  const query = jest.fn();
  const getClient = jest.fn().mockReturnValue({
    query: apolloQuery,
  });
  const clearStore = jest.fn().mockResolvedValue([]);
  const stop = jest.fn();

  return {
    client: {
      query,
      getClient,
      clearStore,
      stop,
    } as unknown as EsoLogsClient,
    query,
    apolloQuery,
    getClient,
    clearStore,
    stop,
  };
};

describe('GraphqlTestHarness', () => {
  const testDocument: DocumentNode = gql`
    query TestOperation($id: Int) {
      test(id: $id) {
        id
      }
    }
  `;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ESOLOGS_TOKEN;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes queries against a provided client', async () => {
    const { client, query } = createStubClient();
    query.mockResolvedValue({ value: 42 });

    const harness = new GraphqlTestHarness({ client });
    const variables = { id: 7 } as const;

    const result = await harness.execute(testDocument, { variables });

    expect(result).toEqual({ value: 42 });
    expect(query).toHaveBeenCalledWith({
      context: undefined,
      fetchPolicy: 'no-cache',
      query: testDocument,
      variables,
    });
  });

  it('merges default and per-call contexts', async () => {
    const { client, query } = createStubClient();
    query.mockResolvedValue({ ok: true });

    const harness = new GraphqlTestHarness({
      client,
      defaultContext: { auth: 'token' },
      defaultFetchPolicy: 'cache-first',
    });

    await harness.execute(testDocument, {
      context: { requestId: 'abc', auth: 'override' },
      fetchPolicy: 'network-only',
    });

    expect(query).toHaveBeenCalledWith({
      query: testDocument,
      fetchPolicy: 'network-only',
      context: { auth: 'override', requestId: 'abc' },
      variables: undefined,
    });
  });

  it('returns raw Apollo results when requested', async () => {
    const { client, apolloQuery, getClient } = createStubClient();
    apolloQuery.mockResolvedValue({ data: { hello: 'world' }, loading: false });

    const harness = new GraphqlTestHarness({ client });
    const response = await harness.executeRaw(testDocument);

    expect(response).toEqual({ data: { hello: 'world' }, loading: false });
    expect(getClient).toHaveBeenCalled();
    expect(apolloQuery).toHaveBeenCalledWith({
      query: testDocument,
      fetchPolicy: 'no-cache',
      context: undefined,
      variables: undefined,
    });
  });

  it('extracts data via selector helpers', async () => {
    const { client, query } = createStubClient();
    query.mockResolvedValue({ data: { value: [1, 2, 3] } });

    const harness = new GraphqlTestHarness({ client });
    const extracted = await harness.executeAndExtract<{ data: { value: number[] } }, number[]>(
      testDocument,
      (data) => data.data.value,
    );

    expect(extracted).toEqual([1, 2, 3]);
  });

  it('throws when selector returns undefined', async () => {
    const { client, query } = createStubClient();
    query.mockResolvedValue({ data: null });

    const harness = new GraphqlTestHarness({ client });

    await expect(
      harness.executeAndExtract(testDocument, (data) => (data as any)?.missing?.field),
    ).rejects.toThrow('selector returned undefined');
  });

  it('supports owning the client via environment token', async () => {
    const clearStoreSpy = jest.spyOn(EsoLogsClient.prototype, 'clearStore').mockResolvedValue([]);
    const stopSpy = jest.spyOn(EsoLogsClient.prototype, 'stop').mockImplementation(() => {});

    process.env.ESOLOGS_TOKEN = 'token';

    const harness = new GraphqlTestHarness();
    await harness.dispose();

    expect(clearStoreSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('does not dispose provided clients', async () => {
    const { client, clearStore, stop } = createStubClient();
    const harness = new GraphqlTestHarness({ client });

    await harness.dispose();

    expect(clearStore).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
  });

  it('requires either an access token or an existing client', () => {
    expect(() => new GraphqlTestHarness()).toThrow('ESOLOGS_TOKEN access token');
  });

  it('logs execution events when a logger is provided', async () => {
    const { client, query } = createStubClient();
    query.mockResolvedValue({ ok: true });
    const logger = jest.fn();

    const harness = new GraphqlTestHarness({ client, logger });
    await harness.execute(testDocument, { logLabel: 'custom' });

    expect(logger).toHaveBeenCalledWith(
      'graphql:execute',
      expect.objectContaining({ label: 'custom', operation: 'TestOperation' }),
    );
  });
});
