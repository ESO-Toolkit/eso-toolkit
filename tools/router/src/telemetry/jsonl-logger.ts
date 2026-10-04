import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import pino, { type Logger as PinoLogger } from "pino";

/**
 * JSONL telemetry logger backed by pino. Pino writes structured JSON records
 * one per line by default, which is exactly what we want for rubric tuning:
 * append-only, grep-friendly, and easy to ingest later for analysis.
 *
 * We wrap pino behind a `.log(record)` method that matches the original
 * append-file API, so the dispatcher and auth commands don't care which
 * backend is in use. If pino ever becomes too heavy, swapping back to plain
 * fs.appendFile is a one-line change inside this file.
 */
export class JsonlLogger {
  private readonly logger: PinoLogger;
  readonly filepath: string;

  constructor(filepath: string) {
    this.filepath = filepath;
    mkdirSync(dirname(filepath), { recursive: true });
    this.logger = pino(
      {
        base: null, // don't include pid/hostname fields in every record
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination({
        dest: filepath,
        sync: false,
        append: true,
        mkdir: true,
      }),
    );
  }

  static default(cwd: string = process.cwd()): JsonlLogger {
    const ts = new Date().toISOString().slice(0, 10);
    return new JsonlLogger(join(cwd, ".router", "logs", `${ts}.jsonl`));
  }

  log(record: Record<string, unknown>): void {
    try {
      // Pino requires a message string when called as logger.info(obj, msg),
      // but logger.info(obj) also works. Use `kind` (if present) as the msg
      // so the records stay human-scannable when you tail the file.
      const msg = typeof record.kind === "string" ? record.kind : "event";
      this.logger.info(record, msg);
    } catch {
      // Logging must never crash the dispatcher.
    }
  }

  /**
   * Flush pending writes. Call during shutdown to avoid losing the tail of
   * a busy session. Idempotent and safe to call multiple times.
   */
  async flush(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.logger.flush(() => resolve());
    });
  }
}
