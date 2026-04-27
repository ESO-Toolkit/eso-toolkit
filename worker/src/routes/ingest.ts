import { Hono } from 'hono';

import { upsertBuildStats } from '../lib/d1-queries';
import type { BuildStatRow, Env } from '../types';

export const ingestRoute = new Hono<{ Bindings: Env }>();

ingestRoute.post('/eso-ingest', async (c) => {
  const secret = c.req.header('X-Ingest-Secret');
  if (!secret || secret !== c.env.INGEST_SECRET) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const body = await c.req.json<{ rows: BuildStatRow[] }>();

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return c.json({ error: 'rows array is required' }, 400);
  }

  if (body.rows.length > 500) {
    return c.json({ error: 'batch size cannot exceed 500' }, 400);
  }

  const inserted = await upsertBuildStats(c.env.DB, body.rows);

  return c.json({ success: true, upserted: inserted });
});
