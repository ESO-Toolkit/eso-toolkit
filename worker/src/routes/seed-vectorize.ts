import { Hono } from 'hono';

import { EMBEDDING_MODEL } from '../config';
import type { Env, KnowledgeDocRow } from '../types';

export const seedVectorizeRoute = new Hono<{ Bindings: Env }>();

seedVectorizeRoute.post('/seed-vectorize', async (c) => {
  const secret = c.req.header('X-Ingest-Secret');
  if (!secret || secret !== c.env.INGEST_SECRET) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const docs = await c.env.DB.prepare(
    'SELECT * FROM knowledge_docs WHERE vectorize_id IS NULL',
  ).all<KnowledgeDocRow>();

  if (docs.results.length === 0) {
    return c.json({ message: 'No unseeded docs found', seeded: 0 });
  }

  let seeded = 0;
  const batchSize = 20;

  for (let i = 0; i < docs.results.length; i += batchSize) {
    const batch = docs.results.slice(i, i + batchSize);
    const texts = batch.map((d) => `${d.title}: ${d.content}`);

    const embedResult = await c.env.AI.run(EMBEDDING_MODEL, { text: texts });
    const vectors = (embedResult as { data: number[][] }).data;

    const vectorEntries = batch.map((doc, idx) => ({
      id: `doc-${doc.id}`,
      values: vectors[idx],
      metadata: {
        doc_id: doc.id!,
        title: doc.title,
        doc_type: doc.doc_type,
        source: doc.source ?? 'verified',
      },
    }));

    await c.env.VECTOR_INDEX.upsert(vectorEntries);

    for (const doc of batch) {
      await c.env.DB.prepare(
        'UPDATE knowledge_docs SET vectorize_id = ? WHERE id = ?',
      )
        .bind(`doc-${doc.id}`, doc.id!)
        .run();
    }

    seeded += batch.length;
  }

  return c.json({ success: true, seeded });
});
