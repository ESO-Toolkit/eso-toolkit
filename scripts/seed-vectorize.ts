/**
 * Vectorize Seeding Script
 *
 * Reads knowledge_docs from D1, generates embeddings via Workers AI,
 * upserts vectors to Vectorize, and stores returned IDs back into D1.
 *
 * This script must be run from the worker/ directory using wrangler:
 *   cd worker && npx wrangler dev
 *   # In another terminal:
 *   npx tsx scripts/seed-vectorize.ts [--url http://localhost:8787]
 *
 * Alternatively, deploy the worker and run against production:
 *   npx tsx scripts/seed-vectorize.ts --url https://eso-chat-worker.<account>.workers.dev
 *
 * The script calls a special internal endpoint on the worker.
 * You need to add the seed-vectorize route to the worker first (see below).
 *
 * For now, this script calls the embedding model and Vectorize directly
 * through the Wrangler local dev proxy.
 */

interface KnowledgeDoc {
  id: number;
  doc_type: string;
  title: string;
  content: string;
  vectorize_id: string | null;
}

const BATCH_SIZE = 20;

const parseArgs = () => {
  const args = process.argv.slice(2);
  let url = 'http://localhost:8787';
  let secret = 'dev-secret-change-me';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) url = args[++i];
    if (args[i] === '--secret' && args[i + 1]) secret = args[++i];
  }

  return { url, secret };
};

const main = async () => {
  const { url, secret } = parseArgs();

  console.log('Fetching knowledge docs to seed...');

  const res = await fetch(`${url}/api/seed-vectorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ingest-Secret': secret,
    },
  });

  if (!res.ok) {
    console.error('Failed to seed vectorize:', await res.text());
    process.exit(1);
  }

  const result = await res.json();
  console.log('Seed result:', result);
};

main().catch(console.error);
