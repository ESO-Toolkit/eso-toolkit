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
    version: 1,
    issueId: 'install-update',
    description:
      'Update failed for @everyone at C:\\Users\\Private Name\\Documents; bearer super-secret',
    appVersion: '0.18.0',
    platform: 'windows',
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

describe('Kalpa support contract', () => {
  it('renders the shared client/server contract fixture exactly', () => {
    expect(renderSupportReport(parseSupportPayload(sharedFixture.payload))).toBe(
      sharedFixture.report,
    );
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
