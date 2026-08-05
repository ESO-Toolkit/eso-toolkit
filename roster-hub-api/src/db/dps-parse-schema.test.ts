import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DPS_PARSE_SCHEMA_STATEMENTS,
  ensureDpsParsesSchema,
  resetDpsParsesSchemaCache,
} from './dps-parse-schema';

/**
 * Reduce SQL to something comparable across two hand-maintained copies:
 * strip line comments, split on statement boundaries, collapse whitespace.
 *
 * Formatting is explicitly NOT part of the comparison — the .sql file is
 * annotated for humans and the TS copy is not, and requiring them to match
 * character for character would make the test fail for reasons nobody cares
 * about. What must match is the statements themselves.
 */
function normalize(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((statement) => statement.replace(/\s+/g, ' ').trim())
    .filter((statement) => statement.length > 0);
}

const MIGRATION_SQL = readFileSync(join(__dirname, 'migration-dps-parses.sql'), 'utf8');

beforeEach(() => {
  resetDpsParsesSchemaCache();
});

describe('DPS_PARSE_SCHEMA_STATEMENTS', () => {
  /**
   * The bootstrap exists because the deploy token cannot reach D1's management
   * API, so this constant is what actually creates production's tables. If it
   * drifts from the migration file, the two paths silently build different
   * schemas — this test is the only thing standing between us and that.
   */
  it('matches migration-dps-parses.sql statement for statement', () => {
    expect(normalize(DPS_PARSE_SCHEMA_STATEMENTS.join(';\n'))).toEqual(normalize(MIGRATION_SQL));
  });

  /** Re-running against a migrated database must be a no-op, not an error. */
  it('is entirely idempotent', () => {
    DPS_PARSE_SCHEMA_STATEMENTS.forEach((statement) => {
      expect(statement).toMatch(/CREATE (TABLE|INDEX) IF NOT EXISTS/i);
    });
  });
});

/** Minimal D1 stand-in that records the SQL it was handed. */
function fakeDb(onRun?: () => void) {
  const statements: string[] = [];
  const db = {
    prepare: (sql: string) => ({
      run: async () => {
        statements.push(sql);
        onRun?.();
        return { success: true };
      },
    }),
  };
  return { db: db as never, statements };
}

describe('ensureDpsParsesSchema', () => {
  it('applies every statement', async () => {
    const { db, statements } = fakeDb();
    await ensureDpsParsesSchema(db);
    expect(statements).toEqual([...DPS_PARSE_SCHEMA_STATEMENTS]);
  });

  /**
   * An isolate serves many requests. Paying for the DDL on each one would put
   * this on the hot path of a read route, which is the objection to bootstrapping
   * from a request handler in the first place.
   */
  it('runs once per isolate, and shares one attempt between concurrent callers', async () => {
    const { db, statements } = fakeDb();

    await Promise.all([ensureDpsParsesSchema(db), ensureDpsParsesSchema(db)]);
    await ensureDpsParsesSchema(db);

    expect(statements).toHaveLength(DPS_PARSE_SCHEMA_STATEMENTS.length);
  });

  /**
   * Caching the rejection would turn one transient D1 blip into a permanently
   * broken isolate — every later request reusing a promise that can only ever
   * reject, with no path back short of eviction.
   */
  it('retries after a failure instead of caching it', async () => {
    let attempt = 0;
    const failing = {
      prepare: () => ({
        run: async () => {
          attempt++;
          if (attempt === 1) throw new Error('D1 unavailable');
          return { success: true };
        },
      }),
    };

    await expect(ensureDpsParsesSchema(failing as never)).rejects.toThrow('D1 unavailable');
    await expect(ensureDpsParsesSchema(failing as never)).resolves.toBeUndefined();
  });
});
