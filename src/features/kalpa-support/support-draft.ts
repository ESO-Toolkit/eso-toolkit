export const SUPPORT_REPORT_MAX_LENGTH = 1950;
export const SUPPORT_FRAGMENT_MAX_LENGTH = 8192;
export const SUPPORT_DRAFT_KEY = 'kalpa_support_draft_v1';
export const SUPPORT_DRAFT_ERROR_KEY = 'kalpa_support_draft_error_v1';
export const SUPPORT_IDEMPOTENCY_KEY = 'kalpa_support_idempotency_v1';
export const SUPPORT_RESULT_KEY = 'kalpa_support_result_v1';

const ISSUE_IDS = [
  'addon-status',
  'install-update',
  'addon-folder',
  'backups-data',
  'log-upload',
  'other',
] as const;
export type SupportIssueId = (typeof ISSUE_IDS)[number];

const ISSUES: Record<SupportIssueId, { label: string; note: string }> = {
  'addon-status': {
    label: 'Addon status looks wrong',
    note: 'Kalpa included the addon versions, dependency warnings, and modified-file state it currently sees.',
  },
  'install-update': {
    label: 'Install or update failed',
    note: 'Kalpa included the addon versions and local file state it currently sees. Please describe the failed step above.',
  },
  'addon-folder': {
    label: 'Wrong game or addon folder',
    note: 'Kalpa included the detected ESO instance. Local account names and the full folder path stay hidden.',
  },
  'backups-data': {
    label: 'Backups, profiles, or saved data',
    note: 'Backup contents and SavedVariables are deliberately not collected. Please describe the affected item and action above.',
  },
  'log-upload': {
    label: 'ESO Logs upload',
    note: 'Combat-log contents and account credentials are deliberately not collected. Please describe the failed upload step above.',
  },
  other: {
    label: 'Something else',
    note: 'Kalpa included only general app and addon state. Please describe what you were doing above.',
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
  issueId: SupportIssueId;
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

export class SupportDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupportDraftError';
  }
}

export function neutralizeMentions(value: string): string {
  return value
    .replace(/@(everyone|here)/gi, '@\u200b$1')
    .replace(/<(?=(@[!&]?\d+|#\d+|t:\d+(?::[tTdDfFR])?|\/[^:>]{1,32}:\d+)>)/g, '<\u200b');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SupportDraftError('The support report is not valid.');
  }
  return value as Record<string, unknown>;
}

function allowedKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new SupportDraftError('The support report contains an unsupported field.');
  }
}

function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string' || value.length > max * 4) {
    throw new SupportDraftError('A support report field is invalid.');
  }
  const redacted = neutralizeMentions(value)
    .replace(
      /(?:[A-Za-z]:[\\/]+Users|[\\/]+(?:Users|home))[\\/]+[^\s\\/]+(?:[\\/]+[^\s,;]+)*/gi,
      '[local path]',
    )
    .replace(/\\\\[^\s\\/]+[\\/]+[^\s\\/]+(?:[\\/]+[^\s,;]+)*/g, '[local path]')
    .replace(
      /\b(authorization|bearer|access[_ -]?token|refresh[_ -]?token|api[_ -]?key|client[_ -]?secret)\b(?:\s*[:=]\s*|\s+)[^\s,;]{6,}|\b(token)\b(?:\s*[:=]\s*[^\s,;]+|\s+[A-Za-z0-9._~+/=-]{16,})/gi,
      '$1$2 [redacted]',
    )
    .replace(/\b\d{17,20}\b/g, '[account-id]');
  const normalized = multiline
    ? redacted.replace(/\r\n?/g, '\n').trim()
    : redacted.replace(/\s*[\r\n]+\s*/g, ' ').trim();
  return normalized.slice(0, max);
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9999) {
    throw new SupportDraftError('A support report count is invalid.');
  }
  return value;
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
  if (input.version !== 1 || !ISSUE_IDS.includes(input.issueId as SupportIssueId)) {
    throw new SupportDraftError('This support report version is not supported.');
  }
  if (!['online', 'offline'].includes(String(input.connection))) {
    throw new SupportDraftError('The connection state is invalid.');
  }
  if (!['checking', 'complete'].includes(String(input.updateState))) {
    throw new SupportDraftError('The update state is invalid.');
  }
  if (!['windows', 'macos', 'linux'].includes(String(input.platform))) {
    throw new SupportDraftError('The platform is invalid.');
  }
  const generatedAt = clean(input.generatedAt, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(generatedAt) || !Number.isFinite(Date.parse(generatedAt))) {
    throw new SupportDraftError('The generated date is invalid.');
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
    throw new SupportDraftError('The attention list is invalid.');
  }
  const attention = diagnostics.attention.map((raw): SupportAttentionItem => {
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
    issueId: input.issueId as SupportIssueId,
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
  return truncate(
    `- ${item.name} (${item.folder}): ${details.join('; ') || 'needs attention'}`,
    180,
  );
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
  const items = d.attention.map(attentionLine);
  const noneOrOmitted = items.length
    ? `- ${items.length} item(s) omitted to keep the report within Discord's limit`
    : '- None detected automatically';
  const assemble = (description: string, attention: string[]): string =>
    neutralizeMentions(
      [...heading, description, ...diagnostics, ...attention, ...suffix].join('\n'),
    );

  const desiredDescription = payload.description || 'No description provided.';
  const fixed = assemble('', [noneOrOmitted]);
  if (fixed.length > SUPPORT_REPORT_MAX_LENGTH) {
    throw new SupportDraftError('The support report is too long.');
  }
  const description = truncate(desiredDescription, SUPPORT_REPORT_MAX_LENGTH - fixed.length);
  const included: string[] = [];
  for (const item of items) {
    const remaining = items.length - included.length - 1;
    const attention = [
      ...included,
      item,
      ...(remaining ? [`- ...and ${remaining} more item(s)`] : []),
    ];
    const candidate = assemble(description, attention);
    if (candidate.length > SUPPORT_REPORT_MAX_LENGTH) break;
    included.push(item);
  }
  const omitted = items.length - included.length;
  const attention = included.length
    ? [...included, ...(omitted ? [`- ...and ${omitted} more item(s)`] : [])]
    : [noneOrOmitted];
  const report = assemble(description, attention);
  if (report.length > SUPPORT_REPORT_MAX_LENGTH) {
    throw new SupportDraftError('The support report is too long.');
  }
  return report;
}

function decodeBase64Url(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value))
    throw new SupportDraftError('The support handoff is invalid.');
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function captureKalpaSupportDraft(): void {
  if (window.location.pathname.replace(/\/$/, '') !== '/kalpa/support') return;
  const fragment = window.location.hash.slice(1);
  if (!fragment.startsWith('kalpa=')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  sessionStorage.removeItem(SUPPORT_DRAFT_ERROR_KEY);
  sessionStorage.removeItem(SUPPORT_RESULT_KEY);
  try {
    if (fragment.length > SUPPORT_FRAGMENT_MAX_LENGTH)
      throw new SupportDraftError('The support handoff is too large.');
    const parsed = parseSupportPayload(JSON.parse(decodeBase64Url(fragment.slice(6))) as unknown);
    renderSupportReport(parsed);
    sessionStorage.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(parsed));
    sessionStorage.setItem(SUPPORT_IDEMPOTENCY_KEY, globalThis.crypto.randomUUID());
  } catch (error) {
    sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    sessionStorage.removeItem(SUPPORT_IDEMPOTENCY_KEY);
    sessionStorage.setItem(
      SUPPORT_DRAFT_ERROR_KEY,
      error instanceof Error ? error.message : 'The support handoff is invalid.',
    );
  }
}

export function getStoredSupportDraft(): SupportTicketPayload | null {
  const stored = sessionStorage.getItem(SUPPORT_DRAFT_KEY);
  if (!stored) return null;
  try {
    return parseSupportPayload(JSON.parse(stored) as unknown);
  } catch {
    sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    return null;
  }
}

export function getSupportIdempotencyKey(): string {
  const existing = sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY);
  if (existing && /^[A-Za-z0-9_-]{32,128}$/.test(existing)) return existing;
  const next = globalThis.crypto.randomUUID();
  sessionStorage.setItem(SUPPORT_IDEMPOTENCY_KEY, next);
  return next;
}

export function clearStoredSupportDraft(): void {
  sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
  sessionStorage.removeItem(SUPPORT_DRAFT_ERROR_KEY);
  sessionStorage.removeItem(SUPPORT_IDEMPOTENCY_KEY);
  sessionStorage.removeItem(SUPPORT_RESULT_KEY);
}

export function getSupportIssueLabel(issueId: SupportIssueId): string {
  return ISSUES[issueId].label;
}
