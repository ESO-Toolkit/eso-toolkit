/**
 * Roster → Discord formatted text.
 *
 * Decodes a compact roster_data blob (base64url → deflate-raw → JSON)
 * and produces Discord-markdown sections ready to be sent as messages.
 *
 * Mirrors the frontend `generateDiscordFormat()` from RosterBuilderPage.tsx
 * but operates server-side in a Cloudflare Worker.
 */

// ─── Set Display Names ──────────────────────────────────────────────────────
// Subset of SET_DISPLAY_NAMES from src/utils/setNameUtils.ts.
// Keyed by numeric KnownSetIDs values.

const SET_NAMES: Record<number, string> = {
  // Support — Healer 5-piece
  399: 'Martial Knowledge',
  267: 'Powerful Assault',
  184: 'Spell Power Cure',
  183: 'Combat Physician',
  352: 'Master Architect',
  378: "Jorvuld's Guidance",
  394: 'Olorime',
  395: 'Perfected Olorime',
  549: "Zen's Redress",
  484: 'Roaring Opportunist',
  485: 'Perfected Roaring Opportunist',
  // Support — Tank 5-piece
  241: 'Alkosh',
  351: 'War Machine',
  393: 'Yolnahkriin',
  434: 'Perfected Yolnahkriin',
  432: "Drake's Rush",
  502: 'Perfected Saxhleel Champion',
  517: 'Pearlescent Ward',
  519: "Pillager's Profit",
  520: "Perfected Pillager's Profit",
  518: 'Perfected Pearlescent Ward',
  555: 'Lucent Echoes',
  556: 'Perfected Lucent Echoes',
  // Monster sets
  185: 'Engine Guardian',
  187: 'Valkyn Skoria',
  396: "Gryphon's Reprisal",
  380: 'Slimecraw',
  353: 'Earthgore',
  379: 'Symphony of Blades',
  483: 'Stone Husk',
  497: 'Encratis',
  501: 'Baron Zaudrus',
  503: 'Spaulder of Ruin',
  538: 'Nazaray',
  539: 'Nunatak',
  541: 'Archdruid Devyric',
  548: 'Ozezan',
  554: 'The Blind',
  // Mythic
  500: 'Pearls of Ehlnofey',
  547: "Velothi Ur-Mage's Amulet",
  // DPS 5-piece
  109: 'Deadly Strike',
  487: 'Perfected Merciless Charge',
  486: 'Merciless Charge',
  382: 'Crushing Wall',
  383: 'Perfected Crushing Wall',
  488: 'Perfected Grand Rejuvenation',
  540: 'Cryptcanon Vestments',
  542: 'Peace and Serenity',
  546: "Perfected Ansuul's Torment",
  557: 'Slivers of the Null Arca',
  558: 'Perfected Slivers of the Null Arca',
  560: "Xoryn's Masterpiece",
  563: 'Tide-Born Wildstalker',
  // Other / Training
  32: 'Armor of the Trainee',
  543: "Druid's Braid",
  407: 'Aegis Caller',
  550: 'Plague Slinger',
  // Leaderboard-discovered
  83: 'The Sergeant',
  105: 'The Noble Duelist',
  89: 'Dreugh King Slayer',
  84: 'The Crusader',
  91: "Hunding's Rage",
  151: 'Elf Bane',
  168: 'Necropotence',
  144: 'Night Terror',
  152: 'Blessing of the Potentates',
  180: 'Advancing Yokeda',
  181: 'Resilient Yokeda',
  177: 'Aether',
  186: 'Undaunted Unweaver',
  204: 'Burning Spellweave',
  192: 'Bloodspawn',
  200: "Nerien'eth",
  193: 'Maw of the Infernal',
  178: 'Infallible Aether',
  194: 'Molag Kena',
  238: 'Brands of Imperium',
  114: 'Swamp Raider',
  240: 'Storm Master',
  239: 'Scathing Mage',
  237: 'Leeching Plate',
  236: 'Essence Thief',
  44: 'Agility',
  136: 'Law of Julianos',
  268: 'Briarheart',
  301: 'Mighty Chudan',
  300: 'Swarm Mother',
  302: 'Iceheart',
  303: 'Tremorscale',
  304: 'Grothdarr',
  266: "Mother's Sorrow",
  265: 'Plague Doctor',
  311: 'Medusa',
  172: 'Treasure Hunter',
  313: "The Master's Mace",
  314: "The Master's Ice Staff",
  315: "The Master's Restoration Staff",
  305: 'War Maiden',
  312: 'Defiler',
  316: 'Pillar of Nirn',
  317: 'Zaan',
  318: 'Mechanical Acuity',
  319: 'Unfathomable Darkness',
  362: "Asylum's Perfected Dagger",
  363: "Asylum's Perfected Restoration Staff",
  364: "Maelstrom's Bow",
  397: 'Relequen',
  398: "Relequen's Perfected",
  400: "Siroria's Perfected",
  401: 'Balorgh',
  402: 'Blackrose Prison Dagger',
  403: 'Blackrose Prison Perfected Dagger',
  404: 'Blackrose Prison Perfected Bow',
  405: 'Blackrose Prison Perfected Ice Staff',
  406: 'Blackrose Prison Perfected Restoration Staff',
  408: 'Stonekeeper',
  431: "Lokkestiiz's Perfected",
  433: 'Azureblight',
  435: 'Dragonguard Elite',
  436: 'New Moon Acolyte',
  437: 'Venomous Smite',
  438: "Vrol's Perfected",
  439: 'Wild Hunt',
  480: "Vateshran's Greatsword",
  481: "Vateshran's Perfected Staff",
  482: 'Frostbite',
  489: 'Heartland Conqueror',
  490: 'Saxhleel Champion',
  491: "Sul-Xan's Torment",
  492: "Perfected Sul-Xan's Torment",
  493: "Perfected Bahsei's Mania",
  494: "Harpooner's Wading Kilt",
  495: "Death Dealer's Fete",
  496: 'Crimson Oath',
  498: 'Magma Incarnate',
  499: 'Wretched Vitality',
  504: "Hexos' Ward",
  505: 'Plaguebreak',
  506: 'Turning Tide',
  507: 'Markyn Ring of Majesty',
  508: 'Rallying Cry',
  509: 'Baron Thirsk',
  510: "Order's Wrath",
  511: "Serpent's Disdain",
  512: 'Coral Riptide',
  513: 'Perfected Coral Riptide',
  514: "Mora's Whispers",
  515: 'Oakensoul Ring',
  516: 'Gourmand',
  521: 'Roksa the Warped',
  522: "Runecarver's Blaze",
  523: "Ansuul's Torment",
  524: 'Macabre Vintage',
  525: 'Highland Sentinel',
  526: 'Mora Scribe',
  527: 'Perfected Mora Scribe',
  528: 'Pyrebrand',
  529: 'Corpseburster',
  530: 'Beacon of Oblivion',
  531: 'Jerensi',
  532: "Arkay's Charity",
  533: "Rakkhat's Voidmantle",
  534: "Kazpian's",
  535: 'Recovery Convergence',
  536: 'Perfected Recovery Convergence',
  537: "Perfected Kazpian's",
  544: 'Stonehulk Domination',
  545: "Huntsman's Warmask",
  143: 'Armor of the Veiled Heritance',
  66: 'Armor of the Seducer',
  48: 'Ashen Grip',
  40: "Hatchling's Shell",
  135: "Torug's Pact",
  553: 'Prismatic Weapon',
  202: "Kagrenac's Hope",
  551: 'Twin Sisters',
  552: 'Ancient Grace',
  195: 'Lord Warden',
  179: 'Eternal Yokeda',
  182: 'Vicious Ophidian',
  188: 'Overwhelming',
  45: 'Endurance',
  264: 'The Pariah',
  203: 'Morkuldin',
  201: "Pelinal's Wrath",
  306: 'Velidreth',
  307: "Kra'gh",
  308: 'Chokethorn',
  309: 'Ilambris',
  310: 'Stormfist',
  320: 'The Troll King',
  321: "The Master's Bow",
  322: "Assassin's Guile",
  323: "Vanguard's Challenge",
  324: 'Flame Blossom',
  325: 'Mad Tinkerer',
  365: "Galenwe's Perfected",
  366: 'Vykosa',
  367: 'Blackrose Bow',
  368: 'Blackrose Ice Staff',
  369: 'Blackrose Resto',
  370: "Tzogvin's Warband",
  371: "False God's Devotion",
  372: "Perfected False God's",
  373: 'Grundwulf',
  374: 'Grave Guardian',
  375: "Kjalnar's Nightmare",
  376: "Yandir's Might",
  377: 'Vateshran Perfected Sword',
  381: 'Vateshran Perfected Dagger',
  410: "Kinras's Wrath",
  411: 'Pale Order',
  412: 'Bog Raider',
  413: 'Gaze of Sithis',
  414: "Scorion's Feast",
  415: 'Thunder Caller',
  416: 'Storm-Cursed',
  417: 'Lady Malygda',
  418: "Sea-Serpent's Coil",
  419: 'Stormweaver',
  420: "Akatosh's Law",
  421: "Oakfather's Retribution",
  422: 'The Weald',
  559: "Xoryn's Masterpiece",
  423: 'Vandorallen',
  424: 'Three Queens',
  425: 'Death-Dancer',
  426: 'Xanmeer Spellweaver',
  427: 'Black Gem Monstrosity',
  428: 'Coup De Grâce',
  429: 'Unknown',
  430: 'Unknown',
  561: 'Unknown',
};

function setName(id: number | undefined): string {
  if (id == null) return '';
  return SET_NAMES[id] ?? `Unknown Set (${id})`;
}

// ─── Look-up tables (mirrors frontend rosterEncoding.ts) ────────────────────

const CLASS_SKILL_LINES = [
  'Ardent Flame', 'Draconic Power', 'Earthen Heart',
  'Dark Magic', 'Daedric Summoning', 'Storm Calling',
  'Assassination', 'Shadow', 'Siphoning',
  'Aedric Spear', "Dawn's Wrath", 'Restoring Light',
  'Animal Companions', 'Green Balance', "Winter's Embrace",
  'Grave Lord', 'Bone Tyrant', 'Living Death',
  'Herald of the Tome', 'Apocryphal Soldier', 'Curative Runeforms',
] as const;

const ULTIMATES = ['Aggressive Warhorn', 'Glacial Colossus', 'Barrier', 'Greater Storm Atronach'];
const HEALER_BUFFS = ['Enlivening Overflow', 'From the Brink'];
const HEALER_CPS = ['Enlivening Overflow', 'From the Brink'];
const JAIL_DD_TYPES = ['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'] as const;

const JAIL_DD_LABELS: Record<string, string> = {
  banner: 'Banner', zenkosh: 'ZenKosh', wm: 'WM',
  'wm-mk': 'WM/MK', mk: 'MK', custom: 'Custom',
};

// ─── Compact Types (minimal, decode-only) ───────────────────────────────────

interface CompactGear { s1?: number; s2?: number; ms?: number; a?: number[]; }
interface CompactSkills { l1?: number | string; l2?: number | string; l3?: number | string; fl?: 1; }
interface CompactGroup { g?: string; }

interface CompactTank {
  pn?: string; pt?: string; pi?: string; rl?: string; lb?: string[];
  rn?: string; gs?: CompactGear; sl?: CompactSkills;
  ul?: number | string; grs?: string[]; gr?: CompactGroup; no?: string;
}

interface CompactHealer {
  pn?: string; pt?: string; pi?: string; rl?: string; lb?: string[];
  rn?: string; s1?: number; s2?: number; ms?: number; aw?: string; a?: number[];
  sl?: CompactSkills; hb?: number; cp?: number;
  ul?: number | string; grs?: string[]; gr?: CompactGroup; no?: string;
}

interface CompactDPS {
  sn: number; pn?: string; pt?: string; pi?: string; rl?: string; lb?: string[];
  rn?: string; s1?: number; s2?: number; ms?: number; aw?: string;
  as?: number[]; gs?: number[];
  sl?: CompactSkills; ul?: number | string;
  grs?: string[]; gr?: CompactGroup; no?: string;
  jt?: number; cd?: string;
}

interface CompactRosterV3 {
  v: 3; n?: string; co?: [number, number, number];
  ts?: CompactTank[]; hs?: CompactHealer[]; dp?: CompactDPS[];
  ag?: string[]; no?: string;
}

interface CompactRosterV2 {
  v: 2; n?: string;
  t1?: CompactTank; t2?: CompactTank;
  h1?: CompactHealer; h2?: CompactHealer;
  dp?: CompactDPS[]; ag?: string[]; no?: string;
}

type CompactRoster = CompactRosterV2 | CompactRosterV3;

// ─── Decode helpers ─────────────────────────────────────────────────────────

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const writeAndClose = writer.write(bytes).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 5 * 1024 * 1024) { await reader.cancel(); throw new Error('Payload too large'); }
    chunks.push(value);
  }
  await writeAndClose;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(out);
}

async function decodeRosterData(rosterData: string): Promise<CompactRoster> {
  const bytes = fromBase64Url(rosterData);
  const json = await inflate(bytes);
  return JSON.parse(json) as CompactRoster;
}

// ─── Normalize compact → unified arrays ─────────────────────────────────────

interface NormalizedRoster {
  name: string;
  tanks: CompactTank[];
  healers: CompactHealer[];
  dps: CompactDPS[];
  notes?: string;
}

function normalize(c: CompactRoster): NormalizedRoster {
  if (c.v === 3) {
    const r = c as CompactRosterV3;
    return {
      name: r.n ?? 'Roster',
      tanks: r.ts ?? [],
      healers: r.hs ?? [],
      dps: (r.dp ?? []).sort((a, b) => a.sn - b.sn),
      notes: r.no,
    };
  }
  const r = c as CompactRosterV2;
  const tanks: CompactTank[] = [];
  if (r.t1) tanks.push(r.t1);
  if (r.t2) tanks.push(r.t2);
  const healers: CompactHealer[] = [];
  if (r.h1) healers.push(r.h1);
  if (r.h2) healers.push(r.h2);
  return {
    name: r.n ?? 'Roster',
    tanks,
    healers,
    dps: (r.dp ?? []).sort((a, b) => a.sn - b.sn),
    notes: r.no,
  };
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function resolveSkillLine(val: number | string | undefined): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  return CLASS_SKILL_LINES[val] ?? '';
}

function resolveUltimate(val: number | string | undefined): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  return ULTIMATES[val] ?? '';
}

function resolveHealerBuff(val: number | undefined): string {
  if (val == null) return '';
  return HEALER_BUFFS[val] ?? '';
}

function resolveHealerCP(val: number | undefined): string {
  if (val == null) return '';
  return HEALER_CPS[val] ?? '';
}

function bracket(val: string | null | undefined): string {
  return val ? ` [${val}]` : '';
}

function bracketed(vals: string[]): string {
  return vals.map((v) => ` [${v}]`).join('');
}

function groupArrow(groups?: string[], groupObj?: CompactGroup): string {
  // Check multi-group first, then legacy single group
  const name = groups?.[0] ?? groupObj?.g;
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.includes('left')) return '⬅️';
  if (lower.includes('right')) return '➡️';
  return '';
}

function positionEmoji(playerNumber?: string): string {
  if (!playerNumber) return '';
  const lower = playerNumber.toLowerCase();
  if (lower === 'left') return '👈';
  if (lower === 'right') return '👉';
  if (lower === 'center') return '👇';
  return playerNumber;
}

function formatPosition(positionTag?: string, playerNumber?: string): string {
  if (!positionTag && !playerNumber) return '';
  const emoji = positionEmoji(playerNumber);
  const isEmoji = emoji === '👈' || emoji === '👉' || emoji === '👇';
  if (positionTag && emoji && isEmoji) return ` [${positionTag}] [${emoji}]`;
  if (positionTag && emoji) return ` [${positionTag} ${emoji}]`;
  if (positionTag) return ` [${positionTag}]`;
  if (emoji) return ` [${emoji}]`;
  return '';
}

function formatGearLine(names: string[]): string {
  const filtered = names.filter(Boolean);
  if (!filtered.length) return '';
  return `GEAR: ${filtered.map((s) => `\`${s}\``).join(' ')}`;
}

function formatSkillLinesLine(sl?: CompactSkills): string {
  if (!sl) return '';
  if (sl.fl) return 'LINES: `Flexible`';
  const parts = [resolveSkillLine(sl.l1), resolveSkillLine(sl.l2), resolveSkillLine(sl.l3)].filter(Boolean);
  if (!parts.length) return '';
  return `LINES: ${parts.map((l) => `\`${l}\``).join(' ')}`;
}

function collectGearFromTank(t: CompactTank): string[] {
  if (!t.gs) return [];
  const result: string[] = [];
  if (t.gs.s1) result.push(setName(t.gs.s1));
  if (t.gs.s2) result.push(setName(t.gs.s2));
  if (t.gs.ms) result.push(setName(t.gs.ms));
  if (t.gs.a) t.gs.a.forEach((id) => result.push(setName(id)));
  return result.filter(Boolean);
}

function collectGearFromHealer(h: CompactHealer): string[] {
  const result: string[] = [];
  if (h.s1) result.push(setName(h.s1));
  if (h.s2) result.push(setName(h.s2));
  if (h.ms) result.push(setName(h.ms));
  if (h.a) h.a.forEach((id) => result.push(setName(id)));
  return result.filter(Boolean);
}

function collectGearFromDPS(dd: CompactDPS): string[] {
  // Prefer structured fields; fall back to legacy gearSets
  if (dd.s1 != null || dd.s2 != null || dd.ms != null) {
    const result: string[] = [];
    if (dd.s1) result.push(setName(dd.s1));
    if (dd.s2) result.push(setName(dd.s2));
    if (dd.ms) result.push(setName(dd.ms));
    if (dd.as) dd.as.forEach((id) => result.push(setName(id)));
    return result.filter(Boolean);
  }
  if (dd.gs) return dd.gs.map((id) => setName(id)).filter(Boolean);
  return [];
}

// ─── Main formatter ─────────────────────────────────────────────────────────

/**
 * Format a normalized roster into Discord-markdown sections.
 * Each section is kept under ~1900 chars to leave room for the 2000-char limit.
 */
function formatSections(roster: NormalizedRoster, rosterUrl?: string): string[] {
  const sections: string[] = [];

  // ── Header + Tanks ──────────────────────────────────────────────────────
  const tankLines: string[] = [];
  tankLines.push(`**${roster.name}**`);
  tankLines.push('');

  roster.tanks.forEach((tank, idx) => {
    const arrow = groupArrow(tank.grs, tank.gr) || (idx === 0 ? '⬅️' : '➡️');
    const label = tank.rl || (idx === 0 ? 'MT' : 'OT');
    const ult = bracket(resolveUltimate(tank.ul));
    const pos = formatPosition(tank.pt, tank.pi);
    const roleNote = bracket(tank.rn ?? undefined);
    const labelsPart = tank.lb?.length ? bracketed(tank.lb) : '';
    const player = tank.pn ? ` @${tank.pn}` : '';

    tankLines.push(`${arrow}🛡️ **${label}**:${ult}${pos}${roleNote}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearFromTank(tank));
    if (gear) tankLines.push(gear);

    const sl = formatSkillLinesLine(tank.sl);
    if (sl) tankLines.push(sl);

    if (tank.no) tankLines.push(`*${tank.no}*`);
    tankLines.push('');
  });

  sections.push(tankLines.join('\n'));

  // ── Healers ─────────────────────────────────────────────────────────────
  const healerLines: string[] = [];
  healerLines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  healerLines.push('');

  roster.healers.forEach((h, idx) => {
    const arrow = groupArrow(h.grs, h.gr) || (idx === 0 ? '⬅️' : '➡️');
    const label = h.rl || `H${idx + 1}`;
    const pos = formatPosition(h.pt, h.pi);
    const roleNote = bracket(h.rn ?? undefined);
    const ult = bracket(resolveUltimate(h.ul));
    const buff = bracket(resolveHealerBuff(h.hb));
    const cp = bracket(resolveHealerCP(h.cp));
    const labelsPart = h.lb?.length ? bracketed(h.lb) : '';
    const player = h.pn ? ` @${h.pn}` : '';

    healerLines.push(`${arrow}💖 **${label}**:${pos}${roleNote}${ult}${buff}${cp}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearFromHealer(h));
    if (gear) healerLines.push(gear);

    const sl = formatSkillLinesLine(h.sl);
    if (sl) healerLines.push(sl);

    if (h.no) healerLines.push(`*${h.no}*`);
    healerLines.push('');
  });

  sections.push(healerLines.join('\n'));

  // ── DPS ─────────────────────────────────────────────────────────────────
  const dpsLines: string[] = [];
  dpsLines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  dpsLines.push('');

  roster.dps.forEach((dd) => {
    const arrow = groupArrow(dd.grs, dd.gr);
    const jailType = dd.jt != null
      ? ` [${JAIL_DD_LABELS[JAIL_DD_TYPES[dd.jt]] ?? dd.cd ?? ''}]`
      : '';
    const pos = formatPosition(dd.pt, dd.pi);
    const roleNote = bracket(dd.rn ?? undefined);
    const labelsPart = dd.lb?.length ? bracketed(dd.lb) : '';
    const player = dd.pn ? ` @${dd.pn}` : '';

    dpsLines.push(`${arrow}⚔️ **#${dd.sn}${jailType}**:${pos}${roleNote}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearFromDPS(dd));
    if (gear) dpsLines.push(gear);

    const sl = formatSkillLinesLine(dd.sl);
    if (sl) dpsLines.push(sl);

    const ult = resolveUltimate(dd.ul);
    if (ult) dpsLines.push(`[${ult}]`);

    if (dd.no) dpsLines.push(`*${dd.no}*`);
    dpsLines.push('');
  });

  // Split DPS into two sections if it's too long (> 1800 chars)
  const dpsText = dpsLines.join('\n');
  if (dpsText.length > 1800) {
    const half = Math.ceil(roster.dps.length / 2);
    // Find the split point in dpsLines by tracking which DD we're on
    let ddCount = 0;
    let splitIdx = 0;
    for (let i = 0; i < dpsLines.length; i++) {
      if (dpsLines[i].startsWith('⚔️') || dpsLines[i].match(/^[⬅️➡️]*⚔️/)) {
        ddCount++;
        if (ddCount > half) { splitIdx = i; break; }
      }
    }
    if (splitIdx > 0) {
      sections.push(dpsLines.slice(0, splitIdx).join('\n'));
      sections.push(dpsLines.slice(splitIdx).join('\n'));
    } else {
      sections.push(dpsText);
    }
  } else {
    sections.push(dpsText);
  }

  // ── Notes + Link ────────────────────────────────────────────────────────
  const footerLines: string[] = [];
  if (roster.notes) {
    footerLines.push('**General Notes:**');
    footerLines.push(roster.notes);
    footerLines.push('');
  }
  if (rosterUrl) {
    footerLines.push(`🔗 [View on ESO Toolkit](${rosterUrl})`);
  }
  if (footerLines.length) {
    sections.push(footerLines.join('\n'));
  }

  return sections.filter((s) => s.trim().length > 0);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface DiscordFormatResult {
  title: string;
  sections: string[];
}

/**
 * Decode a roster_data blob and format it as Discord markdown sections.
 * Each section is safe to send as a single Discord message (< 2000 chars).
 */
export async function formatRosterForDiscord(
  rosterData: string,
  rosterName: string,
  rosterId?: string,
  baseUrl?: string,
): Promise<DiscordFormatResult> {
  const compact = await decodeRosterData(rosterData);
  const roster = normalize(compact);
  // Use the hub title if the compact name is generic
  if (rosterName && rosterName !== 'New Roster') {
    roster.name = rosterName;
  }

  const rosterUrl = rosterId && baseUrl ? `${baseUrl}/rosters/${rosterId}` : undefined;
  const sections = formatSections(roster, rosterUrl);

  return { title: roster.name, sections };
}
