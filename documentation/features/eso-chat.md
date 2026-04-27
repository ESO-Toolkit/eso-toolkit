# ESO AI Chat

A RAG-powered chat system that answers ESO build questions using real structured data from ESO Logs and curated game knowledge.

## Architecture

```
┌─────────────┐     SSE      ┌──────────────────┐
│  React App  │◄────────────►│  CF Worker (Hono) │
│  useEsoChat │   /api/eso-  │                   │
│  Redux      │     chat     │  Intent Extract   │
└─────────────┘              │  D1 Query         │
                             │  Vectorize Search  │
                             │  Workers AI Gen    │
                             └────┬───┬───┬──────┘
                                  │   │   │
                              ┌───┘   │   └───┐
                              ▼       ▼       ▼
                            D1    Vectorize  Workers AI
                         (stats)  (embeddings) (LLM)
```

## Data Flow

1. **User sends message** → React dispatches to `useEsoChat` hook
2. **Intent extraction** — rule-based parsing extracts weapons, traits, enchants, roles, classes
3. **Parallel data fetch**:
   - D1 query for matching `build_stats` rows (structured data)
   - Workers AI embedding generation → Vectorize semantic search → D1 `knowledge_docs` retrieval
4. **Prompt construction** — system prompt includes ESO Logs stats + knowledge base + anti-hallucination rules
5. **Streaming generation** — Workers AI (Qwen3-30B-A3B) generates response, streamed via SSE
6. **Sources payload** — final SSE event delivers structured source metadata for the Sources panel
7. **Frontend render** — Redux slice accumulates tokens, displays markdown, shows collapsible sources

## Models

| Purpose | Model | Dimensions | Context | Cost |
|---------|-------|------------|---------|------|
| Chat generation | `@cf/qwen/qwen3-30b-a3b-fp8` | — | 32K tokens | $0.051/$0.34 per M tokens |
| Embeddings | `@cf/baai/bge-m3` | 1024 | 8192 tokens | $0.012 per M tokens |

**Why these models:**
- **Qwen3-30B-A3B**: MoE architecture (30B params, 3B active) — fast inference at low cost. Strong instruction following for grounded RAG answers. Supports reasoning mode toggle.
- **BGE-M3**: Best accuracy on benchmarks among Workers AI embedding models. 8192 token input allows embedding larger chunks. 1024 dimensions with cosine similarity.

Model IDs are centralized in `worker/src/config.ts` for easy swapping.

## D1 Schema

### `build_stats`
Aggregated data from ESO Logs parses.

| Column | Type | Notes |
|--------|------|-------|
| weapon_combo | TEXT | e.g. "dual wield / bow" |
| role | TEXT | e.g. "stamina dps" |
| class | TEXT | e.g. "nightblade" |
| front_bar_enchant | TEXT | |
| back_bar_enchant | TEXT | |
| front_bar_trait | TEXT | |
| back_bar_trait | TEXT | |
| usage_count | INTEGER | Number of players using this combo |
| avg_parse_score | REAL | Average DPS parse score |
| patch_version | TEXT | e.g. "U44" |
| updated_at | TEXT | Last update timestamp |

UNIQUE constraint on (weapon_combo, role, class, patch_version).

### `knowledge_docs`
Curated ESO knowledge for semantic retrieval.

| Column | Type | Notes |
|--------|------|-------|
| doc_type | TEXT | trait, enchant, weapon, role, class, mechanic |
| title | TEXT | Document title |
| content | TEXT | Full document content |
| vectorize_id | TEXT | Corresponding Vectorize vector ID |
| created_at | TEXT | Creation timestamp |

## Vectorize Usage

- **Index name**: `eso-knowledge`
- **Dimensions**: 1024 (BGE-M3)
- **Metric**: cosine
- **Metadata stored**: doc_id, title, doc_type (for filtering)
- **Query**: top-K=5, score threshold > 0.5

## Local Dev Workflow

```bash
# 1. Install worker deps
cd worker && npm install

# 2. Apply migrations locally
npm run migrate:local

# 3. Start worker dev server
npm run dev
# Worker runs at http://localhost:8787

# 4. Seed Vectorize (requires worker running)
npx tsx scripts/seed-vectorize.ts

# 5. Start frontend dev server (from root)
cd .. && npm run dev
# Frontend at http://localhost:3001
# Set VITE_ESO_CHAT_API_URL=http://localhost:8787 in .env
```

## Deploy Workflow

```bash
# 1. Apply migrations to remote D1
cd worker && npm run migrate:remote

# 2. Set worker secrets
wrangler secret put INGEST_SECRET

# 3. Deploy worker
npm run deploy

# 4. Seed Vectorize in production
npx tsx scripts/seed-vectorize.ts --url https://eso-chat-worker.<account>.workers.dev --secret <your-secret>
```

## Ingestion Workflow

```bash
# 1. Place ESO Logs export at data-downloads/esologs-snapshot.json
# See scripts/ingest-esologs.ts for expected input shape

# 2. Run ingestion (local)
npx tsx scripts/ingest-esologs.ts --url http://localhost:8787 --secret dev-secret-change-me

# 3. Run ingestion (production)
npx tsx scripts/ingest-esologs.ts --url https://eso-chat-worker.<account>.workers.dev --secret <your-secret>
```

## Worker Secrets

Managed via `wrangler secret put`:
- `INGEST_SECRET` — protects `/api/eso-ingest` and `/api/seed-vectorize` endpoints

Local development uses `worker/.dev.vars`.

## Frontend Environment

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_ESO_CHAT_API_URL` | Worker API base URL | `http://localhost:8787` |
