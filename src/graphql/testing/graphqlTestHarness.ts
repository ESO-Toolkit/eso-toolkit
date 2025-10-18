import type {
  ApolloQueryResult,
  ErrorPolicy,
  FetchPolicy,
  OperationVariables,
} from '@apollo/client';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { DocumentNode, OperationDefinitionNode } from 'graphql';

import { createEsoLogsClient, EsoLogsClient } from '../../esologsClient';

type Logger = (event: string, details?: Record<string, unknown>) => void;

type GraphqlTestHarnessConfig = {
  client?: EsoLogsClient;
  accessToken?: string;
  defaultFetchPolicy?: FetchPolicy;
  defaultContext?: Record<string, unknown>;
  logger?: Logger;
};

type ExecuteOptions<TVariables extends OperationVariables> = {
  variables?: TVariables;
  fetchPolicy?: FetchPolicy;
  context?: Record<string, unknown>;
  logLabel?: string;
  errorPolicy?: ErrorPolicy;
};

type InternalQueryOptions<TVariables extends OperationVariables> = {
  query: DocumentNode;
  fetchPolicy: FetchPolicy;
  variables?: TVariables;
  context?: Record<string, unknown>;
  errorPolicy?: ErrorPolicy;
};

const DEFAULT_FETCH_POLICY: FetchPolicy = 'no-cache';

function resolveOperationName(document: DocumentNode): string | undefined {
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === 'OperationDefinition' && Boolean(definition.name),
  );

  return operation?.name?.value;
}

class GraphqlTestHarness {
  private readonly client: EsoLogsClient;

  private readonly shouldDisposeClient: boolean;

  private readonly defaultFetchPolicy: FetchPolicy;

  private readonly defaultContext: Record<string, unknown>;

  private readonly logger?: Logger;

  constructor(config: GraphqlTestHarnessConfig = {}) {
    this.logger = config.logger;
    this.defaultFetchPolicy = config.defaultFetchPolicy ?? DEFAULT_FETCH_POLICY;
    this.defaultContext = config.defaultContext ?? {};

    if (config.client) {
      this.client = config.client;
      this.shouldDisposeClient = false;
      return;
    }

    const accessToken = config.accessToken ?? process.env.ESOLOGS_TOKEN;
    if (!accessToken) {
      throw new Error(
        'GraphqlTestHarness requires either an EsoLogsClient instance or an ESOLOGS_TOKEN access token.',
      );
    }

    this.client = createEsoLogsClient(accessToken);
    this.shouldDisposeClient = true;
  }

  async execute<TData, TVariables extends OperationVariables = OperationVariables>(
    document: TypedDocumentNode<TData, TVariables> | DocumentNode,
    options: ExecuteOptions<TVariables> = {},
  ): Promise<TData> {
    this.log('graphql:execute', {
      label: options.logLabel,
      operation: resolveOperationName(document as DocumentNode),
      fetchPolicy: options.fetchPolicy ?? this.defaultFetchPolicy,
      errorPolicy: options.errorPolicy,
    });

    const queryOptions = this.buildQueryOptions<TVariables>(document, options);
    return this.client.query<TData, TVariables>(queryOptions as never);
  }

  async executeRaw<TData, TVariables extends OperationVariables = OperationVariables>(
    document: TypedDocumentNode<TData, TVariables> | DocumentNode,
    options: ExecuteOptions<TVariables> = {},
  ): Promise<ApolloQueryResult<TData>> {
    this.log('graphql:executeRaw', {
      label: options.logLabel,
      operation: resolveOperationName(document as DocumentNode),
      fetchPolicy: options.fetchPolicy ?? this.defaultFetchPolicy,
    });

    const queryOptions = this.buildQueryOptions<TVariables>(document, options);
    return this.client.getClient().query(queryOptions as never) as Promise<
      ApolloQueryResult<TData>
    >;
  }

  async executeAndExtract<
    TData,
    TResult,
    TVariables extends OperationVariables = OperationVariables,
  >(
    document: TypedDocumentNode<TData, TVariables> | DocumentNode,
    selector: (data: TData) => TResult,
    options: ExecuteOptions<TVariables> = {},
  ): Promise<TResult> {
    const data = await this.execute(document, options);
    const extracted = selector(data);

    if (typeof extracted === 'undefined') {
      throw new Error(
        'GraphqlTestHarness selector returned undefined. Confirm the selection path.',
      );
    }

    return extracted;
  }

  getClient(): EsoLogsClient {
    return this.client;
  }

  async dispose(): Promise<void> {
    if (!this.shouldDisposeClient) {
      return;
    }

    try {
      await this.client.clearStore();
    } catch (error) {
      this.log('graphql:clearStoreFailed', { error });
    }

    try {
      this.client.stop();
    } catch (error) {
      this.log('graphql:stopFailed', { error });
    }
  }

  private buildQueryOptions<TVariables extends OperationVariables = OperationVariables>(
    document: TypedDocumentNode<unknown, TVariables> | DocumentNode,
    options: ExecuteOptions<TVariables>,
  ): InternalQueryOptions<TVariables> {
    const queryOptions: InternalQueryOptions<TVariables> = {
      query: document as DocumentNode,
      fetchPolicy: options.fetchPolicy ?? this.defaultFetchPolicy,
    };

    if (options.variables) {
      queryOptions.variables = options.variables;
    }

    if (options.errorPolicy) {
      queryOptions.errorPolicy = options.errorPolicy;
    }

    const mergedContext = {
      ...this.defaultContext,
      ...(options.context ?? {}),
    };

    if (Object.keys(mergedContext).length > 0) {
      queryOptions.context = mergedContext;
    }

    return queryOptions;
  }

  private log(event: string, details?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }

    try {
      this.logger(event, details);
    } catch {
      // Ignore logger failures to keep harness execution deterministic.
    }
  }
}

export type { ExecuteOptions, GraphqlTestHarnessConfig };
export { GraphqlTestHarness };
