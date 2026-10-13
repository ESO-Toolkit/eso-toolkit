import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { MemoryCredentialStore } from "../src/credentials/memory-store.js";
import type { Credential } from "../src/types.js";

describe("MemoryCredentialStore", () => {
  const cred: Credential = {
    providerId: "test",
    kind: "api-key",
    secret: "sk-ant-fake",
  };

  it("round-trips a credential", async () => {
    const store = new MemoryCredentialStore();
    await store.set("test", cred);
    const got = await store.get("test");
    assert.deepEqual(got, cred);
  });

  it("returns null for missing providers", async () => {
    const store = new MemoryCredentialStore();
    assert.equal(await store.get("nope"), null);
  });

  it("lists stored providers", async () => {
    const store = new MemoryCredentialStore();
    await store.set("a", cred);
    await store.set("b", cred);
    const list = await store.list();
    assert.deepEqual(list.sort(), ["a", "b"]);
  });

  it("deletes credentials", async () => {
    const store = new MemoryCredentialStore();
    await store.set("test", cred);
    await store.delete("test");
    assert.equal(await store.get("test"), null);
  });

  it("delete is idempotent", async () => {
    const store = new MemoryCredentialStore();
    await store.delete("never-existed");
    assert.equal(await store.get("never-existed"), null);
  });
});
