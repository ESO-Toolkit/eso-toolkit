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
            0: { 0: 126597, 1: 38964, 2: 23806, 3: 40327, 4: 31096, 5: 36972 },
            1: { 0: 38839, 1: 21275, 2: 31103, 3: 31828, 4: 34762, 5: 36972 },
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
            0: { 0: 22265, 1: 22269, 2: 22259, 3: 22241, 4: 22248, 5: 22230 },
            1: { 0: 22273, 1: 22277, 2: 22283, 3: 22288, 4: 22293, 5: 22300 },
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
            0: { 0: 41314, 1: 40995, 2: 17902, 3: 40251, 4: 40336, 5: 40460 },
            1: { 0: 41223, 1: 40385, 2: 39052, 3: 40420, 4: 40244, 5: 40460 },
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
            0: { 0: 24618, 1: 23201, 2: 23209, 3: 23213, 4: 23234, 5: 23219 },
            1: { 0: 23226, 1: 23230, 2: 23236, 3: 23240, 4: 23244, 5: 23248 },
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
            0: { 0: 39248, 1: 39249, 2: 39250, 3: 39251, 4: 39252, 5: 39253 },
            1: { 0: 39254, 1: 39255, 2: 39256, 3: 39257, 4: 39258, 5: 39259 },
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
            0: { 0: 42033, 1: 42036, 2: 42039, 3: 42042, 4: 42045, 5: 42048 },
            1: { 0: 42051, 1: 42054, 2: 42057, 3: 42060, 4: 42063, 5: 42066 },
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
  const lines = ['-- Seed: sample builds for Build Hub', '-- Generated by seed-builds.mjs', ''];

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
