import 'dotenv/config';

import axios from 'axios';

import type { GraphqlTestHarnessConfig } from '@graphql/testing/graphqlTestHarness';
import { GraphqlTestHarness } from '@graphql/testing/graphqlTestHarness';

type LogFn = (message: string, ...details: unknown[]) => void;

type ScriptLogger = {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
};

type ResolveAccessTokenOptions = {
  forceRefresh?: boolean;
};

type RunScriptOptions = {
  name?: string;
};

type ScriptContext = {
  logger: ScriptLogger;
  resolveAccessToken: (options?: ResolveAccessTokenOptions) => Promise<string>;
  getGraphqlHarness: (config?: GraphqlTestHarnessConfig) => Promise<GraphqlTestHarness>;
};

const DEFAULT_SCRIPT_NAME = 'script';
const DEFAULT_TOKEN_URL = process.env.OAUTH_PROVIDER_TOKEN_URL ??
  process.env.ESOLOGS_TOKEN_URL ??
  'https://www.esologs.com/oauth/token';

let cachedToken: string | null = typeof process.env.ESOLOGS_TOKEN === 'string' && process.env.ESOLOGS_TOKEN.length > 0
  ? process.env.ESOLOGS_TOKEN
  : null;

function createLogger(name: string): ScriptLogger {
  const prefix = `[${name}]`;

  const format = (level: string, message: string, details: unknown[]): void => {
    if (details.length === 0) {
      console.log(`${prefix} ${level} ${message}`);
      return;
    }
    console.log(`${prefix} ${level} ${message}`, ...details);
  };

  return {
    info: (message, ...details) => format('INFO', message, details),
    warn: (message, ...details) => format('WARN', message, details),
    error: (message, ...details) => format('ERROR', message, details),
  };
}

function assertOAuthCredentials(): void {
  if (cachedToken) {
    return;
  }

  if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
    throw new Error('Missing ESO Logs OAuth credentials. Provide ESOLOGS_TOKEN or OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET.');
  }
}

async function fetchAccessToken(): Promise<string> {
  assertOAuthCredentials();

  if (cachedToken) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.OAUTH_CLIENT_ID as string,
    client_secret: process.env.OAUTH_CLIENT_SECRET as string,
  });

  const response = await axios.post(DEFAULT_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const token = typeof response.data === 'object' && response.data !== null && 'access_token' in response.data
    ? (response.data as Record<string, unknown>).access_token
    : undefined;

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('ESO Logs token endpoint returned an invalid token.');
  }

  cachedToken = token;
  process.env.ESOLOGS_TOKEN = token;
  return token;
}

function withGraphqlHarness(
  logger: ScriptLogger,
): (config?: GraphqlTestHarnessConfig) => Promise<GraphqlTestHarness> {
  let harness: GraphqlTestHarness | null = null;

  return async (config?: GraphqlTestHarnessConfig): Promise<GraphqlTestHarness> => {
    if (harness) {
      return harness;
    }

    const accessToken = await fetchAccessToken();
    harness = new GraphqlTestHarness({
      accessToken,
      ...config,
    });

    logger.info('GraphQL harness initialized');
    return harness;
  };
}

async function disposeHarness(harness: GraphqlTestHarness | null, logger: ScriptLogger): Promise<void> {
  if (!harness) {
    return;
  }

  try {
    await harness.dispose();
    logger.info('GraphQL harness disposed');
  } catch (error) {
    logger.warn('Failed to dispose GraphQL harness', error);
  }
}

async function resolveAccessToken(options?: ResolveAccessTokenOptions): Promise<string> {
  if (options?.forceRefresh) {
    cachedToken = null;
  }

  if (cachedToken && !options?.forceRefresh) {
    return cachedToken;
  }

  return fetchAccessToken();
}

async function runScriptInternal(
  handler: (context: ScriptContext) => Promise<void> | void,
  options?: RunScriptOptions,
): Promise<void> {
  const name = options?.name ?? DEFAULT_SCRIPT_NAME;
  const logger = createLogger(name);
  let harnessInstance: GraphqlTestHarness | null = null;

  try {
    const context: ScriptContext = {
      logger,
      resolveAccessToken,
      getGraphqlHarness: async (config?: GraphqlTestHarnessConfig) => {
        if (!harnessInstance) {
          harnessInstance = await withGraphqlHarness(logger)(config);
        }
        return harnessInstance;
      },
    };

    await handler(context);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      if (error.stack) {
        logger.error('Stack trace', error.stack);
      }
    } else {
      logger.error('Script failed with non-error value', error);
    }
    process.exitCode = 1;
  } finally {
    await disposeHarness(harnessInstance, logger);
  }
}

export type { RunScriptOptions, ScriptContext, ScriptLogger };
export { runScriptInternal as runScript };
