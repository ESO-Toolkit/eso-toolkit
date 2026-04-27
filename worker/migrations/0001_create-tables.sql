-- Build statistics from ESO Logs parses
CREATE TABLE IF NOT EXISTS build_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weapon_combo TEXT NOT NULL,
  role TEXT NOT NULL,
  class TEXT NOT NULL,
  front_bar_enchant TEXT NOT NULL DEFAULT '',
  back_bar_enchant TEXT NOT NULL DEFAULT '',
  front_bar_trait TEXT NOT NULL DEFAULT '',
  back_bar_trait TEXT NOT NULL DEFAULT '',
  usage_count INTEGER NOT NULL DEFAULT 0,
  avg_parse_score REAL NOT NULL DEFAULT 0,
  patch_version TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(weapon_combo, role, class, patch_version)
);

CREATE INDEX idx_build_stats_weapon ON build_stats(weapon_combo);
CREATE INDEX idx_build_stats_role ON build_stats(role);
CREATE INDEX idx_build_stats_class ON build_stats(class);
CREATE INDEX idx_build_stats_usage ON build_stats(usage_count DESC);

-- Knowledge documents for RAG retrieval
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  vectorize_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_knowledge_docs_type ON knowledge_docs(doc_type);
CREATE INDEX idx_knowledge_docs_vectorize ON knowledge_docs(vectorize_id);
