/**
 * Client for the DPS-builds leaderboard endpoints on roster-hub-api.
 *
 * Follows the roster/build hub client pattern, with one deliberate difference:
 * these requests do NOT set `cache: 'no-store'`. The routes are unauthenticated
 * and edge-cached (10-15 min), and opting out would defeat that for no benefit —
 * the data only changes when the cron runs.
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';
import type {
  DpsEncounterSummary,
  DpsParse,
  DpsParseBuildResponse,
  ListDpsEncountersResponse,
  ListDpsParsesResponse,
} from '../types/dpsParses.types';

const BASE_URL = getRosterHubBaseUrl();
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();

  // Tracked separately from the caller's signal: both abort the same controller,
  // but only one of them means "timed out". Reporting a cancelled request (unmount,
  // superseded query) as a timeout would show users an error for something that
  // worked exactly as intended.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const onExternalAbort = (): void => controller.abort();
  if (signal?.aborted) {
    // Already aborted before we got here: the 'abort' event has been and gone, so
    // a listener would never fire and the fetch would run to the full timeout
    // before anyone noticed the caller had given up.
    controller.abort();
  } else {
    signal?.addEventListener('abort', onExternalAbort, { once: true });
  }

  const cleanup = (): void => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  };

  let res: Response;
  try {
    // Deliberately no Content-Type: these are GETs with no body, and that header
    // is not CORS-safelisted — setting it forces an OPTIONS preflight on every
    // cross-origin request, doubling the round trips for nothing. (It also has to
    // survive the Worker's origin allowlist, so it turns a benign request into one
    // that can fail outright.)
    res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
  } catch (err) {
    cleanup();
    if (err instanceof Error && err.name === 'AbortError') {
      // Re-throw the caller's cancellation as an AbortError so callers can keep
      // ignoring it, rather than dressing it up as a failure.
      if (!timedOut) throw err;
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw err;
  }
  cleanup();

  if (!res.ok) {
    const text = await res.text();
    let message = `API error ${res.status}`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore parse failure
    }
    const error = new Error(message);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

// ─── Defensive normalization ─────────────────────────────────────────────────
// The ingest is best-effort by design (stale set tables, absent build dimensions),
// so the client drops individual bad rows rather than failing a whole page.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Validate the parts of the build that downstream code dereferences without
 * guarding — `toFeatureVector` reads `build.sets.fivePiece` and
 * `build.bars.front/back` directly, so a malformed object would throw during
 * feature extraction and take the whole page down. Anything that fails the shape
 * check becomes `null`, which every consumer already handles.
 */
/** Every element finite and numeric — not merely "is an array". */
function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number' && Number.isFinite(v));
}

/** setCounts is [setId, pieceCount] pairs. */
function isSetCountArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        entry.every((n) => typeof n === 'number' && Number.isFinite(n)),
    )
  );
}

function normalizeBuild(raw: unknown): DpsParse['build'] {
  if (!isRecord(raw)) return null;

  const sets = raw.sets;
  const bars = raw.bars;
  if (!isRecord(sets) || !isRecord(bars)) return null;

  // Element types matter, not just the container: feature extraction sorts these
  // numerically, so a string slipping through would produce NaN comparisons and
  // silently wrong clusters rather than a visible failure.
  if (!isNumberArray(sets.fivePiece) || !isNumberArray(sets.extra)) return null;
  if (!isNumberArray(bars.front) || !isNumberArray(bars.back)) return null;
  if (!isSetCountArray(raw.setCounts)) return null;
  if (!Array.isArray(raw.missing) || !raw.missing.every((m) => typeof m === 'string')) return null;

  return raw as unknown as DpsParse['build'];
}

/**
 * Returns null for a row that cannot be ranked or displayed. A parse with no
 * amount is meaningless on a leaderboard, and one with no id cannot be opened.
 */
export function normalizeParse(raw: unknown): DpsParse | null {
  if (!isRecord(raw)) return null;

  const amount = num(raw.amount);
  const parseId = str(raw.parse_id);
  if (amount === null || !parseId) return null;

  return {
    parse_id: parseId,
    encounter_id: num(raw.encounter_id) ?? 0,
    difficulty: num(raw.difficulty) ?? -1,
    zone_id: num(raw.zone_id) ?? 0,
    trial_id: str(raw.trial_id),
    encounter_name: str(raw.encounter_name),
    hard_mode_level: num(raw.hard_mode_level),
    partition: num(raw.partition) ?? -1,

    character_label: str(raw.character_label) || 'Anonymous',
    eso_class: str(raw.eso_class),
    spec_name: str(raw.spec_name),
    race: typeof raw.race === 'string' ? raw.race : null,
    server_region: typeof raw.server_region === 'string' ? raw.server_region : null,
    server_name: typeof raw.server_name === 'string' ? raw.server_name : null,
    guild_name: typeof raw.guild_name === 'string' ? raw.guild_name : null,

    report_code: str(raw.report_code),
    fight_id: num(raw.fight_id) ?? 0,
    rank: num(raw.rank),
    amount,
    duration_ms: num(raw.duration_ms),
    log_start_ms: num(raw.log_start_ms),
    log_date: typeof raw.log_date === 'string' ? raw.log_date : null,
    bracket_data: num(raw.bracket_data),

    set1_id: num(raw.set1_id),
    set2_id: num(raw.set2_id),
    monster_id: num(raw.monster_id),
    mythic_id: num(raw.mythic_id),
    arena_set_id: num(raw.arena_set_id),
    mundus_id: num(raw.mundus_id),
    food_ability_id: num(raw.food_ability_id),
    signature_hash: str(raw.signature_hash),

    build: normalizeBuild(raw.build),
    source_url: str(raw.source_url),
  };
}

export function normalizeParsesResponse(raw: unknown): ListDpsParsesResponse {
  if (!isRecord(raw)) return { parses: [], total: 0, limit: 0, offset: 0 };

  const parses = Array.isArray(raw.parses)
    ? raw.parses.map(normalizeParse).filter((p): p is DpsParse => p !== null)
    : [];

  return {
    parses,
    total: num(raw.total) ?? parses.length,
    limit: num(raw.limit) ?? parses.length,
    offset: num(raw.offset) ?? 0,
  };
}

function normalizeEncounter(raw: unknown): DpsEncounterSummary | null {
  if (!isRecord(raw)) return null;
  const encounterId = num(raw.encounter_id);
  if (encounterId === null) return null;

  return {
    encounter_id: encounterId,
    difficulty: num(raw.difficulty) ?? -1,
    encounter_name: str(raw.encounter_name),
    zone_id: num(raw.zone_id) ?? 0,
    trial_id: str(raw.trial_id),
    parse_count: num(raw.parse_count) ?? 0,
    top_amount: num(raw.top_amount) ?? 0,
    class_count: num(raw.class_count) ?? 0,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  };
}

export function normalizeEncountersResponse(raw: unknown): ListDpsEncountersResponse {
  if (!isRecord(raw) || !Array.isArray(raw.encounters)) return { encounters: [] };
  return {
    encounters: raw.encounters
      .map(normalizeEncounter)
      .filter((e): e is DpsEncounterSummary => e !== null),
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ListParsesOptions {
  encounterId?: number;
  difficulty?: number;
  esoClass?: string;
  signatureHash?: string;
  limit?: number;
  offset?: number;
  sort?: 'amount' | 'recent';
  /**
   * Pooled class view: cap each boss's contribution at its N best rows so
   * high-ceiling boards don't crowd out the pool. Server-side clamped [1,100].
   */
  perEncounterCap?: number;
}

export const dpsParsesApi = {
  /** Which encounters have ingested data. Feeds the trial/boss picker. */
  async listEncounters(signal?: AbortSignal): Promise<ListDpsEncountersResponse> {
    return normalizeEncountersResponse(
      await request<unknown>('/dps-leaderboard/encounters', signal),
    );
  },

  /**
   * Top parses. The server requires at least one of `encounterId` / `esoClass`,
   * so this throws early rather than sending a request guaranteed to 400.
   */
  async listParses(opts: ListParsesOptions, signal?: AbortSignal): Promise<ListDpsParsesResponse> {
    if (opts.encounterId === undefined && !opts.esoClass) {
      throw new Error('listParses requires at least one of: encounterId, esoClass');
    }

    const params = new URLSearchParams();
    if (opts.encounterId !== undefined) params.set('encounter', String(opts.encounterId));
    if (opts.difficulty !== undefined) params.set('difficulty', String(opts.difficulty));
    if (opts.esoClass) params.set('class', opts.esoClass);
    if (opts.signatureHash) params.set('signature', opts.signatureHash);
    if (opts.perEncounterCap !== undefined) {
      params.set('per_encounter_cap', String(opts.perEncounterCap));
    }
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset !== undefined) params.set('offset', String(opts.offset));
    if (opts.sort) params.set('sort', opts.sort);

    return normalizeParsesResponse(
      await request<unknown>(`/dps-leaderboard/parses?${params.toString()}`, signal),
    );
  },

  /** Raw gear + talents for one parse, for the Build Editor handoff. */
  async getBuild(parseId: string, signal?: AbortSignal): Promise<DpsParseBuildResponse> {
    return request<DpsParseBuildResponse>(
      `/dps-leaderboard/parses/${encodeURIComponent(parseId)}/build`,
      signal,
    );
  },
};
