-- ONE-SHOT backfill: un-HTML-escape stored free-text CONTENT.
--
-- Companion to migration-unescape-author-name.sql. The write paths previously
-- stored free-text via sanitize()=escapeHtml(trim()), so titles/descriptions/
-- bios/comment bodies with ' < > " & rendered as literal entities ("&#x27;").
-- The write paths now store these RAW (escape on OUTPUT — React text nodes /
-- MUI props auto-escape; verified no raw-HTML sink consumes them); this repairs
-- existing rows.
--
-- ⚠️ NOT IDEMPOTENT — run EXACTLY ONCE. Unlike identity fields, free-text can
-- legitimately contain a user-typed literal "&amp;" / "<" etc.; re-running the
-- decode would corrupt those. The blanket column REPLACE is one-shot only.
--
-- SCOPE: only the flat free-text columns below. Deliberately EXCLUDED:
--   • enum/regex-validated cols (eso_class, role, game_mode, trial_id, pack_type)
--     and all tag columns — their validators forbid & < > " ' so they hold no
--     entities (sanitize() is a no-op there).
--   • JSON blobs (rosters.recommended_addons, packs.addons) — a column-wide
--     REPLACE would rewrite structural JSON text; their inner addon name/note/
--     packTitle need a JSON-aware parse→unescape→restringify pass instead. (As
--     of this migration, prod holds zero escaped entities in those blobs.)
--
-- Apply once, alongside the worker deploy:
--   wrangler d1 execute roster-hub-db --remote --file=src/db/migration-unescape-content.sql

UPDATE builds SET
  title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&'),
  description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(description, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE title LIKE '%&%' OR description LIKE '%&%';

UPDATE rosters SET
  title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&'),
  description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(description, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE title LIKE '%&%' OR description LIKE '%&%';

UPDATE packs SET
  title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&'),
  description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(description, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE title LIKE '%&%' OR description LIKE '%&%';

UPDATE user_profiles SET
  bio = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(bio, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE bio LIKE '%&%';

UPDATE roster_comments SET
  body = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(body, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE body LIKE '%&%';

UPDATE build_comments SET
  body = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(body, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE body LIKE '%&%';
