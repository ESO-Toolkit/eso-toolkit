-- Update starter gear to current 2025-2026 meta: Orders Wrath + Tide-Born
-- Wildstalker replaced Mother's Sorrow / Julianos. Sources: Hack The Minotaur,
-- Hyperioxes, Kalam0n, eso-sets.com.

UPDATE knowledge_docs
SET content = REPLACE(
  content,
  '### Starter Gear (Pre-Trial)
Players without trial gear should start with:
- Body: Mothers Sorrow (overland Deshaan) or Julianos (crafted)
- Weapons + Jewelry: Orders Wrath (crafted, guaranteed crit)
- Mythic: Velothi Amulet (top priority to farm)
- Monster: 1pc Slimecraw (easy to get, gives crit)',
  '### Starter Gear (Pre-Trial)
Players without trial gear should start with:
- Body (5pc): **Orders Wrath** (crafted, only 3 traits needed — 943 Crit Chance + 8% Crit Damage)
- Weapons + Jewelry (5pc): **Deadly Strike** (buy from Cyrodiil merchants or guild traders — 15% DoT and channeled ability damage, perfect for Fatecarver beam). Alternative: **Tide-Born Wildstalker** (crafted, 5 traits, 12% direct damage to monsters — from Solstice zone, requires Seasons of the Worm Cult)
- Mythic: **Velothi Ur-Mage''s Amulet** (top priority to farm — massive damage boost)
- Monster: 1pc **Slimecraw** (easy vet dungeon, gives crit chance)

**Progression path:** Orders Wrath + Deadly Strike → replace body with **Perfected Null Arca** (trial) → replace jewelry/weapons with **Advancing Yokeda** (trial)'
)
WHERE title = 'Beginner Beam Build - Full Setup';
