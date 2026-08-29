import type { TicketCategory } from '../types.js';

export const SUPPORT_REPORT_MAX_LENGTH = 1950;
const ISSUE_IDS = [
  'addon-status',
  'install-update',
  'addon-folder',
  'backups-data',
  'log-upload',
  'other',
] as const;
type IssueId = (typeof ISSUE_IDS)[number];

const ISSUES: Record<IssueId, { label: string; note: string; category: TicketCategory }> = {
  'addon-status': {
    label: 'Addon status looks wrong',
    note: 'Kalpa included the addon versions, dependency warnings, and modified-file state it currently sees.',
    category: 'Bug',
  },
  'install-update': {
    label: 'Install or update failed',
    note: 'Kalpa included the addon versions and local file state it currently sees. Please describe the failed step above.',
    category: 'Bug',
  },
  'addon-folder': {
    label: 'Wrong game or addon folder',
    note: 'Kalpa included the detected ESO instance. Local account names and the full folder path stay hidden.',
    category: 'Bug',
  },
  'backups-data': {
    label: 'Backups, profiles, or saved data',
    note: 'Backup contents and SavedVariables are deliberately not collected. Please describe the affected item and action above.',
    category: 'Bug',
  },
  'log-upload': {
    label: 'ESO Logs upload',
    note: 'Combat-log contents and account credentials are deliberately not collected. Please describe the failed upload step above.',
    category: 'Bug',
  },
  other: {
    label: 'Something else',
    note: 'Kalpa included only general app and addon state. Please describe what you were doing above.',
    category: 'Feedback',
  },
};

export interface SupportAttentionItem {
  name: string;
  folder: string;
  currentVersion: string | null;
  availableVersion: string | null;
  missingDependencies: number;
  outdatedDependencies: number;
  modifiedFiles: number;
}

export interface SupportTicketPayload {
  version: 1;
  issueId: IssueId;
  description: string;
  appVersion: string;
  platform: 'windows' | 'macos' | 'linux';
  generatedAt: string;
  connection: 'online' | 'offline';
  updateState: 'checking' | 'complete';
  instanceLabel: string;
  diagnostics: {
    addons: number;
    libraries: number;
    disabled: number;
    checked: number;
    updates: number;
    dependencyWarnings: number;
    modified: number;
    lastError: string | null;
    attention: SupportAttentionItem[];
  };
}

export class SupportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupportValidationError';
  }
}

export function neutralizeMentions(value: string): string {
  return value
    .replace(/@(everyone|here)/gi, '@\u200b$1')
    .replace(/<(?=(@[!&]?\d+|#\d+|t:\d+(?::[tTdDfFR])?|\/[^:>]{1,32}:\d+)>)/g, '<\u200b');
}

function stripNonPrintingControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const isAllowedWhitespace = codePoint === 9 || codePoint === 10 || codePoint === 13;
    const isControlCharacter = codePoint < 32 || (codePoint >= 127 && codePoint <= 159);
    return isControlCharacter && !isAllowedWhitespace ? '' : character;
  }).join('');
}

function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string' || value.length > max * 4) {
    throw new SupportValidationError('A text field is invalid');
  }
  const redacted = stripNonPrintingControlCharacters(
    neutralizeMentions(value)
      .replace(
        /(?:[A-Za-z]:[\\/]+|[\\/]+(?:Users|home|mnt|opt|var|tmp|etc|srv|Volumes)[\\/]+)[^\r\n,;]+?(?=\s+(?:and|at|from|with|then)\b|[,;\r\n]|$)/gi,
        '[local path]',
      )
      .replace(/\\\\[^\r\n,;]+?(?=\s+(?:and|at|from|with|then)\b|[,;\r\n]|$)/g, '[local path]')
      .replace(
        /\b(authorization|bearer|access[_ -]?token|refresh[_ -]?token|api[_ -]?key|client[_ -]?secret)\b(?:\s*[:=]\s*|\s+)[^\s,;]{6,}|\b(token)\b(?:\s*[:=]\s*[^\s,;]+|\s+[A-Za-z0-9._~+/=-]{16,})/gi,
        '$1$2 [redacted]',
      )
      .replace(/\b\d{17,20}\b/g, '[account-id]'),
  );
  const normalized = multiline
    ? redacted.replace(/\r\n?/g, '\n').trim()
    : redacted.replace(/\s*[\r\n]+\s*/g, ' ').trim();
  return normalized.slice(0, max);
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9999) {
    throw new SupportValidationError('A diagnostic count is invalid');
  }
  return value;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SupportValidationError('The report is not an object');
  }
  return value as Record<string, unknown>;
}

function allowedKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new SupportValidationError('The report contains an unsupported field');
  }
}

function nullableText(value: unknown, max: number): string | null {
  return value === null ? null : clean(value, max);
}

export function parseSupportPayload(value: unknown): SupportTicketPayload {
  const input = object(value);
  allowedKeys(input, [
    'version',
    'issueId',
    'description',
    'appVersion',
    'platform',
    'generatedAt',
    'connection',
    'updateState',
    'instanceLabel',
    'diagnostics',
  ]);
  if (input.version !== 1 || !ISSUE_IDS.includes(input.issueId as IssueId)) {
    throw new SupportValidationError('The report version or issue is unsupported');
  }
  if (!['online', 'offline'].includes(String(input.connection))) {
    throw new SupportValidationError('The connection state is invalid');
  }
  if (!['checking', 'complete'].includes(String(input.updateState))) {
    throw new SupportValidationError('The update state is invalid');
  }
  if (!['windows', 'macos', 'linux'].includes(String(input.platform))) {
    throw new SupportValidationError('The platform is invalid');
  }
  const generatedAt = clean(input.generatedAt, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(generatedAt) || !Number.isFinite(Date.parse(generatedAt))) {
    throw new SupportValidationError('The generated date is invalid');
  }
  const diagnostics = object(input.diagnostics);
  allowedKeys(diagnostics, [
    'addons',
    'libraries',
    'disabled',
    'checked',
    'updates',
    'dependencyWarnings',
    'modified',
    'lastError',
    'attention',
  ]);
  if (!Array.isArray(diagnostics.attention) || diagnostics.attention.length > 12) {
    throw new SupportValidationError('The attention list is invalid');
  }
  const attention = diagnostics.attention.map((raw) => {
    const item = object(raw);
    allowedKeys(item, [
      'name',
      'folder',
      'currentVersion',
      'availableVersion',
      'missingDependencies',
      'outdatedDependencies',
      'modifiedFiles',
    ]);
    return {
      name: clean(item.name, 80),
      folder: clean(item.folder, 80),
      currentVersion: nullableText(item.currentVersion, 40),
      availableVersion: nullableText(item.availableVersion, 40),
      missingDependencies: count(item.missingDependencies),
      outdatedDependencies: count(item.outdatedDependencies),
      modifiedFiles: count(item.modifiedFiles),
    };
  });
  return {
    version: 1,
    issueId: input.issueId as IssueId,
    description: clean(input.description, 500, true),
    appVersion: clean(input.appVersion, 40),
    platform: input.platform as 'windows' | 'macos' | 'linux',
    generatedAt,
    connection: input.connection as 'online' | 'offline',
    updateState: input.updateState as 'checking' | 'complete',
    instanceLabel: clean(input.instanceLabel, 80),
    diagnostics: {
      addons: count(diagnostics.addons),
      libraries: count(diagnostics.libraries),
      disabled: count(diagnostics.disabled),
      checked: count(diagnostics.checked),
      updates: count(diagnostics.updates),
      dependencyWarnings: count(diagnostics.dependencyWarnings),
      modified: count(diagnostics.modified),
      lastError: nullableText(diagnostics.lastError, 240),
      attention,
    },
  };
}

function attentionLine(item: SupportAttentionItem): string {
  const details: string[] = [];
  if (item.availableVersion)
    details.push(`Kalpa sees ${item.currentVersion ?? 'unknown'} -> ${item.availableVersion}`);
  if (item.missingDependencies)
    details.push(`${item.missingDependencies} missing dependency warning(s)`);
  if (item.outdatedDependencies)
    details.push(`${item.outdatedDependencies} outdated dependency warning(s)`);
  if (item.modifiedFiles) details.push(`${item.modifiedFiles} locally modified file(s)`);
  return `- ${item.name} (${item.folder}): ${details.join('; ') || 'needs attention'}`;
}

export function renderSupportReport(payload: SupportTicketPayload): string {
  const issue = ISSUES[payload.issueId];
  const d = payload.diagnostics;
  const heading = [
    '# Kalpa support request',
    '',
    `**Issue:** ${issue.label}`,
    '',
    '**What happened**',
  ];
  const diagnostics = [
    '',
    '## Automatic diagnostics',
    `- Generated: ${payload.generatedAt}`,
    `- Kalpa version: ${payload.appVersion}`,
    `- Platform: ${payload.platform}`,
    `- Connection: ${payload.connection}`,
    `- ESO instance: ${payload.instanceLabel}`,
    '- AddOns folder: hidden (local account names and full paths are never shared)',
    `- Scan summary: ${d.addons} addon(s), ${d.libraries} libraries, ${d.disabled} disabled`,
    `- Dependency warnings: ${d.dependencyWarnings} addon(s)`,
    `- Locally modified: ${d.modified} addon(s)`,
    `- Update check: ${payload.updateState === 'checking' ? 'in progress' : `${d.checked} checked, ${d.updates} update(s) reported`}`,
    `- Last app message: ${d.lastError ?? 'None recorded'}`,
    '',
    '## What Kalpa collected for this issue',
    issue.note,
    '',
    '## Addons needing attention',
  ];
  const suffix = [
    '',
    '## Privacy note',
    'This report does not include SavedVariables, account IDs, access tokens, or file contents.',
  ];
  const attention = d.attention.map(attentionLine);
  const report = neutralizeMentions(
    [
      ...heading,
      payload.description || 'No description provided.',
      ...diagnostics,
      ...(attention.length ? attention : ['- None detected automatically']),
      ...suffix,
    ].join('\n'),
  );
  if (report.length > SUPPORT_REPORT_MAX_LENGTH) {
    throw new SupportValidationError('The canonical report exceeds Discord limits');
  }
  return report;
}

export function supportTicketMetadata(payload: SupportTicketPayload): {
  category: TicketCategory;
  title: string;
} {
  const issue = ISSUES[payload.issueId];
  return { category: issue.category, title: `Kalpa: ${issue.label}`.slice(0, 100) };
}
