/**
 * Generates valid encoded roster strings for the Roster Hub seed data.
 * Uses Node's zlib.deflateRawSync to match the browser's CompressionStream('deflate-raw').
 *
 * Source: #1 leaderboard entries from ESO Logs API (fetched 2026-03-12)
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

// ── KnownSetIDs reference (from abilities.ts) ──────────────────────────────
// Tank sets: 651=Perf Pearlescent Ward, 771=Perf Lucent Echoes, 770=Perf Xoryn's,
//   589=Perf Saxhleel, 451=Perf Yolnahkriin, 516=Elemental Catalyst, 331=War Machine,
//   622=Turning Tide, 180=Powerful Assault, 602=Crimson Oath's Rive
// Monster/mythic: 578=Baron Zaudrus, 633=Nazaray, 634=Nunatak, 609=Magma Incarnate,
//   627=Spaulder of Ruin, 577=Encratis, 683=Roksa, 276=Tremorscale, 666=Archdruid Devyric
// Healer sets: 185=SPC, 650=Perf Pillager's, 332=Master Architect, 346=Jorvuld's,
//   496/497=Roaring Opp/Perf, 194=Combat Physician, 180=Powerful Assault,
//   147=Way of Martial Knowledge
// Healer monster: 436=Symphony of Blades, 687=Ozezan, 576=Pearls of Ehlnofey
// DPS sets: 772=Perf Slivers, 767=Slivers, 127=Deadly Strike, 809=Tide-Born Wildstalker,
//   707=Perf Ansuul's, 702=Ansuul's, 475=Aegis Caller, 137=Berserking Warrior,
//   777=Corpseburster, 232=Roar of Alkosh, 455=Z'en's Redress, 331=War Machine,
//   50=Morag Tong, 764=Highland Sentinel, 147=WMK, 795=Jerensi's Bladestorm
// DPS monster/mythic: 270=Slimecraw, 694=Velothi Ur-Mage, 168=Nerien'eth,
//   169=Valkyn Skoria, 845=Huntsman's Warmask, 350=Zaan, 691=Cryptcanon Vestments
// DPS weapons: 522=Perf Merciless Charge, 526=Perf Crushing Wall, 369=Merciless Charge,
//   373=Crushing Wall, 425=Perf Spectral Cloak

// ── Compact roster objects (v:2 format from real leaderboard data) ──────────
// Tank gear uses CompactGear: { s1, s2, ms, a }
// Healer gear: { s1, s2, ms, a } directly on CompactHealer
// DPS gear: gs:number[] flat array of all setIDs

const rosters = {
  // Aetherian Archive #1 — RIP Vital (3 tanks, 1 healer)
  'seed-aa-01': {
    v: 2,
    n: 'AA #1 — RIP Vital',
    t1: { pn: 'Anonymous 9', gs: { s1: 651, s2: 622, ms: 633 } },
    t2: { pn: 'Anonymous 3', gs: { s1: 809, a: [702, 166, 332, 707, 766, 172] } },
    h1: { pn: 'Hålle Beåry', s1: 185, s2: 650, ms: 436, a: [533] },
    dp: [
      { sn: 1, pn: 'what to even play man', gs: [795, 127, 270, 694, 526] },
      { sn: 2, pn: 'kitejesus', gs: [772, 809, 270, 694, 522] },
      { sn: 3, pn: 'Melkor the Maiar', gs: [127, 772, 270, 694, 526] },
      { sn: 4, pn: 'Anonymous 5', gs: [773, 29, 274, 812, 373] },
      { sn: 5, pn: 'Silver June', gs: [772, 127, 270, 694, 522] },
      { sn: 6, pn: 'Anonymous 2', gs: [772, 809, 270, 694, 369] },
      { sn: 7, pn: 'Anonymous 4', gs: [809, 707, 270, 694, 522] },
      { sn: 8, pn: 'Anonymous 10', gs: [172, 29, 270, 658] },
    ],
    no: '3-tank comp. Tank3 (Necro) in DPS slot would be: Eternal Warrior + Caluurion + Nunatak.',
  },

  // Hel Ra Citadel #1 — Wächter des Zwielichts
  'seed-hrc-01': {
    v: 2,
    n: 'HRC #1 — Wächter des Zwielichts',
    t1: { pn: 'Toran von der Eichert', gs: { s1: 771, s2: 622, ms: 633, a: [564] } },
    t2: { pn: 'Lacht-über-Gegner', gs: { s1: 180, s2: 602, ms: 633 } },
    h1: { pn: 'Cascadira', s1: 185, s2: 180, ms: 436, a: [533] },
    h2: { pn: 'Persephone Urania', s1: 332, s2: 518, ms: 128, a: [627] },
    dp: [
      { sn: 1, pn: 'Vivien Guevry', gs: [127, 590, 586, 270, 694, 373] },
      { sn: 2, pn: 'Kaida Miriel', gs: [331, 127, 270, 694, 373] },
      { sn: 3, pn: 'Briza Do\'Urdenn', gs: [127, 772, 270, 694, 526] },
      { sn: 4, pn: 'Babadiop', gs: [707, 772, 270, 694, 522] },
      { sn: 5, pn: 'Blob R\'am', gs: [707, 455, 270, 694, 526] },
      { sn: 6, pn: 'Caldrya', gs: [707, 127, 270, 694, 522] },
      { sn: 7, pn: 'Parcanos', gs: [772, 127, 270, 694, 522] },
      { sn: 8, pn: 'Aleco der Glücklose', gs: [707, 127, 270, 694, 526] },
    ],
  },

  // Halls of Fabrication #1 — Dragonia
  'seed-hof-01': {
    v: 2,
    n: 'HOF #1 — Dragonia',
    t1: { pn: 'Grace Lightning', gs: { s1: 651, s2: 770, ms: 634 } },
    t2: { pn: 'Auntie Tauntie', gs: { s1: 768, s2: 180, ms: 633, a: [771, 206] } },
    h1: { pn: 'Emily Davar', s1: 346, s2: 496, ms: 436, a: [318, 497] },
    h2: { pn: 'Skinny Wants-To-Hide-Tail', s1: 185, s2: 649, ms: 687, a: [533] },
    dp: [
      { sn: 1, pn: 'Cirsea', gs: [707, 127, 270, 694, 526] },
      { sn: 2, pn: 'Kandicrux', gs: [707, 127, 270, 694, 373] },
      { sn: 3, pn: 'Syllia Fenra', gs: [702, 127, 270, 694, 373] },
      { sn: 4, pn: 'D-arc Magician Girl', gs: [772, 127, 270, 694, 526] },
      { sn: 5, pn: 'Amayíí', gs: [707, 127, 270, 694, 373] },
      { sn: 6, pn: 'Arcanold Schwarzenegger', gs: [707, 127, 270, 694, 526] },
      { sn: 7, pn: 'Zan\'kir the Conjurer', gs: [707, 127, 270, 694, 526] },
      { sn: 8, pn: 'Izzy Robijn', gs: [772, 127, 270, 694, 526] },
    ],
  },

  // Asylum Sanctorium #1 — Les Serres d'Auri-El
  'seed-as-01': {
    v: 2,
    n: "AS #1 — Les Serres d'Auri-El",
    t1: { pn: 'Daimonos Sova', gs: { s1: 771, s2: 180, ms: 276, a: [532] } },
    t2: { pn: 'Bad-hper', gs: { s1: 589, s2: 651, ms: 276 } },
    h1: { pn: 'Sentinelle-Du-Marais', s1: 185, s2: 147, ms: 633 },
    h2: { pn: 'Dr Ectarious', s1: 346, s2: 497, ms: 436, a: [533] },
    dp: [
      { sn: 1, pn: 'Mamie bryan', gs: [772, 809, 270, 694, 522] },
      { sn: 2, pn: 'La beameuse folle', gs: [772, 809, 270, 694, 522] },
      { sn: 3, pn: 'Aeryïl', gs: [809, 772, 270, 694, 373] },
      { sn: 4, pn: "J'Cree", gs: [707, 127, 270, 694, 522] },
      { sn: 5, pn: 'Feyre Eveningstar', gs: [809, 772, 270, 694, 522] },
      { sn: 6, pn: 'Titarca', gs: [772, 809, 270, 694, 522] },
      { sn: 7, pn: 'Sined Kamori', gs: [772, 455, 845, 270, 522] },
      { sn: 8, pn: 'Nëphia Shaot', gs: [772, 809, 270, 694, 522] },
    ],
  },

  // Cloudrest #1 — TranscendingApotheosis (1 tank, 1 healer, 10 DPS)
  'seed-cr-01': {
    v: 2,
    n: 'CR #1 — TranscendingApotheosis',
    t1: { pn: 'Prison-Death', gs: { s1: 651, s2: 589, ms: 633 } },
    h1: { pn: 'Serratía Marcescens', s1: 185, s2: 180, ms: 687, a: [691, 281] },
    dp: [
      { sn: 1, pn: 'Lücs', gs: [331, 147, 845, 270, 522] },
      { sn: 2, pn: 'Solocatalystt', gs: [772, 809, 845, 270, 522] },
      { sn: 3, pn: 'Tripple Nines', gs: [772, 809, 845, 270, 522] },
      { sn: 4, pn: 'Joe-Cozen', gs: [772, 809, 845, 270, 522] },
      { sn: 5, pn: 'Better Oakensorc', gs: [772, 50, 270, 694, 522] },
      { sn: 6, pn: 'Whip Your Hair Backnforth', gs: [331, 772, 350, 627, 522] },
      { sn: 7, pn: 'Naomi Akamolamer', gs: [809, 772, 845, 350, 522] },
      { sn: 8, pn: 'De-Lighted', gs: [232, 455, 577, 691] },
    ],
    no: 'Solo tank/healer comp — 10 DPS slots (only 8 shown).',
  },

  // Sunspire #1 — BDSM
  'seed-ss-01': {
    v: 2,
    n: 'SS #1 — ⛓️BDSM',
    t1: { pn: "Djur'Boll", gs: { s1: 651, s2: 516, ms: 578 } },
    t2: { pn: 'Repartitor', gs: { s1: 771, s2: 331, ms: 578, a: [361] } },
    h1: { pn: 'marina artmarc', s1: 650, s2: 185, ms: 687, a: [281, 576] },
    h2: { pn: 'Aryasa Envinyatar', s1: 332, s2: 180, a: [609, 627, 533] },
    dp: [
      { sn: 1, pn: 'Lucy The Firebreather', gs: [232, 455, 270, 694, 522] },
      { sn: 2, pn: 'Fenovea', gs: [772, 777, 270, 694, 369] },
      { sn: 3, pn: 'Arcanichaze', gs: [772, 127, 270, 694, 522] },
      { sn: 4, pn: 'Ra Azzira', gs: [767, 147, 270, 694, 369] },
      { sn: 5, pn: 'Rin Yarenne', gs: [772, 137, 168, 694, 522] },
      { sn: 6, pn: 'Saldin Matvi', gs: [772, 137, 270, 694, 522] },
      { sn: 7, pn: 'alan reet', gs: [772, 127, 270, 694, 522] },
      { sn: 8, pn: 'Nightingale-song', gs: [772, 475, 169, 694, 373] },
    ],
  },

  // Kyne's Aegis #1 — Eclipsë (1 tank, 1 healer, 10 DPS)
  'seed-ka-01': {
    v: 2,
    n: 'KA #1 — Eclipsë',
    t1: { pn: 'Onyx Overload', gs: { s1: 771, s2: 180, a: [609, 627, 373] } },
    h1: { pn: 'Preox-Morlana', s1: 650, s2: 185, ms: 633, a: [576] },
    dp: [
      { sn: 1, pn: "I'm Bad Lmao", gs: [331, 516, 270, 694, 522] },
      { sn: 2, pn: 'Jotąro', gs: [772, 50, 270, 694, 522] },
      { sn: 3, pn: 'Naomi Akamolamer', gs: [772, 475, 350, 694, 522] },
      { sn: 4, pn: 'Yung Handsome Rich Savage', gs: [772, 475, 270, 694, 522] },
      { sn: 5, pn: 'Absolute Fragger', gs: [331, 651, 270, 694, 522] },
      { sn: 6, pn: 'Biān', gs: [232, 455, 270, 691, 522] },
      { sn: 7, pn: 'Donut Detective', gs: [772, 475, 270, 694, 522] },
      { sn: 8, pn: 'Mitch-Tries-To-Arcanist', gs: [475, 772, 270, 694, 522] },
    ],
    no: 'Solo tank/healer comp — 10 DPS slots (only 8 shown).',
  },

  // Rockgrove #1 — Clown Consortium
  'seed-rg-01': {
    v: 2,
    n: 'RG #1 — Clown Consortium',
    t1: { pn: "Amora's Whispers", gs: { s1: 771, s2: 651, ms: 633 } },
    t2: { pn: 'Y U No Dps', gs: { s1: 331, s2: 516, ms: 577, a: [526] } },
    h1: { pn: 'Euphorbia Flanaganii', s1: 650, s2: 185, ms: 687, a: [576] },
    h2: { pn: 'D-fibrillator', s1: 332, s2: 180, a: [609, 627, 526] },
    dp: [
      { sn: 1, pn: 'Tana Melaina', gs: [772, 127, 270, 694, 522] },
      { sn: 2, pn: 'Ariella Telvanni', gs: [772, 764, 168, 694, 522] },
      { sn: 3, pn: 'No Smart Player Blue', gs: [772, 137, 845, 270, 522] },
      { sn: 4, pn: 'Berserk L Guts', gs: [772, 137, 168, 694, 522] },
      { sn: 5, pn: 'Commander Dnk', gs: [772, 137, 845, 270, 522] },
      { sn: 6, pn: 'Page Halfbeast', gs: [772, 147, 845, 270, 522] },
      { sn: 7, pn: 'Aressa Telvanni', gs: [232, 455, 691, 270, 522] },
      { sn: 8, pn: 'Glutwürmchen', gs: [772, 137, 168, 694, 522] },
    ],
  },

  // Dreadsail Reef #1 — Alles wird Gut
  'seed-dsr-01': {
    v: 2,
    n: 'DSR #1 — Alles wird Gut',
    t1: { pn: 'Teilzeitvegan', gs: { s1: 651, s2: 770, ms: 578 } },
    t2: { pn: 'Mendar Agandor', gs: { s1: 451, s2: 771, ms: 683 } },
    h1: { pn: 'Zählt-die-Latten', s1: 332, s2: 650, ms: 436 },
    h2: { pn: 'Hohepriester Lucius', s1: 194, s2: 185, ms: 687 },
    dp: [
      { sn: 1, pn: 'Nerilya Vess', gs: [772, 764, 168, 694, 522] },
      { sn: 2, pn: 'Cyraendiell', gs: [772, 168, 137, 425, 694, 522] },
      { sn: 3, pn: 'Eranelle Lixyll', gs: [331, 168, 137, 425, 694, 522] },
      { sn: 4, pn: 'Samuel Crow', gs: [772, 168, 736, 425, 694, 522] },
      { sn: 5, pn: 'X-r-r', gs: [772, 168, 707, 425, 694, 522] },
      { sn: 6, pn: 'Cerenity Oira', gs: [772, 168, 707, 425, 694, 522] },
      { sn: 7, pn: 'Gursche Ill', gs: [772, 168, 707, 425, 694, 522] },
      { sn: 8, pn: 'Zbaviciel', gs: [772, 168, 707, 425, 694, 522] },
    ],
  },

  // Ossein Cage #1 — MuLtiCoLOrEd PoNiEs
  'seed-oc-01': {
    v: 2,
    n: 'OSC #1 — MuLtiCoLOrEd PoNiEs',
    t1: { pn: 'Bittergreen', gs: { s1: 651, s2: 650, ms: 633 } },
    t2: { pn: 'Seeker-Deer', gs: { s1: 589, s2: 770, a: [609, 627] } },
    h1: { pn: "Vex'alya", s1: 185, s2: 332, ms: 666, a: [362] },
    h2: { pn: 'Auroreal Cifer', s1: 147, s2: 180, ms: 687, a: [362] },
    dp: [
      { sn: 1, pn: 'Morrígan Mehr', gs: [772, 127, 270, 694, 522] },
      { sn: 2, pn: 'Vegannist', gs: [772, 809, 666, 694, 522] },
      { sn: 3, pn: 'fushido', gs: [772, 809, 270, 694, 522] },
      { sn: 4, pn: 'Thaos īx Arkannon', gs: [127, 707, 270, 694, 526] },
      { sn: 5, pn: 'Ganuyth Tyrri', gs: [772, 809, 270, 694, 522] },
      { sn: 6, pn: "S'azhdarune", gs: [772, 809, 169, 694, 522] },
      { sn: 7, pn: 'Vairan Iverhulu', gs: [707, 455, 169, 694, 522] },
      { sn: 8, pn: 'Darkanist the Elf', gs: [127, 331, 270, 694, 526] },
    ],
  },
};

// Generate SQL UPDATE statements
const lines = [
  '-- Update seed rosters with real encoded roster_data',
  '-- Generated 2026-03-12 from #1 leaderboard entries via ESO Logs API',
  '',
];
for (const [id, roster] of Object.entries(rosters)) {
  const encoded = encode(roster);
  lines.push(`UPDATE rosters SET roster_data = '${encoded}' WHERE id = '${id}';`);
}

const sql = lines.join('\n');
console.log(sql);
