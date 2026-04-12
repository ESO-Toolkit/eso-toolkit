import { gql } from '@apollo/client';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Bookmark as BookmarkIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Link as LinkIcon,
  PersonAdd as PersonAddIcon,
  StickyNote2 as NotesIcon,
  Visibility as VisibilityIcon,
  Groups as GroupsIcon,
  SportsEsports as AddonIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import {
  Button,
  ButtonBase,
  Container,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Autocomplete,
  Chip,
  Divider,
  Alert,
  Snackbar,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import discordIcon from '../assets/discord-icon.svg';
import { PerFightBuilds } from '../components/PerFightBuilds';
import { RoleCompositionPicker } from '../components/RoleCompositionPicker';
import { RosterCardSections } from '../components/roster/RosterCardSections';
import { GLASS_SX_DARK, GLASS_SX_LIGHT } from '../components/roster/shared/glassSx';
import { SetAssignmentManager } from '../components/SetAssignmentManager';
import { WorkInProgressDisclaimer } from '../components/WorkInProgressDisclaimer';
import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';
import type { BuildChampionPoints } from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import { PublishRosterDialog } from '../features/roster-hub/components/PublishRosterDialog';
import { ServerPickerDialog } from '../features/roster-hub/components/ServerPickerDialog';
import { GetPlayersForReportQuery } from '../graphql/gql/graphql';
import { saveRoster, updateRoster } from '../store/saved_rosters';
import { useAppDispatch } from '../store/useAppDispatch';
import { KnownSetIDs } from '../types/abilities';
import {
  RaidRoster,
  TankSetup,
  TankGearSet as _TankGearSet,
  HealerSetup,
  DPSSlot,
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  JailDDType,
  RosterDetailLevel,
  SkillLineConfig,
  PlayerGroup as _PlayerGroup,
  RoleComposition,
  createDefaultRoster,
  defaultTankSetup,
  defaultHealerSetup,
  createDefaultDPSSlots,
  CLASS_SKILL_LINES,
} from '../types/roster';
import type { TrialBuildOverrides } from '../types/trial-encounters';
import {
  convertLogPlayersToRoster,
  type LogCombatantInfoEvent,
  type LogPlayerDetails,
} from '../utils/logToRoster';
// roleColors used by RosterCardSections
import { encodeRosterToURL, decodeRosterFromURL } from '../utils/rosterEncoding';
import { resizeRoster } from '../utils/rosterResize';
import { getSetDisplayName, findSetIdByName } from '../utils/setNameUtils';
import type { SlotKey } from '../utils/slotKey';
import { parseSlotKey } from '../utils/slotKey';

/**
 * GraphQL query for fetching player details and combatant info events from a report
 */
const GET_PLAYERS_FOR_REPORT = gql`
  query getPlayersForReport($code: String!, $fightIDs: [Int]) {
    reportData {
      report(code: $code) {
        playerDetails(includeCombatantInfo: true, fightIDs: $fightIDs)
        events(fightIDs: $fightIDs, dataType: CombatantInfo, useActorIDs: true, limit: 10000) {
          data
        }
      }
    }
  }
`;

/**
 * Encode roster to base64 for URL sharing
 */
// ============================================================
// COMPACT URL ENCODING (v2)
// Short key names + deflate-raw compression = smallest possible URL
// Backwards compatible: falls back to v1 (plain base64 JSON) on decode
// ============================================================

interface CompactSkills {
  l1?: number | string; // line1: CLASS_SKILL_LINES index or custom string
  l2?: number | string; // line2: CLASS_SKILL_LINES index or custom string
  l3?: number | string; // line3: CLASS_SKILL_LINES index or custom string
  fl?: 1; // isFlex (only stored when true)
  no?: string; // notes
}

interface CompactGear {
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  a?: number[]; // additionalSets
  no?: string; // notes
}

interface CompactGroup {
  g?: string; // groupName
  n?: number; // groupNumber
}

/** Champion tree (slots + passives) for inline build data */
interface CompactChampionTree {
  s?: Array<number | null>; // slotted perk IDs (4 slots)
  p?: Record<string, number>; // passive allocations
}

/** Champion points across all 3 trees for inline build data */
interface CompactBuildCP {
  w?: CompactChampionTree; // warfare
  f?: CompactChampionTree; // fitness
  c?: CompactChampionTree; // craft
}

interface CompactTank {
  pn?: string; // playerName
  pt?: string; // positionTag (e.g. "portal", "bridge")
  pi?: string; // playerNumber / position (e.g. "left", "right")
  rl?: string; // roleLabel
  rn?: string; // roleNotes
  lb?: string[]; // labels
  gs?: CompactGear; // gearSets
  sl?: CompactSkills; // skillLines
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  ss?: (number | string)[]; // specificSkills: ability IDs (new) or names (legacy)
  gr?: CompactGroup; // group
  no?: string; // notes
  // Full detail mode
  sk?: { 0?: Record<string, number>; 1?: Record<string, number> }; // skills (SkillsConfig)
  pa?: number[]; // passives
  cp2?: CompactBuildCP; // champion points
  fd?: { id?: number; name?: string }; // food
}

interface CompactHealer {
  pn?: string; // playerName
  pt?: string; // positionTag (e.g. "portal", "tomb")
  pi?: string; // playerNumber / position (e.g. "left", "right")
  rl?: string; // roleLabel
  rn?: string; // roleNotes
  lb?: string[]; // labels
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  a?: number[]; // additionalSets
  sl?: CompactSkills; // skillLines
  hb?: number; // healerBuff: HealerBuff index
  cp?: number; // championPoint: HealerChampionPoint index
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  gr?: CompactGroup; // group
  no?: string; // notes
  // Full detail mode
  ss?: (number | string)[]; // specificSkills
  sk?: { 0?: Record<string, number>; 1?: Record<string, number> }; // skills (SkillsConfig)
  pa?: number[]; // passives
  cp2?: CompactBuildCP; // champion points
  fd?: { id?: number; name?: string }; // food
}

interface CompactDPS {
  sn: number; // slotNumber (required)
  pn?: string; // playerName
  pt?: string; // positionTag (e.g. "portal", "slayer", "banner")
  pi?: string; // playerNumber / position (e.g. "left", "right", "1")
  rl?: string; // roleLabel
  rn?: string; // roleNotes
  lb?: string[]; // labels
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  as?: number[]; // additionalSets
  gs?: number[]; // legacy gearSets (backward compat)
  sl?: CompactSkills; // skillLines
  cp?: string; // championPoint
  ss?: number[]; // specificSkills (ability IDs)
  ul?: number | string; // ultimate (index or custom string)
  gr?: CompactGroup; // group
  no?: string; // notes
  jt?: number; // jailDDType index
  cd?: string; // customDescription
  // Full detail mode — populated from build attachments
  sk?: { 0?: Record<string, number>; 1?: Record<string, number> }; // skills (SkillsConfig)
  pa?: number[]; // passives (ability IDs)
  cp2?: CompactBuildCP; // champion points (BuildChampionPoints)
  fd?: { id?: number; name?: string }; // food
}

interface CompactRoster {
  v: 2; // version marker
  n?: string; // rosterName
  t1?: CompactTank;
  t2?: CompactTank;
  h1?: CompactHealer;
  h2?: CompactHealer;
  dp?: CompactDPS[]; // only filled DPS slots
  ag?: string[]; // availableGroups
  no?: string; // notes
}

// Lookup tables for encoding/decoding fixed-vocabulary strings as integers
const SKILL_LINE_TO_IDX = new Map(CLASS_SKILL_LINES.map((sl, i) => [sl, i] as const));
const ULTIMATE_LIST = Object.values(SupportUltimate); // 4 preset ultimates
const ULTIMATE_TO_IDX = new Map(ULTIMATE_LIST.map((u, i) => [u, i] as const));
const HEALER_BUFF_LIST = Object.values(HealerBuff); // 2 values
const HEALER_BUFF_TO_IDX = new Map(HEALER_BUFF_LIST.map((b, i) => [b, i] as const));
const CHAMPION_POINT_LIST = Object.values(HealerChampionPoint); // 2 values
const CHAMPION_POINT_TO_IDX = new Map(CHAMPION_POINT_LIST.map((cp, i) => [cp, i] as const));
const JAIL_DD_TYPE_LIST: JailDDType[] = ['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'];
const JAIL_DD_TYPE_TO_IDX = new Map(JAIL_DD_TYPE_LIST.map((t, i) => [t, i] as const));

/** Encode a skill line string: known index or raw string for custom values */
function encodeSkillLine(s?: string): number | string | undefined {
  if (!s) return undefined;
  const idx = SKILL_LINE_TO_IDX.get(s as (typeof CLASS_SKILL_LINES)[number]);
  return idx !== undefined ? idx : s;
}

/** Decode a skill line: index → lookup, string → pass-through */
function decodeSkillLine(v?: number | string): string {
  if (v == null) return '';
  if (typeof v === 'number') return CLASS_SKILL_LINES[v] ?? '';
  return v;
}

/** Encode an ultimate: known SupportUltimate index or raw string for custom */
function encodeUltimate(u?: string | null): number | string | undefined {
  if (!u) return undefined;
  const idx = ULTIMATE_TO_IDX.get(u as SupportUltimate);
  return idx !== undefined ? idx : u;
}

/** Decode an ultimate */
function decodeUltimate(v?: number | string): string | null {
  if (v == null) return null;
  if (typeof v === 'number') return ULTIMATE_LIST[v] ?? null;
  return v;
}

function compactSkills(sl: SkillLineConfig): CompactSkills | undefined {
  const c: CompactSkills = {};
  const l1 = encodeSkillLine(sl.line1);
  if (l1 != null) c.l1 = l1;
  const l2 = encodeSkillLine(sl.line2);
  if (l2 != null) c.l2 = l2;
  const l3 = encodeSkillLine(sl.line3);
  if (l3 != null) c.l3 = l3;
  if (sl.isFlex) c.fl = 1;
  if (sl.notes) c.no = sl.notes;
  return Object.keys(c).length > 0 ? c : undefined;
}

function expandSkills(c?: CompactSkills): SkillLineConfig {
  return {
    line1: decodeSkillLine(c?.l1),
    line2: decodeSkillLine(c?.l2),
    line3: decodeSkillLine(c?.l3),
    isFlex: c?.fl === 1,
    notes: c?.no,
  };
}

function compactGear(gs: _TankGearSet): CompactGear | undefined {
  const c: CompactGear = {};
  if (gs.set1 != null) c.s1 = gs.set1 as number;
  if (gs.set2 != null) c.s2 = gs.set2 as number;
  if (gs.monsterSet != null) c.ms = gs.monsterSet as number;
  if (gs.additionalSets?.length) c.a = gs.additionalSets as number[];
  if (gs.notes) c.no = gs.notes;
  return Object.keys(c).length > 0 ? c : undefined;
}

function expandGear(c?: CompactGear): _TankGearSet {
  return {
    set1: c?.s1 as KnownSetIDs | undefined,
    set2: c?.s2 as KnownSetIDs | undefined,
    monsterSet: c?.ms as KnownSetIDs | undefined,
    additionalSets: c?.a as KnownSetIDs[] | undefined,
    notes: c?.no,
  };
}

function compactGroup(gr?: _PlayerGroup): CompactGroup | undefined {
  if (!gr?.groupName) return undefined;
  const c: CompactGroup = { g: gr.groupName };
  if (gr.groupNumber != null) c.n = gr.groupNumber;
  return c;
}

function expandGroup(c?: CompactGroup): _PlayerGroup | undefined {
  if (!c?.g) return undefined;
  return { groupName: c.g, groupNumber: c.n };
}

// ── Inline build data (skills, passives, CP, food) ────────────────────

function compactInlineSkills(
  skills?: SkillsConfig,
): { 0?: Record<string, number>; 1?: Record<string, number> } | undefined {
  if (!skills) return undefined;
  const result: { 0?: Record<string, number>; 1?: Record<string, number> } = {};
  for (const bar of [0, 1] as const) {
    const barData = skills[bar];
    if (barData && Object.keys(barData).length > 0) {
      result[bar] = { ...barData };
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function expandInlineSkills(compact?: {
  0?: Record<string, number>;
  1?: Record<string, number>;
}): SkillsConfig | undefined {
  if (!compact) return undefined;
  const result: SkillsConfig = { 0: {}, 1: {} };
  for (const bar of [0, 1] as const) {
    const barData = compact[bar];
    if (barData) {
      for (const [slot, abilityId] of Object.entries(barData)) {
        result[bar][Number(slot)] = abilityId;
      }
    }
  }
  return result;
}

function compactBuildCP(cp?: BuildChampionPoints): CompactBuildCP | undefined {
  if (!cp) return undefined;
  const result: CompactBuildCP = {};
  for (const [key, treeKey] of [
    ['w', 'warfare'],
    ['f', 'fitness'],
    ['c', 'craft'],
  ] as const) {
    const tree = cp[treeKey];
    const hasSlots = tree.slots.some((s) => s !== null);
    const hasPassives = Object.keys(tree.passives).length > 0;
    if (hasSlots || hasPassives) {
      const ct: CompactChampionTree = {};
      if (hasSlots) ct.s = tree.slots;
      if (hasPassives) ct.p = tree.passives;
      result[key] = ct;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function expandBuildCP(compact?: CompactBuildCP): BuildChampionPoints | undefined {
  if (!compact) return undefined;
  return {
    warfare: {
      slots: compact.w?.s ?? [null, null, null, null],
      passives: compact.w?.p ?? {},
    },
    fitness: {
      slots: compact.f?.s ?? [null, null, null, null],
      passives: compact.f?.p ?? {},
    },
    craft: {
      slots: compact.c?.s ?? [null, null, null, null],
      passives: compact.c?.p ?? {},
    },
  };
}

function compactTank(t: TankSetup): CompactTank {
  const c: CompactTank = {};
  if (t.playerName) c.pn = t.playerName;
  if (t.positionTag) c.pt = t.positionTag;
  if (t.playerNumber) c.pi = t.playerNumber;
  if (t.roleLabel) c.rl = t.roleLabel;
  if (t.roleNotes) c.rn = t.roleNotes;
  if (t.labels?.length) c.lb = t.labels;
  const gs = compactGear(t.gearSets);
  if (gs) c.gs = gs;
  const sl = compactSkills(t.skillLines);
  if (sl) c.sl = sl;
  const ul = encodeUltimate(t.ultimate);
  if (ul != null) c.ul = ul;
  if (t.specificSkills?.length) c.ss = t.specificSkills;
  const gr = compactGroup(t.group);
  if (gr) c.gr = gr;
  if (t.notes) c.no = t.notes;
  // Inline build data
  const sk = compactInlineSkills(t.skills);
  if (sk) c.sk = sk;
  if (t.passives?.length) c.pa = t.passives;
  const cp2 = compactBuildCP(t.cpPoints);
  if (cp2) c.cp2 = cp2;
  if (t.food?.id != null || t.food?.name) c.fd = t.food;
  return c;
}

function expandTank(c?: CompactTank): TankSetup {
  return {
    ...defaultTankSetup(),
    playerName: c?.pn,
    positionTag: c?.pt,
    playerNumber: c?.pi != null ? String(c.pi) : undefined,
    roleLabel: c?.rl,
    roleNotes: c?.rn,
    labels: c?.lb,
    gearSets: expandGear(c?.gs),
    skillLines: expandSkills(c?.sl),
    ultimate: decodeUltimate(c?.ul),
    specificSkills: (c?.ss ?? []).filter((v): v is number => typeof v === 'number'),
    group: expandGroup(c?.gr),
    notes: c?.no,
    // Inline build data
    skills: expandInlineSkills(c?.sk),
    passives: c?.pa,
    cpPoints: expandBuildCP(c?.cp2),
    food: c?.fd,
  };
}

function compactHealer(h: HealerSetup): CompactHealer {
  const c: CompactHealer = {};
  if (h.playerName) c.pn = h.playerName;
  if (h.positionTag) c.pt = h.positionTag;
  if (h.playerNumber) c.pi = h.playerNumber;
  if (h.roleLabel) c.rl = h.roleLabel;
  if (h.roleNotes) c.rn = h.roleNotes;
  if (h.labels?.length) c.lb = h.labels;
  if (h.set1 != null) c.s1 = h.set1 as number;
  if (h.set2 != null) c.s2 = h.set2 as number;
  if (h.monsterSet != null) c.ms = h.monsterSet as number;
  if (h.additionalSets?.length) c.a = h.additionalSets as number[];
  const sl = compactSkills(h.skillLines);
  if (sl) c.sl = sl;
  if (h.healerBuff != null) {
    const idx = HEALER_BUFF_TO_IDX.get(h.healerBuff);
    if (idx !== undefined) c.hb = idx;
  }
  if (h.championPoint != null) {
    const idx = CHAMPION_POINT_TO_IDX.get(h.championPoint);
    if (idx !== undefined) c.cp = idx;
  }
  const ul = encodeUltimate(h.ultimate);
  if (ul != null) c.ul = ul;
  const gr = compactGroup(h.group);
  if (gr) c.gr = gr;
  if (h.notes) c.no = h.notes;
  // Inline build data
  if (h.specificSkills?.length) c.ss = h.specificSkills;
  const sk = compactInlineSkills(h.skills);
  if (sk) c.sk = sk;
  if (h.passives?.length) c.pa = h.passives;
  const cp2 = compactBuildCP(h.cpPoints);
  if (cp2) c.cp2 = cp2;
  if (h.food?.id != null || h.food?.name) c.fd = h.food;
  return c;
}

function expandHealer(c?: CompactHealer): HealerSetup {
  return {
    ...defaultHealerSetup(),
    playerName: c?.pn,
    positionTag: c?.pt,
    playerNumber: c?.pi != null ? String(c.pi) : undefined,
    roleLabel: c?.rl,
    roleNotes: c?.rn,
    labels: c?.lb,
    set1: c?.s1 as KnownSetIDs | undefined,
    set2: c?.s2 as KnownSetIDs | undefined,
    monsterSet: c?.ms as KnownSetIDs | undefined,
    additionalSets: c?.a as KnownSetIDs[] | undefined,
    skillLines: expandSkills(c?.sl),
    healerBuff: c?.hb != null ? ((HEALER_BUFF_LIST[c.hb] as HealerBuff) ?? null) : null,
    championPoint:
      c?.cp != null ? ((CHAMPION_POINT_LIST[c.cp] as HealerChampionPoint) ?? null) : null,
    ultimate: decodeUltimate(c?.ul),
    group: expandGroup(c?.gr),
    notes: c?.no,
    // Inline build data
    specificSkills: (c?.ss ?? []).filter((v): v is number => typeof v === 'number'),
    skills: expandInlineSkills(c?.sk),
    passives: c?.pa,
    cpPoints: expandBuildCP(c?.cp2),
    food: c?.fd,
  };
}

function compactDPS(d: DPSSlot): CompactDPS {
  const c: CompactDPS = { sn: d.slotNumber };
  if (d.playerName) c.pn = d.playerName;
  if (d.positionTag) c.pt = d.positionTag;
  if (d.playerNumber) c.pi = d.playerNumber;
  if (d.roleLabel) c.rl = d.roleLabel;
  if (d.roleNotes) c.rn = d.roleNotes;
  if (d.labels?.length) c.lb = d.labels;
  if (d.set1 != null) c.s1 = d.set1 as number;
  if (d.set2 != null) c.s2 = d.set2 as number;
  if (d.monsterSet != null) c.ms = d.monsterSet as number;
  if (d.additionalSets?.length) c.as = d.additionalSets as number[];
  const sl = d.skillLines ? compactSkills(d.skillLines) : undefined;
  if (sl) c.sl = sl;
  if (d.championPoint) c.cp = d.championPoint;
  if (d.ultimate) c.ul = encodeUltimate(d.ultimate);
  const gr = compactGroup(d.group);
  if (gr) c.gr = gr;
  if (d.notes) c.no = d.notes;
  if (d.jailDDType) {
    const idx = JAIL_DD_TYPE_TO_IDX.get(d.jailDDType);
    if (idx !== undefined) c.jt = idx;
  }
  if (d.customDescription) c.cd = d.customDescription;
  // Inline build data
  if (d.specificSkills?.length) c.ss = d.specificSkills;
  const sk = compactInlineSkills(d.skills);
  if (sk) c.sk = sk;
  if (d.passives?.length) c.pa = d.passives;
  const cp2 = compactBuildCP(d.cpPoints);
  if (cp2) c.cp2 = cp2;
  if (d.food?.id != null || d.food?.name) c.fd = d.food;
  return c;
}

function expandDPS(c: CompactDPS): DPSSlot {
  return {
    slotNumber: c.sn,
    playerName: c.pn,
    positionTag: c.pt,
    // c.pi was stored as number in old encoded rosters — coerce to string for compat
    playerNumber: c.pi != null ? String(c.pi) : undefined,
    roleLabel: c.rl,
    roleNotes: c.rn,
    labels: c.lb,
    set1: c.s1 as KnownSetIDs | undefined,
    set2: c.s2 as KnownSetIDs | undefined,
    monsterSet: c.ms as KnownSetIDs | undefined,
    additionalSets: c.as as KnownSetIDs[] | undefined,
    // Legacy: if old compact data has gs but no s1/s2, migrate first two to set1/set2
    ...(c.gs && !c.s1 && !c.s2
      ? {
          set1: (c.gs[0] as KnownSetIDs) ?? undefined,
          set2: (c.gs[1] as KnownSetIDs) ?? undefined,
          additionalSets: (c.gs.slice(2) as KnownSetIDs[]) || undefined,
        }
      : {}),
    skillLines: c.sl ? expandSkills(c.sl) : undefined,
    championPoint: c.cp || undefined,
    specificSkills: (c.ss ?? []).filter((v): v is number => typeof v === 'number'),
    ultimate: c.ul != null ? decodeUltimate(c.ul) : null,
    group: expandGroup(c.gr),
    notes: c.no,
    jailDDType: c.jt != null ? JAIL_DD_TYPE_LIST[c.jt] : undefined,
    customDescription: c.cd,
    // Inline build data
    skills: expandInlineSkills(c.sk),
    passives: c.pa,
    cpPoints: expandBuildCP(c.cp2),
    food: c.fd,
  };
}

function _compactifyRoster(roster: RaidRoster): CompactRoster {
  const c: CompactRoster = { v: 2 };
  if (roster.rosterName && roster.rosterName !== 'New Roster') c.n = roster.rosterName;
  c.t1 = compactTank(roster.tanks[0] ?? defaultTankSetup(1));
  c.t2 = compactTank(roster.tanks[1] ?? defaultTankSetup(2));
  c.h1 = compactHealer(roster.healers[0] ?? defaultHealerSetup(1));
  c.h2 = compactHealer(roster.healers[1] ?? defaultHealerSetup(2));
  const filledSlots = roster.dpsSlots.filter(
    (slot) =>
      slot.playerName ||
      slot.playerNumber != null ||
      slot.roleLabel ||
      slot.roleNotes ||
      slot.labels?.length ||
      slot.set1 != null ||
      slot.set2 != null ||
      slot.monsterSet != null ||
      slot.additionalSets?.length ||
      slot.championPoint ||
      slot.ultimate ||
      slot.jailDDType ||
      slot.notes ||
      slot.group ||
      slot.skillLines ||
      slot.championPoint,
  );
  if (filledSlots.length) c.dp = filledSlots.map(compactDPS);
  if (roster.availableGroups?.length) c.ag = roster.availableGroups;
  if (roster.notes) c.no = roster.notes;
  return c;
}

function _expandCompactRoster(c: CompactRoster): RaidRoster {
  const dpsSlots = createDefaultDPSSlots();
  if (c.dp) {
    for (const compactSlot of c.dp) {
      const idx = compactSlot.sn - 1;
      if (idx >= 0 && idx < 8) {
        dpsSlots[idx] = expandDPS(compactSlot);
      }
    }
  }
  return {
    rosterName: c.n ?? 'New Roster',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    composition: { tanks: 2, healers: 2, dps: dpsSlots.length },
    tanks: [
      { ...expandTank(c.t1), slotNumber: 1 },
      { ...expandTank(c.t2), slotNumber: 2 },
    ],
    healers: [
      { ...expandHealer(c.h1), slotNumber: 1 },
      { ...expandHealer(c.h2), slotNumber: 2 },
    ],
    dpsSlots,
    availableGroups: c.ag ?? [],
    notes: c.no,
  };
}

// ---------------------------------------------------------------------------
// Addon export helpers (ESO-658)
// ---------------------------------------------------------------------------

/** Addon-compatible roster slot for tanks/healers. */
interface AddonSlot {
  playerName?: string;
  role: string;
  gearSets?: {
    set1?: string;
    set2?: string;
    monsterSet?: string;
  };
}

/** Addon-compatible DPS slot. */
interface AddonDPSSlot {
  playerName?: string;
  slotNumber: number;
  gearSets?: string[];
}

/** The addon-import format: plain JSON, no compression, set names resolved. */
interface AddonExportRoster {
  rosterName: string;
  [key: `tank${number}`]: AddonSlot;
  [key: `healer${number}`]: AddonSlot;
  dpsSlots?: AddonDPSSlot[];
}

function tankToAddonSlot(tank: TankSetup): AddonSlot | undefined {
  if (!tank.playerName) return undefined;
  const slot: AddonSlot = { playerName: tank.playerName, role: 'Tank' };
  const gs = tank.gearSets;
  if (gs.set1 || gs.set2 || gs.monsterSet) {
    slot.gearSets = {
      set1: gs.set1 ? getSetDisplayName(gs.set1) : undefined,
      set2: gs.set2 ? getSetDisplayName(gs.set2) : undefined,
      monsterSet: gs.monsterSet ? getSetDisplayName(gs.monsterSet) : undefined,
    };
  }
  return slot;
}

function healerToAddonSlot(healer: HealerSetup): AddonSlot | undefined {
  if (!healer.playerName) return undefined;
  const slot: AddonSlot = { playerName: healer.playerName, role: 'Healer' };
  if (healer.set1 || healer.set2 || healer.monsterSet) {
    slot.gearSets = {
      set1: healer.set1 ? getSetDisplayName(healer.set1) : undefined,
      set2: healer.set2 ? getSetDisplayName(healer.set2) : undefined,
      monsterSet: healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
    };
  }
  return slot;
}

function dpsToAddonSlot(dps: DPSSlot): AddonDPSSlot | undefined {
  if (!dps.playerName) return undefined;
  const slot: AddonDPSSlot = { playerName: dps.playerName, slotNumber: dps.slotNumber };

  // Prefer structured fields (new format); fall back to legacy flat gearSets array
  const setNames: string[] = [];
  if (dps.set1 != null) setNames.push(getSetDisplayName(dps.set1));
  if (dps.set2 != null) setNames.push(getSetDisplayName(dps.set2));
  if (dps.monsterSet != null) setNames.push(getSetDisplayName(dps.monsterSet));
  dps.additionalSets?.forEach((id) => setNames.push(getSetDisplayName(id)));
  if (setNames.length === 0 && dps.gearSets?.length) {
    setNames.push(...dps.gearSets.map((id) => getSetDisplayName(id)).filter(Boolean));
  }
  if (setNames.length) slot.gearSets = setNames;

  return slot;
}

/**
 * Convert a RaidRoster to the simplified addon-import format.
 * Set IDs are resolved to human-readable display names so the addon can
 * match them against in-game GetItemLinkSetInfo() results.
 */
function rosterToAddonExport(roster: RaidRoster): AddonExportRoster {
  const addonRoster: AddonExportRoster = { rosterName: roster.rosterName };

  roster.tanks.forEach((tank, i) => {
    const t = tankToAddonSlot(tank);
    if (t) addonRoster[`tank${i + 1}`] = t;
  });
  roster.healers.forEach((healer, i) => {
    const h = healerToAddonSlot(healer);
    if (h) addonRoster[`healer${i + 1}`] = h;
  });

  const dpsSlots = roster.dpsSlots
    .map(dpsToAddonSlot)
    .filter((s): s is AddonDPSSlot => s !== undefined);
  if (dpsSlots.length) addonRoster.dpsSlots = dpsSlots;

  return addonRoster;
}

/**
 * Encode an addon-export roster as a Base64URL string (no compression).
 * The ESOtk addon decodes this with Util.Base64UrlDecode + Util.JsonDecode.
 */
function encodeAddonExport(roster: RaidRoster): string {
  const addonRoster = rosterToAddonExport(roster);
  const json = JSON.stringify(addonRoster);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Validates and normalizes imported roster data to ensure type safety
 * @param data - Parsed JSON data (unknown type)
 * @returns Validated RaidRoster with all required fields
 */
const validateImportedRoster = (data: unknown): RaidRoster => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid roster data: expected an object');
  }
  const parsedData = data as Record<string, unknown>;
  const base = createDefaultRoster();

  // Support both old named-field format and new array format
  let tanks: TankSetup[];
  let healers: HealerSetup[];

  if (Array.isArray(parsedData.tanks)) {
    tanks = (parsedData.tanks as TankSetup[]).map((t, i) => ({
      ...defaultTankSetup(i + 1),
      ...t,
      slotNumber: i + 1,
    }));
  } else {
    // Legacy: convert tank1/tank2 to array
    const t1 =
      parsedData.tank1 && typeof parsedData.tank1 === 'object'
        ? { ...defaultTankSetup(1), ...(parsedData.tank1 as object) }
        : defaultTankSetup(1);
    const t2 =
      parsedData.tank2 && typeof parsedData.tank2 === 'object'
        ? { ...defaultTankSetup(2), ...(parsedData.tank2 as object) }
        : defaultTankSetup(2);
    tanks = [t1, t2];
  }

  if (Array.isArray(parsedData.healers)) {
    healers = (parsedData.healers as HealerSetup[]).map((h, i) => ({
      ...defaultHealerSetup(i + 1),
      ...h,
      slotNumber: i + 1,
    }));
  } else {
    const h1 =
      parsedData.healer1 && typeof parsedData.healer1 === 'object'
        ? { ...defaultHealerSetup(1), ...(parsedData.healer1 as object) }
        : defaultHealerSetup(1);
    const h2 =
      parsedData.healer2 && typeof parsedData.healer2 === 'object'
        ? { ...defaultHealerSetup(2), ...(parsedData.healer2 as object) }
        : defaultHealerSetup(2);
    healers = [h1, h2];
  }

  const comp: RoleComposition = (parsedData.composition as RoleComposition) ?? {
    tanks: tanks.length,
    healers: healers.length,
    dps: 12 - tanks.length - healers.length,
  };

  return {
    ...base,
    ...parsedData,
    composition: comp,
    tanks,
    healers,
    dpsSlots:
      Array.isArray(parsedData.dpsSlots) && (parsedData.dpsSlots as unknown[]).length > 0
        ? (parsedData.dpsSlots as DPSSlot[])
        : createDefaultDPSSlots(comp.dps),
  } as RaidRoster;
};

/**
 * RosterBuilderPage - Allows raid leads to create and manage raid rosters
 * Includes tank/healer gear assignments, DD requirements, and ultimate assignments
 */
export const RosterBuilderPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // roleColors moved to RosterCardSections
  const navigate = useNavigate();

  // Use the precomputed glass style constant — stable reference prevents MUI
  // from regenerating emotion CSS classes on every render.
  const glassTextField = isDarkMode ? GLASS_SX_DARK : GLASS_SX_LIGHT;

  const [roster, setRoster] = useState<RaidRoster>(createDefaultRoster());
  const [mode, setMode] = useState<RosterDetailLevel>('simple');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [quickFillDialog, setQuickFillDialog] = useState(false);
  const [quickFillText, setQuickFillText] = useState('');
  const [previewDialog, setPreviewDialog] = useState(false);
  const [importUrlDialog, setImportUrlDialog] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMenuAnchor, setImportMenuAnchor] = useState<null | HTMLElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRosterIdRef = useRef<string | null>(null);

  // Get auth state
  const { isLoggedIn, accessToken } = useAuth();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishRosterData, setPublishRosterData] = useState<string>('');
  const [discordPublishOpen, setDiscordPublishOpen] = useState(false);
  const [discordPublishData, setDiscordPublishData] = useState<string>('');
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open Discord modal when returning from OAuth redirect (?discord=1)
  useEffect(() => {
    if (searchParams.get('discord') === '1') {
      setDiscordPublishOpen(true);
      searchParams.delete('discord');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get ESO Logs client context (safe to call - doesn't throw if not logged in)
  const { client: esoLogsClient, isReady, isLoggedIn: clientLoggedIn } = useEsoLogsClientContext();

  // Client is only available when ready and logged in
  const client = isReady && clientLoggedIn ? esoLogsClient : null;

  // Update tank setup by array index
  const handleTankChange = useCallback((index: number, updates: Partial<TankSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      tanks: prev.tanks.map((t, i) => (i === index ? { ...t, ...updates } : t)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update healer setup by array index
  const handleHealerChange = useCallback((index: number, updates: Partial<HealerSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      healers: prev.healers.map((h, i) => (i === index ? { ...h, ...updates } : h)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Memoized callbacks for SetAssignmentManager
  // Uses setRoster functional form to avoid depending on `roster` (prevents re-creation on every state change)
  const handleSetAssignment = useCallback(
    (setName: string, slotKey: SlotKey, slot: string) => {
      const { role, index } = parseSlotKey(slotKey);
      const gearSlot = (slot === 'monster' ? 'monsterSet' : slot) as 'set1' | 'set2' | 'monsterSet';

      if (setName === '') {
        if (role === 'tank') {
          setRoster((prev) => ({
            ...prev,
            tanks: prev.tanks.map((t, i) =>
              i === index ? { ...t, gearSets: { ...t.gearSets, [gearSlot]: undefined } } : t,
            ),
            updatedAt: new Date().toISOString(),
          }));
        } else {
          handleHealerChange(index, { [gearSlot]: undefined });
        }
        return;
      }

      const setId = findSetIdByName(setName);
      if (!setId) {
        setSnackbar({ open: true, message: `Unknown set name: ${setName}`, severity: 'error' });
        return;
      }

      if (role === 'tank') {
        setRoster((prev) => ({
          ...prev,
          tanks: prev.tanks.map((t, i) =>
            i === index ? { ...t, gearSets: { ...t.gearSets, [gearSlot]: setId } } : t,
          ),
          updatedAt: new Date().toISOString(),
        }));
      } else {
        handleHealerChange(index, { [gearSlot]: setId });
      }
    },
    [handleHealerChange],
  );

  const handleUltimateUpdate = useCallback(
    (slotKey: SlotKey, ultimate: string | null) => {
      const { role, index } = parseSlotKey(slotKey);
      if (role === 'tank') {
        handleTankChange(index, { ultimate });
      } else {
        handleHealerChange(index, { ultimate });
      }
    },
    [handleTankChange, handleHealerChange],
  );

  const handleHealerCPUpdate = useCallback(
    (slotKey: SlotKey, championPoint: HealerChampionPoint | null) => {
      const { index } = parseSlotKey(slotKey);
      handleHealerChange(index, { championPoint });
    },
    [handleHealerChange],
  );

  // Stable per-index onChange callbacks — avoids creating new functions in .map() JSX
  // which would defeat React.memo on TankCard/HealerCard.
  // Only recreated when the number of slots changes, not when slot data changes.
  const tankCount = roster.tanks.length;
  const tankChangeCallbacks = useMemo(
    () =>
      Array.from(
        { length: tankCount },
        (_, i) => (updates: Partial<TankSetup>) => handleTankChange(i, updates),
      ),
    [tankCount, handleTankChange],
  );
  const healerCount = roster.healers.length;
  const healerChangeCallbacks = useMemo(
    () =>
      Array.from(
        { length: healerCount },
        (_, i) => (updates: Partial<HealerSetup>) => handleHealerChange(i, updates),
      ),
    [healerCount, handleHealerChange],
  );

  // ── Composition change handler ──
  // The picker uses optimistic local state for instant number updates.
  // startTransition defers the heavy roster resize so React doesn't block
  // the main thread — the picker paints first, cards update later.
  const [, startTransition] = useTransition();
  const handleCompositionChange = useCallback(
    (newComp: RoleComposition) => {
      startTransition(() => {
        setRoster((prev) => resizeRoster(prev, newComp));
      });
    },
    [startTransition],
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for DPS slots reordering
  const handleDPSDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRoster((prev) => {
        const oldIndex = prev.dpsSlots.findIndex((slot) => slot.slotNumber === active.id);
        const newIndex = prev.dpsSlots.findIndex((slot) => slot.slotNumber === over.id);

        return {
          ...prev,
          dpsSlots: arrayMove(prev.dpsSlots, oldIndex, newIndex),
          updatedAt: new Date().toISOString(),
        };
      });
    }
  }, []);

  const handleMoveDPSSlot = useCallback((slotIndex: number, direction: 'up' | 'down') => {
    setRoster((prev) => {
      const newIndex = direction === 'up' ? slotIndex - 1 : slotIndex + 1;
      if (newIndex < 0 || newIndex >= prev.dpsSlots.length) return prev;
      return {
        ...prev,
        dpsSlots: arrayMove(prev.dpsSlots, slotIndex, newIndex),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Gate URL sync until the initial load has settled so we don't clobber the incoming ?r= param
  const urlSyncReady = React.useRef(false);

  // Load roster from URL on mount (supports ?r= query param and legacy #hash)
  React.useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('r') || window.location.hash.substring(1);
    const savedId = params.get('id');
    if (savedId) {
      savedRosterIdRef.current = savedId;
    }
    if (encoded) {
      void decodeRosterFromURL(encoded)
        .then((decoded) => {
          if (cancelled) return;
          if (decoded) {
            setRoster(decoded);
            if (decoded.rosterDetailLevel) {
              setMode(decoded.rosterDetailLevel);
            }
            setSnackbar({
              open: true,
              message: savedId ? 'Roster loaded for editing!' : 'Roster loaded from shared link!',
              severity: 'success',
            });
          }
          urlSyncReady.current = true;
        })
        .catch(() => {
          urlSyncReady.current = true;
        });
    } else {
      urlSyncReady.current = true;
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep ?r= query param in sync with the current roster so the URL is always shareable.
  // Debounced to avoid expensive compression on every keystroke and browser rate limits.
  React.useEffect(() => {
    if (!urlSyncReady.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void encodeRosterToURL(roster)
        .then((encoded) => {
          if (cancelled || !encoded) return;
          const url = new URL(window.location.href);
          url.search = `?r=${encoded}`;
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        })
        .catch(() => {
          // Encoding failure is non-critical for URL sync — silently skip
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [roster]);

  // Generate shareable read-only link (points to /rv, the dedicated share view)
  const handleCopyLink = useCallback(() => {
    void encodeRosterToURL(roster)
      .then((encoded) => {
        if (encoded) {
          // Derive base path to support subdirectory deployments (e.g. /dev-previews/pr-xxx/)
          const basePath = window.location.pathname.replace(/\/roster-builder(\/.*)?$/, '');
          const url = `${window.location.origin}${basePath}/rv?r=${encoded}`;
          navigator.clipboard.writeText(url).then(
            () =>
              setSnackbar({
                open: true,
                message: 'Read-only link copied to clipboard!',
                severity: 'success',
              }),
            () => setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' }),
          );
        }
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to encode roster', severity: 'error' });
      });
  }, [roster]);

  // Save roster to My Rosters (Redux/localStorage)
  const handleSaveToMyRosters = useCallback((): void => {
    const existingId = savedRosterIdRef.current;
    if (existingId) {
      dispatch(updateRoster({ id: existingId, roster }));
      setSnackbar({ open: true, message: 'Roster updated in My Rosters!', severity: 'success' });
    } else {
      const action = dispatch(saveRoster(roster));
      savedRosterIdRef.current = action.payload.id;
      setSnackbar({ open: true, message: 'Roster saved to My Rosters!', severity: 'success' });
    }
  }, [dispatch, roster]);

  // Update roster name
  const handleRosterNameChange = (name: string): void => {
    setRoster((prev) => ({
      ...prev,
      rosterName: name,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Stable DPS slot change handler (used with slotIndex prop on DPSSlotCard)
  const handleDPSSlotChange = useCallback((slotIndex: number, updates: Partial<DPSSlot>): void => {
    setRoster((prev) => {
      const updatedSlots = [...prev.dpsSlots];
      updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], ...updates };
      return { ...prev, dpsSlots: updatedSlots, updatedAt: new Date().toISOString() };
    });
  }, []);

  // Convert existing DPS slot to jail DD requirement
  const handleConvertDPSToJail = useCallback((slotNumber: number, jailType: JailDDType): void => {
    setRoster((prev) => {
      const slotIndex = prev.dpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      const updatedDpsSlots = [...prev.dpsSlots];
      updatedDpsSlots[slotIndex] = {
        ...updatedDpsSlots[slotIndex],
        jailDDType: jailType,
        customDescription: jailType === 'custom' ? '' : undefined,
      };

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Convert jail DD back to regular DPS
  const handleConvertJailToDPS = useCallback((slotNumber: number): void => {
    setRoster((prev) => {
      const slotIndex = prev.dpsSlots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIndex === -1) return prev;

      const updatedDpsSlots = [...prev.dpsSlots];
      const {
        jailDDType: _removed1,
        customDescription: _removed2,
        ...regularSlot
      } = updatedDpsSlots[slotIndex];
      updatedDpsSlots[slotIndex] = regularSlot;

      return {
        ...prev,
        dpsSlots: updatedDpsSlots,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Update trial per-fight build overrides
  const handleTrialOverridesChange = useCallback(
    (overrides: TrialBuildOverrides | undefined): void => {
      setRoster((prev) => ({
        ...prev,
        trialOverrides: overrides,
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  // Memoized derived values for stable prop references
  // Use a stable key derived from buff values, not the array reference (which changes on every state update)
  const healerBuffKey = roster.healers.map((h) => h.healerBuff ?? '').join(',');
  const usedBuffs = useMemo(
    () => roster.healers.map((h) => h.healerBuff).filter(Boolean) as HealerBuff[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [healerBuffKey],
  );

  const memoizedGroups = useMemo(
    () => [...(roster.availableGroups ?? [])].sort(),
    [roster.availableGroups],
  );

  // Stable slot number list for SortableContext — only changes when slots are reordered,
  // not when slot data changes. Prevents all 8 DPS cards from re-rendering via useSortable
  // context subscription on every keystroke.
  const dpsSlotOrder = roster.dpsSlots.map((s) => s.slotNumber).join(',');
  const dpsSlotIds = useMemo(
    () => roster.dpsSlots.map((slot) => slot.slotNumber),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dpsSlotOrder],
  );

  // Export roster for ESOtk addon (Base64URL-encoded JSON)
  const handleExportAddon = useCallback(() => {
    try {
      const encoded = encodeAddonExport(roster);
      navigator.clipboard
        .writeText(encoded)
        .then(() => {
          setSnackbar({
            open: true,
            message: 'Addon import string copied! Paste in-game: /esotk roster import <string>',
            severity: 'success',
          });
        })
        .catch(() => {
          setSnackbar({ open: true, message: 'Failed to copy to clipboard', severity: 'error' });
        });
    } catch {
      setSnackbar({ open: true, message: 'Failed to generate addon export', severity: 'error' });
    }
  }, [roster]);

  // Export roster as JSON
  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(roster, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `${roster.rosterName.replace(/\s+/g, '_')}_roster.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    setSnackbar({ open: true, message: 'Roster exported successfully!', severity: 'success' });
  }, [roster]);

  // Import roster from JSON
  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e): void => {
      try {
        // Parse JSON as unknown (not using type assertion)
        const parsedData: unknown = JSON.parse(e.target?.result as string);

        // Validate and normalize the data with proper type checking
        const validatedRoster = validateImportedRoster(parsedData);

        setRoster(validatedRoster);
        if (validatedRoster.rosterDetailLevel) {
          setMode(validatedRoster.rosterDetailLevel);
        }
        setSnackbar({ open: true, message: 'Roster imported successfully!', severity: 'success' });
      } catch (error) {
        setSnackbar({
          open: true,
          message: `Failed to import roster: ${error instanceof Error ? error.message : 'Invalid JSON file'}`,
          severity: 'error',
        });
      }
    };
    reader.readAsText(file);
  }, []);

  // Import roster from ESO Logs URL
  const handleImportFromUrl = useCallback(async (): Promise<void> => {
    if (!importUrl) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid ESO Logs URL.',
        severity: 'error',
      });
      return;
    }

    if (!client) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to import from ESO Logs.',
        severity: 'error',
      });
      return;
    }

    try {
      setImportLoading(true);

      // Parse URL to extract code and fight ID
      // Expected formats:
      // https://www.esologs.com/reports/<code>#fight=<fightId>
      // https://www.esologs.com/reports/<code>?fight=<fightId>
      // https://www.esologs.com/reports/<code>
      const urlMatch = importUrl.match(/esologs\.com\/reports\/([^#/?]+)(?:[#?]fight=(\d+))?/);
      if (!urlMatch) {
        setSnackbar({
          open: true,
          message:
            'Invalid ESO Logs URL format. Expected: https://www.esologs.com/reports/CODE or https://www.esologs.com/reports/CODE?fight=ID',
          severity: 'error',
        });
        setImportLoading(false);
        return;
      }

      const [, code, fightIdStr] = urlMatch;
      const fightId = fightIdStr ? parseInt(fightIdStr, 10) : undefined;

      // Fetch player details from the report
      const response = await client.query<GetPlayersForReportQuery>({
        query: GET_PLAYERS_FOR_REPORT,
        variables: {
          code,
          fightIDs: fightId ? [fightId] : undefined,
        },
        fetchPolicy: 'no-cache',
      });

      const playerDetails = response.reportData?.report?.playerDetails;
      if (!playerDetails) {
        setSnackbar({
          open: true,
          message: 'No player data found in the report.',
          severity: 'error',
        });
        setImportLoading(false);
        return;
      }

      // Extract player details from the response object
      // The playerDetails structure is: { data: { playerDetails: { tanks, healers, dps } } }
      let details: LogPlayerDetails | undefined;

      if (typeof playerDetails === 'string') {
        // If it's a string, parse it as JSON
        try {
          const parsed = JSON.parse(playerDetails) as {
            data?: { playerDetails?: LogPlayerDetails };
          };
          details = parsed?.data?.playerDetails;
        } catch (error) {
          setSnackbar({
            open: true,
            message: `Failed to parse player details: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
            severity: 'error',
          });
          setImportLoading(false);
          return;
        }
      } else if (typeof playerDetails === 'object') {
        // If it's already an object, extract the nested data
        const payload = (playerDetails as { data?: unknown }).data;
        if (payload && typeof payload === 'object') {
          details = (payload as { playerDetails?: LogPlayerDetails }).playerDetails;
        }
      }

      if (!details) {
        setSnackbar({
          open: true,
          message: 'Invalid player details format.',
          severity: 'error',
        });
        setImportLoading(false);
        return;
      }

      // Extract combatant info events from the response
      const report = response.reportData?.report as {
        playerDetails?: unknown;
        events?: { data?: string | unknown };
      };
      const eventsData = report?.events?.data;

      let combatantInfoEvents: LogCombatantInfoEvent[] = [];
      if (eventsData) {
        try {
          if (typeof eventsData === 'string') {
            combatantInfoEvents = JSON.parse(eventsData);
          } else if (Array.isArray(eventsData)) {
            combatantInfoEvents = eventsData as LogCombatantInfoEvent[];
          }
        } catch {
          // Continue without aura data — simple-mode fields still work
        }
      }

      // Convert all players into fully-populated roster slots
      const result = convertLogPlayersToRoster(details, combatantInfoEvents, roster);

      // Update roster with parsed data and auto-switch to full mode
      setRoster((prev) => ({
        ...prev,
        tanks: prev.tanks.map((t, i) =>
          i < result.tanks.length ? { ...result.tanks[i], slotNumber: i + 1 } : t,
        ),
        healers: prev.healers.map((h, i) =>
          i < result.healers.length ? { ...result.healers[i], slotNumber: i + 1 } : h,
        ),
        dpsSlots: result.dpsSlots.length > 0 ? result.dpsSlots : prev.dpsSlots,
        rosterDetailLevel: 'full',
        updatedAt: new Date().toISOString(),
      }));
      setMode('full');

      const tankCount = Math.min(result.tanks.length, roster.tanks.length);
      const healerCount = Math.min(result.healers.length, roster.healers.length);
      const dpsCount = Math.min(result.dpsSlots.length, 8);

      setSnackbar({
        open: true,
        message: `Successfully imported ${tankCount} tank(s), ${healerCount} healer(s), and ${dpsCount} DPS from ESO Logs (full mode)!`,
        severity: 'success',
      });

      // Close dialog and reset state
      setImportUrlDialog(false);
      setImportUrl('');
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setImportLoading(false);
    }
  }, [importUrl, client, roster]);

  // Quick fill player names from text
  const handleQuickFill = useCallback((): void => {
    const lines = quickFillText
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please enter at least one player name',
        severity: 'error',
      });
      return;
    }

    setRoster((prev) => {
      let lineIdx = 0;
      const newTanks = prev.tanks.map((t) => {
        const name = lineIdx < lines.length ? lines[lineIdx++]?.trim() : undefined;
        return name ? { ...t, playerName: name } : t;
      });
      const newHealers = prev.healers.map((h) => {
        const name = lineIdx < lines.length ? lines[lineIdx++]?.trim() : undefined;
        return name ? { ...h, playerName: name } : h;
      });
      const newDps = prev.dpsSlots.map((d) => {
        const name = lineIdx < lines.length ? lines[lineIdx++]?.trim() : undefined;
        return name ? { ...d, playerName: name } : d;
      });
      return {
        ...prev,
        tanks: newTanks,
        healers: newHealers,
        dpsSlots: newDps,
        updatedAt: new Date().toISOString(),
      };
    });

    setQuickFillDialog(false);
    setQuickFillText('');
    setSnackbar({
      open: true,
      message: `Filled ${Math.min(lines.length, 12)} player slots!`,
      severity: 'success',
    });
  }, [quickFillText]);

  // Copy Discord formatted roster to clipboard
  const handleCopyDiscordFormat = useCallback((): void => {
    const discordFormat = generateDiscordFormat(roster);
    navigator.clipboard
      .writeText(discordFormat)
      .then((): void => {
        setSnackbar({
          open: true,
          message: 'Discord format copied to clipboard!',
          severity: 'success',
        });
      })
      .catch((): void => {
        setSnackbar({ open: true, message: 'Failed to copy to clipboard.', severity: 'error' });
      });
  }, [roster]);

  return (
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      {/* Development Banner */}
      <WorkInProgressDisclaimer featureName="Roster Builder" sx={{ mb: 3 }} />

      {/* Roster Hub Banner */}
      <Box
        onClick={() => navigate('/roster-hub')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          mb: 3,
          borderRadius: '10px',
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(167,139,250,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.05) 100%)',
          border: isDarkMode ? '1px solid rgba(96,165,250,0.2)' : '1px solid rgba(37,99,235,0.15)',
          cursor: 'pointer',
          transition: 'background 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(167,139,250,0.12) 100%)'
              : 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.08) 100%)',
            borderColor: isDarkMode ? 'rgba(96,165,250,0.3)' : 'rgba(37,99,235,0.25)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: isDarkMode ? '#60a5fa' : '#2563eb',
              letterSpacing: '0.02em',
            }}
          >
            🏛️ Explore Community Rosters
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: isDarkMode ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.7)',
            }}
          >
            Browse published rosters from the community
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isDarkMode ? '#60a5fa' : '#2563eb',
            whiteSpace: 'nowrap',
            ml: 'auto',
          }}
        >
          Visit Hub →
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        {/* Row 1 — Title lockup + Mode pill toggle + Hub link */}
        <Box
          sx={{
            viewTransitionName: 'roster-hero',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.5, sm: 1 },
            mb: 2.5,
          }}
        >
          {/* Icon lockup */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 100%)',
                border: isDarkMode
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <GroupsIcon
                sx={{
                  fontSize: '1rem',
                  color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                }}
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                  lineHeight: 1,
                  mb: 0.375,
                }}
              >
                Roster
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Roster Builder
              </Typography>
            </Box>
          </Box>

          {/* Segmented pill toggle */}
          <Box
            role="tablist"
            aria-label="Roster detail level"
            sx={{
              display: 'flex',
              borderRadius: '10px',
              padding: '3px',
              minWidth: { xs: 'auto', sm: 220 },
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {(['simple', 'full'] as const).map((value) => (
              <Box
                key={value}
                role="tab"
                tabIndex={mode === value ? 0 : -1}
                aria-selected={mode === value}
                aria-label={`${value === 'simple' ? 'Simple' : 'Full'} mode`}
                onClick={() => {
                  setMode(value);
                  setRoster((prev) => ({ ...prev, rosterDetailLevel: value }));
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setMode(value);
                    setRoster((prev) => ({ ...prev, rosterDetailLevel: value }));
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const next = value === 'simple' ? 'full' : 'simple';
                    setMode(next);
                    setRoster((prev) => ({ ...prev, rosterDetailLevel: next }));
                    // Focus the newly selected tab
                    const sibling =
                      e.key === 'ArrowRight'
                        ? (e.currentTarget.nextElementSibling as HTMLElement)
                        : (e.currentTarget.previousElementSibling as HTMLElement);
                    sibling?.focus();
                  }
                }}
                sx={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  textAlign: 'center',
                  px: 1.75,
                  py: 0.625,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: mode === value ? 600 : 500,
                  letterSpacing: '0.01em',
                  color:
                    mode === value
                      ? isDarkMode
                        ? '#f1f5f9'
                        : '#0f172a'
                      : isDarkMode
                        ? 'rgba(255,255,255,0.45)'
                        : 'rgba(0,0,0,0.45)',
                  background:
                    mode === value
                      ? isDarkMode
                        ? 'rgba(255,255,255,0.09)'
                        : 'rgba(255,255,255,0.85)'
                      : 'transparent',
                  boxShadow:
                    mode === value
                      ? isDarkMode
                        ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
                        : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
                      : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  userSelect: 'none',
                  '&:hover': {
                    color:
                      mode === value
                        ? undefined
                        : isDarkMode
                          ? 'rgba(255,255,255,0.7)'
                          : 'rgba(0,0,0,0.7)',
                    background:
                      mode === value
                        ? undefined
                        : isDarkMode
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.03)',
                  },
                }}
              >
                {value === 'simple' ? 'Simple' : 'Full'}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Row 2 — Roster Name */}
        <TextField
          fullWidth
          size="small"
          label="Roster Name"
          value={roster.rosterName}
          onChange={(e) => handleRosterNameChange(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              '& fieldset': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
              },
              '&:hover fieldset': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
              },
            },
          }}
        />

        {/* Row 3 — Action button bar */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* ── Top row: pill groups left + right ── */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 1,
            }}
          >
            {/* ── Import / Export / Quick Fill pill group ── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: '10px',
                width: { xs: '100%', md: 'auto' },
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: isDarkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(0,0,0,0.1)',
                overflow: 'hidden',
                boxShadow: isDarkMode
                  ? '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : '0 1px 4px rgba(0,0,0,0.07)',
              }}
            >
              {/* Import */}
              <Tooltip title="Import roster from file or log" arrow>
                <ButtonBase
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    setImportMenuAnchor(e.currentTarget)
                  }
                  sx={{
                    display: 'inline-flex',
                    flex: { xs: 1, md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.625,
                    px: 1.5,
                    py: { xs: 1.375, md: 0.875 },
                    minHeight: { xs: '44px', md: 'auto' },
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                    background: 'transparent',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    '&:hover': {
                      color: isDarkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.8)',
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  <UploadIcon sx={{ fontSize: '0.95rem' }} />
                  Import
                  <ExpandMoreIcon sx={{ fontSize: '0.8rem', opacity: 0.55, ml: -0.25 }} />
                </ButtonBase>
              </Tooltip>

              {/* Segment divider */}
              <Box
                sx={{
                  width: '1px',
                  my: 0.625,
                  background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
              />

              {/* Export */}
              <Tooltip title="Export roster as JSON file" arrow>
                <ButtonBase
                  onClick={handleExportJSON}
                  sx={{
                    display: 'inline-flex',
                    flex: { xs: 1, md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.625,
                    px: 1.5,
                    py: { xs: 1.375, md: 0.875 },
                    minHeight: { xs: '44px', md: 'auto' },
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                    background: 'transparent',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    '&:hover': {
                      color: isDarkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.8)',
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  <DownloadIcon sx={{ fontSize: '0.95rem' }} />
                  Export
                </ButtonBase>
              </Tooltip>

              {/* Thicker divider before Quick Fill */}
              <Box
                sx={{
                  width: '1px',
                  my: 0,
                  background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              />

              {/* Quick Fill — sky-blue accent segment */}
              <Tooltip title="Paste a list of names to fill all roster slots at once" arrow>
                <ButtonBase
                  onClick={() => setQuickFillDialog(true)}
                  sx={{
                    display: 'inline-flex',
                    flex: { xs: 1, md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.625,
                    px: 1.5,
                    py: { xs: 1.375, md: 0.875 },
                    minHeight: { xs: '44px', md: 'auto' },
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isDarkMode ? 'rgba(56,189,248,0.9)' : 'rgba(14,116,144,0.9)',
                    background: isDarkMode ? 'rgba(56,189,248,0.07)' : 'rgba(14,116,144,0.05)',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    '&:hover': {
                      color: isDarkMode ? 'rgba(56,189,248,1)' : 'rgba(14,116,144,1)',
                      background: isDarkMode ? 'rgba(56,189,248,0.14)' : 'rgba(14,116,144,0.09)',
                    },
                  }}
                >
                  <PersonAddIcon sx={{ fontSize: '0.95rem' }} />
                  Quick Fill
                </ButtonBase>
              </Tooltip>
            </Box>

            {/* Import dropdown menu (sibling of pill group, not inside) */}
            <Menu
              anchorEl={importMenuAnchor}
              open={Boolean(importMenuAnchor)}
              onClose={() => setImportMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: '10px',
                    mt: 0.5,
                    backgroundColor: isDarkMode ? 'rgba(30,30,40,0.98)' : 'rgba(255,255,255,0.98)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.08)',
                    boxShadow: isDarkMode
                      ? '0 8px 24px rgba(0,0,0,0.5)'
                      : '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setImportMenuAnchor(null);
                  fileInputRef.current?.click();
                }}
                sx={{ fontSize: '0.8125rem', gap: 1 }}
              >
                <ListItemIcon sx={{ minWidth: '28px !important' }}>
                  <UploadIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>From JSON File</ListItemText>
              </MenuItem>
              {isLoggedIn && (
                <MenuItem
                  onClick={() => {
                    setImportMenuAnchor(null);
                    setImportUrlDialog(true);
                  }}
                  sx={{ fontSize: '0.8125rem', gap: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: '28px !important' }}>
                    <LinkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>From Log URL</ListItemText>
                </MenuItem>
              )}
            </Menu>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".json"
              onChange={(e) => {
                handleImportJSON(e);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              aria-label="Upload roster JSON file"
            />

            {/* Spacer pushes share actions to the right on wider screens */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

            {/* ── Right side: Copy pill + Publish/Save pill ── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 1,
                width: { xs: '100%', md: 'auto' },
              }}
            >
              {/* Copy pill — Share Link | Discord Copy | Discord Preview */}
              <Box
                sx={{
                  flex: { xs: 1, md: '0 0 auto' },
                  display: 'flex',
                  alignItems: 'stretch',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  minHeight: { xs: '44px', md: 'auto' },
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.08)',
                  boxShadow: isDarkMode
                    ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <Tooltip title="Copy read-only share link" arrow>
                  <ButtonBase
                    onClick={handleCopyLink}
                    sx={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      px: 1.25,
                      py: { xs: 1.375, md: 0.875 },
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                      background: 'transparent',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      '&:hover': {
                        color: isDarkMode ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.8)',
                        background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <LinkIcon sx={{ fontSize: '0.9rem' }} />
                    Share
                  </ButtonBase>
                </Tooltip>
                <Box
                  sx={{
                    width: '1px',
                    my: 0.625,
                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                />
                <Tooltip title="Copy roster formatted for Discord" arrow>
                  <ButtonBase
                    onClick={handleCopyDiscordFormat}
                    sx={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      px: 1.25,
                      py: { xs: 1.375, md: 0.875 },
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                      background: 'transparent',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      '&:hover': {
                        color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <img
                      src={discordIcon}
                      alt=""
                      style={{ width: 14, height: 14, opacity: isDarkMode ? 0.65 : 0.55 }}
                    />
                    Copy
                  </ButtonBase>
                </Tooltip>
                <Box
                  sx={{
                    width: '1px',
                    my: 0.625,
                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                />
                <Tooltip title="Preview Discord format" arrow>
                  <ButtonBase
                    onClick={() => setPreviewDialog(true)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.875,
                      py: { xs: 1.375, md: 0.875 },
                      color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                      background: 'transparent',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      '&:hover': {
                        color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <VisibilityIcon sx={{ fontSize: '0.85rem' }} />
                  </ButtonBase>
                </Tooltip>
              </Box>

              {/* Publish / Save pill */}
              <Box
                sx={{
                  flex: { xs: 1, md: '0 0 auto' },
                  display: 'flex',
                  alignItems: 'stretch',
                  borderRadius: '10px',
                  minHeight: { xs: '44px', md: 'auto' },
                  background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.1)'
                    : '1px solid rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  boxShadow: isDarkMode
                    ? '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : '0 1px 4px rgba(0,0,0,0.07)',
                }}
              >
                {/* Publish to Hub — logged-in only */}
                {isLoggedIn && (
                  <>
                    <Tooltip title="Publish to Roster Hub" arrow>
                      <ButtonBase
                        onClick={() => {
                          void encodeRosterToURL(roster)
                            .then((encoded) => {
                              setPublishRosterData(encoded);
                              setPublishDialogOpen(true);
                            })
                            .catch(() => {
                              setSnackbar({
                                open: true,
                                message: 'Failed to encode roster for publishing',
                                severity: 'error',
                              });
                            });
                        }}
                        sx={{
                          display: 'inline-flex',
                          flex: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.625,
                          px: 1.375,
                          py: { xs: 1.375, md: 0.875 },
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isDarkMode ? 'rgba(147,197,253,0.95)' : 'rgba(29,78,216,0.9)',
                          background: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.07)',
                          transition: 'background-color 0.15s ease, color 0.15s ease',
                          '&:hover': {
                            color: isDarkMode ? '#bfdbfe' : '#1d4ed8',
                            background: isDarkMode
                              ? 'rgba(59,130,246,0.18)'
                              : 'rgba(59,130,246,0.12)',
                          },
                        }}
                      >
                        <GroupsIcon sx={{ fontSize: '0.9rem' }} />
                        Hub
                      </ButtonBase>
                    </Tooltip>
                    <Box
                      sx={{
                        width: '1px',
                        my: 0,
                        background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      }}
                    />
                  </>
                )}

                {/* Publish to Discord */}
                <Tooltip title="Publish as rich embed to Discord server" arrow>
                  <ButtonBase
                    onClick={() => {
                      void encodeRosterToURL(roster)
                        .then((encoded) => {
                          setDiscordPublishData(encoded);
                          setDiscordPublishOpen(true);
                        })
                        .catch(() => {
                          setSnackbar({
                            open: true,
                            message: 'Failed to encode roster',
                            severity: 'error',
                          });
                        });
                    }}
                    sx={{
                      display: 'inline-flex',
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      px: 1.375,
                      py: { xs: 1.375, md: 0.875 },
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isDarkMode ? 'rgba(165,180,252,0.95)' : 'rgba(79,70,229,0.9)',
                      background: isDarkMode ? 'rgba(88,101,242,0.1)' : 'rgba(88,101,242,0.07)',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      '&:hover': {
                        color: isDarkMode ? '#c7d2fe' : '#4338ca',
                        background: isDarkMode ? 'rgba(88,101,242,0.18)' : 'rgba(88,101,242,0.14)',
                      },
                    }}
                  >
                    <img
                      src={discordIcon}
                      alt=""
                      style={{ width: 13, height: 13, opacity: isDarkMode ? 0.85 : 0.7 }}
                    />
                    Discord
                  </ButtonBase>
                </Tooltip>

                <Box
                  sx={{
                    width: '1px',
                    my: 0,
                    background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                />

                {/* Save */}
                <Tooltip
                  title={
                    savedRosterIdRef.current
                      ? 'Update this roster in My Rosters'
                      : 'Save roster to My Rosters (stored locally)'
                  }
                  arrow
                >
                  <ButtonBase
                    onClick={handleSaveToMyRosters}
                    sx={{
                      display: 'inline-flex',
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.625,
                      px: 1.375,
                      py: { xs: 1.375, md: 0.875 },
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isDarkMode ? 'rgba(196,181,253,0.95)' : 'rgba(109,40,217,0.9)',
                      background: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.07)',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      '&:hover': {
                        color: isDarkMode ? '#ddd6fe' : '#7c3aed',
                        background: isDarkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.12)',
                      },
                    }}
                  >
                    <BookmarkIcon sx={{ fontSize: '0.9rem' }} />
                    Save
                  </ButtonBase>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* ── ESOtk Addon Banner ── */}
          <Tooltip
            title="Copy roster for ESOtk addon — paste in-game with /esotk roster import"
            arrow
          >
            <ButtonBase
              onClick={handleExportAddon}
              sx={{
                width: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderRadius: '10px',
                cursor: 'pointer',
                border: isDarkMode
                  ? '1px solid rgba(251,191,36,0.18)'
                  : '1px solid rgba(161,98,7,0.18)',
                fontFamily: 'inherit',
                textAlign: 'left',
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(251,191,36,0.09) 0%, rgba(245,158,11,0.05) 55%, rgba(11,18,32,0.35) 100%)'
                  : 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 55%, rgba(255,255,255,0.55) 100%)',
                overflow: 'hidden',
                transition: 'background 0.2s ease, border-color 0.2s ease',
                boxShadow: isDarkMode
                  ? '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(251,191,36,0.06)'
                  : '0 1px 4px rgba(0,0,0,0.06)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: isDarkMode
                    ? 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.65) 25%, rgba(245,158,11,0.9) 55%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, rgba(161,98,7,0.4) 25%, rgba(245,158,11,0.65) 55%, transparent 100%)',
                  borderRadius: '4px 4px 0 0',
                },
                '&:hover': {
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.14) 0%, rgba(245,158,11,0.08) 55%, rgba(11,18,32,0.35) 100%)'
                    : 'linear-gradient(135deg, rgba(251,191,36,0.13) 0%, rgba(245,158,11,0.07) 55%, rgba(255,255,255,0.55) 100%)',
                  borderColor: isDarkMode ? 'rgba(251,191,36,0.32)' : 'rgba(161,98,7,0.3)',
                  boxShadow: isDarkMode
                    ? '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(251,191,36,0.1)'
                    : '0 2px 8px rgba(161,98,7,0.1)',
                },
              }}
            >
              {/* Icon box */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isDarkMode ? 'rgba(251,191,36,0.14)' : 'rgba(161,98,7,0.1)',
                  border: isDarkMode
                    ? '1px solid rgba(251,191,36,0.22)'
                    : '1px solid rgba(161,98,7,0.18)',
                }}
              >
                <AddonIcon
                  sx={{
                    fontSize: '1.1rem',
                    color: isDarkMode ? 'rgba(251,191,36,0.92)' : 'rgba(120,70,0,0.88)',
                  }}
                />
              </Box>

              {/* Text content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  component="div"
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: isDarkMode ? 'rgba(251,191,36,0.95)' : 'rgba(120,70,0,0.9)',
                  }}
                >
                  ESOtk Addon Export
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    fontSize: '0.7rem',
                    lineHeight: 1.4,
                    mt: 0.25,
                    color: isDarkMode ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.42)',
                  }}
                >
                  Copy roster data · paste in-game with{' '}
                  <Box
                    component="code"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.675rem',
                      px: 0.5,
                      py: 0.125,
                      borderRadius: '4px',
                      background: isDarkMode ? 'rgba(251,191,36,0.1)' : 'rgba(161,98,7,0.08)',
                      color: isDarkMode ? 'rgba(251,191,36,0.8)' : 'rgba(120,70,0,0.75)',
                    }}
                  >
                    /esotk roster import
                  </Box>
                </Typography>
              </Box>

              {/* Action hint icon */}
              <CopyIcon
                sx={{
                  fontSize: '1rem',
                  flexShrink: 0,
                  color: isDarkMode ? 'rgba(251,191,36,0.45)' : 'rgba(161,98,7,0.38)',
                }}
              />
            </ButtonBase>
          </Tooltip>
        </Box>

        <Box
          sx={{
            my: 3,
            height: '1px',
            background: isDarkMode
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.06) 20%, rgba(0,0,0,0.06) 80%, transparent 100%)',
          }}
        />

        {/* ─── Roster Setup Section ─── */}
        <Box sx={{ mb: 3 }}>
          {/* Section header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 100%)',
                border: isDarkMode
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <TuneIcon
                sx={{
                  fontSize: '1rem',
                  color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                }}
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                  lineHeight: 1,
                  mb: 0.375,
                }}
              >
                Configuration
              </Typography>
              <Typography
                component="h2"
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Roster Setup
              </Typography>
            </Box>
          </Box>

          {/* Shared container card */}
          <Box
            sx={{
              borderRadius: '12px',
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`,
              p: 2,
            }}
          >
            {/* Role Composition Picker */}
            <RoleCompositionPicker
              composition={roster.composition}
              onChange={handleCompositionChange}
              variant="embedded"
            />

            {/* Player Groups subsection (full mode only) */}
            <Box sx={{ display: mode === 'full' ? 'block' : 'none' }}>
              {/* Inner divider */}
              <Box
                sx={{
                  my: 2,
                  height: '1px',
                  background: isDarkMode
                    ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 15%, rgba(255,255,255,0.06) 85%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.05) 85%, transparent 100%)',
                }}
              />

              {/* Subsection label */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                <GroupIcon
                  sx={{
                    fontSize: '0.9rem',
                    color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  }}
                >
                  Player Groups
                </Typography>
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    px: 0.625,
                    py: 0.125,
                    borderRadius: '6px',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.06)'
                      : '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  {roster.availableGroups.length}
                </Box>
              </Box>

              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={roster.availableGroups}
                onChange={(_, value) =>
                  setRoster((prev) => ({
                    ...prev,
                    availableGroups: value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                slotProps={{
                  popper: {
                    disablePortal: true,
                  },
                }}
                ChipProps={{
                  onMouseDown: (event) => {
                    event.stopPropagation();
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add Groups"
                    placeholder="Type a name and press Enter"
                    helperText={
                      roster.availableGroups.length === 0
                        ? 'e.g. Slayer Stack 1, Group A, Group B'
                        : undefined
                    }
                    sx={glassTextField}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <Chip
                        label={option}
                        {...chipProps}
                        key={key}
                        sx={{
                          borderRadius: '6px',
                          backgroundColor: isDarkMode
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                          border: isDarkMode
                            ? '1px solid rgba(255,255,255,0.1)'
                            : '1px solid rgba(0,0,0,0.1)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          letterSpacing: '0.01em',
                          '& .MuiChip-deleteIcon': {
                            color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                            '&:hover': {
                              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                            },
                          },
                        }}
                      />
                    );
                  })
                }
              />
            </Box>
          </Box>
        </Box>

        {/* Simple Mode: Set Assignment Manager */}
        <Box sx={{ display: mode === 'simple' ? 'block' : 'none' }}>
          <SetAssignmentManager
            tanks={roster.tanks}
            healers={roster.healers}
            onAssignSet={handleSetAssignment}
            onUpdateUltimate={handleUltimateUpdate}
            onUpdateHealerCP={handleHealerCPUpdate}
          />
        </Box>

        {/* Full Mode: Full Roster Details */}
        <Box sx={{ display: mode === 'full' ? 'block' : 'none' }}>
          <RosterCardSections
            tanks={roster.tanks}
            healers={roster.healers}
            dpsSlots={roster.dpsSlots}
            tankChangeCallbacks={tankChangeCallbacks}
            healerChangeCallbacks={healerChangeCallbacks}
            handleDPSSlotChange={handleDPSSlotChange}
            handleConvertDPSToJail={handleConvertDPSToJail}
            handleConvertJailToDPS={handleConvertJailToDPS}
            handleMoveDPSSlot={handleMoveDPSSlot}
            availableGroups={memoizedGroups}
            usedBuffs={usedBuffs}
            mode={mode}
            savedRosterId={savedRosterIdRef.current ?? undefined}
            isDarkMode={isDarkMode}
            dpsSlotIds={dpsSlotIds}
            sensors={sensors}
            handleDPSDragEnd={handleDPSDragEnd}
          />

          {/* Per-Fight Builds */}
          <Box sx={{ my: 2 }}>
            <PerFightBuilds roster={roster} onUpdateTrialOverrides={handleTrialOverridesChange} />
          </Box>

          <Divider
            sx={{
              my: 1.5,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          />

          {/* General Notes */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 100%)',
                border: isDarkMode
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <NotesIcon
                sx={{
                  fontSize: '1rem',
                  color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                }}
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                  lineHeight: 1,
                  mb: 0.375,
                }}
              >
                Notes
              </Typography>
              <Typography
                component="h2"
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                General Notes
              </Typography>
            </Box>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="General Notes"
            value={roster.notes || ''}
            onChange={(e) =>
              setRoster((prev) => ({
                ...prev,
                notes: e.target.value,
                updatedAt: new Date().toISOString(),
              }))
            }
            sx={glassTextField}
          />
        </Box>
      </Paper>

      {/* Quick Fill Dialog */}
      <Dialog
        open={quickFillDialog}
        onClose={() => setQuickFillDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              backgroundColor: isDarkMode ? 'rgba(20,20,30,0.97)' : 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(16px)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isDarkMode
                ? '0 16px 48px rgba(0,0,0,0.5)'
                : '0 16px 48px rgba(0,0,0,0.12)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            background: isDarkMode
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Quick Fill Player Names
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter player names, one per line. The first 2 will fill tanks, next 2 will fill healers,
            and remaining will fill DPS slots (up to 8 total DPS).
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={12}
            fullWidth
            variant="outlined"
            placeholder={'Player1\nPlayer2\nPlayer3\n...'}
            value={quickFillText}
            onChange={(e) => setQuickFillText(e.target.value)}
            helperText={`${quickFillText.split('\n').filter((line) => line.trim()).length} players entered`}
            sx={glassTextField}
          />
        </DialogContent>
        <DialogActions>
          <ButtonBase
            onClick={() => setQuickFillDialog(false)}
            sx={{
              px: 1.5,
              py: 0.625,
              borderRadius: '8px',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              background: 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              '&:hover': {
                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            }}
          >
            Cancel
          </ButtonBase>
          <Button
            onClick={handleQuickFill}
            variant="contained"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              boxShadow: isDarkMode
                ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            Fill Roster
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discord Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              backgroundColor: isDarkMode ? 'rgba(20,20,30,0.97)' : 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(16px)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isDarkMode
                ? '0 16px 48px rgba(0,0,0,0.5)'
                : '0 16px 48px rgba(0,0,0,0.12)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            background: isDarkMode
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Discord Message Preview
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This is how your roster will appear when posted to Discord:
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              bgcolor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'grey.900',
              color: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowX: 'auto',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {generateDiscordFormat(roster)}
          </Paper>
        </DialogContent>
        <DialogActions>
          <ButtonBase
            onClick={() => setPreviewDialog(false)}
            sx={{
              px: 1.5,
              py: 0.625,
              borderRadius: '8px',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              background: 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              '&:hover': {
                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            }}
          >
            Close
          </ButtonBase>
          <Button
            onClick={() => {
              handleCopyDiscordFormat();
              setPreviewDialog(false);
            }}
            variant="contained"
            startIcon={<CopyIcon />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              boxShadow: isDarkMode
                ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import from URL Dialog */}
      <Dialog
        open={importUrlDialog}
        onClose={() => {
          setImportUrlDialog(false);
          setImportUrl('');
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              backgroundColor: isDarkMode ? 'rgba(20,20,30,0.97)' : 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(16px)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isDarkMode
                ? '0 16px 48px rgba(0,0,0,0.5)'
                : '0 16px 48px rgba(0,0,0,0.12)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            background: isDarkMode
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Import Roster from ESO Logs
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the ESO Logs report URL for a specific fight. The roster will be automatically
            derived from the player data in the report.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Example URL formats:</strong>
            <br />
            • With fight ID (hash): https://www.esologs.com/reports/ABC123#fight=5
            <br />
            • With fight ID (query): https://www.esologs.com/reports/ABC123?fight=5
            <br />• Without fight ID: https://www.esologs.com/reports/ABC123
          </Typography>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            label="ESO Logs URL"
            placeholder="https://www.esologs.com/reports/ABC123#fight=5"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            sx={{ mt: 2, ...glassTextField }}
            disabled={importLoading}
            helperText="The report must be public or you must be logged in to access it"
          />
        </DialogContent>
        <DialogActions>
          <ButtonBase
            onClick={() => {
              setImportUrlDialog(false);
              setImportUrl('');
            }}
            sx={{
              px: 1.5,
              py: 0.625,
              borderRadius: '8px',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              background: 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              opacity: importLoading ? 0.5 : 1,
              pointerEvents: importLoading ? 'none' : 'auto',
              '&:hover': {
                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            }}
          >
            Cancel
          </ButtonBase>
          <Button
            onClick={handleImportFromUrl}
            variant="contained"
            disabled={importLoading}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              boxShadow: isDarkMode
                ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {importLoading ? 'Importing...' : 'Import Roster'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Publish to Roster Hub dialog */}
      <PublishRosterDialog
        open={publishDialogOpen}
        rosterData={publishRosterData}
        token={accessToken}
        onClose={() => setPublishDialogOpen(false)}
        onPublished={() => {
          setSnackbar({
            open: true,
            severity: 'success',
            message: 'Roster published to Roster Hub!',
          });
        }}
      />

      {/* Publish to Discord dialog */}
      <ServerPickerDialog
        open={discordPublishOpen}
        title={roster.rosterName}
        trialId={roster.trialOverrides?.trialId ?? ''}
        rosterData={discordPublishData}
        onClose={() => setDiscordPublishOpen(false)}
        onSuccess={() => {
          setDiscordPublishOpen(false);
          setSnackbar({
            open: true,
            severity: 'success',
            message: 'Roster published to Discord!',
          });
        }}
      />
    </Container>
  );
};

// (TankCard, HealerCard, and DPSSlotCard have been extracted to src/components/roster/)

// DD Requirement Card Component
// Generate Discord formatted text
const generateDiscordFormat = (roster: RaidRoster): string => {
  const lines: string[] = [];

  lines.push(`**${roster.rosterName}**`);
  lines.push('');

  // Wrap a value in brackets as a header token — returns empty string if falsy
  const bracket = (val: string | null | undefined): string => (val ? ` [${val}]` : '');

  // Wrap an array of values as bracket tokens
  const bracketed = (vals: string[]): string => vals.map((v) => ` [${v}]`).join('');

  // Derive group arrow from group name: "left" → ⬅️, "right" → ➡️
  const groupArrow = (groupName?: string): string => {
    if (!groupName) return '';
    const lower = groupName.toLowerCase();
    if (lower.includes('left')) return '⬅️';
    if (lower.includes('right')) return '➡️';
    return '';
  };

  // Convert playerNumber to a pointing emoji, or return the raw value
  const positionEmoji = (playerNumber?: string): string => {
    if (!playerNumber) return '';
    const lower = playerNumber.toLowerCase();
    if (lower === 'left') return '👈';
    if (lower === 'right') return '👉';
    if (lower === 'center') return '👇';
    return playerNumber;
  };

  // Format positionTag + playerNumber as bracket tokens
  const formatPosition = (positionTag?: string, playerNumber?: string): string => {
    if (!positionTag && !playerNumber) return '';
    const emoji = positionEmoji(playerNumber);
    const isEmoji = emoji === '👈' || emoji === '👉' || emoji === '👇';
    if (positionTag && emoji && isEmoji) {
      // Directional position → separate brackets: [Portal] [👈]
      return ` [${positionTag}] [${emoji}]`;
    }
    if (positionTag && emoji) {
      // Non-directional position → combined: [Tomb 2a]
      return ` [${positionTag} ${emoji}]`;
    }
    if (positionTag) return ` [${positionTag}]`;
    if (emoji) return ` [${emoji}]`;
    return '';
  };

  // Format gear sets as a `GEAR: \`Set1\` \`Set2\`` line
  const formatGearLine = (names: string[]): string => {
    const filtered = names.filter(Boolean);
    if (!filtered.length) return '';
    return `GEAR: ${filtered.map((s) => `\`${s}\``).join(' ')}`;
  };

  // Format skill lines as a `LINES: \`Line1\` \`Line2\`` line
  const formatSkillLinesLine = (skillLines: SkillLineConfig): string => {
    if (skillLines.isFlex) return 'LINES: `Flexible`';
    const parts = [skillLines.line1, skillLines.line2, skillLines.line3].filter(Boolean);
    if (!parts.length) return '';
    return `LINES: ${parts.map((l) => `\`${l}\``).join(' ')}`;
  };

  // Collect display names from a structured gear config
  const collectGearNames = (config: {
    set1?: KnownSetIDs;
    set2?: KnownSetIDs;
    monsterSet?: KnownSetIDs;
    additionalSets?: KnownSetIDs[];
  }): string[] => {
    const result: string[] = [];
    if (config.set1) result.push(getSetDisplayName(config.set1));
    if (config.set2) result.push(getSetDisplayName(config.set2));
    if (config.monsterSet) result.push(getSetDisplayName(config.monsterSet));
    if (config.additionalSets)
      config.additionalSets.forEach((id) => result.push(getSetDisplayName(id)));
    return result.filter(Boolean);
  };

  // Tanks — arrow from group name, defaults MT=⬅️ OT=➡️
  roster.tanks.forEach((tank, idx) => {
    const num = idx + 1;
    const arrow = groupArrow(tank.group?.groupName) || (num === 1 ? '⬅️' : '➡️');
    const label = tank.roleLabel || (num === 1 ? 'MT' : 'OT');
    const ult = bracket(tank.ultimate);
    const pos = formatPosition(tank.positionTag, tank.playerNumber);
    const roleNote = bracket(tank.roleNotes);
    const labelsPart = tank.labels?.length ? bracketed(tank.labels) : '';
    const player = tank.playerName ? ` @${tank.playerName}` : '';

    lines.push(`${arrow}🛡️ **${label}**:${ult}${pos}${roleNote}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearNames(tank.gearSets));
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(tank.skillLines);
    if (sl) lines.push(sl);

    if (tank.notes) lines.push(`*${tank.notes}*`);

    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Healers — arrow from group name, defaults H1=⬅️ H2=➡️
  roster.healers.forEach((h, index) => {
    const arrow = groupArrow(h.group?.groupName) || (index === 0 ? '⬅️' : '➡️');
    const label = h.roleLabel || `H${index + 1}`;
    const pos = formatPosition(h.positionTag, h.playerNumber);
    const roleNote = bracket(h.roleNotes);
    const ult = bracket(h.ultimate);
    const buff = bracket(h.healerBuff);
    const cp = bracket(h.championPoint);
    const labelsPart = h.labels?.length ? bracketed(h.labels) : '';
    const player = h.playerName ? ` @${h.playerName}` : '';

    lines.push(`${arrow}💖 **${label}**:${pos}${roleNote}${ult}${buff}${cp}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearNames(h));
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(h.skillLines);
    if (sl) lines.push(sl);

    if (h.notes) lines.push(`*${h.notes}*`);

    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Format jail DD type for display
  const formatJailDDType = (type: JailDDType, customDescription?: string): string => {
    switch (type) {
      case 'banner':
        return 'Banner';
      case 'zenkosh':
        return 'ZenKosh';
      case 'wm':
        return 'WM';
      case 'wm-mk':
        return 'WM/MK';
      case 'mk':
        return 'MK';
      case 'custom':
        return customDescription || 'Custom';
      default:
        return '';
    }
  };

  // DPS — arrow from group name, no default arrow if no group
  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  sortedDPS.forEach((dd) => {
    const arrow = groupArrow(dd.group?.groupName);
    const jailType = dd.jailDDType
      ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
      : '';
    const pos = formatPosition(dd.positionTag, dd.playerNumber);
    const roleNote = bracket(dd.roleNotes);
    const labelsPart = dd.labels?.length ? bracketed(dd.labels) : '';
    const player = dd.playerName ? ` @${dd.playerName}` : '';

    lines.push(
      `${arrow}⚔️ **#${dd.slotNumber}${jailType}**:${pos}${roleNote}${labelsPart}${player}`,
    );

    const ddGearParts: string[] = [];
    if (dd.set1) ddGearParts.push(getSetDisplayName(dd.set1));
    if (dd.set2) ddGearParts.push(getSetDisplayName(dd.set2));
    if (dd.monsterSet) ddGearParts.push(getSetDisplayName(dd.monsterSet));
    if (dd.additionalSets)
      dd.additionalSets.forEach((id) => ddGearParts.push(getSetDisplayName(id)));

    const gear = formatGearLine(ddGearParts.filter(Boolean));
    if (gear) lines.push(gear);

    if (dd.skillLines) {
      const sl = formatSkillLinesLine(dd.skillLines);
      if (sl) lines.push(sl);
    }
    if (dd.ultimate) lines.push(`[${dd.ultimate}]`);
    if (dd.notes) lines.push(`*${dd.notes}*`);

    lines.push('');
  });

  // General Notes
  if (roster.notes) {
    lines.push('**General Notes:**');
    lines.push(roster.notes);
    lines.push('');
  }

  return lines.join('\n');
};
