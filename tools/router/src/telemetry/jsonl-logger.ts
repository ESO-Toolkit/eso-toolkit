import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Simple JSONL logger. One record per line, append-only. Used to capture
 * envelopes, preflight results, escalations, and final outcomes so the
 * rubric can be tuned against historical data later.
 */
export class JsonlLogger {
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
  }

  static default(cwd: string = process.cwd()): JsonlLogger {
    const ts = new Date().toISOString().slice(0, 10);
    return new JsonlLogger(join(cwd, ".router", "logs", `${ts}.jsonl`));
  }

  log(record: Record<string, unknown>): void {
    const line =
      JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n";
    try {
      appendFileSync(this.path, line);
    } catch {
      // Logging is best-effort; never crash the dispatcher on a write failure.
    }
  }

  get filepath(): string {
    return this.path;
  }

  exists(): boolean {
    return existsSync(this.path);
  }
}
