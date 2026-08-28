import {
  captureKalpaSupportDraft,
  getStoredSupportDraft,
  getSupportIdempotencyKey,
  neutralizeMentions,
  parseSupportPayload,
  renderSupportReport,
  SUPPORT_DRAFT_KEY,
  SUPPORT_FRAGMENT_MAX_LENGTH,
  SUPPORT_IDEMPOTENCY_KEY,
  SUPPORT_REPORT_MAX_LENGTH,
} from './support-draft';
import { supportDraftFixture } from './support-fixtures';

function encodeFragment(payload: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('Kalpa support draft contract', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/kalpa/support');
  });

  it('redacts paths, secrets, account IDs, and neutralizes mentions', () => {
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      description: 'token=abc @here 123456789012345678 C:\\Users\\Alice\\SavedVariables',
    });
    const report = renderSupportReport(parsed);

    expect(report).not.toContain('Alice');
    expect(report).not.toContain('abc');
    expect(report).not.toContain('123456789012345678');
    expect(report).not.toMatch(/@here|<@/);
    expect(report).toContain('[local path]');
    expect(report).toContain('[redacted]');
    expect(report.length).toBeLessThanOrEqual(SUPPORT_REPORT_MAX_LENGTH);
  });

  it('rejects client-supplied identity and unknown fields', () => {
    expect(() =>
      parseSupportPayload({ ...supportDraftFixture(), discordUserId: '123456789012345678' }),
    ).toThrow('unsupported field');
  });

  it('caps attention lists, counts, and rendered report size', () => {
    const fixture = supportDraftFixture();
    expect(() =>
      parseSupportPayload({
        ...fixture,
        diagnostics: { ...fixture.diagnostics, addons: 10000 },
      }),
    ).toThrow('count');
    expect(() =>
      parseSupportPayload({
        ...fixture,
        diagnostics: {
          ...fixture.diagnostics,
          attention: Array.from({ length: 13 }, () => fixture.diagnostics.attention[0]),
        },
      }),
    ).toThrow('attention list');
  });

  it('uses the canonical ellipsis when an attention row is truncated', () => {
    const fixture = supportDraftFixture();
    const parsed = parseSupportPayload({
      ...fixture,
      diagnostics: {
        ...fixture.diagnostics,
        attention: [
          {
            ...fixture.diagnostics.attention[0],
            name: 'n'.repeat(100),
            folder: 'f'.repeat(100),
          },
        ],
      },
    });
    const row = renderSupportReport(parsed)
      .split('\n')
      .find((line) => line.startsWith('- n'));

    expect(row).toHaveLength(180);
    expect(row?.endsWith('...')).toBe(true);
  });

  it('captures a valid fragment before clearing it from the URL', () => {
    const encoded = encodeFragment(supportDraftFixture());
    expect(encoded.length).toBeLessThan(SUPPORT_FRAGMENT_MAX_LENGTH);
    window.history.replaceState(null, '', `/kalpa/support#kalpa=${encoded}`);

    captureKalpaSupportDraft();

    expect(window.location.hash).toBe('');
    expect(getStoredSupportDraft()).toMatchObject({ issueId: 'install-update' });
    expect(sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY)).toMatch(/^[\w-]{32,128}$/);
  });

  it('captures a valid fragment when hosted below a preview base path', () => {
    const encoded = encodeFragment(supportDraftFixture());
    window.history.replaceState(null, '', `/dev-previews/pr-1469/kalpa/support/#kalpa=${encoded}`);

    captureKalpaSupportDraft();

    expect(window.location.pathname).toBe('/dev-previews/pr-1469/kalpa/support/');
    expect(window.location.hash).toBe('');
    expect(getStoredSupportDraft()).toMatchObject({ issueId: 'install-update' });
    expect(sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY)).toMatch(/^[\w-]{32,128}$/);
  });

  it('preserves one idempotency key for all retries of the same draft', () => {
    sessionStorage.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(supportDraftFixture()));
    expect(getSupportIdempotencyKey()).toBe(getSupportIdempotencyKey());
  });

  it('does not redact ordinary prose that merely contains the word token', () => {
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      description: 'A token of gratitude for the support team.',
    });
    expect(parsed.description).toBe('A token of gratitude for the support team.');
  });

  it('neutralizes both textual and structured Discord mentions', () => {
    expect(neutralizeMentions('@everyone <@123456789012345678> <#123456789012345678>')).not.toMatch(
      /@everyone|<@|<#/,
    );
  });

  it('rejects unknown platform values', () => {
    expect(() =>
      parseSupportPayload({ ...supportDraftFixture(), platform: 'browser supplied' }),
    ).toThrow('platform');
  });
});
