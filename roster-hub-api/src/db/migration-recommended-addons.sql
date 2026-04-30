-- Add recommended_addons JSON column to rosters table.
-- Stores the creator's addon recommendations as a JSON string:
-- { "packId": "trial-essentials", "addons": [{ "esouiId": 1855, "name": "...", ... }] }
ALTER TABLE rosters ADD COLUMN recommended_addons TEXT DEFAULT NULL;
