-- Add display name columns so we can match log analyzer players to esotk profiles
ALTER TABLE user_profiles ADD COLUMN na_display_name TEXT DEFAULT NULL;
ALTER TABLE user_profiles ADD COLUMN eu_display_name TEXT DEFAULT NULL;
