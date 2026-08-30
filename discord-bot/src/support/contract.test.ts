import { describe, expect, it } from 'vitest';
import sharedFixture from '../../../src/features/kalpa-support/support-contract-fixture.json';
import {
  neutralizeMentions,
  parseSupportPayload,
  renderSupportReport,
  SupportValidationError,
} from './contract';

export function supportFixture() {
  return {
    version: 2,
    issueId: 'install-update',
    description:
      'Update failed for @everyone at C:\\Users\\Private Name\\Documents; bearer super-secret',
    appVersion: '0.18.0',
    platform: 'windows',
    environment: {
      osVersion: '10.0.26200',
      arch: 'x86_64',
      tauri: '2.9.1',
      webview: 'Chromium 138',
    },
    generatedAt: '2026-08-28T12:00:00.000Z',
    connection: 'online',
    updateState: 'complete',
    instanceLabel: 'Live',
    diagnostics: {
      addons: 2,
      libraries: 1,
      disabled: 0,
      checked: 2,
      updates: 1,
      dependencyWarnings: 1,
      modified: 0,
      lastError: 'Account 123456789012345678 and <@123456789012345678>',
      attention: [
        {
          name: 'Addon One',
          folder: 'AddonOne',
          currentVersion: '1.0',
          availableVersion: '1.1',
          missingDependencies: 1,
          outdatedDependencies: 0,
          modifiedFiles: 0,
        },
      ],
    },
  } as const;
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

describe('Kalpa support contract', () => {
  it.each(sharedFixture.cases.map((entry) => [entry.name, entry] as const))(
    'renders the shared client/server contract fixture exactly: %s',
    (_name, entry) => {
      expect(renderSupportReport(parseSupportPayload(entry.payload))).toBe(entry.report);
    },
  );

  it('normalizes every environment field and falls back to unknown', () => {
    const parsed = parseSupportPayload({
      ...supportFixture(),
      environment: {
        osVersion: 'Windows 11 Home (DESKTOP-ABC123)',
        arch: 'AArch64',
        tauri: '2.9.1-beta.2',
        webview: 'Chromium 138.0.3296.62',
      },
    });

    expect(parsed.environment).toEqual({
      osVersion: 'unknown',
      arch: 'aarch64',
      tauri: '2.9.1-beta.2',
      webview: 'unknown',
    });
    const report = renderSupportReport(parsed);
    expect(report).not.toContain('DESKTOP-ABC123');
    expect(report).toContain('- OS build: unknown');
    expect(report).toContain('- CPU architecture: aarch64');
  });

  it('rejects environment fields outside the allow-list and version mismatches', () => {
    expect(() =>
      parseSupportPayload({
        ...supportFixture(),
        environment: { ...supportFixture().environment, hostname: 'DESKTOP-ABC123' },
      }),
    ).toThrow(SupportValidationError);
    expect(() =>
      parseSupportPayload({
        ...supportFixture(),
        environment: { ...supportFixture().environment, username: 'brayden' },
      }),
    ).toThrow(SupportValidationError);
    const { environment: _dropped, ...withoutEnvironment } = supportFixture();
    expect(() => parseSupportPayload(withoutEnvironment)).toThrow(SupportValidationError);
    expect(() => parseSupportPayload({ ...supportFixture(), version: 1 })).toThrow(
      SupportValidationError,
    );
    expect(() => parseSupportPayload({ ...supportFixture(), version: 3 })).toThrow(
      SupportValidationError,
    );
  });

  it('is a no-op on a payload Kalpa already cleaned', () => {
    // Kalpa redacts and truncates before the user reviews the report. If this
    // validation then changed anything, the message posted to Discord would not
    // be the message the user consented to. Every fixture case is run through
    // twice: the second pass must be byte-identical.
    for (const entry of sharedFixture.cases) {
      const once = parseSupportPayload(entry.payload);
      const twice = parseSupportPayload(JSON.parse(JSON.stringify(once)));
      expect(twice).toEqual(once);
      expect(renderSupportReport(twice)).toBe(renderSupportReport(once));
    }
  });

  it('does not expand a truncated redaction into a longer one', () => {
    // The exact shape Kalpa must never emit: a cut that lands inside the
    // `[redacted]` token the first pass produced.
    const cut = `${'x'.repeat(60)} bearer [redac`;
    const parsed = parseSupportPayload({ ...supportFixture(), description: cut });

    expect(parsed.description).not.toBe(cut);
    expect(parsed.description).toContain('bearer [redacted]');
    // Kalpa's clamp is what guarantees this input never reaches here; the
    // assertion documents why that clamp exists.
    expect(parsed.description.length).toBeGreaterThan(cut.length);
  });

  it('keeps forbidden identity and device fields out of every rendered report', () => {
    const report = renderSupportReport(parseSupportPayload(supportFixture()));
    for (const forbidden of [
      'hostname',
      'username',
      'macAddress',
      'deviceId',
      'serialNumber',
      'locale',
      'ipAddress',
    ]) {
      expect(report).not.toContain(forbidden);
    }
  });

  it('redacts sensitive identifiers and paths and neutralizes Discord mentions', () => {
    const report = renderSupportReport(parseSupportPayload(supportFixture()));
    expect(report).toContain('[local path]');
    expect(report).toContain('bearer [redacted]');
    expect(report).toContain('[account-id]');
    expect(report).toContain('@\u200beveryone');
    expect(report).not.toContain('Private Name');
    expect(report).not.toContain('Name');
    expect(report).not.toContain('super-secret');
    expect(report).not.toContain('123456789012345678');
  });

  it('redacts non-home absolute paths and strips non-printing control characters', () => {
    const parsed = parseSupportPayload({
      ...supportFixture(),
      description: 'D:\\Games\\ESO\\AddOns and /var/lib/private\u0007',
    });

    expect(parsed.description.match(/\[local path\]/g)).toHaveLength(2);
    expect(parsed.description).not.toContain('Games');
    expect(parsed.description).not.toContain('/var/');
    expect(parsed.description).not.toContain('\u0007');
  });

  it('redacts removable-media mounts and drive-less Windows paths', () => {
    // Kalpa supports secondary Steam libraries, which udisks mounts under
    // /media or /run/media/<username>. Those carry the account name exactly as
    // /home does, and so does a Windows path that has lost its drive letter.
    const parsed = parseSupportPayload({
      ...supportFixture(),
      description:
        '/run/media/bob/SteamLibrary/ESO failed; /media/bob/ext broke; Users\\Brayden\\Documents\\AddOns is wrong',
    });

    expect(parsed.description).not.toContain('bob');
    expect(parsed.description).not.toContain('Brayden');
    expect(parsed.description.match(/\[local path\]/g)).toHaveLength(3);
  });

  it('leaves ordinary prose that merely starts with a path keyword alone', () => {
    const parsed = parseSupportPayload({
      ...supportFixture(),
      description: 'Users of this addon report a crash',
    });
    expect(parsed.description).toBe('Users of this addon report a crash');
  });

  it('never emits a lone surrogate, however the client got one there', () => {
    // A cut landing inside a surrogate pair leaves a string that is not
    // well-formed. Discord rejects the message, and because the channel already
    // exists every retry fails identically: an orphan private channel and a
    // ticket the user can never be given.
    const loneSurrogate = String.fromCharCode(0xd83d);
    const parsed = parseSupportPayload({
      ...supportFixture(),
      description: `lead ${loneSurrogate} trail`,
    });
    expect(isWellFormed(parsed.description)).toBe(true);
    expect(JSON.parse(JSON.stringify(parsed.description))).toBe(parsed.description);
  });

  it('rejects a client-crafted report that exceeds Discord limits', () => {
    const input = supportFixture();
    const parsed = parseSupportPayload({
      ...input,
      description: 'x'.repeat(2_000),
      diagnostics: {
        ...input.diagnostics,
        attention: Array.from({ length: 12 }, (_, index) => ({
          ...input.diagnostics.attention[0],
          name: `Very long addon ${index} ${'z'.repeat(70)}`,
        })),
      },
    });
    expect(() => renderSupportReport(parsed)).toThrow('exceeds Discord limits');
  });

  it('renders every accepted attention row without hidden truncation', () => {
    const input = supportFixture();
    const parsed = parseSupportPayload({
      ...input,
      diagnostics: {
        ...input.diagnostics,
        attention: [
          {
            ...input.diagnostics.attention[0],
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
      `- ${'n'.repeat(80)} (${'f'.repeat(80)}): Kalpa sees 1.0 -> 1.1; 1 missing dependency warning(s)`,
    );
    expect(row).not.toContain('...');
  });

  it('rejects extra client identity fields, raw data, invalid counts, and oversized arrays', () => {
    expect(() => parseSupportPayload({ ...supportFixture(), discordUserId: '123' })).toThrow(
      SupportValidationError,
    );
    expect(() =>
      parseSupportPayload({ ...supportFixture(), savedVariables: 'raw contents' }),
    ).toThrow(SupportValidationError);
    expect(() =>
      parseSupportPayload({
        ...supportFixture(),
        diagnostics: { ...supportFixture().diagnostics, addons: -1 },
      }),
    ).toThrow(SupportValidationError);
    expect(() =>
      parseSupportPayload({
        ...supportFixture(),
        diagnostics: {
          ...supportFixture().diagnostics,
          attention: Array.from({ length: 13 }, () => supportFixture().diagnostics.attention[0]),
        },
      }),
    ).toThrow(SupportValidationError);
  });

  it('neutralizes role, user, channel, everyone, and here mentions', () => {
    const value = neutralizeMentions(
      '@here <@123456789012345678> <@&123456789012345678> <#123456789012345678>',
    );
    expect(value).not.toMatch(/@here|<@|<#/);
  });

  it('rejects unknown platform values', () => {
    expect(() =>
      parseSupportPayload({ ...supportFixture(), platform: 'browser supplied' }),
    ).toThrow(SupportValidationError);
  });
});
