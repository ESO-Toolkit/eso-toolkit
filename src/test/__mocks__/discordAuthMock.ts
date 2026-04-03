/**
 * Jest mock for discord-auth.ts which uses import.meta.env
 * that ts-jest cannot parse.
 */

export const DISCORD_TOKEN_KEY = 'discord_access_token';
export const DISCORD_EXPIRY_KEY = 'discord_token_expires_at';

export function startDiscordAuth(_returnPath?: string): void {
  // no-op in tests
}

export function validateOAuthState(_stateParam: string | null): boolean {
  return false;
}

export async function exchangeDiscordCode(_code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  throw new Error('Not implemented in test mock');
}

export function getDiscordReturnPath(): string {
  return '/';
}

export async function getMutualGuildsFromApi(
  _accessToken: string,
): Promise<{ id: string; name: string; icon: string | null }[]> {
  return [];
}

export function getGuildIconUrl(
  _guildId: string,
  _iconHash: string | null,
  _size?: number,
): string | null {
  return null;
}

export function getBotInviteUrl(): string {
  return 'https://discord.com/oauth2/authorize';
}

export class DiscordAuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscordAuthExpiredError';
  }
}
