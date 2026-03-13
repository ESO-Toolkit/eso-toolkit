-- Seed data for Roster Hub local testing
-- Run: npm run db:seed:remote
-- Source: #1 leaderboard entries from ESO Logs (fetched 2026-03-12)

INSERT OR IGNORE INTO rosters (id, author_id, author_name, title, description, trial_id, roster_data, vote_count, created_at) VALUES
  ('seed-aa-01', 'user-seed-1', 'RIP Vital', 'AA #1 — RIP Vital', 'Rank 1 Aetherian Archive (vHM). 3-tank comp with Pearlescent Ward, Turning Tide, and Caluurion''s Legacy. 1 healer running SPC + Pillager''s.', 'AA', 'placeholder', 61, datetime('now', '-2 days')),
  ('seed-hrc-01', 'user-seed-2', 'Wächter des Zwielichts', 'HRC #1 — Wächter des Zwielichts', 'Rank 1 Hel Ra Citadel (vHM). Dual DK tanks with Lucent Echoes and Crimson Oath''s Rive. Full Arcanist DPS squad.', 'HRC', 'placeholder', 54, datetime('now', '-3 days')),
  ('seed-hof-01', 'user-seed-3', 'Dragonia', 'HOF #1 — Dragonia', 'Rank 1 Halls of Fabrication (vHM). Pearlescent Ward + Xoryn''s Masterpiece tank setup. 7 Arcanist DPS all running Deadly Strike.', 'HOF', 'placeholder', 48, datetime('now', '-4 days')),
  ('seed-as-01', 'user-seed-4', 'Les Serres d''Auri-El', 'AS #1 — Les Serres d''Auri-El', 'Rank 1 Asylum Sanctorium (+2). Saxhleel Champion + Pearlescent Ward on OT. Tide-Born Wildstalker meta across all DPS.', 'AS', 'placeholder', 42, datetime('now', '-5 days')),
  ('seed-cr-01', 'user-seed-5', 'TranscendingApotheosis', 'CR #1 — TranscendingApotheosis', 'Rank 1 Cloudrest (+3). Solo tank/healer comp. 10 DPS slots — Perf Slivers + Tide-Born Wildstalker dominant.', 'CR', 'placeholder', 67, datetime('now', '-1 days')),
  ('seed-ss-01', 'user-seed-6', 'BDSM', 'SS #1 — BDSM', 'Rank 1 Sunspire (vHM). Pearlescent Ward + Elemental Catalyst tanks. Diverse DPS with Slivers, Deadly Strike, and Alkosh.', 'SS', 'placeholder', 73, datetime('now', '-6 days')),
  ('seed-ka-01', 'user-seed-7', 'Eclipsë', 'KA #1 — Eclipsë', 'Rank 1 Kyne''s Aegis (vHM). Solo tank/healer setup with Lucent Echoes + Powerful Assault. Aegis Caller stacking on DPS.', 'KA', 'placeholder', 39, datetime('now', '-7 days')),
  ('seed-rg-01', 'user-seed-8', 'Clown Consortium', 'RG #1 — Clown Consortium', 'Rank 1 Rockgrove (vHM). Lucent Echoes + Pearlescent Ward main tank. DPS heavy on Berserking Warrior and Slivers.', 'RG', 'placeholder', 45, datetime('now', '-8 days')),
  ('seed-dsr-01', 'user-seed-9', 'Alles wird Gut', 'DSR #1 — Alles wird Gut', 'Rank 1 Dreadsail Reef (vHM). Pearlescent + Xoryn''s and Yolnahkriin + Lucent Echoes tanks. Spectral Cloak on all DPS.', 'DSR', 'placeholder', 58, datetime('now', '-9 days')),
  ('seed-oc-01', 'user-seed-10', 'MuLtiCoLOrEd PoNiEs', 'OAC #1 — MuLtiCoLOrEd PoNiEs', 'Rank 1 Oathsworn Citadel (vHM). Pillager''s Profit on main tank. Master Architect + Archdruid Devyric healer.', 'OAC', 'placeholder', 51, datetime('now', '-10 days'));

INSERT OR IGNORE INTO roster_tags (roster_id, tag) VALUES
  ('seed-aa-01', '#1'),
  ('seed-hrc-01', '#1'),
  ('seed-hof-01', '#1'),
  ('seed-as-01', '#1'),
  ('seed-cr-01', '#1'),
  ('seed-ss-01', '#1'),
  ('seed-ka-01', '#1'),
  ('seed-rg-01', '#1'),
  ('seed-dsr-01', '#1'),
  ('seed-oc-01', '#1');
