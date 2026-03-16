/**
 * Seed script — generates sample builds and outputs SQL for D1 insertion.
 *
 * Usage:
 *   node roster-hub-api/src/db/seed-builds.mjs > roster-hub-api/src/db/seed-builds.sql
 *   wrangler d1 execute roster-hub-db --remote --file=roster-hub-api/src/db/seed-builds.sql
 *
 * Indices match buildEncoding.ts lookup tables:
 *   ESO_CLASSES:   any-class=0 dk=1 sorc=2 nb=3 templar=4 warden=5 necro=6 arcanist=7
 *   COMBAT_ROLES:  tank=0 healer=1 magicka-dps=2 stamina-dps=3 hybrid-dps=4
 *   CLASS_SKILL_LINES (DK): ardent-flame=0 draconic-power=1 earthen-heart=2
 *                  (Sorc): dark-magic=3 daedric-summoning=4 storm-calling=5
 *                  (NB):   assassination=6 shadow=7 siphoning=8
 *                  (Templar): aedric-spear=9 dawns-wrath=10 restoring-light=11
 *                  (Warden): animal-companions=12 green-balance=13 winters-embrace=14
 *                  (Necro): grave-lord=15 bone-tyrant=16 living-death=17
 *                  (Arcanist): herald-of-the-tome=18 soldier-of-apocrypha=19 curative-runeforms=20
 */

// ─── Encoding (mirrors src/utils/rosterEncoding.ts) ──────────────────────────

function toBase64Url(bytes) {
  let b64 = Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function deflateString(str) {
  const input = new TextEncoder().encode(str);
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  await Promise.all([writer.write(input).then(() => writer.close()), Promise.resolve()]);

  const chunks = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

async function encodeBuild(compact) {
  const json = JSON.stringify(compact);
  const compressed = await deflateString(json);
  return toBase64Url(compressed);
}

// ─── Sample builds ─────────────────────────────────────────────────────────────

const BUILDS = [
  {
    meta: {
      title: 'Meta Trash DK — Magicka DPS',
      description:
        'Dragonknight Magicka DPS with Nightblade and Arcanist subclassing. Perfected Sul-Xan\'s Torment + Velothi Ur-Mage\'s Amulet. Front bar dual daggers, back bar bow.',
      eso_class: 'dragonknight',
      role: 'magicka-dps',
      game_mode: 'pve',
      tags: ['meta', 'group-content', 'subclass', 'dual-dagger'],
    },
    compact: {
      v: 1,
      n: 'Meta Trash DK — Magicka DPS',
      d: 'Dragonknight Magicka DPS with Nightblade and Arcanist subclassing.',
      ec: 1, // dragonknight
      csl: [0, 18, 6], // ardent-flame, herald-of-the-tome, assassination
      r: 2, // magicka-dps
      ra: ['dunmer', 'khajiit', 'breton'],
      s: [
        {
          nm: 'Trash Setup',
          at: [49, 15, 0], // mostly magicka
          ms: 'thief',
          sk: {
            // Front: Burning Embers, Molten Whip, Engulfing Dragonfire, Rapid Strikes, Deadly Cloak, Standard of Might (ult)
            0: { 0: 20660, 1: 20805, 2: 20930, 3: 38857, 4: 38910, 5: 32947 },
            // Back: Endless Hail, Unstable Wall, Degeneration, Cauterize, Barbed Trap, Standard of Might (ult)
            1: { 0: 38692, 1: 39052, 2: 40457, 3: 32881, 4: 40382, 5: 32947 },
          },
          // Gear: Sul-Xan's Torment (body) + Mother's Sorrow (jewelry+weapons)
          g: {
            0: 173746, 2: 173743, 3: 173748, 6: 173749, 8: 173747, 9: 173744, 16: 173741,
            1: 97218, 11: 97217, 12: 97224,
          },
        },
      ],
    },
  },
  {
    meta: {
      title: 'Trial Healer — Restoring Templar',
      description:
        'High-sustain Templar healer for 12-man trials. Jorvuld\'s Guidance + Spaulder of Ruin. Maximises healing done and Major/Minor Mending uptime.',
      eso_class: 'templar',
      role: 'healer',
      game_mode: 'pve',
      tags: ['trials', 'healer', 'templar', 'support'],
    },
    compact: {
      v: 1,
      n: 'Trial Healer — Restoring Templar',
      d: 'High-sustain Templar healer. Jorvuld\'s Guidance + Spaulder of Ruin.',
      ec: 4, // templar
      csl: [9, 10, 11], // aedric-spear, dawns-wrath, restoring-light
      r: 1, // healer
      ra: ['breton', 'argonian', 'high-elf'],
      s: [
        {
          nm: 'Trial Setup',
          at: [20, 34, 10],
          ms: 'atronach',
          sk: {
            // Front: Breath of Life, Channeled Focus, Luminous Shards, Purifying Light, Combat Prayer, Remembrance (ult)
            0: { 0: 22256, 1: 22240, 2: 26858, 3: 21765, 4: 40094, 5: 22229 },
            // Back: Healing Springs, Radiating Regen, Extended Ritual, Energy Orb, Elemental Drain, Aggressive Horn (ult)
            1: { 0: 40060, 1: 40079, 2: 22262, 3: 42038, 4: 39095, 5: 40223 },
          },
          // Gear: Jorvuld's Guidance (body) + Whorl of the Depths (jewelry)
          g: {
            0: 129127, 2: 129124, 3: 129130, 6: 129131, 8: 129128, 9: 129125, 16: 129121,
            1: 186419, 11: 186418, 12: 186422,
          },
        },
      ],
    },
  },
  {
    meta: {
      title: 'Stamina Warden DD — Animal Companions',
      description:
        'Stamina Warden for group and solo content. Pillar of Nirn + Deadly Strike. Heavy DoT-focused rotation with Subterranean Assault and Bird of Prey.',
      eso_class: 'warden',
      role: 'stamina-dps',
      game_mode: 'pve',
      tags: ['stamina', 'warden', 'dot', 'nature'],
    },
    compact: {
      v: 1,
      n: 'Stamina Warden DD — Animal Companions',
      d: 'Pillar of Nirn + Deadly Strike. DoT-focused rotation with Subterranean Assault.',
      ec: 5, // warden
      csl: [12, 13, 14], // animal-companions, green-balance, winters-embrace
      r: 3, // stamina-dps
      ra: ['wood-elf', 'redguard', 'orc'],
      s: [
        {
          nm: 'Main Setup',
          at: [0, 20, 44],
          ms: 'thief',
          sk: {
            // Front: Subterranean Assault, Cutting Dive, Bull Netch, Bird of Prey, Barbed Trap, Wild Guardian (ult)
            0: { 0: 86014, 1: 85999, 2: 86058, 3: 86045, 4: 40382, 5: 85990 },
            // Back: Endless Hail, Unstable Wall, Growing Swarm, Ice Fortress, Deceptive Predator, Wild Guardian (ult)
            1: { 0: 38692, 1: 39052, 2: 86031, 3: 86130, 4: 86041, 5: 85990 },
          },
          // Gear: Pillar of Nirn (body) + Deadly Strike (jewelry)
          g: {
            0: 127541, 2: 127538, 3: 127543, 6: 127544, 8: 127542, 9: 127539, 16: 127537,
            1: 87873, 11: 87873, 12: 87876,
          },
        },
      ],
    },
  },
  {
    meta: {
      title: 'Magicka Sorcerer — Daedric Surge',
      description:
        'Classic Magicka Sorcerer for all content. Mother\'s Sorrow + Whorl of the Depths. Pet-based sustain with Frenzied Momentum and Bound Aegis.',
      eso_class: 'sorcerer',
      role: 'magicka-dps',
      game_mode: 'pve',
      tags: ['sorcerer', 'pets', 'magicka', 'beginner-friendly'],
    },
    compact: {
      v: 1,
      n: 'Magicka Sorcerer — Daedric Surge',
      d: 'Mother\'s Sorrow + Whorl of the Depths. Pet sustain with Bound Aegis.',
      ec: 2, // sorcerer
      csl: [3, 4, 5], // dark-magic, daedric-summoning, storm-calling
      r: 2, // magicka-dps
      ra: ['high-elf', 'breton', 'dark-elf'],
      s: [
        {
          nm: 'Main Setup',
          at: [49, 15, 0],
          ms: 'thief',
          sk: {
            // Front: Crystal Fragments, Haunting Curse, Daedric Prey, Boundless Storm, Critical Surge, Greater Storm Atronach (ult)
            0: { 0: 46324, 1: 24330, 2: 24328, 3: 23213, 4: 23678, 5: 23492 },
            // Back: Unstable Wall, Liquid Lightning, Volatile Familiar, Bound Aegis, Force Pulse, Greater Storm Atronach (ult)
            1: { 0: 39052, 1: 23200, 2: 23316, 3: 24163, 4: 46356, 5: 23492 },
          },
          // Gear: Mother's Sorrow (body) + Whorl of the Depths (jewelry)
          g: {
            0: 97235, 2: 97232, 3: 97238, 6: 97239, 8: 97236, 9: 97233, 16: 97231,
            1: 186419, 11: 186418, 12: 186422,
          },
        },
      ],
    },
  },
  {
    meta: {
      title: 'Necromancer Tank — Bone Tyrant',
      description:
        'Necromancer tank for veteran trials and arenas. Saxhleel Champion + Crimson Oath\'s Rive. Ultimate-stacking with Stalwart Guard and Bone Shield.',
      eso_class: 'necromancer',
      role: 'tank',
      game_mode: 'pve',
      tags: ['tank', 'necromancer', 'veteran', 'trials'],
    },
    compact: {
      v: 1,
      n: 'Necromancer Tank — Bone Tyrant',
      d: 'Saxhleel Champion + Crimson Oath\'s Rive. Ultimate-stacking Necro tank.',
      ec: 6, // necromancer
      csl: [15, 16, 17], // grave-lord, bone-tyrant, living-death
      r: 0, // tank
      ra: ['nord', 'imperial', 'orc'],
      s: [
        {
          nm: 'Tank Setup',
          at: [0, 64, 0],
          ms: 'atronach',
          sk: {
            // Front: Beckoning Armor, Necrotic Potency, Agony Totem, Pierce Armor, Heroic Slash, Ravenous Goliath (ult)
            0: { 0: 118237, 1: 118639, 2: 118404, 3: 38250, 4: 38264, 5: 118279 },
            // Back: Spirit Guardian, Resistant Flesh, Unnerving Boneyard, Inner Rage, Elemental Drain, Aggressive Horn (ult)
            1: { 0: 118912, 1: 117883, 2: 117805, 3: 42056, 4: 39095, 5: 40223 },
          },
          // Gear: Saxhleel Champion (body) + Crimson Oath's Rive (jewelry)
          g: {
            0: 173875, 2: 173872, 3: 173877, 6: 173878, 8: 173876, 9: 173873, 16: 173870,
            1: 177401, 11: 177400, 12: 177404,
          },
        },
      ],
    },
  },
  {
    meta: {
      title: 'Arcanist Magicka DPS — Herald of the Tome',
      description:
        'Arcanist Magicka DPS with Runic Sunder and Fatecarver. New player-friendly rotation with strong passive Crux generation. Whorl of the Depths + Deadly Strike.',
      eso_class: 'arcanist',
      role: 'magicka-dps',
      game_mode: 'pve',
      tags: ['arcanist', 'magicka', 'new-player', 'necrom'],
    },
    compact: {
      v: 1,
      n: 'Arcanist Magicka DPS — Herald of the Tome',
      d: 'Runic Sunder + Fatecarver rotation. New-player-friendly Crux generation.',
      ec: 7, // arcanist
      csl: [18, 19, 20], // herald-of-the-tome, soldier-of-apocrypha, curative-runeforms
      r: 2, // magicka-dps
      ra: ['high-elf', 'breton', 'dunmer'],
      s: [
        {
          nm: 'Main Setup',
          at: [49, 15, 0],
          ms: 'thief',
          sk: {
            // Front: Cephaliarch's Flail, Escalating Runeblades, Runic Sunder, Fulminating Rune, Degeneration, The Languid Eye (ult)
            0: { 0: 183006, 1: 182977, 2: 183430, 3: 182988, 4: 40457, 5: 189867 },
            // Back: Unstable Wall, Inspired Scholarship, Cruxweaver Armor, Barbed Trap, Inner Light, Pragmatic Fatecarver (ult)
            1: { 0: 39052, 1: 185842, 2: 185908, 3: 40382, 4: 40478, 5: 186366 },
          },
          // Gear: Whorl of the Depths (body) + Deadly Strike (jewelry)
          g: {
            0: 186428, 2: 186425, 3: 186431, 6: 186432, 8: 186429, 9: 186426, 16: 186423,
            1: 87873, 11: 87873, 12: 87876,
          },
        },
      ],
    },
  },
];

// ─── Generate SQL ─────────────────────────────────────────────────────────────

function genId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

function sqlStr(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  const lines = [
    '-- Seed: sample builds for Build Hub',
    '-- Generated by seed-builds.mjs',
    '',
    '-- Clean up previous seed data before inserting fresh builds',
    "DELETE FROM build_tags WHERE build_id IN (SELECT id FROM builds WHERE author_id = 'seed-author');",
    "DELETE FROM builds WHERE author_id = 'seed-author';",
    '',
  ];

  for (const b of BUILDS) {
    const buildData = await encodeBuild(b.compact);
    const id = genId();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    lines.push(
      `INSERT OR IGNORE INTO builds (id, author_id, author_name, is_anonymous, title, description, eso_class, role, game_mode, build_data, vote_count, created_at, updated_at) VALUES (${sqlStr(id)}, 'seed-author', 'ESO Toolkit Team', 0, ${sqlStr(b.meta.title)}, ${sqlStr(b.meta.description)}, ${sqlStr(b.meta.eso_class)}, ${sqlStr(b.meta.role)}, ${sqlStr(b.meta.game_mode)}, ${sqlStr(buildData)}, 0, ${sqlStr(now)}, ${sqlStr(now)});`,
    );

    for (const tag of b.meta.tags) {
      lines.push(
        `INSERT OR IGNORE INTO build_tags (build_id, tag) VALUES (${sqlStr(id)}, ${sqlStr(tag)});`,
      );
    }

    lines.push('');
  }

  console.log(lines.join('\n'));
}

main().catch(console.error);
