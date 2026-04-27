import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { chatRoute } from './routes/chat';
import { healthRoute } from './routes/health';
import { ingestRoute } from './routes/ingest';
import { seedVectorizeRoute } from './routes/seed-vectorize';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return 'https://esotk.com';
      if (origin.startsWith('http://localhost:')) return origin;
      if (origin === 'https://esotk.com') return origin;
      return '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Ingest-Secret'],
  }),
);

app.route('/', healthRoute);
app.route('/', chatRoute);
app.route('/', ingestRoute);
app.route('/', seedVectorizeRoute);

export default app;
