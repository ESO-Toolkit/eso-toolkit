/**
 * Generates valid encoded roster strings for the Roster Hub seed data.
 * Uses Node's zlib.deflateRawSync to match the browser's CompressionStream('deflate-raw').
 *
 * Run: node scripts/generate-seed-rosters.cjs
 */

const zlib = require('zlib');

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encode(compactRoster) {
  const json = JSON.stringify(compactRoster);
  const compressed = zlib.deflateRawSync(Buffer.from(json, 'utf8'));
  return toBase64Url(compressed);
}

// ── Compact roster objects (v:2 format, mirrors rosterEncoding.ts) ───────────
// Skill line indices (from CLASS_SKILL_LINES order in roster.ts):
//   DK: 0=Ardent Flame, 1=Draconic Power, 2=Earthen Heart
//   Sorc: 3=Dark Magic, 4=Daedric Summoning, 5=Storm Calling
//   NB: 6=Assassination, 7=Shadow, 8=Siphoning
//   Templar: 9=Aedric Spear, 10=Dawn's Wrath, 11=Restoring Light
//   Warden: 12=Animal Companions, 13=Green Balance, 14=Winter's Embrace
//   Necro: 15=Grave Lord, 16=Bone Tyrant, 17=Living Death
//   Arcanist: 18=Herald of the Tome, 19=Apocryphal Soldier, 20=Curative Runeforms
//
// Ultimate indices (SupportUltimate):
//   0=Aggressive Warhorn, 1=Glacial Colossus, 2=Barrier, 3=Greater Storm Atronach
//
// HealerBuff indices: 0=Enlivening Overflow, 1=From the Brink
// HealerChampionPoint indices: 0=Enlivening Overflow, 1=From the Brink

const rosters = {
  // Classic Sunspire Score Push — dual DK tanks
  'seed-ss-01': {
    v: 2,
    n: 'Classic SS Score Push',
    t1: { pn: 'Tank1', ul: 0, sl: { l1: 0, l2: 1, l3: 2 }, gs: { s1: 234, s2: 135, ms: 32 } },
    t2: { pn: 'Tank2', ul: 1, sl: { l1: 0, l2: 1, l3: 2 }, gs: { s1: 234, s2: 135, ms: 32 } },
    h1: { pn: 'Healer1', hb: 0, cp: 0, ul: 0, sl: { l1: 11, l2: 13, l3: 20 } },
    h2: { pn: 'Healer2', hb: 1, cp: 1, ul: 2, sl: { l1: 11, l2: 13, l3: 17 } },
    dp: [
      { sn: 1, pn: 'DD1', sl: { l1: 6, l2: 7, l3: 8 } },
      { sn: 2, pn: 'DD2', sl: { l1: 3, l2: 4, l3: 5 } },
      { sn: 3, pn: 'DD3', sl: { l1: 18, l2: 19, l3: 20 } },
      { sn: 4, pn: 'DD4', sl: { l1: 0, l2: 1, l3: 2 } },
      { sn: 5, pn: 'DD5', jt: 0 },
      { sn: 6, pn: 'DD6', sl: { l1: 9, l2: 10, l3: 11 } },
      { sn: 7, pn: 'DD7', sl: { l1: 15, l2: 16, l3: 17 } },
      { sn: 8, pn: 'DD8', sl: { l1: 12, l2: 13, l3: 14 } },
    ],
    no: 'Proven SS score setup. Warhorn + Colossus coverage. 596k+ consistent.',
  },

  // Beginner Friendly SS
  'seed-ss-02': {
    v: 2,
    n: 'Beginner SS Prog',
    t1: { ul: 0, sl: { fl: 1 } },
    t2: { ul: 1, sl: { fl: 1 } },
    h1: { hb: 0, cp: 0, sl: { fl: 1 } },
    h2: { hb: 1, cp: 1, sl: { fl: 1 } },
    no: 'No mythics required. Flexible skill lines and forgiving gear.',
  },

  // DSR Godslayer
  'seed-dsr-01': {
    v: 2,
    n: 'DSR Godslayer Setup',
    t1: { pn: 'DKTank', ul: 0, sl: { l1: 0, l2: 1, l3: 2 }, gs: { s1: 234, s2: 135, ms: 32 } },
    t2: { pn: 'ArcTank', ul: 1, sl: { l1: 18, l2: 19, l3: 20 }, gs: { s1: 234, s2: 178, ms: 32 } },
    h1: { pn: 'TemplarHeal', hb: 0, cp: 0, ul: 0, sl: { l1: 9, l2: 11, l3: 20 } },
    h2: { pn: 'NecroHeal', hb: 1, cp: 1, ul: 3, sl: { l1: 11, l2: 17, l3: 20 } },
    dp: [
      { sn: 1, pn: 'DD1', sl: { l1: 6, l2: 7, l3: 8 } },
      { sn: 2, pn: 'DD2', sl: { l1: 3, l2: 4, l3: 5 } },
      { sn: 3, pn: 'DD3', sl: { l1: 18, l2: 19, l3: 20 } },
      { sn: 4, pn: 'DD4', sl: { l1: 0, l2: 1, l3: 2 } },
      { sn: 5, pn: 'Banner', jt: 0 },
      { sn: 6, pn: 'DD6', sl: { l1: 9, l2: 10, l3: 11 } },
      { sn: 7, pn: 'DD7', sl: { l1: 15, l2: 16, l3: 17 } },
      { sn: 8, pn: 'DD8', sl: { l1: 12, l2: 13, l3: 14 } },
    ],
    no: 'HM-tested. Requires Oakensoul for banner DD.',
  },

  // Cloudrest Speed Run
  'seed-cr-01': {
    v: 2,
    n: 'CR Speed Run Comp',
    t1: { pn: 'Tank1', ul: 0, sl: { l1: 0, l2: 1, l3: 2 } },
    t2: { pn: 'Tank2', ul: 1, sl: { l1: 18, l2: 19, l3: 20 } },
    h1: { pn: 'Healer1', hb: 0, cp: 0, ul: 0, sl: { l1: 9, l2: 11, l3: 20 } },
    h2: { pn: 'Healer2', hb: 1, cp: 1, ul: 2, sl: { l1: 11, l2: 13, l3: 20 } },
    dp: [
      { sn: 1, pn: 'DD1', sl: { l1: 6, l2: 7, l3: 8 } },
      { sn: 2, pn: 'DD2', sl: { l1: 3, l2: 4, l3: 5 } },
      { sn: 3, pn: 'DD3', sl: { l1: 18, l2: 19, l3: 20 } },
      { sn: 4, pn: 'DD4', sl: { l1: 15, l2: 16, l3: 17 } },
      { sn: 5, pn: 'DD5', sl: { l1: 9, l2: 10, l3: 11 } },
      { sn: 6, pn: 'DD6', sl: { l1: 12, l2: 13, l3: 14 } },
      { sn: 7, pn: 'DD7', sl: { l1: 0, l2: 1, l3: 2 } },
      { sn: 8, pn: 'DD8', sl: { l1: 6, l2: 7, l3: 8 } },
    ],
    no: "Sub-30 min CR clear. Z'Maja skip strat.",
  },

  // KA No-CP Prog
  'seed-ka-01': {
    v: 2,
    n: "Kyne's Aegis No-CP Prog",
    t1: { ul: 0, sl: { fl: 1 } },
    t2: { ul: 1, sl: { fl: 1 } },
    h1: { hb: 0, cp: 0, sl: { fl: 1 } },
    h2: { hb: 1, cp: 1, sl: { fl: 1 } },
    no: "No-CP KA progression. Heavy sustain — all DDs running Witchmother's.",
  },

  // SE Optimized
  'seed-se-01': {
    v: 2,
    n: "Sanity's Edge Optimized",
    t1: { pn: 'DKTank', ul: 0, sl: { l1: 0, l2: 1, l3: 2 }, gs: { s1: 234, s2: 135, ms: 32 } },
    t2: { pn: 'ArcTank', ul: 1, sl: { l1: 18, l2: 19, l3: 20 } },
    h1: { pn: 'TemplarHeal', hb: 0, cp: 0, ul: 0, sl: { l1: 9, l2: 11, l3: 20 } },
    h2: { pn: 'NecroHeal', hb: 1, cp: 1, ul: 3, sl: { l1: 17, l2: 11, l3: 20 } },
    dp: [
      { sn: 1, pn: 'DD1', sl: { l1: 18, l2: 19, l3: 20 } },
      { sn: 2, pn: 'DD2', sl: { l1: 3, l2: 4, l3: 5 } },
      { sn: 3, pn: 'DD3', sl: { l1: 6, l2: 7, l3: 8 } },
      { sn: 4, pn: 'DD4', sl: { l1: 0, l2: 1, l3: 2 } },
      { sn: 5, pn: 'ArcBanner', jt: 0 },
      { sn: 6, pn: 'DD6', sl: { l1: 9, l2: 10, l3: 11 } },
      { sn: 7, pn: 'DD7', sl: { l1: 15, l2: 16, l3: 17 } },
      { sn: 8, pn: 'DD8', sl: { l1: 12, l2: 13, l3: 14 } },
    ],
    no: 'Meta SE post-U43. Arcanist banner DD slot 5.',
  },

  // LC Group Finder
  'seed-lc-01': {
    v: 2,
    n: 'Lucent Citadel Group Finder',
    t1: { ul: 0, sl: { fl: 1 } },
    t2: { ul: 1, sl: { fl: 1 } },
    h1: { hb: 0, cp: 0, sl: { fl: 1 } },
    h2: { hb: 1, cp: 1, sl: { fl: 1 } },
    no: 'Pug-friendly. No hard class requirements. Bring your best parse.',
  },

  // MoL Score Push
  'seed-mol-01': {
    v: 2,
    n: 'Maw of Lorkhaj Score Push',
    t1: { pn: 'Tank1', ul: 3, sl: { l1: 0, l2: 1, l3: 2 } },
    t2: { pn: 'Tank2', ul: 3, sl: { l1: 18, l2: 19, l3: 20 } },
    h1: { pn: 'Healer1', hb: 0, cp: 0, ul: 0, sl: { l1: 9, l2: 11, l3: 20 } },
    h2: { pn: 'Healer2', hb: 1, cp: 1, ul: 2, sl: { l1: 11, l2: 17, l3: 20 } },
    dp: [
      { sn: 1, pn: 'DD1', sl: { l1: 6, l2: 7, l3: 8 } },
      { sn: 2, pn: 'DD2', sl: { l1: 3, l2: 4, l3: 5 } },
      { sn: 3, pn: 'DD3', sl: { l1: 18, l2: 19, l3: 20 } },
      { sn: 4, pn: 'DD4', sl: { l1: 15, l2: 16, l3: 17 } },
      { sn: 5, pn: 'DD5', sl: { l1: 0, l2: 1, l3: 2 } },
      { sn: 6, pn: 'DD6', sl: { l1: 9, l2: 10, l3: 11 } },
      { sn: 7, pn: 'DD7', sl: { l1: 12, l2: 13, l3: 14 } },
      { sn: 8, pn: 'DD8', sl: { l1: 6, l2: 7, l3: 8 } },
    ],
    no: 'Twin Atronach setup. Barrier on healer 2 for Rakkhat burn.',
  },
};

// Generate SQL UPDATE statements
const lines = ['-- Update seed rosters with real encoded roster_data'];
for (const [id, roster] of Object.entries(rosters)) {
  const encoded = encode(roster);
  lines.push(`UPDATE rosters SET roster_data = '${encoded}' WHERE id = '${id}';`);
}

const sql = lines.join('\n');
console.log(sql);
