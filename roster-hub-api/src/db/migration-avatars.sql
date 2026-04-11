-- Migration: Add avatar columns to user_profiles
-- Allows users to upload a custom profile avatar image (hosted on ImgBB).
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-avatars.sql

ALTER TABLE user_profiles ADD COLUMN avatar_url       TEXT DEFAULT NULL;
ALTER TABLE user_profiles ADD COLUMN avatar_thumb_url  TEXT DEFAULT NULL;
