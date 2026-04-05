-- Store ImgBB delete URL so we can actually remove hosted images on delete/overwrite
ALTER TABLE user_profiles ADD COLUMN avatar_delete_url TEXT DEFAULT NULL;

-- Dedicated timestamp for avatar upload rate limiting (decoupled from generic updated_at)
ALTER TABLE user_profiles ADD COLUMN avatar_uploaded_at TEXT DEFAULT NULL;
