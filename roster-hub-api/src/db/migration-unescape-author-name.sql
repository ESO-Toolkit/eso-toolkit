-- Backfill: un-HTML-escape stored author_name values.
--
-- Until this change, every write path stored `author_name` as escapeHtml(user.name)
-- (e.g. "SamplePlayer'jo" → "SamplePlayer&#x27;jo"). But author_name is an IDENTITY / lookup key:
-- getUserProfile matches it raw against the URL slug (`author_name = ? COLLATE NOCASE`).
-- Escaping it on store therefore broke profile resolution for any ESO name containing
-- ' < > " & — the profile 404'd with "Player not found" — and rendered as mojibake.
-- The write paths now store author_name RAW (escape on OUTPUT, not on store); this
-- migration repairs existing rows.
--
-- Reverses escapeHtml() in the exact opposite order it was applied, so `&amp;` is
-- decoded LAST (a literal '&' was encoded first, hence must be restored last to avoid
-- corrupting sequences like "&amp;lt;"). Scoped to rows containing '&' and idempotent:
-- re-running it leaves already-raw names unchanged.
--
-- Apply BEFORE/with the worker deploy:
--   wrangler d1 execute roster-hub-db --remote --file=src/db/migration-unescape-author-name.sql

UPDATE builds SET author_name =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(author_name, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE author_name LIKE '%&%';

UPDATE rosters SET author_name =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(author_name, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE author_name LIKE '%&%';

UPDATE roster_comments SET author_name =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(author_name, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE author_name LIKE '%&%';

UPDATE build_comments SET author_name =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(author_name, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE author_name LIKE '%&%';

UPDATE user_profiles SET author_name =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(author_name, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE author_name LIKE '%&%';

UPDATE packs SET author_name =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(author_name, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE author_name LIKE '%&%';
