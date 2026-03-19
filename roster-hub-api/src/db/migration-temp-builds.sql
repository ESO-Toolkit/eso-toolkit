-- Temporary builds: guest-created builds with 5-day expiry
CREATE TABLE IF NOT EXISTS temp_builds (
  id TEXT PRIMARY KEY,
  build_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+5 days'))
);

CREATE INDEX IF NOT EXISTS idx_temp_builds_expires ON temp_builds(expires_at);

-- Rate limit tracking for temp build creation (by IP)
CREATE TABLE IF NOT EXISTS temp_build_rate_limits (
  ip TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_temp_build_rate_ip ON temp_build_rate_limits(ip, created_at);
