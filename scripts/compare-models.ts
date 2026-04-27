/**
 * Side-by-side model comparison through the same worker retrieval pipeline.
 * Tests GLM (deployed with key) vs Qwen3 (direct API call with same prompt).
 * Usage: npx tsx scripts/compare-models.ts
 */

const WORKER_URL = 'https://eso-chat-worker.eso-toolkit.workers.dev';

const TEST_PROMPTS = [
  'what is the dps build',
  'what mundus stone should I use',
  'how do I weave light attacks',
  'what gear should a warden dps use',
];

async function queryWorker(message: string): Promise<{ text: string; sources: string }> {
  const res = await fetch(`${WORKER_URL}/api/eso-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const raw = await res.text();
  const parts = raw.split('\n\n');
  let text = '';
  let sources = '';

  for (const part of parts) {
    const lines = part.trim().split('\n');
    let event = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data = line.slice(5).trim();
    }
    if (event === 'token' && data) text += data;
    else if (event === 'sources' && data) sources = data;
  }

  return { text, sources };
}

async function main() {
  for (const prompt of TEST_PROMPTS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`PROMPT: "${prompt}"`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const start = Date.now();
      const result = await queryWorker(prompt);
      const elapsed = Date.now() - start;

      console.log(`[${elapsed}ms] Response:\n`);
      console.log(result.text);
      console.log(`\nSources: ${result.sources.slice(0, 200)}...`);
    } catch (e) {
      console.log(`ERROR: ${e}`);
    }

    console.log('');
  }
}

main();
