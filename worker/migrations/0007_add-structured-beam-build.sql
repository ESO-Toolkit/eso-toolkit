-- Add structured beam build data so the model can generate proper gear tables
-- Source: TGC Certified Mentors (Madmaxx727) + AEDRA raid leads
-- This addresses the regression where anti-hallucination rules correctly refuse
-- to fabricate tables, but no structured data existed for beam builds.

-- Full beginner beam build with slot-by-slot gear, skill bars, and rotation
INSERT INTO knowledge_docs (doc_type, title, content, source) VALUES
('build', 'Beginner Beam Build - Full Setup', '## Beginner Beam Build (Any Class, Sorcerer Recommended)

### Gear Table
| Slot | Set | Trait | Enchant |
|------|-----|-------|---------|
| Head | Any Trial Monster Set or Velothi | Divines | Max Magicka |
| Shoulders | Any Trial Monster Set | Divines | Max Magicka |
| Chest | Perfected Null Arca | Divines | Max Magicka |
| Legs | Perfected Null Arca | Divines | Max Magicka |
| Hands | Perfected Null Arca | Divines | Max Magicka |
| Waist | Perfected Null Arca | Divines | Max Magicka |
| Feet | Perfected Null Arca | Divines | Max Magicka |
| Necklace | Advancing Yokeda or Heartland Conqueror | Bloodthirsty | Weapon Damage |
| Ring 1 | Advancing Yokeda or Heartland Conqueror | Bloodthirsty | Weapon Damage |
| Ring 2 | Velothi Amulet (Mythic) | — | — |
| Front Bar | Advancing Yokeda or Heartland Conqueror Daggers | Nirnhoned + Charged (content) or Double Charged (parsing) | Flame / Poison |
| Back Bar | Perfected Maelstrom Greatsword | Infused | Weapon Damage (Berserker) |

### Starter Gear (Pre-Trial)
Players without trial gear should start with:
- Body: Mothers Sorrow (overland Deshaan) or Julianos (crafted)
- Weapons + Jewelry: Orders Wrath (crafted, guaranteed crit)
- Mythic: Velothi Amulet (top priority to farm)
- Monster: 1pc Slimecraw (easy to get, gives crit)

### Front Bar Skills
1. Escalating Runeblades (Herald of the Tome) — spammable
2. Fatecarver / Pragmatic Fatecarver (Herald of the Tome) — channeled beam, hold for full duration
3. Tentacular Dread (Herald of the Tome) — cast at 3 Crux for Abyssal Ink debuff
4. Barbed Trap or flex slot — Minor Force source if not using Velothi
5. Merciless Resolve (Assassination subclass) — keep active, fire spectral bow at 5 stacks

### Back Bar Skills
1. Stampede (Two Handed) — gap closer + Maelstrom Greatsword buff
2. Unstable Wall of Elements or Carve (Two Handed) — AoE DoT
3. Degeneration or Structured Entropy (Mages Guild) — Major Sorcery + DoT
4. Class flex (Sorcerer: Hurricane + Liquid Lightning / Warden: Winters Revenge + Arctic Wind)
5. Camouflaged Hunter or flex — Minor Berserk + Fighters Guild passives

### Rotation
1. Pre-buff: Merciless Resolve, Degeneration
2. Back bar: Stampede → Wall of Elements → Bar Swap
3. Front bar: Tentacular Dread (at 3 Crux) → Runeblades x2-3 → Fatecarver (full channel)
4. Repeat from step 2 when DoTs expire
5. Fire Spectral Bow (Merciless) whenever it procs at 5 stacks

### Key Tips
- Mundus: The Thief (critical chance)
- Food: Blue bi-stat (Max Magicka + Max Health)
- Potions: Spell Power or Tri-stat
- All 64 attribute points into Magicka
- Subclass: Assassination (Nightblade) for Hemorrhage passive + Merciless Resolve
- Always light attack weave between abilities
- Fatecarver channels for ~2.5 seconds — do not cancel early
- Pragmatic Fatecarver morph gives a damage shield while channeling (recommended for beginners)', 'verified');

-- Sorcerer-specific beam build additions
INSERT INTO knowledge_docs (doc_type, title, content, source) VALUES
('build', 'Sorcerer Beam Build Specifics', 'Sorcerer is the most beginner-friendly class for beam builds due to built-in survivability. Key Sorcerer advantages: Critical Surge (Storm Calling) heals on every critical hit — with high crit chance this is essentially permanent self-healing. Volatile Familiar or Twilight Tormentor pets deal passive damage without rotation input. Hurricane (Storm Calling) provides Major Resolve + AoE damage on back bar.

### Sorcerer Back Bar Setup
1. Stampede (Two Handed) — Maelstrom buff
2. Hurricane (Storm Calling) — Major Resolve + AoE
3. Liquid Lightning (Storm Calling) — ground AoE DoT
4. Critical Surge (Storm Calling) — Major Sorcery + crit healing
5. Camouflaged Hunter or Boundless Storm — flex

### Sorcerer vs Other Classes for Beam
- Sorcerer: Easiest. Pet healing + Critical Surge = very hard to die. Less raid utility.
- Warden: Strong. Winters Revenge + Arctic Wind give frost synergies and self-heal. Minor Toughness group buff.
- Dragonknight: Good if you want to eventually transition to Runeblades. Burning Embers self-heal.
- Arcanist base: Natural fit since beam skills are Arcanist origin. Pragmatic Shield built into class.
- Any class works — subclassing means every class has access to Herald of the Tome skills.', 'verified');

-- Trial-specific beginner advice
INSERT INTO knowledge_docs (doc_type, title, content, source) VALUES
('build', 'Beginner-Friendly Vet Trials', 'Recommended vet trial progression for new DPS players:

### Entry Level (learn mechanics, get trial gear)
- **vAA (Aetherian Archive)** — Simplest vet trial. Good for learning trial basics. Drops Advancing Yokeda.
- **vHRC (Hel Ra Citadel)** — Simple mechanics, slightly harder than vAA. Drops Advancing Yokeda.
- **vSO (Sanctum Ophidia)** — Moderate difficulty. Good DPS check on Ozara. Drops Twice-Fanged Serpent.

### Intermediate (once comfortable with basics)
- **vMoL (Maw of Lorkhaj)** — First real challenge. Zhajhassa twins require coordination. Drops Lunar Bastion.
- **vCR (Cloudrest)** — Good for learning DPS while handling mechanics. +1/+2/+3 scaling difficulty.

### Get These First
- Any 3-piece trial set bonus activates Minor Slayer — this is more important than which specific set. Run normal trials first to get unperfected gear, then farm vet for perfected.
- Advancing Yokeda from vAA/vHRC is one of the strongest DPS sets and comes from the easiest trials.', 'verified');
