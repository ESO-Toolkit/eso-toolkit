import type { Credential } from "../types.js";

/**
 * Credential storage abstraction. Implementations persist opaque credentials
 * keyed by providerId. Everything that touches secrets goes through this
 * interface so the rest of the router never sees platform-specific code.
 */
export interface CredentialStore {
  /** Return the stored credential for a provider, or null if none. */
  get(providerId: string): Promise<Credential | null>;
  /** Persist (or overwrite) the credential for a provider. */
  set(providerId: string, credential: Credential): Promise<void>;
  /** Remove the stored credential. Idempotent. */
  delete(providerId: string): Promise<void>;
  /** List all provider ids that currently have stored credentials. */
  list(): Promise<string[]>;
}
