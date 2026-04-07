import { Entry } from "@napi-rs/keyring";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { Credential } from "../types.js";
import type { CredentialStore } from "./store.js";

const SERVICE = "eso-router";

/**
 * System keychain credential store backed by `@napi-rs/keyring` (Rust N-API
 * bindings to macOS Keychain, Windows Credential Manager, and Linux Secret
 * Service / libsecret).
 *
 * Why we don't just call the OS directly: Node has no built-in API for the
 * platform keychains. `@napi-rs/keyring` ships prebuilt native binaries for
 * all three platforms so there's no build step, and the actual storage is
 * still the native keychain — the library is only a thin bridge.
 *
 * Account index
 * -------------
 * Keyring APIs are lookup-by-(service, account). We need to enumerate stored
 * credentials (for `router auth status`) but the platform keychains don't
 * expose a portable "list entries" API. We maintain a small index file at
 * ~/.config/eso-router/accounts.json listing the provider ids that have
 * credentials stored in the keychain. The index contains NO secrets — only
 * provider identifiers — and is safe to lose (we recreate it on next login).
 */
export class KeyringCredentialStore implements CredentialStore {
  private readonly indexPath: string;

  constructor(indexPath?: string) {
    this.indexPath =
      indexPath ?? join(configDir(), "eso-router", "accounts.json");
  }

  async get(providerId: string): Promise<Credential | null> {
    const entry = new Entry(SERVICE, providerId);
    let raw: string | null;
    try {
      raw = entry.getPassword();
    } catch (err) {
      // `getPassword` throws on Linux when the entry doesn't exist; treat
      // that as a cache miss rather than a fatal error.
      if (isNotFoundError(err)) return null;
      throw err;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Credential;
    } catch {
      // Corrupt entry — treat as missing and let the caller re-auth.
      return null;
    }
  }

  async set(providerId: string, credential: Credential): Promise<void> {
    const entry = new Entry(SERVICE, providerId);
    entry.setPassword(JSON.stringify(credential));
    this.addToIndex(providerId);
  }

  async delete(providerId: string): Promise<void> {
    const entry = new Entry(SERVICE, providerId);
    try {
      entry.deletePassword();
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
    }
    this.removeFromIndex(providerId);
  }

  async list(): Promise<string[]> {
    if (!existsSync(this.indexPath)) return [];
    try {
      const raw = readFileSync(this.indexPath, "utf8");
      const parsed = JSON.parse(raw) as { providers: string[] };
      return Array.isArray(parsed.providers) ? parsed.providers : [];
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Account index (plaintext, no secrets)
  // -------------------------------------------------------------------------

  private addToIndex(providerId: string): void {
    const current = new Set(this.readIndex());
    current.add(providerId);
    this.writeIndex([...current]);
  }

  private removeFromIndex(providerId: string): void {
    const current = new Set(this.readIndex());
    current.delete(providerId);
    this.writeIndex([...current]);
  }

  private readIndex(): string[] {
    if (!existsSync(this.indexPath)) return [];
    try {
      return (
        (JSON.parse(readFileSync(this.indexPath, "utf8")) as {
          providers?: string[];
        }).providers ?? []
      );
    } catch {
      return [];
    }
  }

  private writeIndex(providers: string[]): void {
    mkdirSync(dirname(this.indexPath), { recursive: true });
    writeFileSync(
      this.indexPath,
      JSON.stringify({ providers: providers.sort() }, null, 2),
      { mode: 0o600 },
    );
  }
}

function configDir(): string {
  if (process.platform === "win32") {
    return process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support");
  }
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}

function isNotFoundError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return (
    /no matching entry|not found|no such|does not exist/i.test(message) ||
    /NoEntry|NotFound/i.test(message)
  );
}
