-- Enforce single-owner ESO @handles on the profile display-name columns.
--
-- `PUT /users/me/display-names` writes na_display_name/eu_display_name, and
-- `POST /users/avatars/lookup` resolves avatars purely by matching those columns.
-- Without a uniqueness constraint two accounts could claim the same @handle, so
-- account A could set na_display_name='@VictimHandle' and have their avatar render
-- next to the victim in every report. Partial UNIQUE indexes (WHERE ... IS NOT NULL)
-- keep the constraint while still allowing many rows with a NULL display name.
--
-- ⚠️ If prod already holds duplicate non-NULL values in either column, creating the
-- index fails. Resolve the duplicates first (keep the earliest owner, NULL the rest),
-- then apply.
--
-- Apply alongside the worker deploy:
--   wrangler d1 execute roster-hub-db --remote --file=src/db/migration-display-names-unique.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_na_display_name
  ON user_profiles (na_display_name)
  WHERE na_display_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_eu_display_name
  ON user_profiles (eu_display_name)
  WHERE eu_display_name IS NOT NULL;
