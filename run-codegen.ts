// Script to fetch ESO Logs access token and run GraphQL codegen (TypeScript)
import { resolve } from 'path';
import axios from 'axios';
import { execSync } from 'child_process';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '.env') });

const EXISTING_TOKEN = process.env.ESOLOGS_TOKEN;
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const TOKEN_URL =
  process.env.OAUTH_PROVIDER_TOKEN_URL || 'https://www.esologs.com/oauth/token';

if (!EXISTING_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
  console.error('Missing ESOLOGS_TOKEN or OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET in .env');
  process.exit(1);
}

async function getAccessToken(): Promise<string> {
  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID || '',
      client_secret: CLIENT_SECRET || '',
    });
    const response = await axios.post(TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    // Cast response to expected type
    if (typeof response.data === 'object' && response.data !== null && 'access_token' in response.data) {
      return (response.data as { access_token: string }).access_token;
    }
    throw new Error('Invalid response from token endpoint');
  } catch (err) {
    // Type guard for axios error
    if (err && typeof err === 'object' && 'isAxiosError' in err && (err as any).isAxiosError) {
      const axiosErr = err as any;
      console.error(
        'Failed to fetch access token:',
        axiosErr.response?.data || axiosErr.message,
      );
    } else if (err instanceof Error) {
      console.error('Failed to fetch access token:', err.message);
    } else {
      console.error('Failed to fetch access token:', err);
    }
    process.exit(1);
  }
}

(async () => {
  const token = EXISTING_TOKEN || (await getAccessToken());
  if (!token) {
    console.error('No access token received.');
    process.exit(1);
  }
  process.env.ESOLOGS_TOKEN = token;
  // Run graphql-codegen
  try {
    execSync('npx graphql-codegen --config codegen.yml', { stdio: 'inherit' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('GraphQL codegen failed:', err.message);
    } else {
      console.error('GraphQL codegen failed:', err);
    }
    process.exit(1);
  }
})();
