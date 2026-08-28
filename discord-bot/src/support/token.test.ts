import { describe, expect, it } from 'vitest';
import { auditHash, mintSupportSession, verifySupportSession } from './token';

const SECRET = 'a-secure-test-secret-that-is-longer-than-32-characters';
const USER = { id: '222222222222222222', username: 'Tester' };

describe('support session tokens', () => {
  it('authenticates the server-derived Discord identity for ten minutes', async () => {
    const minted = await mintSupportSession(SECRET, USER, 1_000_000);
    const claims = await verifySupportSession(SECRET, minted.token, 1_599_000);
    expect(claims).toMatchObject({ sub: USER.id, username: USER.username, aud: 'kalpa-support' });
  });

  it('rejects expired, tampered, malformed, and wrong-secret tokens', async () => {
    const minted = await mintSupportSession(SECRET, USER, 1_000_000);
    expect(await verifySupportSession(SECRET, minted.token, 1_600_000)).toBeNull();
    expect(await verifySupportSession(SECRET, `${minted.token}x`, 1_001_000)).toBeNull();
    expect(await verifySupportSession(`${SECRET}-different`, minted.token, 1_001_000)).toBeNull();
    expect(await verifySupportSession(SECRET, 'not.a.valid.token', 1_001_000)).toBeNull();
    expect(await verifySupportSession(SECRET, 'x'.repeat(2_049), 1_001_000)).toBeNull();
  });

  it('rejects support secrets that are too short', async () => {
    await expect(mintSupportSession('too-short', USER)).rejects.toThrow(/at least 32/);
    await expect(auditHash('too-short', `user:${USER.id}`)).rejects.toThrow(/at least 32/);
    await expect(verifySupportSession('too-short', 'payload.signature')).resolves.toBeNull();
  });

  it('creates stable non-reversible audit identifiers', async () => {
    const first = await auditHash(SECRET, `user:${USER.id}`);
    expect(first).toBe(await auditHash(SECRET, `user:${USER.id}`));
    expect(first).not.toContain(USER.id);
    expect(first).toHaveLength(20);
  });
});
