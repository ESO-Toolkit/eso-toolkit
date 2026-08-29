import {
  captureKalpaSupportDraft,
  getStoredSupportDraft,
  watchKalpaSupportHandoff,
  getSupportIdempotencyKey,
  neutralizeMentions,
  parseSupportPayload,
  renderSupportReport,
  SUPPORT_DRAFT_ERROR_KEY,
  SUPPORT_DRAFT_KEY,
  SUPPORT_FRAGMENT_MAX_LENGTH,
  SUPPORT_IDEMPOTENCY_KEY,
  SUPPORT_REPORT_MAX_LENGTH,
  SUPPORT_RESULT_KEY,
} from './support-draft';
import { supportContractCases, supportDraftFixture } from './support-fixtures';

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
      description: 'token=abc @here 123456789012345678 C:\\Users\\Alice Player\\SavedVariables',
    });
    const report = renderSupportReport(parsed);

    expect(report).not.toContain('Alice');
    expect(report).not.toContain('Player');
    expect(report).not.toContain('abc');
    expect(report).not.toContain('123456789012345678');
    expect(report).not.toMatch(/@here|<@/);
    expect(report).toContain('[local path]');
    expect(report).toContain('[redacted]');
    expect(report.length).toBeLessThanOrEqual(SUPPORT_REPORT_MAX_LENGTH);
  });

  it('redacts non-home absolute paths and strips non-printing control characters', () => {
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      description: 'D:\\Games\\ESO\\AddOns and /mnt/c/private\u0007',
    });

    expect(parsed.description.match(/\[local path\]/g)).toHaveLength(2);
    expect(parsed.description).not.toContain('Games');
    expect(parsed.description).not.toContain('/mnt/');
    expect(parsed.description).not.toContain('\u0007');
  });

  it.each(supportContractCases().map((entry) => [entry.name, entry] as const))(
    'renders the shared client/server contract fixture exactly: %s',
    (_name, entry) => {
      expect(renderSupportReport(parseSupportPayload(entry.payload))).toBe(entry.report);
    },
  );

  it('normalizes environment values and falls back to unknown rather than guessing', () => {
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      environment: {
        osVersion: 'Windows 11 Home (DESKTOP-ABC123)',
        arch: 'X86_64',
        tauri: 'nightly',
        webview: 'Chromium 138',
      },
    });

    expect(parsed.environment).toEqual({
      osVersion: 'unknown',
      arch: 'x86_64',
      tauri: 'unknown',
      webview: 'Chromium 138',
    });
    expect(renderSupportReport(parsed)).not.toContain('DESKTOP-ABC123');
  });

  it('rejects environment fields that could identify a machine or its owner', () => {
    for (const forbidden of [
      { hostname: 'DESKTOP-ABC123' },
      { username: 'brayden' },
      { macAddress: '00:11:22:33:44:55' },
      { locale: 'en-GB' },
      { env: 'PATH=/usr/bin' },
    ]) {
      expect(() =>
        parseSupportPayload({
          ...supportDraftFixture(),
          environment: { ...supportDraftFixture().environment, ...forbidden },
        }),
      ).toThrow('unsupported field');
    }
  });

  it('requires the environment block for version 2 and rejects it for version 1', () => {
    const { environment: _dropped, ...withoutEnvironment } = supportDraftFixture();
    expect(() => parseSupportPayload(withoutEnvironment)).toThrow('environment');
    expect(() => parseSupportPayload({ ...supportDraftFixture(), version: 1 })).toThrow(
      'environment',
    );
    expect(() => parseSupportPayload({ ...supportDraftFixture(), version: 3 })).toThrow('version');
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

  it('renders every accepted attention row without hidden truncation', () => {
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

    expect(row).toBe(
      `- ${'n'.repeat(80)} (${'f'.repeat(80)}): Kalpa sees 1.0.0 -> 1.1.0; 1 outdated dependency warning(s)`,
    );
    expect(row).not.toContain('...');
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

  it('captures a second handoff that arrives as a same-document hash change', () => {
    // jsdom cannot navigate, so the reload the listener requests surfaces as a
    // "Not implemented" virtual-console error rather than a real page load. The
    // assertion that matters is that the new report was captured at all.
    const reloadNotice = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      watchKalpaSupportHandoff();
      window.history.replaceState(
        null,
        '',
        `/kalpa/support#kalpa=${encodeFragment(supportDraftFixture())}`,
      );
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      expect(getStoredSupportDraft()).toMatchObject({ issueId: 'install-update' });
      expect(window.location.hash).toBe('');
    } finally {
      reloadNotice.mockRestore();
    }
  });

  it('keeps the idempotency key and the confirmed ticket when the same report is reopened', () => {
    const encoded = encodeFragment(supportDraftFixture());
    window.history.replaceState(null, '', `/kalpa/support#kalpa=${encoded}`);
    captureKalpaSupportDraft();
    const firstKey = sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY);
    sessionStorage.setItem(SUPPORT_RESULT_KEY, JSON.stringify({ status: 'created' }));

    window.history.replaceState(null, '', `/kalpa/support#kalpa=${encoded}`);
    const changed = captureKalpaSupportDraft();

    // A second key here would let a retry create a second Discord channel for
    // the same user intent.
    expect(changed).toBe(false);
    expect(sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY)).toBe(firstKey);
    expect(sessionStorage.getItem(SUPPORT_RESULT_KEY)).not.toBeNull();
  });

  it('mints a new key only for a genuinely different report', () => {
    window.history.replaceState(
      null,
      '',
      `/kalpa/support#kalpa=${encodeFragment(supportDraftFixture())}`,
    );
    captureKalpaSupportDraft();
    const firstKey = sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY);

    const second = { ...supportDraftFixture(), description: 'A different problem entirely.' };
    window.history.replaceState(null, '', `/kalpa/support#kalpa=${encodeFragment(second)}`);

    expect(captureKalpaSupportDraft()).toBe(true);
    expect(sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY)).not.toBe(firstKey);
  });

  it('keeps a confirmed ticket when a malformed second handoff arrives', () => {
    sessionStorage.setItem(SUPPORT_RESULT_KEY, JSON.stringify({ status: 'created' }));
    window.history.replaceState(null, '', '/kalpa/support#kalpa=not-valid-base64url-payload');

    captureKalpaSupportDraft();

    expect(sessionStorage.getItem(SUPPORT_RESULT_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(SUPPORT_DRAFT_ERROR_KEY)).toContain('invalid');
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

  it('stores a generic error for malformed fragments without reflecting decoded input', () => {
    const hostile = encodeFragment('{"secret":"do-not-reflect"');
    window.history.replaceState(null, '', `/kalpa/support#kalpa=${hostile}`);

    captureKalpaSupportDraft();

    expect(sessionStorage.getItem(SUPPORT_DRAFT_ERROR_KEY)).toBe(
      'The support handoff is invalid. Return to Kalpa and prepare it again.',
    );
    expect(sessionStorage.getItem(SUPPORT_DRAFT_ERROR_KEY)).not.toContain('do-not-reflect');
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
