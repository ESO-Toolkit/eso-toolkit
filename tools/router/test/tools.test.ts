import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import {
  listFilesTool,
  readFileTool,
  requestEscalationTool,
  runBashTool,
  writeFileTool,
} from "../src/tools/builtin.js";
import { createDefaultRegistry } from "../src/tools/index.js";
import type { ToolContext } from "../src/tools/types.js";

const config = RouterConfigSchema.parse({
  tiers: { default: { provider: "p", model: "m" } },
  providers: { p: { kind: "anthropic-api" } },
});

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "router-test-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function makeCtx(cwd: string): ToolContext {
  return {
    cwd,
    signal: new AbortController().signal,
    config,
  };
}

describe("read_file tool", () => {
  it("reads a file inside the cwd", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "hello.txt"), "hi there");
      const result = await readFileTool.execute({ path: "hello.txt" }, makeCtx(dir));
      assert.equal(result.isError, undefined);
      assert.equal(result.content, "hi there");
    });
  });

  it("rejects paths that escape the cwd", async () => {
    await withTempDir(async (dir) => {
      const result = await readFileTool.execute(
        { path: "../etc/passwd" },
        makeCtx(dir),
      );
      assert.equal(result.isError, true);
      assert.match(result.content, /outside/);
    });
  });

  it("rejects invalid input shapes", async () => {
    await withTempDir(async (dir) => {
      const result = await readFileTool.execute(
        { nope: "no path field" },
        makeCtx(dir),
      );
      assert.equal(result.isError, true);
    });
  });

  it("truncates large files at maxBytes", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "big.txt"), "x".repeat(1000));
      const result = await readFileTool.execute(
        { path: "big.txt", maxBytes: 10 },
        makeCtx(dir),
      );
      assert.match(result.content, /truncated/);
    });
  });
});

describe("write_file tool", () => {
  it("writes a file inside the cwd", async () => {
    await withTempDir(async (dir) => {
      const result = await writeFileTool.execute(
        { path: "out.txt", content: "abc" },
        makeCtx(dir),
      );
      assert.equal(result.isError, undefined);
      assert.equal(await readFile(join(dir, "out.txt"), "utf8"), "abc");
    });
  });

  it("rejects absolute paths outside the cwd", async () => {
    await withTempDir(async (dir) => {
      const result = await writeFileTool.execute(
        { path: "/tmp/evil.txt", content: "bad" },
        makeCtx(dir),
      );
      assert.equal(result.isError, true);
    });
  });
});

describe("list_files tool", () => {
  it("lists entries at depth 1", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "a.txt"), "");
      await writeFile(join(dir, "b.txt"), "");
      const result = await listFilesTool.execute({}, makeCtx(dir));
      assert.match(result.content, /a\.txt/);
      assert.match(result.content, /b\.txt/);
    });
  });

  it("skips dotfiles and node_modules", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, ".hidden"), "");
      await writeFile(join(dir, "visible.txt"), "");
      const result = await listFilesTool.execute({}, makeCtx(dir));
      assert.doesNotMatch(result.content, /\.hidden/);
      assert.match(result.content, /visible/);
    });
  });
});

describe("run_bash tool", () => {
  it("captures stdout on success", async () => {
    await withTempDir(async (dir) => {
      const result = await runBashTool.execute(
        { command: "echo hello" },
        makeCtx(dir),
      );
      assert.equal(result.isError, false);
      assert.match(result.content, /hello/);
    });
  });

  it("marks non-zero exits as errors", async () => {
    await withTempDir(async (dir) => {
      const result = await runBashTool.execute(
        { command: "exit 7" },
        makeCtx(dir),
      );
      assert.equal(result.isError, true);
    });
  });
});

describe("request_escalation tool", () => {
  it("invokes the escalation callback", async () => {
    let called: { reason?: string; digest?: string } = {};
    const ctx: ToolContext = {
      cwd: process.cwd(),
      signal: new AbortController().signal,
      config,
      requestEscalation: (reason, digest) => {
        called = { reason, digest };
      },
    };
    const result = await requestEscalationTool.execute(
      { reason: "self_doubt", digest: "stuck on auth flow" },
      ctx,
    );
    assert.equal(result.isError, undefined);
    assert.equal(called.reason, "self_doubt");
    assert.equal(called.digest, "stuck on auth flow");
  });
});

describe("createDefaultRegistry", () => {
  it("registers all built-in tools", () => {
    const registry = createDefaultRegistry();
    const names = registry.list().map((t) => t.name);
    assert.ok(names.includes("read_file"));
    assert.ok(names.includes("write_file"));
    assert.ok(names.includes("list_files"));
    assert.ok(names.includes("run_bash"));
    assert.ok(names.includes("request_escalation"));
  });

  it("snapshot is isolated from the original", () => {
    const original = createDefaultRegistry();
    const snap = original.snapshot();
    assert.equal(original.list().length, snap.list().length);
  });
});
