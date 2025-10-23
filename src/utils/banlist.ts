import { getEnvVar } from './envUtils';
import { Logger, LogLevel } from './logger';

const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'Banlist',
});

const GITHUB_GIST_API_BASE = 'https://api.github.com/gists/';
const BANLIST_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const BANLIST_FILE_NAME = 'banlist.json';

export const DEFAULT_BAN_REASON =
  'Access denied: this ESO Logs account has been banned from ESO Log Aggregator.';

export interface BanCheckUser {
  id?: number | string | null;
  name?: string | null;
  naDisplayName?: string | null;
  euDisplayName?: string | null;
}

interface RawBanEntry {
  id?: number | string | Array<number | string> | null;
  name?: string | string[] | null;
  naDisplayName?: string | string[] | null;
  euDisplayName?: string | string[] | null;
  reason?: string | null;
}

interface NormalizedBanEntry {
  ids: string[];
  names: string[];
  naDisplayNames: string[];
  euDisplayNames: string[];
  reason?: string;
}

interface BanlistCache {
  fetchedAt: number;
  entries: NormalizedBanEntry[];
}

interface BanCheckResult {
  isBanned: boolean;
  reason?: string;
}

interface GistFile {
  filename: string;
  raw_url: string;
  truncated?: boolean;
  content?: string;
}

interface GistResponse {
  files?: Record<string, GistFile>;
}

let cache: BanlistCache | null = null;
let inflightFetch: Promise<NormalizedBanEntry[]> | null = null;

const normalizeStringArray = (value: unknown, toLowerCase = true): string[] => {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((entry): entry is string | number => typeof entry === 'string' || typeof entry === 'number')
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .map((entry) => (toLowerCase ? entry.toLowerCase() : entry));
};

const normalizeBanEntry = (raw: unknown): NormalizedBanEntry | null => {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')) {
    const value = String(raw).trim();
    if (!value) return null;

    if (!Number.isNaN(Number(value))) {
      return {
        ids: [value],
        names: [],
        naDisplayNames: [],
        euDisplayNames: [],
      };
    }

    const lower = value.toLowerCase();
    return {
      ids: [],
      names: [lower],
      naDisplayNames: [lower],
      euDisplayNames: [lower],
    };
  }

  const entry = raw as RawBanEntry;

  const ids = normalizeStringArray(entry.id, false);
  const names = normalizeStringArray(entry.name);
  const naDisplayNames = normalizeStringArray(entry.naDisplayName);
  const euDisplayNames = normalizeStringArray(entry.euDisplayName);
  const reason = typeof entry.reason === 'string' ? entry.reason.trim() : undefined;

  if (!ids.length && !names.length && !naDisplayNames.length && !euDisplayNames.length) {
    return null;
  }

  return {
    ids: ids.map((id) => id.trim()).filter(Boolean),
    names,
    naDisplayNames,
    euDisplayNames,
    reason,
  };
};

const parseBanlistContent = (content: string): NormalizedBanEntry[] => {
  try {
    const parsed = JSON.parse(content);

    const sourceEntries = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { bannedUsers?: unknown[] }).bannedUsers)
      ? (parsed as { bannedUsers: unknown[] }).bannedUsers
      : Array.isArray((parsed as { banned?: unknown[] }).banned)
      ? (parsed as { banned: unknown[] }).banned
      : [];

    if (!Array.isArray(sourceEntries)) {
      return [];
    }

    const normalized = sourceEntries
      .map((entry) => normalizeBanEntry(entry))
      .filter((entry): entry is NormalizedBanEntry => entry !== null);

    return normalized;
  } catch (error) {
    logger.error('Failed to parse banlist gist content', error instanceof Error ? error : undefined);
    return [];
  }
};

const selectGistFile = (files?: Record<string, GistFile>): GistFile | undefined => {
  if (!files) return undefined;

  const fileEntries = Object.values(files);
  if (!fileEntries.length) return undefined;

  const preferred = fileEntries.find(
    (file) => file.filename.toLowerCase() === BANLIST_FILE_NAME,
  );
  if (preferred) return preferred;

  const jsonFile = fileEntries.find((file) => file.filename.toLowerCase().endsWith('.json'));
  if (jsonFile) return jsonFile;

  return fileEntries[0];
};

const fetchBanEntriesFromGist = async (gistId: string): Promise<NormalizedBanEntry[]> => {
  try {
    const response = await fetch(`${GITHUB_GIST_API_BASE}${gistId}`);
    if (!response.ok) {
      throw new Error(`Failed to load banlist gist: ${response.status}`);
    }

    const gist = (await response.json()) as GistResponse;
    const file = selectGistFile(gist.files);
    if (!file) {
      logger.warn('Banlist gist did not contain any files');
      return [];
    }

    if (file.truncated) {
      const rawResponse = await fetch(file.raw_url);
      if (!rawResponse.ok) {
        throw new Error(`Failed to load truncated banlist file: ${rawResponse.status}`);
      }
      const rawContent = await rawResponse.text();
      return parseBanlistContent(rawContent);
    }

    if (!file.content) {
      const rawResponse = await fetch(file.raw_url);
      if (!rawResponse.ok) {
        throw new Error(`Failed to load banlist file content: ${rawResponse.status}`);
      }
      const rawContent = await rawResponse.text();
      return parseBanlistContent(rawContent);
    }

    return parseBanlistContent(file.content);
  } catch (error) {
    logger.error('Failed to retrieve banlist gist', error instanceof Error ? error : undefined);
    return [];
  }
};

const loadBanEntries = async (): Promise<NormalizedBanEntry[]> => {
  const gistId = getEnvVar('VITE_BANLIST_GIST_ID');
  if (!gistId) {
    return [];
  }

  const now = Date.now();
  if (cache && now - cache.fetchedAt < BANLIST_CACHE_TTL_MS) {
    return cache.entries;
  }

  if (!inflightFetch) {
    inflightFetch = (async () => {
      const entries = await fetchBanEntriesFromGist(gistId);
      cache = {
        fetchedAt: Date.now(),
        entries,
      };
      inflightFetch = null;
      return entries;
    })();
  }

  return inflightFetch;
};

const toComparableId = (value: number | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const toComparableName = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized : null;
};

const matchesEntry = (entry: NormalizedBanEntry, user: BanCheckUser): boolean => {
  const id = toComparableId(user.id ?? null);
  const name = toComparableName(user.name ?? null);
  const naDisplayName = toComparableName(user.naDisplayName ?? null);
  const euDisplayName = toComparableName(user.euDisplayName ?? null);

  if (id && entry.ids.includes(id)) {
    return true;
  }
  if (name && entry.names.includes(name)) {
    return true;
  }
  if (naDisplayName && entry.naDisplayNames.includes(naDisplayName)) {
    return true;
  }
  if (euDisplayName && entry.euDisplayNames.includes(euDisplayName)) {
    return true;
  }

  return false;
};

export const checkUserBan = async (user: BanCheckUser): Promise<BanCheckResult> => {
  const entries = await loadBanEntries();
  if (!entries.length) {
    return { isBanned: false };
  }

  for (const entry of entries) {
    if (matchesEntry(entry, user)) {
      return {
        isBanned: true,
        reason: entry.reason || DEFAULT_BAN_REASON,
      };
    }
  }

  return { isBanned: false };
};

export const clearBanlistCache = (): void => {
  cache = null;
  inflightFetch = null;
};
