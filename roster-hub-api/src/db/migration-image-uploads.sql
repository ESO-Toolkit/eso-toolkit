-- Image uploads: track hosted screenshots for moderation and cleanup
CREATE TABLE IF NOT EXISTS image_uploads (
  id TEXT PRIMARY KEY,
  uploader_id TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  delete_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_image_uploads_uploader ON image_uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_created ON image_uploads(created_at DESC);

-- Image reports: users can flag inappropriate screenshots
CREATE TABLE IF NOT EXISTS image_reports (
  id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL REFERENCES image_uploads(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_image_reports_image ON image_reports(image_id);
CREATE INDEX IF NOT EXISTS idx_image_reports_reporter ON image_reports(reporter_id);
