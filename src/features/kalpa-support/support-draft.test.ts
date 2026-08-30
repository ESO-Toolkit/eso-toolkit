import {
  captureKalpaSupportDraft,
  getStoredSupportDraft,
  watchKalpaSupportHandoff,
  getSupportIdempotencyKey,
  neutralizeMentions,
  parseSupportPayload,
  renderSupportReport,
  sha256Hex,
  SUPPORT_DRAFT_ERROR_KEY,
  SUPPORT_DRAFT_KEY,
  SUPPORT_FRAGMENT_MAX_LENGTH,
  SUPPORT_IDEMPOTENCY_KEY,
  SUPPORT_REPORT_MAX_LENGTH,
  SUPPORT_RESULT_KEY,
  verifySupportReport,
} from './support-draft';
import { supportContractCases, supportDraftFixture } from './support-fixtures';

function encodeFragment(payload: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * True when the string contains no unpaired surrogate. `String#isWellFormed`
 * would say the same thing, but it is ES2024 and this package targets ES2022.
 */
function isWellFormed(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
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

  it('redacts removable-media mounts and drive-less Windows paths', () => {
    // udisks mounts secondary Steam libraries under /media or
    // /run/media/<username>; those carry the account name exactly as /home
    // does, and so does a Windows path that has lost its drive letter.
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      description:
        '/run/media/bob/SteamLibrary/ESO failed; /media/bob/ext broke; Users\\Brayden\\Documents\\AddOns is wrong',
    });

    expect(parsed.description).not.toContain('bob');
    expect(parsed.description).not.toContain('Brayden');
    expect(parsed.description.match(/\[local path\]/g)).toHaveLength(3);
  });

  it('leaves ordinary prose that merely starts with a path keyword alone', () => {
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      description: 'Users of this addon report a crash',
    });
    expect(parsed.description).toBe('Users of this addon report a crash');
  });

  it('never renders a lone surrogate, however the client got one there', () => {
    // A cut inside a surrogate pair leaves a string that is not well-formed.
    // Discord rejects the message, and since the channel already exists every
    // retry fails identically.
    const parsed = parseSupportPayload({
      ...supportDraftFixture(),
      description: `lead ${String.fromCharCode(0xd83d)} trail`,
    });
    expect(isWellFormed(parsed.description)).toBe(true);
    expect(isWellFormed(renderSupportReport(parsed))).toBe(true);
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

  it('requires the environment block from version 2 onward and rejects it for version 1', () => {
    const { environment: _dropped, ...withoutEnvironment } = supportDraftFixture();
    expect(() => parseSupportPayload(withoutEnvironment)).toThrow('environment');
    expect(() => parseSupportPayload({ ...supportDraftFixture(), version: 1 })).toThrow(
      'environment',
    );
    expect(() => parseSupportPayload({ ...supportDraftFixture(), version: 4 })).toThrow('version');
  });

  it('holds version 3 and the report hash to each other', () => {
    const { reportSha256: hash, ...withoutHash } = supportDraftFixture();
    // Version 3 without the hash: a Kalpa that quietly stopped sending it must
    // be rejected here, not silently downgraded to an unverified report.
    expect(() => parseSupportPayload(withoutHash)).toThrow('hash');
    // The hash without version 3: the key set is exact per version, so a
    // version-2 payload cannot smuggle a field no version-2 reader checks.
    expect(() => parseSupportPayload({ ...withoutHash, version: 2, reportSha256: hash })).toThrow(
      'hash',
    );
    for (const malformed of ['', hash!.toUpperCase(), hash!.slice(0, 63), `${hash!}0`]) {
      expect(() =>
        parseSupportPayload({ ...supportDraftFixture(), reportSha256: malformed }),
      ).toThrow('hash');
    }
    // A version-2 report predates the hash and stays accepted, so a Kalpa build
    // already in the wild keeps working against this page.
    expect(parseSupportPayload({ ...withoutHash, version: 2 }).reportSha256).toBeUndefined();
  });

  it('computes real SHA-256 over the report text', () => {
    // Fixed vectors: the Worker uses the platform digest and this page hand
    // writes one, so only a known answer keeps them the same function.
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('a'.repeat(56))).toBe(
      'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
    );
    expect(sha256Hex('\u{1F600}')).toBe(
      'f0443a342c5ef54783a111b51ba56c938e474c32324d90c3a60c9c8e3a37e2d9',
    );
  });

  it('verifies every fixture case against this page own rendering rules', () => {
    // The cross-repository invariant. Kalpa and the Worker each hold their own
    // hand-copied copy of these rules; if this page drifts from either, exactly
    // this assertion fails, in this repository.
    for (const entry of supportContractCases()) {
      const parsed = parseSupportPayload(entry.payload);
      expect(renderSupportReport(parsed)).toBe(entry.report);
      expect(verifySupportReport(parsed)).toBe(
        parsed.reportSha256 === undefined ? 'unverifiable' : 'match',
      );
    }
  });

  it('reports a mismatch when the hash does not cover what this page renders', () => {
    // Stands in for the real failure: this page's redaction or rendering rules
    // having drifted from Kalpa's, so the preview is not what the user reviewed.
    const drifted = parseSupportPayload({
      ...supportDraftFixture(),
      reportSha256: 'a'.repeat(64),
    });
    expect(verifySupportReport(drifted)).toBe('mismatch');
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
