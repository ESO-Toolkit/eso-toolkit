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

/**
 * Allow-listed environment details, mirrored from Kalpa's `support-report.ts`.
 *
 * `osVersion` is the OS product/build, `arch` a fixed-allow-list CPU
 * architecture, `tauri` the bundled runtime version, and `webview` the web view
 * engine plus MAJOR version only. Each is bounded and re-validated here rather
 * than trusted from the client; anything outside its shape becomes `unknown`,
 * so an edition string, machine name, or path cannot survive validation.
 *
 * Never accepted, by schema: hostname, user or home-directory name, hardware or
 * device IDs, serial numbers, MAC or IP addresses, Discord or account IDs,
 * locale, environment variables, tokens, credentials, cookies, SavedVariables,
 * combat-log content, raw files, and full local paths.
 */
export interface SupportEnvironment {
  osVersion: string;
  arch: string;
  tauri: string;
  webview: string;
}

const SUPPORT_UNKNOWN = 'unknown';

const SUPPORT_ARCHITECTURES = [
  'x86',
  'x86_64',
  'arm',
  'aarch64',
  'loongarch64',
  'mips',
  'mips64',
  'powerpc',
  'powerpc64',
  'riscv64',
  's390x',
  'sparc',
  'sparc64',
];

export function normalizeOsVersion(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^\d{1,6}(\.\d{1,6}){0,3}$/.test(text) ? text : SUPPORT_UNKNOWN;
}

export function normalizeArchitecture(value: unknown): string {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SUPPORT_ARCHITECTURES.includes(text) ? text : SUPPORT_UNKNOWN;
}

export function normalizeRuntimeVersion(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^\d{1,4}(\.\d{1,4}){0,3}(-[0-9A-Za-z.]{1,16})?$/.test(text) ? text : SUPPORT_UNKNOWN;
}

export function normalizeWebviewLabel(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^(?:Chromium|WebKit) \d{1,4}$/.test(text) ? text : SUPPORT_UNKNOWN;
}

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
  /** 1 is accepted only so a legacy report still renders; Kalpa emits 2. */
  version: 1 | 2;
  issueId: SupportIssueId;
  description: string;
  appVersion: string;
  platform: 'windows' | 'macos' | 'linux';
  /** Present from version 2 onward. A version-1 report omits the key entirely. */
  environment?: SupportEnvironment;
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
    throw new SupportDraftError('A support report field is invalid.');
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
    throw new SupportDraftError('A support report count is invalid.');
  }
  return value;
}

function nullableText(value: unknown, max: number): string | null {
  return value === null ? null : clean(value, max);
}

function parseEnvironment(value: unknown): SupportEnvironment {
  const input = object(value);
  allowedKeys(input, ['osVersion', 'arch', 'tauri', 'webview']);
  return {
    osVersion: normalizeOsVersion(input.osVersion),
    arch: normalizeArchitecture(input.arch),
    tauri: normalizeRuntimeVersion(input.tauri),
    webview: normalizeWebviewLabel(input.webview),
  };
}

export function parseSupportPayload(value: unknown): SupportTicketPayload {
  const input = object(value);
  allowedKeys(input, [
    'version',
    'issueId',
    'description',
    'appVersion',
    'platform',
    'environment',
    'generatedAt',
    'connection',
    'updateState',
    'instanceLabel',
    'diagnostics',
  ]);
  const version = input.version === 1 || input.version === 2 ? input.version : null;
  if (version === null || !ISSUE_IDS.includes(input.issueId as SupportIssueId)) {
    throw new SupportDraftError('This support report version is not supported.');
  }
  // Version 1 predates the environment block; accepting it there would render a
  // section the user never reviewed in Kalpa.
  if ((version === 2) !== (input.environment !== undefined)) {
    throw new SupportDraftError('The support report environment is invalid.');
  }
  const environment = version === 2 ? parseEnvironment(input.environment) : undefined;
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
    version,
    issueId: input.issueId as SupportIssueId,
    description: clean(input.description, 500, true),
    appVersion: clean(input.appVersion, 40),
    platform: input.platform as 'windows' | 'macos' | 'linux',
    ...(environment ? { environment } : {}),
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
  const environment = payload.environment
    ? [
        `- OS build: ${payload.environment.osVersion}`,
        `- CPU architecture: ${payload.environment.arch}`,
        `- App runtime: Tauri ${payload.environment.tauri}, web view ${payload.environment.webview}`,
      ]
    : [];
  const diagnostics = [
    '',
    '## Automatic diagnostics',
    `- Generated: ${payload.generatedAt}`,
    `- Kalpa version: ${payload.appVersion}`,
    `- Platform: ${payload.platform}`,
    ...environment,
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
  const normalizedPath = window.location.pathname.replace(/\/+$/, '');
  if (!normalizedPath.endsWith('/kalpa/support')) return;
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
  } catch {
    sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    sessionStorage.removeItem(SUPPORT_IDEMPOTENCY_KEY);
    sessionStorage.setItem(
      SUPPORT_DRAFT_ERROR_KEY,
      'The support handoff is invalid. Return to Kalpa and prepare it again.',
    );
  }
}

/**
 * A second handoff can arrive without a page load.
 *
 * The desktop opener reuses an already-open tab, and a URL that differs from
 * the current one only in its fragment is a same-document navigation: no module
 * re-evaluates, so `captureKalpaSupportDraft` never sees the new report and the
 * user stares at the previous result. Capture it on `hashchange` and reload, so
 * the page always renders the report Kalpa just prepared.
 */
export function watchKalpaSupportHandoff(): void {
  window.addEventListener('hashchange', () => {
    if (!window.location.hash.startsWith('#kalpa=')) return;
    captureKalpaSupportDraft();
    window.location.reload();
  });
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

/** Remove the reviewed request after Discord confirms creation, retaining only the ticket link. */
export function clearPendingSupportDraft(): void {
  sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
  sessionStorage.removeItem(SUPPORT_DRAFT_ERROR_KEY);
  sessionStorage.removeItem(SUPPORT_IDEMPOTENCY_KEY);
}

export function getSupportIssueLabel(issueId: SupportIssueId): string {
  return ISSUES[issueId].label;
}
