-- Seed data for Roster Hub local testing
-- Run: npm run db:seed:remote

INSERT OR IGNORE INTO rosters (id, author_id, author_name, title, description, trial_id, roster_data, vote_count, created_at) VALUES
  ('seed-ss-01', 'user-seed-1', 'VelvetStrike', 'Classic Sunspire Score Push', 'Our guild''s proven SS score setup. Dual DK tanks, two healer comps with Warhorn + Colossus coverage. Hits consistent 596k+.', 'SS', 'placeholder', 47, datetime('now', '-5 days')),
  ('seed-ss-02', 'user-seed-2', 'AshenwingNA', 'Beginner Friendly SS Prog', 'No mythics required. Flexible skill lines and forgiving gear — great for groups learning Sunspire mechanics for the first time.', 'SS', 'placeholder', 12, datetime('now', '-2 days')),
  ('seed-dsr-01', 'user-seed-3', 'Pyrethread', 'DSR Godslayer Setup', 'HM-tested Dreadsail Reef roster. Specific proc sets for Lylanar and Sail Ripper. Requires Oakensoul for banner DDs.', 'DSR', 'placeholder', 38, datetime('now', '-8 days')),
  ('seed-cr-01', 'user-seed-4', 'LunarCrestNA', 'Cloudrest Speed Run Comp', 'Sub-30 minute CR clear. Uses Z''Maja skip strat. Both healers need Enlivening Overflow for the portal phase.', 'CR', 'placeholder', 29, datetime('now', '-3 days')),
  ('seed-ka-01', 'user-seed-1', 'VelvetStrike', 'Kyne''s Aegis No-CP Prog', 'No-CP Kyne''s Aegis progression roster. Heavy sustain focus — all DDs running Witchmother''s Potent Brew and Clever Alchemist.', 'KA', 'placeholder', 21, datetime('now', '-6 days')),
  ('seed-se-01', 'user-seed-5', 'GlacierBaneEU', 'Sanity''s Edge Optimized', 'Meta SE roster post-U43 patch. Arcanist banner DD in slot 5. Adjusted healer CP spread for the new Ansuul burn.', 'SE', 'placeholder', 55, datetime('now', '-10 days')),
  ('seed-lc-01', 'user-seed-6', 'ObsidianVeil', 'Lucent Citadel Group Finder', 'Pug-friendly LC. No hard class requirements. Designed for LFG groups with rotating DPS. Just bring your best parse.', 'LC', 'placeholder', 8, datetime('now', '-1 days')),
  ('seed-mol-01', 'user-seed-2', 'AshenwingNA', 'Maw of Lorkhaj Score Push', 'Legacy trial but still competitive for score. Twin Atronach setup. Barrier on healer 2 for Rakkhat burn phase.', 'MOL', 'placeholder', 33, datetime('now', '-12 days'));

INSERT OR IGNORE INTO roster_tags (roster_id, tag) VALUES
  ('seed-ss-01', 'score-push'),
  ('seed-ss-01', 'optimized'),
  ('seed-ss-02', 'beginner'),
  ('seed-ss-02', 'prog'),
  ('seed-dsr-01', 'godslayer'),
  ('seed-dsr-01', 'optimized'),
  ('seed-cr-01', 'speed-run'),
  ('seed-cr-01', 'optimized'),
  ('seed-ka-01', 'no-cp'),
  ('seed-ka-01', 'prog'),
  ('seed-se-01', 'optimized'),
  ('seed-se-01', 'score-push'),
  ('seed-lc-01', 'group-finder'),
  ('seed-lc-01', 'beginner'),
  ('seed-mol-01', 'score-push');
