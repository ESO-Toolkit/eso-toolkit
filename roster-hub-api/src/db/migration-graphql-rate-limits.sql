-- IP-based rate limiting for the /graphql proxy endpoint
CREATE TABLE IF NOT EXISTS graphql_rate_limits (
  ip TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_graphql_rate_ip ON graphql_rate_limits(ip, created_at);
