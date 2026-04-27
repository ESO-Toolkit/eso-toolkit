import { Hono } from 'hono';
import type { Env } from '../types';

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get('/health', async (c) => {
  const dbCheck = await c.env.DB.prepare('SELECT 1').first();
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbCheck ? 'connected' : 'error',
  });
});
