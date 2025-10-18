import { execSync } from 'node:child_process';

import { runScript } from './_runner/bootstrap';

const SCRIPT_NAME = 'run-codegen';
const CODEGEN_COMMAND = 'npx graphql-codegen --config codegen.yml';

runScript(async ({ resolveAccessToken, logger }) => {
  logger.info('Resolving ESO Logs access token...');
  const token = await resolveAccessToken();
  logger.info('Access token available');

  process.env.ESOLOGS_TOKEN = token;

  logger.info('Executing GraphQL code generation');
  try {
    execSync(CODEGEN_COMMAND, { stdio: 'inherit' });
    logger.info('GraphQL code generation completed');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('GraphQL codegen failed', error.message);
      throw error;
    }
    throw new Error(`GraphQL codegen failed with non-error value: ${String(error)}`);
  }
}, { name: SCRIPT_NAME });
