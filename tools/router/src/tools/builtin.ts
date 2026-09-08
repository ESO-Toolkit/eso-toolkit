import { spawn } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import type { Tool, ToolContext, ToolResult } from "./types.js";

/**
 * Built-in tools: read_file, write_file, list_files, run_bash, and
 * request_escalation. These are deliberately minimal — more advanced tools
 * (Grep, Glob, Edit) can be registered by consumers but aren't the router's
 * concern.
 *
 * All filesystem tools are sandboxed to the dispatcher's cwd: absolute paths
 * that escape the cwd are rejected, as are traversal attempts (`../`) that
 * land outside the tree. This is defense-in-depth; the real auth boundary is
 * still the OS user the router runs as.
 */

function ensureInside(cwd: string, input: string): string {
  const resolved = isAbsolute(input) ? resolve(input) : resolve(cwd, input);
  const rel = relative(cwd, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(
      `Path "${input}" is outside the router working directory.`,
    );
  }
  return resolved;
}

const ReadFileInput = z.object({
  path: z.string().describe("Path to read, relative to the working directory."),
  maxBytes: z.number().int().positive().optional(),
});

export const readFileTool: Tool = {
  name: "read_file",
  description:
    "Read a file from the workspace. Returns the file contents as text.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative or absolute path." },
      maxBytes: {
        type: "number",
        description:
          "Optional cap on bytes read; the read is truncated if larger.",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = ReadFileInput.safeParse(input);
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    try {
      const abs = ensureInside(ctx.cwd, parsed.data.path);
      const buf = await readFile(abs);
      const limit = parsed.data.maxBytes ?? 64 * 1024;
      const truncated = buf.length > limit;
      const content = buf.subarray(0, limit).toString("utf8");
      return {
        content: truncated
          ? `${content}\n\n[... truncated ${buf.length - limit} bytes ...]`
          : content,
      };
    } catch (err) {
      return {
        isError: true,
        content: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

const WriteFileInput = z.object({
  path: z.string(),
  content: z.string(),
});

export const writeFileTool: Tool = {
  name: "write_file",
  description:
    "Write text content to a file in the workspace. Overwrites existing files.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = WriteFileInput.safeParse(input);
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    try {
      const abs = ensureInside(ctx.cwd, parsed.data.path);
      await writeFile(abs, parsed.data.content, "utf8");
      return { content: `Wrote ${parsed.data.content.length} bytes to ${parsed.data.path}` };
    } catch (err) {
      return {
        isError: true,
        content: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

const ListFilesInput = z.object({
  path: z.string().optional(),
  depth: z.number().int().min(1).max(5).optional(),
});

export const listFilesTool: Tool = {
  name: "list_files",
  description:
    "List files and directories under a path in the workspace, up to a limited depth.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory to list (default: cwd)." },
      depth: { type: "number", description: "Traversal depth (default 1, max 5)." },
    },
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = ListFilesInput.safeParse(input ?? {});
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    const start = ensureInside(ctx.cwd, parsed.data.path ?? ".");
    const depth = parsed.data.depth ?? 1;
    const lines: string[] = [];
    const walk = async (dir: string, level: number): Promise<void> => {
      if (level > depth) return;
      if (ctx.signal.aborted) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (err) {
        lines.push(`[error] ${dir}: ${(err as Error).message}`);
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        if (entry.name === "node_modules") continue;
        const full = join(dir, entry.name);
        const rel = relative(ctx.cwd, full) || ".";
        lines.push(entry.isDirectory() ? `${rel}/` : rel);
        if (entry.isDirectory()) await walk(full, level + 1);
      }
    };
    try {
      const s = await stat(start);
      if (!s.isDirectory()) {
        return { isError: true, content: `${parsed.data.path ?? "."} is not a directory` };
      }
      await walk(start, 1);
      return { content: lines.join("\n") || "(empty)" };
    } catch (err) {
      return {
        isError: true,
        content: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

const RunBashInput = z.object({
  command: z.string(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
});

export const runBashTool: Tool = {
  name: "run_bash",
  description:
    "Run a shell command in the workspace. Returns combined stdout+stderr. Capped at 120s.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      timeoutMs: { type: "number" },
    },
    required: ["command"],
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = RunBashInput.safeParse(input);
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    const timeout = parsed.data.timeoutMs ?? 30_000;

    return await new Promise<ToolResult>((resolve) => {
      const child = spawn("bash", ["-lc", parsed.data.command], {
        cwd: ctx.cwd,
        signal: ctx.signal,
      });
      let out = "";
      let err = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
      child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
      child.stderr?.on("data", (d: Buffer) => (err += d.toString()));
      child.on("error", (e) => {
        clearTimeout(timer);
        resolve({ isError: true, content: e.message });
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        const combined =
          (out ? out : "") + (err ? (out ? "\n" : "") + err : "");
        resolve({
          isError: code !== 0,
          content:
            combined.length > 32_768
              ? combined.slice(0, 32_768) + "\n[... truncated ...]"
              : combined || `(exit ${code})`,
        });
      });
    });
  },
};

const RequestEscalationInput = z.object({
  reason: z.enum([
    "self_doubt",
    "ambiguity",
    "validation_failed",
    "user_requested",
  ]),
  digest: z.string().min(1),
});

export const requestEscalationTool: Tool = {
  name: "request_escalation",
  description:
    "Signal that this task is larger or more ambiguous than triage realized. Provide a one-paragraph digest of what you tried so the next-tier worker can continue from where you stopped. Do not retry the task after calling this.",
  inputSchema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        enum: ["self_doubt", "ambiguity", "validation_failed", "user_requested"],
      },
      digest: {
        type: "string",
        description: "Summary of prior attempt for the next-tier worker.",
      },
    },
    required: ["reason", "digest"],
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = RequestEscalationInput.safeParse(input);
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    if (ctx.requestEscalation) {
      ctx.requestEscalation(parsed.data.reason, parsed.data.digest);
    }
    return {
      content:
        "Escalation requested. Stop working on this task and wait for the next-tier worker to take over.",
    };
  },
};

const ConsultExpertInput = z.object({
  question: z
    .string()
    .min(1)
    .describe(
      "A self-contained question for the expert. Include all context the expert needs since it has no access to your conversation history.",
    ),
  tier: z
    .string()
    .optional()
    .describe(
      "Optional tier name. Defaults to one tier above the current worker.",
    ),
});

export const consultExpertTool: Tool = {
  name: "consult_expert",
  description:
    "Borrow expertise from a higher-tier model for one focused question. Use this BEFORE making any architectural, naming, or refactoring decision you're not confident about. The expert has NO access to your conversation history, your tools, or the workspace — your question must be entirely self-contained, including code snippets and constraints. Returns a one-paragraph answer. Cheap to call sparingly, expensive to call constantly.",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description:
          "Self-contained question. Include code snippets, constraints, and what you've already considered.",
      },
      tier: {
        type: "string",
        description:
          "Optional tier name. Defaults to one tier above current.",
      },
    },
    required: ["question"],
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = ConsultExpertInput.safeParse(input);
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    if (!ctx.consultExpert) {
      return {
        isError: true,
        content:
          "Expert consultation is not available in this dispatcher (no consultExpert callback wired).",
      };
    }
    try {
      const { digest, cost } = await ctx.consultExpert(
        parsed.data.question,
        parsed.data.tier,
      );
      return {
        content: `[expert response, $${cost.toFixed(4)}]:\n${digest}`,
      };
    } catch (err) {
      return {
        isError: true,
        content: `Consultation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

const DelegateSubtaskInput = z.object({
  prompt: z
    .string()
    .min(1)
    .describe("Self-contained sub-task prompt for an autonomous worker."),
  tier: z
    .string()
    .optional()
    .describe(
      "Optional tier name. Defaults to one tier below the current worker.",
    ),
});

export const delegateSubtaskTool: Tool = {
  name: "delegate_subtask",
  description:
    "Spawn an autonomous sub-worker to handle a focused sub-task. Use this from a planner role: split your work into independent steps and delegate each to a cheaper executor. The sub-worker has its own tool loop and can read/write files independently. Your prompt must be entirely self-contained (filenames, constraints, expected output). Returns the sub-worker's final digest.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description:
          "Self-contained sub-task. Specify filenames, constraints, and expected output format.",
      },
      tier: {
        type: "string",
        description:
          "Optional tier name. Defaults to one tier below current.",
      },
    },
    required: ["prompt"],
    additionalProperties: false,
  },
  async execute(input, ctx): Promise<ToolResult> {
    const parsed = DelegateSubtaskInput.safeParse(input);
    if (!parsed.success) {
      return { isError: true, content: `Invalid input: ${parsed.error.message}` };
    }
    if (!ctx.delegateSubtask) {
      return {
        isError: true,
        content:
          "Subtask delegation is not available in this dispatcher (no delegateSubtask callback wired).",
      };
    }
    try {
      const { digest, status, cost } = await ctx.delegateSubtask(
        parsed.data.prompt,
        parsed.data.tier,
      );
      return {
        content: `[subtask ${status}, $${cost.toFixed(4)}]:\n${digest}`,
        isError: status === "failure",
      };
    } catch (err) {
      return {
        isError: true,
        content: `Delegation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

export const BUILTIN_TOOLS: Tool[] = [
  readFileTool,
  writeFileTool,
  listFilesTool,
  runBashTool,
  requestEscalationTool,
  consultExpertTool,
  delegateSubtaskTool,
];
