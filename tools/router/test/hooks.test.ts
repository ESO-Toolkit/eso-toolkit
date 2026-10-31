import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runHook } from "../src/dispatch/hooks.js";

describe("runHook", () => {
  it("invokes a default-export function", async () => {
    const dir = await mkdtemp(join(tmpdir(), "router-hook-"));
    const hookPath = join(dir, "hook.mjs");
    await writeFile(
      hookPath,
      `globalThis.__routerHookCalled = null;
       export default function hook(payload) {
         globalThis.__routerHookCalled = payload.event;
       }`,
    );
    try {
      await runHook(hookPath, { event: "beforeTriage", prompt: "x" });
      assert.equal(
        (globalThis as unknown as { __routerHookCalled: string })
          .__routerHookCalled,
        "beforeTriage",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("invokes an { onEvent } object export", async () => {
    const dir = await mkdtemp(join(tmpdir(), "router-hook-"));
    const hookPath = join(dir, "hook-obj.mjs");
    await writeFile(
      hookPath,
      `globalThis.__routerHookObj = null;
       export const onEvent = (payload) => {
         globalThis.__routerHookObj = payload.event;
       };`,
    );
    try {
      await runHook(hookPath, { event: "afterDispatch" });
      assert.equal(
        (globalThis as unknown as { __routerHookObj: string }).__routerHookObj,
        "afterDispatch",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("throws on a module with no hook export", async () => {
    const dir = await mkdtemp(join(tmpdir(), "router-hook-"));
    const hookPath = join(dir, "hook-bad.mjs");
    await writeFile(hookPath, `export const unrelated = 1;`);
    try {
      await assert.rejects(
        () => runHook(hookPath, { event: "beforeTriage" }),
        /does not export/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
