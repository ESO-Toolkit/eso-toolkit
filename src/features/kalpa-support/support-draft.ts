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
  /** 1 and 2 are accepted only so an older report still renders; Kalpa emits 3. */
  version: 1 | 2 | 3;
  issueId: SupportIssueId;
  description: string;
  appVersion: string;
  platform: 'windows' | 'macos' | 'linux';
  /** Present from version 2 onward. A version-1 report omits the key entirely. */
  environment?: SupportEnvironment;
  /**
   * Lowercase hex SHA-256 of the report text Kalpa rendered and the user
   * reviewed. Present only on version 3. See `verifySupportReport` for what it
   * is and is not.
   */
  reportSha256?: string;
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

/** Lowercase hex SHA-256, the shape Kalpa emits. */
const REPORT_SHA256 = /^[0-9a-f]{64}$/;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * SHA-256 of `text` as lowercase hex, over its UTF-8 bytes.
 *
 * Written out rather than delegated to `crypto.subtle` because that API is
 * async, and both places this is needed — Kalpa's report preview and this
 * page's — derive the report synchronously while rendering. Making them async
 * would add a third "still checking" state to the Create button for no gain.
 *
 * The Worker uses the platform digest, and the shared fixture pins one value
 * for one report text, so this routine disagreeing with real SHA-256 fails the
 * contract test rather than shipping.
 */
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 2 ** 32));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const schedule = new Uint32Array(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i += 1) schedule[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const previous = schedule[i - 15];
      const recent = schedule[i - 2];
      const s0 = rotr(previous, 7) ^ rotr(previous, 18) ^ (previous >>> 3);
      const s1 = rotr(recent, 17) ^ rotr(recent, 19) ^ (recent >>> 10);
      schedule[i] = schedule[i - 16] + s0 + schedule[i - 7] + s1;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const t1 =
        (h +
          (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
          ((e & f) ^ (~e & g)) +
          SHA256_K[i] +
          schedule[i]) >>>
        0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
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

/**
 * Cut to a UTF-16 length without splitting a surrogate pair. A plain slice
 * would leave a lone high surrogate, which is not well-formed and which
 * Discord rejects when the report is serialized as JSON.
 */
function sliceCodeUnits(value: string, units: number): string {
  if (units <= 0) return '';
  const lastUnit = value.charCodeAt(units - 1);
  const splitsPair = lastUnit >= 0xd800 && lastUnit <= 0xdbff;
  return value.slice(0, splitsPair ? units - 1 : units);
}

function stripNonPrintingControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const isAllowedWhitespace = codePoint === 9 || codePoint === 10 || codePoint === 13;
    const isControlCharacter = codePoint < 32 || (codePoint >= 127 && codePoint <= 159);
    // Array.from iterates code points, so a well-formed pair arrives as one
    // character whose code point is astral. A code point still inside the
    // surrogate range is therefore unpaired, and would make the string
    // un-serializable as JSON — which Discord rejects.
    const isLoneSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
    return (isControlCharacter && !isAllowedWhitespace) || isLoneSurrogate ? '' : character;
  }).join('');
}

function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string' || value.length > max * 4) {
    throw new SupportDraftError('A support report field is invalid.');
  }
  const redacted = stripNonPrintingControlCharacters(
    neutralizeMentions(value)
      .replace(
        /(?:[A-Za-z]:[\\/]+|[\\/]+(?:Users|home|media|mnt|opt|run|srv|tmp|var|etc|Volumes)[\\/]+|\bUsers[\\/]+)[^\r\n,;]+?(?=\s+(?:and|at|from|with|then)\b|[,;\r\n]|$)/gi,
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
  return sliceCodeUnits(normalized, max);
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
    'reportSha256',
    'generatedAt',
    'connection',
    'updateState',
    'instanceLabel',
    'diagnostics',
  ]);
  const version =
    input.version === 1 || input.version === 2 || input.version === 3 ? input.version : null;
  if (version === null || !ISSUE_IDS.includes(input.issueId as SupportIssueId)) {
    throw new SupportDraftError('This support report version is not supported.');
  }
  // Version 1 predates the environment block; accepting it there would render a
  // section the user never reviewed in Kalpa.
  if (version >= 2 !== (input.environment !== undefined)) {
    throw new SupportDraftError('The support report environment is invalid.');
  }
  // Version 3 is exactly "carries a report hash". Keeping the key version-gated
  // rather than optional means a client that silently stopped sending the hash
  // is rejected instead of quietly downgrading to an unverified report.
  if ((version === 3) !== (input.reportSha256 !== undefined)) {
    throw new SupportDraftError('The support report hash is invalid.');
  }
  if (version === 3 && !REPORT_SHA256.test(String(input.reportSha256))) {
    throw new SupportDraftError('The support report hash is invalid.');
  }
  const environment = version >= 2 ? parseEnvironment(input.environment) : undefined;
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
    ...(version === 3 ? { reportSha256: String(input.reportSha256) } : {}),
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

/**
 * Whether the report this page renders is the report Kalpa showed the user.
 *
 * This page keeps its own hand-copied redaction and rendering rules, so it can
 * drift from Kalpa's independently of the Worker's. Comparing the rendered text
 * against the hash Kalpa sent is the only thing that notices, and it notices
 * while the user is still looking at the report rather than after a ticket
 * exists.
 *
 * `unverifiable` covers a version-1 or version-2 report, which predates the
 * hash: there is nothing to check, and refusing those would break a client that
 * is still in the wild.
 *
 * Not an integrity control — the hash rides in the same URL fragment as the
 * payload, so anyone who can change one can change the other. It detects drift
 * between our own implementations, nothing more.
 */
export function verifySupportReport(
  payload: SupportTicketPayload,
): 'match' | 'mismatch' | 'unverifiable' {
  if (payload.reportSha256 === undefined) return 'unverifiable';
  try {
    return sha256Hex(renderSupportReport(payload)) === payload.reportSha256 ? 'match' : 'mismatch';
  } catch {
    return 'mismatch';
  }
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

/** Returns true when a capture stored a report that differs from the previous one. */
export function captureKalpaSupportDraft(): boolean {
  const normalizedPath = window.location.pathname.replace(/\/+$/, '');
  if (!normalizedPath.endsWith('/kalpa/support')) return false;
  const fragment = window.location.hash.slice(1);
  if (!fragment.startsWith('kalpa=')) return false;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  const previousDraft = sessionStorage.getItem(SUPPORT_DRAFT_KEY);
  sessionStorage.removeItem(SUPPORT_DRAFT_ERROR_KEY);
  try {
    if (fragment.length > SUPPORT_FRAGMENT_MAX_LENGTH)
      throw new SupportDraftError('The support handoff is too large.');
    const parsed = parseSupportPayload(JSON.parse(decodeBase64Url(fragment.slice(6))) as unknown);
    renderSupportReport(parsed);
    const serialized = JSON.stringify(parsed);
    // Re-opening the handoff for a report already on this page is not a new
    // request. Minting a fresh idempotency key for it would let a retry create a
    // SECOND Discord channel for one user intent, so the existing key is kept
    // and the confirmed result is left alone.
    if (serialized === previousDraft) return false;
    sessionStorage.removeItem(SUPPORT_RESULT_KEY);
    sessionStorage.setItem(SUPPORT_DRAFT_KEY, serialized);
    sessionStorage.setItem(SUPPORT_IDEMPOTENCY_KEY, globalThis.crypto.randomUUID());
    return true;
  } catch {
    // A malformed second handoff must not silently discard a ticket that was
    // already confirmed, so the result is only cleared once a new draft parses.
    sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    sessionStorage.removeItem(SUPPORT_IDEMPOTENCY_KEY);
    sessionStorage.setItem(
      SUPPORT_DRAFT_ERROR_KEY,
      'The support handoff is invalid. Return to Kalpa and prepare it again.',
    );
    return true;
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
    // Only reload for a report this page is not already showing. Reloading for
    // the same one would abort a ticket creation that is already in flight.
    if (captureKalpaSupportDraft()) window.location.reload();
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
