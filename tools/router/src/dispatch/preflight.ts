import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CredentialStore } from "../credentials/store.js";
import type { ProbeResult, Provider } from "../types.js";

/**
 * Entitlement preflight: before dispatching a worker, probe the
 * (provider, model) pair with the current credential. Caches the result
 * for a short TTL so we don't probe on every prompt.
 *
 * The cache file lives under .router/cache/entitlements.json in the repo
 * where router was invoked. It's safe to delete at any time.
 */

const DEFAULT_TTL_MS = 15 * 60 * 1000;

interface CacheEntry extends ProbeResult {
  provider: string;
  model: string;
}

interface CacheFile {
  version: 1;
  entries: CacheEntry[];
}

export class PreflightCache {
  private entries: Map<string, CacheEntry> = new Map();

  constructor(
    private readonly path: string,
    private readonly ttlMs: number = DEFAULT_TTL_MS,
  ) {
    this.load();
  }

  static default(cwd: string = process.cwd()): PreflightCache {
    return new PreflightCache(join(cwd, ".router", "cache", "entitlements.json"));
  }

  get(provider: string, model: string): ProbeResult | null {
    const key = `${provider}:${model}`;
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.checkedAt > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    return entry;
  }

  set(provider: string, model: string, result: ProbeResult): void {
    this.entries.set(`${provider}:${model}`, { ...result, provider, model });
    this.persist();
  }

  invalidate(provider: string, model?: string): void {
    if (model) {
      this.entries.delete(`${provider}:${model}`);
    } else {
      for (const key of [...this.entries.keys()]) {
        if (key.startsWith(`${provider}:`)) this.entries.delete(key);
      }
    }
    this.persist();
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      const raw = readFileSync(this.path, "utf8");
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed.version !== 1) return;
      for (const e of parsed.entries) {
        this.entries.set(`${e.provider}:${e.model}`, e);
      }
    } catch {
      // Corrupt cache is recoverable — just start fresh.
    }
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      const file: CacheFile = {
        version: 1,
        entries: [...this.entries.values()],
      };
      writeFileSync(this.path, JSON.stringify(file, null, 2));
    } catch {
      // Cache persistence is best-effort.
    }
  }
}

export interface PreflightInput {
  provider: Provider;
  model: string;
  store: CredentialStore;
  cache: PreflightCache;
}

export interface PreflightOutput {
  result: ProbeResult;
  /** Null means no credential was found in the store at all. */
  hadCredential: boolean;
}

export async function preflight(
  input: PreflightInput,
): Promise<PreflightOutput> {
  const cached = input.cache.get(input.provider.id, input.model);
  const credential = await input.store.get(input.provider.id);

  if (!credential) {
    return {
      result: {
        ok: false,
        reason: "missing_credential",
        message: `No credentials stored for provider "${input.provider.id}".`,
        checkedAt: Date.now(),
      },
      hadCredential: false,
    };
  }

  if (cached && cached.ok) {
    return { result: cached, hadCredential: true };
  }

  const result = await input.provider.probe(input.model, credential);
  input.cache.set(input.provider.id, input.model, result);
  return { result, hadCredential: true };
}
