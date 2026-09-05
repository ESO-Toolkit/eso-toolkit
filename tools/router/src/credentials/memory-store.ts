import type { Credential } from "../types.js";
import type { CredentialStore } from "./store.js";

/** In-memory credential store for tests and `ROUTER_NO_KEYRING=1` mode. */
export class MemoryCredentialStore implements CredentialStore {
  private readonly map = new Map<string, Credential>();

  async get(providerId: string): Promise<Credential | null> {
    return this.map.get(providerId) ?? null;
  }

  async set(providerId: string, credential: Credential): Promise<void> {
    this.map.set(providerId, credential);
  }

  async delete(providerId: string): Promise<void> {
    this.map.delete(providerId);
  }

  async list(): Promise<string[]> {
    return [...this.map.keys()];
  }
}
