import { gql } from '@apollo/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AutoAwesome as AutoAwesomeIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Favorite as FavoriteIcon,
  Group as GroupIcon,
  Link as LinkIcon,
  PersonAdd as PersonAddIcon,
  Shield as ShieldIcon,
  StickyNote2 as NotesIcon,
  DragIndicator as DragIndicatorIcon,
  Visibility as VisibilityIcon,
  Groups as GroupsIcon,
  SportsEsports as AddonIcon,
} from '@mui/icons-material';
import {
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Chip,
  Divider,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useMemo, useRef } from 'react';

import discordIcon from '../assets/discord-icon.svg';
import { PerFightBuilds } from '../components/PerFightBuilds';
import { SetAssignmentManager } from '../components/SetAssignmentManager';
import { WorkInProgressDisclaimer } from '../components/WorkInProgressDisclaimer';
import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';
import { GetPlayersForReportQuery } from '../graphql/gql/graphql';
import { KnownAbilities, KnownSetIDs } from '../types/abilities';
import {
  RaidRoster,
  TankSetup,
  TankGearSet,
  HealerSetup,
  DPSSlot,
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  JailDDType,
  CLASS_SKILL_LINES,
  SkillLineConfig,
  PlayerGroup,
  createDefaultRoster,
  defaultTankSetup,
  defaultHealerSetup,
  createDefaultDPSSlots,
  TANK_5PIECE_SETS,
  HEALER_5PIECE_SETS,
  FLEXIBLE_5PIECE_SETS,
  TANK_MONSTER_SETS,
  HEALER_MONSTER_SETS,
  FLEXIBLE_MONSTER_SETS,
  MONSTER_SETS,
  ALL_5PIECE_SETS,
  DD_SPECIAL_SETS,
  validateCompatibility,
} from '../types/roster';
import type { TrialBuildOverrides } from '../types/trial-encounters';
import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';
import { encodeRosterToURL as encodeRosterToURLShared } from '../utils/rosterEncoding';
import { getSetDisplayName, findSetIdByName } from '../utils/setNameUtils';

/**
 * Type definitions for log file import
 */
interface GearItem {
  setName?: string;
  setID?: number; // Set ID from API
  permanentEnchant?: number; // Mythic items have this set, counts as 2 pieces
  [key: string]: unknown;
}

interface TalentItem {
  name?: string;
  guid?: number;
  type?: number;
  abilityIcon?: string;
  flags?: number;
  [key: string]: unknown;
}

interface CombatantInfo {
  gear?: GearItem[];
  talents?: TalentItem[];
  [key: string]: unknown;
}

interface PlayerData {
  name?: string;
  id?: number;
  combatantInfo?: CombatantInfo;
  [key: string]: unknown;
}

interface PlayerDetails {
  tanks?: PlayerData[];
  healers?: PlayerData[];
  dps?: PlayerData[];
  [key: string]: unknown;
}

interface AuraInfo {
  source: number;
  ability: number;
  stacks?: number;
  icon?: string;
  name?: string;
}

interface CombatantInfoEvent {
  timestamp: number;
  type: string;
  sourceID: number;
  targetID?: number;
  sourceIsFriendly?: boolean;
  auras?: AuraInfo[];
}

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

interface CompactTank {
  pn?: string; // playerName
  pi?: number; // playerNumber
  rl?: string; // roleLabel
  rn?: string; // roleNotes
  lb?: string[]; // labels
  gs?: CompactGear; // gearSets
  sl?: CompactSkills; // skillLines
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  ss?: string[]; // specificSkills
  gr?: CompactGroup; // group
  no?: string; // notes
}

interface CompactHealer {
  pn?: string; // playerName
  pi?: number; // playerNumber
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
}

interface CompactDPS {
  sn: number; // slotNumber (required)
  pn?: string; // playerName
  pi?: number; // playerNumber
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
  ul?: number | string; // ultimate (index or custom string)
  gr?: CompactGroup; // group
  no?: string; // notes
  jt?: number; // jailDDType index
  cd?: string; // customDescription
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

function compactGear(gs: TankGearSet): CompactGear | undefined {
  const c: CompactGear = {};
  if (gs.set1 != null) c.s1 = gs.set1 as number;
  if (gs.set2 != null) c.s2 = gs.set2 as number;
  if (gs.monsterSet != null) c.ms = gs.monsterSet as number;
  if (gs.additionalSets?.length) c.a = gs.additionalSets as number[];
  if (gs.notes) c.no = gs.notes;
  return Object.keys(c).length > 0 ? c : undefined;
}

function expandGear(c?: CompactGear): TankGearSet {
  return {
    set1: c?.s1 as KnownSetIDs | undefined,
    set2: c?.s2 as KnownSetIDs | undefined,
    monsterSet: c?.ms as KnownSetIDs | undefined,
    additionalSets: c?.a as KnownSetIDs[] | undefined,
    notes: c?.no,
  };
}

function compactGroup(gr?: PlayerGroup): CompactGroup | undefined {
  if (!gr?.groupName) return undefined;
  const c: CompactGroup = { g: gr.groupName };
  if (gr.groupNumber != null) c.n = gr.groupNumber;
  return c;
}

function expandGroup(c?: CompactGroup): PlayerGroup | undefined {
  if (!c?.g) return undefined;
  return { groupName: c.g, groupNumber: c.n };
}

function compactTank(t: TankSetup): CompactTank {
  const c: CompactTank = {};
  if (t.playerName) c.pn = t.playerName;
  if (t.playerNumber != null) c.pi = t.playerNumber;
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
  return c;
}

function expandTank(c?: CompactTank): TankSetup {
  return {
    ...defaultTankSetup(),
    playerName: c?.pn,
    playerNumber: c?.pi,
    roleLabel: c?.rl,
    roleNotes: c?.rn,
    labels: c?.lb,
    gearSets: expandGear(c?.gs),
    skillLines: expandSkills(c?.sl),
    ultimate: decodeUltimate(c?.ul),
    specificSkills: c?.ss ?? [],
    group: expandGroup(c?.gr),
    notes: c?.no,
  };
}

function compactHealer(h: HealerSetup): CompactHealer {
  const c: CompactHealer = {};
  if (h.playerName) c.pn = h.playerName;
  if (h.playerNumber != null) c.pi = h.playerNumber;
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
  return c;
}

function expandHealer(c?: CompactHealer): HealerSetup {
  return {
    ...defaultHealerSetup(),
    playerName: c?.pn,
    playerNumber: c?.pi,
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
  };
}

function compactDPS(d: DPSSlot): CompactDPS {
  const c: CompactDPS = { sn: d.slotNumber };
  if (d.playerName) c.pn = d.playerName;
  if (d.playerNumber != null) c.pi = d.playerNumber;
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
  return c;
}

function expandDPS(c: CompactDPS): DPSSlot {
  return {
    slotNumber: c.sn,
    playerName: c.pn,
    playerNumber: c.pi,
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
    ultimate: c.ul != null ? decodeUltimate(c.ul) : null,
    group: expandGroup(c.gr),
    notes: c.no,
    jailDDType: c.jt != null ? JAIL_DD_TYPE_LIST[c.jt] : undefined,
    customDescription: c.cd,
  };
}

function compactifyRoster(roster: RaidRoster): CompactRoster {
  const c: CompactRoster = { v: 2 };
  if (roster.rosterName && roster.rosterName !== 'New Roster') c.n = roster.rosterName;
  c.t1 = compactTank(roster.tank1);
  c.t2 = compactTank(roster.tank2);
  c.h1 = compactHealer(roster.healer1);
  c.h2 = compactHealer(roster.healer2);
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
      slot.skillLines,
  );
  if (filledSlots.length) c.dp = filledSlots.map(compactDPS);
  if (roster.availableGroups?.length) c.ag = roster.availableGroups;
  if (roster.notes) c.no = roster.notes;
  return c;
}

function expandCompactRoster(c: CompactRoster): RaidRoster {
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
    tank1: expandTank(c.t1),
    tank2: expandTank(c.t2),
    healer1: expandHealer(c.h1),
    healer2: expandHealer(c.h2),
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
  tank1?: AddonSlot;
  tank2?: AddonSlot;
  healer1?: AddonSlot;
  healer2?: AddonSlot;
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
  if (dps.gearSets?.length) {
    slot.gearSets = dps.gearSets.map((id) => getSetDisplayName(id)).filter(Boolean);
  }
  return slot;
}

/**
 * Convert a RaidRoster to the simplified addon-import format.
 * Set IDs are resolved to human-readable display names so the addon can
 * match them against in-game GetItemLinkSetInfo() results.
 */
function rosterToAddonExport(roster: RaidRoster): AddonExportRoster {
  const addonRoster: AddonExportRoster = {
    rosterName: roster.rosterName,
  };

  const t1 = tankToAddonSlot(roster.tank1);
  const t2 = tankToAddonSlot(roster.tank2);
  const h1 = healerToAddonSlot(roster.healer1);
  const h2 = healerToAddonSlot(roster.healer2);

  if (t1) addonRoster.tank1 = t1;
  if (t2) addonRoster.tank2 = t2;
  if (h1) addonRoster.healer1 = h1;
  if (h2) addonRoster.healer2 = h2;

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
  // Encode as Base64URL (URL-safe, no padding)
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64url encode a byte array (URL-safe, no padding) */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64url decode back to byte array */
function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function readAllChunks(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function deflateString(str: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(str);
  // Use pipeThrough to avoid floating promise rejections from unawaited write/close calls.
  const inputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
  return readAllChunks(
    inputStream.pipeThrough(
      new CompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>,
    ),
  );
}

async function inflateBytes(bytes: Uint8Array): Promise<string> {
  // Use pipeThrough to avoid floating promise rejections from unawaited write/close calls.
  // Decompression errors propagate cleanly through the pipeline to the caller.
  const inputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const output = await readAllChunks(
    inputStream.pipeThrough(
      new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>,
    ),
  );
  return new TextDecoder().decode(output);
}

/**
 * Encode roster to a compact, deflate-compressed, URL-safe base64 string (v2).
 */
const encodeRosterToURL = async (roster: RaidRoster): Promise<string> => {
  try {
    const compact = compactifyRoster(roster);
    const json = JSON.stringify(compact);
    const compressed = await deflateString(json);
    return toBase64Url(compressed);
  } catch {
    return '';
  }
};

/**
 * Decode roster from URL hash. Supports v2 (deflate + compact) and v1 (plain base64 JSON).
 */
const decodeRosterFromURL = async (encoded: string): Promise<RaidRoster | null> => {
  // Try v2: deflate-raw + compact format
  try {
    const bytes = fromBase64Url(encoded);
    const json = await inflateBytes(bytes);
    const parsed = JSON.parse(json) as { v?: number };
    if (parsed.v === 2) {
      return expandCompactRoster(parsed as CompactRoster);
    }
  } catch {
    // fall through to v1
  }
  // Try v1: btoa(encodeURIComponent(json))
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as RaidRoster;
  } catch {
    return null;
  }
};

// Icon mappings for ESO abilities
const ULTIMATE_ICONS: Record<string, string> = {
  [SupportUltimate.WARHORN]: 'ability_ava_003_a',
  [SupportUltimate.COLOSSUS]: 'ability_necromancer_006_b',
  [SupportUltimate.BARRIER]: 'ability_ava_006',
  [SupportUltimate.ATRONACH]: 'ability_sorcerer_greater_storm_atronach',
};

const HEALER_BUFF_ICONS: Record<string, string> = {
  [HealerBuff.ENLIVENING_OVERFLOW]: 'ability_mage_065',
  [HealerBuff.FROM_THE_BRINK]: 'ability_mage_065',
};

const SKILL_LINE_ICONS: Record<string, string> = {
  // Dragonknight
  'Ardent Flame': 'ability_dragonknight_001', // Lava Whip
  'Draconic Power': 'ability_dragonknight_008', // Protective Scale
  'Earthen Heart': 'ability_dragonknight_007', // Spiked Armor

  // Sorcerer
  'Dark Magic': 'ability_sorcerer_mage_wraith', // Mages' Wrath
  'Daedric Summoning': 'ability_sorcerer_greater_storm_atronach',
  'Storm Calling': 'ability_sorcerer_endless_fury',

  // Nightblade
  Assassination: 'ability_nightblade_012', // Strife
  Shadow: 'ability_nightblade_012',
  Siphoning: 'ability_nightblade_012',

  // Templar
  'Aedric Spear': 'ability_templar_sun_fire',
  "Dawn's Wrath": 'ability_templar_sun_fire',
  'Restoring Light': 'ability_templar_sun_fire',

  // Warden
  'Animal Companions': 'ability_mage_065',
  'Green Balance': 'ability_mage_065',
  "Winter's Embrace": 'ability_mage_065',

  // Necromancer
  'Grave Lord': 'ability_necromancer_006_b', // Blastbones
  'Bone Tyrant': 'ability_necromancer_006_b',
  'Living Death': 'ability_necromancer_006_b',

  // Arcanist
  'Herald of the Tome': 'ability_mage_065',
  'Apocryphal Soldier': 'ability_mage_065',
  'Curative Runeforms': 'ability_mage_065',
};

/**
 * Get icon for ultimates
 */
const getUltimateIcon = (ultimate: string | undefined): React.ReactElement | null => {
  if (!ultimate) return null;
  const iconFile = ULTIMATE_ICONS[ultimate];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for healer buffs
 */
const getHealerBuffIcon = (buff: string | undefined): React.ReactElement | null => {
  if (!buff) return null;
  const iconFile = HEALER_BUFF_ICONS[buff];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for skill lines based on class
 */
const getSkillLineIcon = (skillLine: string): React.ReactElement | null => {
  const iconFile = SKILL_LINE_ICONS[skillLine];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

// Pre-computed set option arrays (pure data, computed once at module load)
const TANK_5PIECE_OPTIONS: readonly string[] = (() => {
  const tankSets = Array.from(TANK_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const hybridSets = Array.from(FLEXIBLE_5PIECE_SETS)
    .filter((set) => !TANK_5PIECE_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();
  return [...tankSets, ...hybridSets];
})();

const TANK_MONSTER_OPTIONS: readonly string[] = (() => {
  const sets = new Set<string>();
  TANK_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  FLEXIBLE_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  return Array.from(sets).sort();
})();

const HEALER_5PIECE_OPTIONS: readonly string[] = (() => {
  const healerSets = Array.from(HEALER_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const hybridSets = Array.from(FLEXIBLE_5PIECE_SETS)
    .filter((set) => !HEALER_5PIECE_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();
  return [...healerSets, ...hybridSets];
})();

const HEALER_MONSTER_OPTIONS: readonly string[] = (() => {
  const sets = new Set<string>();
  HEALER_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  FLEXIBLE_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  return Array.from(sets).sort();
})();

// DPS set options: DD special sets first, then all 5-piece sets
const DPS_5PIECE_OPTIONS: readonly string[] = (() => {
  const ddSets = Array.from(DD_SPECIAL_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const otherSets = Array.from(ALL_5PIECE_SETS)
    .filter((set) => !DD_SPECIAL_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();
  return [...ddSets, ...otherSets];
})();

const DPS_MONSTER_OPTIONS: readonly string[] = (() => {
  const sets = new Set<string>();
  MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  return Array.from(sets).sort();
})();

const isDDSpecialSet = (setId: KnownSetIDs): boolean => {
  return (DD_SPECIAL_SETS as readonly KnownSetIDs[]).includes(setId);
};

/**
 * Helper functions for type-safe set membership checks
 */
const isTank5PieceSet = (setId: KnownSetIDs): boolean => {
  return TANK_5PIECE_SETS.includes(setId);
};

const isHealer5PieceSet = (setId: KnownSetIDs): boolean => {
  return HEALER_5PIECE_SETS.includes(setId);
};

const isFlexible5PieceSet = (setId: KnownSetIDs): boolean => {
  return FLEXIBLE_5PIECE_SETS.includes(setId);
};

const isMonsterSet = (setId: KnownSetIDs): boolean => {
  return MONSTER_SETS.includes(setId);
};

/**
 * Validates and normalizes imported roster data to ensure type safety
 * @param data - Parsed JSON data (unknown type)
 * @returns Validated RaidRoster with all required fields
 */
const validateImportedRoster = (data: unknown): RaidRoster => {
  // Type guard to check if data is an object
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid roster data: expected an object');
  }

  const parsedData = data as Partial<RaidRoster>;

  // Create a validated roster by merging with defaults
  const validatedRoster: RaidRoster = {
    ...createDefaultRoster(),
    ...parsedData,
    // Explicitly validate and provide defaults for required complex fields
    tank1:
      parsedData.tank1 && typeof parsedData.tank1 === 'object'
        ? { ...defaultTankSetup(), ...parsedData.tank1 }
        : defaultTankSetup(),
    tank2:
      parsedData.tank2 && typeof parsedData.tank2 === 'object'
        ? { ...defaultTankSetup(), ...parsedData.tank2 }
        : defaultTankSetup(),
    healer1:
      parsedData.healer1 && typeof parsedData.healer1 === 'object'
        ? { ...defaultHealerSetup(), ...parsedData.healer1 }
        : defaultHealerSetup(),
    healer2:
      parsedData.healer2 && typeof parsedData.healer2 === 'object'
        ? { ...defaultHealerSetup(), ...parsedData.healer2 }
        : defaultHealerSetup(),
    dpsSlots:
      Array.isArray(parsedData.dpsSlots) && parsedData.dpsSlots.length > 0
        ? parsedData.dpsSlots
        : createDefaultDPSSlots(),
  };

  return validatedRoster;
};

/**
 * RosterBuilderPage - Allows raid leads to create and manage raid rosters
 * Includes tank/healer gear assignments, DD requirements, and ultimate assignments
 */
export const RosterBuilderPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const roleColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;

  const glassTextField = {
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
  };

  const [roster, setRoster] = useState<RaidRoster>(createDefaultRoster());
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
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

  // Get auth state
  const { isLoggedIn } = useAuth();

  // Get ESO Logs client context (safe to call - doesn't throw if not logged in)
  const { client: esoLogsClient, isReady, isLoggedIn: clientLoggedIn } = useEsoLogsClientContext();

  // Client is only available when ready and logged in
  const client = isReady && clientLoggedIn ? esoLogsClient : null;

  // Helper functions for role mapping
  const getRoleNumber = useCallback((role: 'tank1' | 'tank2' | 'healer1' | 'healer2'): 1 | 2 => {
    return role === 'tank1' || role === 'healer1' ? 1 : 2;
  }, []);

  const isTankRole = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2'): role is 'tank1' | 'tank2' => {
      return role === 'tank1' || role === 'tank2';
    },
    [],
  );

  // Update tank setup
  const handleTankChange = useCallback((tankNum: 1 | 2, updates: Partial<TankSetup>): void => {
    setRoster((prev) => ({
      ...prev,
      [`tank${tankNum}`]: {
        ...prev[`tank${tankNum}` as 'tank1' | 'tank2'],
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Stable per-card tank callbacks
  const handleTank1Change = useCallback(
    (updates: Partial<TankSetup>) => handleTankChange(1, updates),
    [handleTankChange],
  );
  const handleTank2Change = useCallback(
    (updates: Partial<TankSetup>) => handleTankChange(2, updates),
    [handleTankChange],
  );

  // Update healer setup
  const handleHealerChange = useCallback(
    (healerNum: 1 | 2, updates: Partial<HealerSetup>): void => {
      setRoster((prev) => ({
        ...prev,
        [`healer${healerNum}`]: {
          ...prev[`healer${healerNum}` as 'healer1' | 'healer2'],
          ...updates,
        },
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  // Stable per-card healer callbacks
  const handleHealer1Change = useCallback(
    (updates: Partial<HealerSetup>) => handleHealerChange(1, updates),
    [handleHealerChange],
  );
  const handleHealer2Change = useCallback(
    (updates: Partial<HealerSetup>) => handleHealerChange(2, updates),
    [handleHealerChange],
  );

  // Memoized callbacks for SetAssignmentManager
  const handleSetAssignment = useCallback(
    (setName: string, role: 'tank1' | 'tank2' | 'healer1' | 'healer2', slot: string) => {
      const roleNum = getRoleNumber(role);
      // Convert 'monster' to 'monsterSet' for internal state
      const slotKey = (slot === 'monster' ? 'monsterSet' : slot) as 'set1' | 'set2' | 'monsterSet';

      // Empty string means clear the slot
      if (setName === '') {
        if (isTankRole(role)) {
          const currentTank = roster[role];
          handleTankChange(roleNum, {
            gearSets: {
              ...currentTank.gearSets,
              [slotKey]: undefined,
            },
          });
        } else {
          handleHealerChange(roleNum, {
            [slotKey]: undefined,
          });
        }
        return;
      }

      // Convert set name to set ID for proper type safety
      const setId = findSetIdByName(setName);
      if (!setId) {
        // Set not found, skip assignment silently
        return;
      }

      if (isTankRole(role)) {
        const currentTank = roster[role];
        handleTankChange(roleNum, {
          gearSets: {
            ...currentTank.gearSets,
            [slotKey]: setId,
          },
        });
      } else {
        handleHealerChange(roleNum, {
          [slotKey]: setId,
        });
      }
    },
    [roster, getRoleNumber, isTankRole, handleTankChange, handleHealerChange],
  );

  const handleUltimateUpdate = useCallback(
    (role: 'tank1' | 'tank2' | 'healer1' | 'healer2', ultimate: string | null) => {
      const roleNum = getRoleNumber(role);
      if (isTankRole(role)) {
        handleTankChange(roleNum, { ultimate });
      } else {
        handleHealerChange(roleNum, { ultimate });
      }
    },
    [getRoleNumber, isTankRole, handleTankChange, handleHealerChange],
  );

  const handleHealerCPUpdate = useCallback(
    (role: 'healer1' | 'healer2', championPoint: HealerChampionPoint | null) => {
      const healerNum = getRoleNumber(role);
      handleHealerChange(healerNum, {
        championPoint,
      });
    },
    [getRoleNumber, handleHealerChange],
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for DPS slots reordering
  const handleDPSDragEnd = (event: DragEndEvent): void => {
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
  };

  // Gate URL sync until the initial load has settled so we don't clobber the incoming ?r= param
  const urlSyncReady = React.useRef(false);

  // Load roster from URL on mount (supports ?r= query param and legacy #hash)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('r') || window.location.hash.substring(1);
    if (encoded) {
      void decodeRosterFromURL(encoded).then((decoded) => {
        if (decoded) {
          setRoster(decoded);
          setSnackbar({
            open: true,
            message: 'Roster loaded from shared link!',
            severity: 'success',
          });
        }
        urlSyncReady.current = true;
      });
    } else {
      urlSyncReady.current = true;
    }
  }, []);

  // Keep ?r= query param in sync with the current roster so the URL is always shareable.
  // Debounced to avoid expensive compression on every keystroke and browser rate limits.
  React.useEffect(() => {
    if (!urlSyncReady.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void encodeRosterToURL(roster).then((encoded) => {
        if (cancelled || !encoded) return;
        const url = new URL(window.location.href);
        url.search = `?r=${encoded}`;
        url.hash = '';
        window.history.replaceState(null, '', url.toString());
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [roster]);

  // Generate shareable read-only link (points to /rv, the dedicated share view)
  const handleCopyLink = useCallback(() => {
    void encodeRosterToURLShared(roster).then((encoded) => {
      if (encoded) {
        // Derive base path to support subdirectory deployments (e.g. /dev-previews/pr-xxx/)
        const basePath = window.location.pathname.replace(/\/roster-builder(\/.*)?$/, '');
        const url = `${window.location.origin}${basePath}/rv?r=${encoded}`;
        navigator.clipboard
          .writeText(url)
          .then(() => {
            setSnackbar({
              open: true,
              message: 'Read-only link copied to clipboard!',
              severity: 'success',
            });
          })
          .catch(() => {
            setSnackbar({ open: true, message: 'Failed to copy link', severity: 'error' });
          });
      }
    });
  }, [roster]);

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
  const usedBuffs = useMemo(
    () => [roster.healer1?.healerBuff, roster.healer2?.healerBuff].filter(Boolean) as HealerBuff[],
    [roster.healer1?.healerBuff, roster.healer2?.healerBuff],
  );

  const memoizedGroups = useMemo(() => roster.availableGroups, [roster.availableGroups]);

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
      let details: PlayerDetails | undefined;

      if (typeof playerDetails === 'string') {
        // If it's a string, parse it as JSON
        try {
          const parsed = JSON.parse(playerDetails) as { data?: { playerDetails?: PlayerDetails } };
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
          details = (payload as { playerDetails?: PlayerDetails }).playerDetails;
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

      const { tanks = [], healers = [], dps = [] } = details;

      // Extract combatant info events from the response
      // Note: TypeScript doesn't know about the events field, so we cast it
      const report = response.reportData?.report as {
        playerDetails?: unknown;
        events?: { data?: string | unknown };
      };
      const eventsData = report?.events?.data;

      // Parse events data - it might be a string or already an object
      let combatantInfoEvents: CombatantInfoEvent[] = [];
      if (eventsData) {
        try {
          if (typeof eventsData === 'string') {
            combatantInfoEvents = JSON.parse(eventsData);
          } else if (Array.isArray(eventsData)) {
            combatantInfoEvents = eventsData as CombatantInfoEvent[];
          }
        } catch {
          // Failed to parse combatant info events - continue without champion point detection from auras
        }
      }

      // Build a map of player ID to champion points detected from auras
      const playerChampionPoints = new Map<string, Set<number>>();
      combatantInfoEvents.forEach((event) => {
        if (!event.auras || event.auras.length === 0) return;

        const sourceId = String(event.sourceID);
        if (!playerChampionPoints.has(sourceId)) {
          playerChampionPoints.set(sourceId, new Set());
        }

        event.auras.forEach((aura) => {
          // Track champion point ability IDs
          if (
            aura.ability === KnownAbilities.ENLIVENING_OVERFLOW ||
            aura.ability === KnownAbilities.FROM_THE_BRINK
          ) {
            playerChampionPoints.get(sourceId)?.add(aura.ability);
          }
        });
      });

      // Helper function to categorize gear sets properly
      const categorizeSets = (
        gear: GearItem[],
      ): {
        fivePieceSets: string[];
        monsterSets: string[];
        otherSets: string[];
      } => {
        // Helper to normalize set names (remove "Perfected" prefix)
        const normalizeSetName = (name: string): string => {
          return name.replace(/^Perfected\s+/i, '');
        };

        // Helper to check if a name has "Perfected" prefix
        const isPerfected = (name: string): boolean => {
          return /^Perfected\s+/i.test(name);
        };

        // Transform gear items: if setName is missing but setID exists, look up the name
        const transformedGear = gear.map((item) => {
          if (!item.setName && item.setID) {
            // Try to get the display name from the setID
            const displayName = getSetDisplayName(item.setID as KnownSetIDs);
            if (displayName) {
              return { ...item, setName: displayName };
            }
          }
          return item;
        });

        // First pass: Count pieces and track which version (perfected/non-perfected) we have
        const rawCountMap = new Map<string, number>();
        const perfectedVersions = new Map<string, string>(); // normalized name -> actual perfected name

        transformedGear.forEach((item: GearItem) => {
          if (item.setName) {
            const pieceCount = item.permanentEnchant ? 2 : 1;
            rawCountMap.set(item.setName, (rawCountMap.get(item.setName) || 0) + pieceCount);

            // Track perfected versions
            if (isPerfected(item.setName)) {
              const normalized = normalizeSetName(item.setName);
              perfectedVersions.set(normalized, item.setName);
            }
          }
        });

        // Second pass: Consolidate perfected and non-perfected sets
        const setCountMap = new Map<string, number>();
        const processedNormalized = new Set<string>();

        rawCountMap.forEach((count, setName) => {
          const normalized = normalizeSetName(setName);

          // Skip if we've already processed this set (either version)
          if (processedNormalized.has(normalized)) {
            return;
          }

          processedNormalized.add(normalized);

          // Check if there's a perfected version
          const perfectedName = perfectedVersions.get(normalized);

          // Calculate total count (perfected + non-perfected pieces)
          let totalCount = 0;
          if (perfectedName) {
            totalCount += rawCountMap.get(perfectedName) || 0;
          }
          // Add non-perfected count (if it exists)
          const nonPerfectedCount = rawCountMap.get(normalized) || 0;
          totalCount += nonPerfectedCount;

          // Always use the non-perfected (normalized) name for consistency
          setCountMap.set(normalized, totalCount);
        });

        const fivePieceSets: string[] = [];
        const monsterSets: string[] = [];
        const otherSets: string[] = [];

        // Sets to exclude from import (crafted sets, leveling sets, etc.)
        const excludedSetIds = new Set([
          KnownSetIDs.ARMOR_OF_THE_TRAINEE, // Crafted leveling set
          KnownSetIDs.DRUIDS_BRAID, // Crafted set from High Isle
        ]);

        setCountMap.forEach((count, setName) => {
          // Try to find the set ID for this set name
          const setId = findSetIdByName(setName);

          // Skip excluded sets
          if (setId && excludedSetIds.has(setId)) {
            return;
          }

          // Categorize the set based on type and piece count
          // Monster sets are typically 2-piece or 1-piece and are in our MONSTER_SETS list
          if (setId && MONSTER_SETS.includes(setId)) {
            monsterSets.push(setName);
          } else if (setId && count >= 5 && ALL_5PIECE_SETS.includes(setId)) {
            // 5-piece sets MUST have 5+ items AND be in our known 5-piece list
            fivePieceSets.push(setName);
          } else {
            // Everything else goes to additional sets
            otherSets.push(setName);
          }
        });

        return { fivePieceSets, monsterSets, otherSets };
      };

      // Helper function to extract ultimate from talents
      const extractUltimate = (
        combatantInfo: CombatantInfo | undefined,
      ): SupportUltimate | null => {
        if (!combatantInfo?.talents) return null;

        // Map ability IDs to support ultimates
        const ultimateIdMap: Record<number, SupportUltimate> = {
          [KnownAbilities.AGGRESSIVE_HORN]: SupportUltimate.WARHORN,
          [KnownAbilities.GLACIAL_COLOSSUS]: SupportUltimate.COLOSSUS,
          [KnownAbilities.REVIVING_BARRIER]: SupportUltimate.BARRIER,
          [KnownAbilities.REPLENISHING_BARRIER]: SupportUltimate.BARRIER,
          [KnownAbilities.SUMMON_CHARGED_ATRONACH]: SupportUltimate.ATRONACH,
        };

        for (const talent of combatantInfo.talents) {
          if (talent.guid && ultimateIdMap[talent.guid]) {
            return ultimateIdMap[talent.guid];
          }
        }

        return null;
      };

      // Helper function to deduplicate set IDs by their display names
      // This prevents having both "Pillager's Profit" (649) and "Perfected Pillager's Profit" (650)
      const deduplicateSetIds = (setIds: KnownSetIDs[]): KnownSetIDs[] => {
        const normalizeDisplayName = (name: string): string => {
          return name.replace(/^Perfected\s+/i, '');
        };

        const seen = new Set<string>();
        const result = setIds.filter((id) => {
          const displayName = getSetDisplayName(id);
          const normalizedName = normalizeDisplayName(displayName);

          if (seen.has(normalizedName)) {
            return false;
          }
          seen.add(normalizedName);
          return true;
        });
        return result;
      };

      // Helper function to extract healer champion point from talents or auras
      const extractHealerChampionPoint = (
        combatantInfo: CombatantInfo | undefined,
        playerId: number | undefined,
      ): HealerChampionPoint | null => {
        // First, check auras from combatant info events (more reliable)
        if (playerId !== undefined) {
          const championPoints = playerChampionPoints.get(String(playerId));
          if (championPoints) {
            if (championPoints.has(KnownAbilities.ENLIVENING_OVERFLOW)) {
              return HealerChampionPoint.ENLIVENING_OVERFLOW;
            }
            if (championPoints.has(KnownAbilities.FROM_THE_BRINK)) {
              return HealerChampionPoint.FROM_THE_BRINK;
            }
          }
        }

        // Fallback to checking talents (less reliable, but worth trying)
        if (!combatantInfo?.talents) return null;

        // Map ability IDs to champion points
        const championPointIdMap: Record<number, HealerChampionPoint> = {
          [KnownAbilities.ENLIVENING_OVERFLOW]: HealerChampionPoint.ENLIVENING_OVERFLOW,
          [KnownAbilities.FROM_THE_BRINK]: HealerChampionPoint.FROM_THE_BRINK,
        };

        for (const talent of combatantInfo.talents) {
          if (talent.guid && championPointIdMap[talent.guid]) {
            return championPointIdMap[talent.guid];
          }
        }

        return null;
      };

      // Helper function to extract healer buff from talents or auras
      const extractHealerBuff = (
        combatantInfo: CombatantInfo | undefined,
        playerId: number | undefined,
      ): HealerBuff | null => {
        // First, check auras from combatant info events (more reliable)
        if (playerId !== undefined) {
          const championPoints = playerChampionPoints.get(String(playerId));
          if (championPoints) {
            if (championPoints.has(KnownAbilities.ENLIVENING_OVERFLOW)) {
              return HealerBuff.ENLIVENING_OVERFLOW;
            }
            if (championPoints.has(KnownAbilities.FROM_THE_BRINK)) {
              return HealerBuff.FROM_THE_BRINK;
            }
          }
        }

        // Fallback to checking talents (less reliable, but worth trying)
        if (!combatantInfo?.talents) return null;

        // Map ability IDs to healer buffs
        const healerBuffIdMap: Record<number, HealerBuff> = {
          [KnownAbilities.ENLIVENING_OVERFLOW]: HealerBuff.ENLIVENING_OVERFLOW,
          [KnownAbilities.FROM_THE_BRINK]: HealerBuff.FROM_THE_BRINK,
        };

        for (const talent of combatantInfo.talents) {
          if (talent.guid && healerBuffIdMap[talent.guid]) {
            return healerBuffIdMap[talent.guid];
          }
        }

        return null;
      };

      // Parse tanks
      const parsedTanks: TankSetup[] = tanks.map((tank: PlayerData, index: number) => {
        const gear = tank.combatantInfo?.gear || [];
        const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);
        const extractedUltimate = extractUltimate(tank.combatantInfo);

        // Get existing ultimate for this tank (if roster already has data)
        const existingUltimate = index === 0 ? roster.tank1.ultimate : roster.tank2.ultimate;

        // Only replace ultimate if:
        // 1. There's no existing ultimate, OR
        // 2. The existing ultimate is Barrier AND we found a non-Barrier ultimate
        const shouldReplaceUltimate =
          !existingUltimate ||
          (existingUltimate === SupportUltimate.BARRIER &&
            extractedUltimate &&
            extractedUltimate !== SupportUltimate.BARRIER);

        const finalUltimate = shouldReplaceUltimate ? extractedUltimate : existingUltimate;

        return {
          playerName: tank.name || `Tank ${index + 1}`,
          roleLabel: `T${index + 1}`,
          gearSets: {
            set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
            set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
            monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
            additionalSets: deduplicateSetIds(
              [...fivePieceSets.slice(2), ...monsterSets.slice(1), ...otherSets]
                .map((name) => findSetIdByName(name))
                .filter((id): id is KnownSetIDs => id !== undefined),
            ),
          },
          skillLines: {
            line1: '',
            line2: '',
            line3: '',
            isFlex: false,
          },
          ultimate: finalUltimate,
          specificSkills: [],
        };
      });

      // Parse healers
      const parsedHealers: HealerSetup[] = healers.map((healer: PlayerData, index: number) => {
        const gear = healer.combatantInfo?.gear || [];
        const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);
        const extractedUltimate = extractUltimate(healer.combatantInfo);

        // Get existing ultimate for this healer (if roster already has data)
        const existingUltimate = index === 0 ? roster.healer1.ultimate : roster.healer2.ultimate;

        // Only replace ultimate if:
        // 1. There's no existing ultimate, OR
        // 2. The existing ultimate is Barrier AND we found a non-Barrier ultimate
        const shouldReplaceUltimate =
          !existingUltimate ||
          (existingUltimate === SupportUltimate.BARRIER &&
            extractedUltimate &&
            extractedUltimate !== SupportUltimate.BARRIER);

        const finalUltimate = shouldReplaceUltimate ? extractedUltimate : existingUltimate;

        return {
          playerName: healer.name || `Healer ${index + 1}`,
          roleLabel: `H${index + 1}`,
          set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
          set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
          monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
          additionalSets: deduplicateSetIds(
            [...fivePieceSets.slice(2), ...monsterSets.slice(1), ...otherSets]
              .map((name) => findSetIdByName(name))
              .filter((id): id is KnownSetIDs => id !== undefined),
          ),
          skillLines: {
            line1: '',
            line2: '',
            line3: '',
            isFlex: false,
          },
          healerBuff: extractHealerBuff(healer.combatantInfo, healer.id),
          championPoint: extractHealerChampionPoint(healer.combatantInfo, healer.id),
          ultimate: finalUltimate,
        };
      });

      // Parse DPS (up to 8 slots)
      const parsedDPS: DPSSlot[] = dps.slice(0, 8).map((dpsPlayer: PlayerData, index: number) => {
        const gear = dpsPlayer.combatantInfo?.gear || [];
        const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);

        return {
          slotNumber: index + 1,
          playerName: dpsPlayer.name || '',
          gearSets: deduplicateSetIds(
            [...fivePieceSets, ...monsterSets, ...otherSets]
              .filter(Boolean)
              .map((name) => findSetIdByName(name))
              .filter((id): id is KnownSetIDs => id !== undefined),
          ),
          skillLines: {
            line1: '',
            line2: '',
            line3: '',
            isFlex: false,
          },
        };
      });

      // Update roster with parsed data (tank1, tank2, healer1, healer2, and DPS slots)
      setRoster((prev) => ({
        ...prev,
        tank1: parsedTanks[0] || prev.tank1,
        tank2: parsedTanks[1] || prev.tank2,
        healer1: parsedHealers[0] || prev.healer1,
        healer2: parsedHealers[1] || prev.healer2,
        dpsSlots: parsedDPS.length > 0 ? parsedDPS : prev.dpsSlots,
        updatedAt: new Date().toISOString(),
      }));

      const tankCount = Math.min(parsedTanks.length, 2);
      const healerCount = Math.min(parsedHealers.length, 2);
      const dpsCount = Math.min(parsedDPS.length, 8);

      setSnackbar({
        open: true,
        message: `Successfully imported ${tankCount} tank(s), ${healerCount} healer(s), and ${dpsCount} DPS from ESO Logs!`,
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
  }, [
    importUrl,
    client,
    roster.tank1.ultimate,
    roster.tank2.ultimate,
    roster.healer1.ultimate,
    roster.healer2.ultimate,
  ]);

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
      const updated = { ...prev };

      // Fill tanks first (up to 2)
      if (lines.length > 0 && lines[0]) updated.tank1.playerName = lines[0].trim();
      if (lines.length > 1 && lines[1]) updated.tank2.playerName = lines[1].trim();

      // Fill healers next (up to 2)
      if (lines.length > 2 && lines[2]) updated.healer1.playerName = lines[2].trim();
      if (lines.length > 3 && lines[3]) updated.healer2.playerName = lines[3].trim();

      // Fill DPS slots (up to 8)
      for (let i = 4; i < Math.min(lines.length, 12); i++) {
        const dpsIndex = i - 4;
        if (updated.dpsSlots[dpsIndex] && lines[i]) {
          updated.dpsSlots[dpsIndex].playerName = lines[i].trim();
        }
      }

      updated.updatedAt = new Date().toISOString();
      return updated;
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Development Banner */}
      <WorkInProgressDisclaimer featureName="Roster Builder" sx={{ mb: 3 }} />

      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        {/* Row 1 — Title lockup + Mode pill toggle */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.5, sm: 0 },
            mb: 2.5,
          }}
        >
          {/* Icon lockup */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
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
            {(['simple', 'advanced'] as const).map((value) => (
              <Box
                key={value}
                onClick={() => setMode(value)}
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
                  transition: 'all 0.15s ease',
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
                {value === 'simple' ? 'Simple Mode' : 'Advanced Mode'}
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 0.75,
            mb: 2,
          }}
        >
          {/* Row 1: utility actions */}
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.75 }}>
            <Tooltip title="Quick Fill" arrow>
              <Button
                size="small"
                startIcon={<PersonAddIcon />}
                onClick={() => setQuickFillDialog(true)}
                sx={{
                  flex: { xs: 1, md: 'none' },
                  justifyContent: 'center',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(0,0,0,0.18)',
                  },
                }}
              >
                Quick Fill
              </Button>
            </Tooltip>
            <Tooltip title="Import roster from file or log" arrow>
              <Button
                size="small"
                startIcon={<UploadIcon />}
                endIcon={<ExpandMoreIcon sx={{ fontSize: '0.875rem !important', ml: -0.5 }} />}
                onClick={(e) => setImportMenuAnchor(e.currentTarget)}
                sx={{
                  flex: { xs: 1, md: 'none' },
                  justifyContent: 'center',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: importMenuAnchor
                    ? isDarkMode
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.04)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(0,0,0,0.18)',
                  },
                }}
              >
                Import
              </Button>
            </Tooltip>
            <Menu
              anchorEl={importMenuAnchor}
              open={Boolean(importMenuAnchor)}
              onClose={() => setImportMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: '10px',
                    mt: 0.5,
                    backgroundColor: isDarkMode ? 'rgba(30,30,40,0.95)' : 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(12px)',
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
            <Tooltip title="Export JSON" arrow>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportJSON}
                sx={{
                  flex: { xs: 1, md: 'none' },
                  justifyContent: 'center',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(0,0,0,0.18)',
                  },
                }}
              >
                Export
              </Button>
            </Tooltip>
            <Tooltip title="Copy for ESOtk addon — paste in-game with /esotk roster import" arrow>
              <Button
                size="small"
                startIcon={<AddonIcon />}
                onClick={handleExportAddon}
                sx={{
                  flex: { xs: 1, md: 'none' },
                  justifyContent: 'center',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(0,0,0,0.18)',
                  },
                }}
              >
                Addon
              </Button>
            </Tooltip>
          </Box>
          {/* end row 1 */}

          {/* Spacer — desktop only */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

          {/* Row 2: share actions */}
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.75 }}>
            {/* Discord compound button — preview + copy in a shared track */}
            <Box
              sx={{
                flex: { xs: 1, md: '0 0 auto' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                padding: '3px',
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: isDarkMode
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <Tooltip title="Preview Discord format" arrow>
                <Box
                  component="button"
                  onClick={() => setPreviewDialog(true)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                    background: 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                      background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    },
                  }}
                >
                  <VisibilityIcon sx={{ fontSize: '0.9rem' }} />
                  <Box component="span">Preview</Box>
                </Box>
              </Tooltip>
              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  mx: 0.25,
                  opacity: isDarkMode ? 0.12 : 0.15,
                  borderColor: isDarkMode ? '#fff' : '#000',
                }}
              />
              <Tooltip title="Copy for Discord" arrow>
                <Box
                  component="button"
                  onClick={handleCopyDiscordFormat}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: isDarkMode ? '#f1f5f9' : '#0f172a',
                    background: isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.85)',
                    boxShadow: isDarkMode
                      ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
                      : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      background: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.95)',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={discordIcon}
                    alt="Copy for Discord"
                    sx={{ width: 16, height: 16 }}
                  />
                  Copy
                </Box>
              </Tooltip>
            </Box>
            <Tooltip title="Copy read-only share link — opens /rv view" arrow>
              <Button
                size="small"
                startIcon={<LinkIcon />}
                onClick={handleCopyLink}
                sx={{
                  flex: { xs: 1, md: 'none' },
                  justifyContent: 'center',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: isDarkMode ? '#f1f5f9' : '#0f172a',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                  border: isDarkMode
                    ? '1px solid rgba(255,255,255,0.12)'
                    : '1px solid rgba(0,0,0,0.12)',
                  boxShadow: isDarkMode
                    ? '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 1px 2px rgba(0,0,0,0.06)',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)',
                    border: isDarkMode
                      ? '1px solid rgba(255,255,255,0.18)'
                      : '1px solid rgba(0,0,0,0.18)',
                  },
                }}
              >
                Share
              </Button>
            </Tooltip>
          </Box>
          {/* end row 2 */}
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

        {/* Simple Mode: Set Assignment Manager */}
        <Box sx={{ display: mode === 'simple' ? 'block' : 'none' }}>
          <SetAssignmentManager
            tank1={roster.tank1}
            tank2={roster.tank2}
            healer1={roster.healer1}
            healer2={roster.healer2}
            onAssignSet={handleSetAssignment}
            onUpdateUltimate={handleUltimateUpdate}
            onUpdateHealerCP={handleHealerCPUpdate}
          />
        </Box>

        {/* Advanced Mode: Full Roster Details */}
        <Box sx={{ display: mode === 'advanced' ? 'block' : 'none' }}>
          {/* Player Groups Management */}
          <Box>
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
                <GroupIcon
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
                  Groups
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
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
                    Player Groups
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: '6px',
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                      border: isDarkMode
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    {roster.availableGroups.length}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Stack spacing={2} mb={3}>
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
                    label="Available Groups (e.g., Slayer Stack 1, Group A)"
                    placeholder="Add group..."
                    helperText="Create groups to organize players. Common examples: Slayer Stack 1, Slayer Stack 2, Group A, Group B"
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
                            : 'rgba(0,0,0,0.05)',
                          border: isDarkMode
                            ? '1px solid rgba(255,255,255,0.1)'
                            : '1px solid rgba(0,0,0,0.1)',
                          fontWeight: 500,
                        }}
                      />
                    );
                  })
                }
              />
            </Stack>
          </Box>

          <Divider
            sx={{
              my: 1.5,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          />

          {/* Tanks Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${roleColors.tank}20 0%, ${roleColors.tank}08 100%)`,
                  border: `1px solid ${roleColors.tank}25`,
                }}
              >
                <ShieldIcon sx={{ fontSize: '1rem', color: roleColors.tank }} />
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
                  Role
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      background: `linear-gradient(135deg, ${roleColors.tank} 0%, ${roleColors.tank}99 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Tanks
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: '6px',
                      backgroundColor: `${roleColors.tank}12`,
                      color: roleColors.tank,
                      border: `1px solid ${roleColors.tank}25`,
                    }}
                  >
                    2
                  </Box>
                </Box>
              </Box>
            </Box>
            <Stack spacing={2} mb={3}>
              <TankCard
                key={1}
                tankNum={1}
                tank={roster.tank1}
                onChange={handleTank1Change}
                availableGroups={memoizedGroups}
              />
              <TankCard
                key={2}
                tankNum={2}
                tank={roster.tank2}
                onChange={handleTank2Change}
                availableGroups={memoizedGroups}
              />
            </Stack>
          </Box>

          <Divider
            sx={{
              my: 1.5,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          />

          {/* Healers Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${roleColors.healer}20 0%, ${roleColors.healer}08 100%)`,
                  border: `1px solid ${roleColors.healer}25`,
                }}
              >
                <FavoriteIcon sx={{ fontSize: '1rem', color: roleColors.healer }} />
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
                  Role
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      background: `linear-gradient(135deg, ${roleColors.healer} 0%, ${roleColors.healer}99 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Healers
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: '6px',
                      backgroundColor: `${roleColors.healer}12`,
                      color: roleColors.healer,
                      border: `1px solid ${roleColors.healer}25`,
                    }}
                  >
                    2
                  </Box>
                </Box>
              </Box>
            </Box>
            <Stack spacing={2} mb={3}>
              <HealerCard
                key={1}
                healerNum={1}
                healer={roster.healer1}
                onChange={handleHealer1Change}
                availableGroups={memoizedGroups}
                usedBuffs={usedBuffs}
              />
              <HealerCard
                key={2}
                healerNum={2}
                healer={roster.healer2}
                onChange={handleHealer2Change}
                availableGroups={memoizedGroups}
                usedBuffs={usedBuffs}
              />
            </Stack>
          </Box>

          <Divider
            sx={{
              my: 1.5,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          />

          {/* DPS Slots Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${roleColors.dps}20 0%, ${roleColors.dps}08 100%)`,
                  border: `1px solid ${roleColors.dps}25`,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: '1rem', color: roleColors.dps }} />
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      background: `linear-gradient(135deg, ${roleColors.dps} 0%, ${roleColors.dps}99 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    DPS Roster
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: '6px',
                      backgroundColor: `${roleColors.dps}12`,
                      color: roleColors.dps,
                      border: `1px solid ${roleColors.dps}25`,
                    }}
                  >
                    {roster.dpsSlots.length} Slots
                  </Box>
                </Box>
              </Box>
            </Box>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDPSDragEnd}
            >
              <SortableContext items={dpsSlotIds} strategy={verticalListSortingStrategy}>
                <Stack spacing={1.5} mb={3}>
                  {roster.dpsSlots.map((slot, index) => (
                    <DPSSlotCard
                      key={slot.slotNumber}
                      slot={slot}
                      slotIndex={index}
                      availableGroups={memoizedGroups}
                      onSlotChange={handleDPSSlotChange}
                      onConvertToJail={handleConvertDPSToJail}
                      onConvertToDPS={handleConvertJailToDPS}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
          </Box>

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
          <Box
            component="button"
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
              transition: 'all 0.15s ease',
              '&:hover': {
                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            }}
          >
            Cancel
          </Box>
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
          <Box
            component="button"
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
              transition: 'all 0.15s ease',
              '&:hover': {
                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            }}
          >
            Close
          </Box>
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
          <Box
            component="button"
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
              transition: 'all 0.15s ease',
              opacity: importLoading ? 0.5 : 1,
              pointerEvents: importLoading ? 'none' : 'auto',
              '&:hover': {
                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            }}
          >
            Cancel
          </Box>
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
    </Container>
  );
};

// Tank Card Component
interface TankCardProps {
  tankNum: 1 | 2;
  tank: TankSetup;
  onChange: (updates: Partial<TankSetup>) => void;
  availableGroups: string[];
}

const TankCard = React.memo<TankCardProps>(({ tankNum, tank, onChange, availableGroups }) => {
  const tankTheme = useTheme();
  const tankIsDark = tankTheme.palette.mode === 'dark';
  const tankRoleColors = tankIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
  const glassSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      backgroundColor: tankIsDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      '& fieldset': {
        borderColor: tankIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
      },
      '&:hover fieldset': {
        borderColor: tankIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
      },
    },
  };
  const availableUltimates = Object.values(SupportUltimate);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '12px',
        backgroundColor: tankIsDark ? `${tankRoleColors.tank}0a` : `${tankRoleColors.tank}06`,
        border: tankIsDark
          ? `1px solid ${tankRoleColors.tank}20`
          : `1px solid ${tankRoleColors.tank}18`,
        borderLeft: `3px solid ${tankRoleColors.tank}`,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: `${tankRoleColors.tank}35`,
          borderLeftColor: tankRoleColors.tank,
          boxShadow: `0 4px 16px ${tankRoleColors.tank}18, 0 2px 8px rgba(0,0,0,0.1)`,
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
            pb: 1,
            borderBottom: `1px solid ${tankRoleColors.tank}25`,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.875,
              py: 0.4,
              borderRadius: '6px',
              backgroundColor: `${tankRoleColors.tank}18`,
              border: `1px solid ${tankRoleColors.tank}35`,
            }}
          >
            <ShieldIcon sx={{ fontSize: '0.85rem', color: tankRoleColors.tank }} />
            <Typography
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: tankRoleColors.tank,
                lineHeight: 1,
              }}
            >
              Tank {tankNum}
            </Typography>
          </Box>
        </Box>
        <Stack spacing={1.5}>
          {/* Essential Fields - Always Visible */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
              <TextField
                fullWidth
                size="small"
                label="Player Name"
                value={tank.playerName || ''}
                onChange={(e) => onChange({ playerName: e.target.value })}
                placeholder="Enter player name"
                sx={glassSx}
              />
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: 150 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={[...availableGroups].sort()}
                value={tank.group?.groupName || ''}
                onChange={(_, value) =>
                  onChange({
                    group: value ? { groupName: value } : undefined,
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Group"
                    placeholder="e.g., Left Stack"
                    sx={glassSx}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Equipment */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: '10px',
              backgroundColor: tankIsDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              border: tankIsDark
                ? '1px solid rgba(255,255,255,0.04)'
                : '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: tankIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                mb: 1,
              }}
            >
              Equipment
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={TANK_5PIECE_OPTIONS}
                    value={tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : ''}
                    onChange={(_, value) =>
                      onChange({
                        gearSets: {
                          ...tank.gearSets,
                          set1: value ? findSetIdByName(value) : undefined,
                        },
                      })
                    }
                    groupBy={(option) => {
                      const setId = findSetIdByName(option);
                      if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                      if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                      return 'Other';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Primary Set (Body)"
                        placeholder="e.g., Alkosh, Yolnahkriin"
                        sx={glassSx}
                        InputProps={{
                          ...params.InputProps,
                        }}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={TANK_5PIECE_OPTIONS}
                    value={tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : ''}
                    onChange={(_, value) =>
                      onChange({
                        gearSets: {
                          ...tank.gearSets,
                          set2: value ? findSetIdByName(value) : undefined,
                        },
                      })
                    }
                    groupBy={(option) => {
                      const setId = findSetIdByName(option);
                      if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                      if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                      return 'Other';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Secondary Set (Jewelry)"
                        placeholder="e.g., Crimson Oath's Rive"
                        sx={glassSx}
                        InputProps={{
                          ...params.InputProps,
                        }}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={TANK_MONSTER_OPTIONS}
                    value={
                      tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : ''
                    }
                    onChange={(_, value) =>
                      onChange({
                        gearSets: {
                          ...tank.gearSets,
                          monsterSet: value ? findSetIdByName(value) : undefined,
                        },
                      })
                    }
                    groupBy={(_option) => {
                      return 'Monster Sets';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Monster/Mythic Set"
                        placeholder="e.g., Symphony of Blades"
                        sx={glassSx}
                        InputProps={{
                          ...params.InputProps,
                        }}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={availableUltimates}
                    value={tank.ultimate || null}
                    onChange={(_event, newValue) =>
                      onChange({ ultimate: newValue as string | null })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Ultimate"
                        placeholder="Select or type custom ultimate"
                        sx={glassSx}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getUltimateIcon(option)}
                          {option}
                        </Box>
                      </li>
                    )}
                  />
                </Box>
              </Box>
            </Stack>
          </Box>

          {/* Compatibility Warnings */}
          {(() => {
            const warnings = validateCompatibility(
              [
                tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
                tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
                tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : undefined,
                ...(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id)),
              ].filter((s): s is string => s !== undefined),
              tank.ultimate,
            );
            if (warnings.length === 0) return null;
            return (
              <Stack spacing={1}>
                {warnings.map((warning, index) => (
                  <Alert
                    key={index}
                    severity="warning"
                    sx={{
                      py: 0.5,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,167,38,0.08)',
                      border: '1px solid rgba(255,167,38,0.2)',
                    }}
                  >
                    {warning}
                  </Alert>
                ))}
              </Stack>
            );
          })()}

          {/* Advanced Options - Collapsible */}
          <Accordion
            elevation={0}
            disableGutters
            sx={{
              mt: 2,
              borderRadius: '10px !important',
              backgroundColor: 'transparent',
              border: tankIsDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0, marginTop: 2 },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ px: 1.5, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: tankIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  fontWeight: 500,
                }}
              >
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
              <Stack spacing={1.25}>
                {/* Identity */}
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: tankIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    mt: 0.5,
                  }}
                >
                  Assignment
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 40%', minWidth: 140 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role Label"
                      placeholder={tankNum === 1 ? 'MT' : 'OT'}
                      value={tank.roleLabel || ''}
                      onChange={(e) => onChange({ roleLabel: e.target.value })}
                      sx={glassSx}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 15%', minWidth: 80 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Player #"
                      value={tank.playerNumber || ''}
                      onChange={(e) =>
                        onChange({
                          playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      sx={glassSx}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 40%', minWidth: 200 }}>
                    <Autocomplete
                      multiple
                      freeSolo
                      size="small"
                      options={[]}
                      value={tank.labels || []}
                      onChange={(_, value) => onChange({ labels: value })}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option}
                            label={option}
                            size="small"
                            sx={{
                              borderRadius: '6px',
                              backgroundColor: tankIsDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.05)',
                              border: tankIsDark
                                ? '1px solid rgba(255,255,255,0.1)'
                                : '1px solid rgba(0,0,0,0.1)',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Tags"
                          placeholder="Add tags"
                          sx={glassSx}
                        />
                      )}
                    />
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  minRows={1}
                  maxRows={4}
                  label="Role Notes"
                  placeholder="e.g., TOMB Main Tank, handles double stacks, portal duty"
                  value={tank.roleNotes || ''}
                  onChange={(e) => onChange({ roleNotes: e.target.value })}
                  sx={glassSx}
                />

                {/* Extra Gear */}
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: tankIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    mt: 0.5,
                  }}
                >
                  Extra Gear
                </Typography>
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]
                    .map((id) => getSetDisplayName(id))
                    .sort()}
                  value={(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id))}
                  onChange={(_, value) =>
                    onChange({
                      gearSets: {
                        ...tank.gearSets,
                        additionalSets: value
                          .map((name) => findSetIdByName(name))
                          .filter((id): id is KnownSetIDs => id !== undefined),
                      },
                    })
                  }
                  groupBy={(option) => {
                    const setId = findSetIdByName(option);
                    if (setId && isTank5PieceSet(setId)) return 'Tank Sets';
                    if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                    if (setId && isMonsterSet(setId)) return 'Monster Sets';
                    return 'Other';
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Additional Sets"
                      helperText="e.g., monster sets, arena weapons (type custom set name if not listed)"
                      sx={glassSx}
                    />
                  )}
                  renderOption={(props, option) => <li {...props}>{option}</li>}
                />

                {/* Build */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mt: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: tankIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    }}
                  >
                    Build
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={tank.skillLines.isFlex}
                        onChange={(e) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              isFlex: e.target.checked,
                            },
                          })
                        }
                        sx={{ p: 0.5 }}
                      />
                    }
                    label="Any class"
                    sx={{
                      ml: 'auto',
                      mr: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.75rem',
                        color: tankIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                      },
                    }}
                  />
                </Box>
                {!tank.skillLines.isFlex && (
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line1}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              line1: value || '',
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} label="Skill Line 1" sx={glassSx} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line2}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              line2: value || '',
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} label="Skill Line 2" sx={glassSx} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={[...CLASS_SKILL_LINES].sort()}
                        value={tank.skillLines.line3}
                        onChange={(_, value) =>
                          onChange({
                            skillLines: {
                              ...tank.skillLines,
                              line3: value || '',
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} label="Skill Line 3" sx={glassSx} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSkillLineIcon(option)}
                              {option}
                            </Box>
                          </li>
                        )}
                      />
                    </Box>
                  </Box>
                )}
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={tank.specificSkills}
                  onChange={(_, value) => onChange({ specificSkills: value })}
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
                      label="Specific Skills Required"
                      placeholder="Add skill..."
                      sx={glassSx}
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
                          size="small"
                          sx={{
                            borderRadius: '6px',
                            backgroundColor: tankIsDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.05)',
                            border: tankIsDark
                              ? '1px solid rgba(255,255,255,0.1)'
                              : '1px solid rgba(0,0,0,0.1)',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      );
                    })
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  size="small"
                  rows={2}
                  label="Notes"
                  value={tank.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  sx={glassSx}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
});
TankCard.displayName = 'TankCard';

// Healer Card Component
interface HealerCardProps {
  healerNum: 1 | 2;
  healer: HealerSetup;
  onChange: (updates: Partial<HealerSetup>) => void;
  availableGroups: string[];
  usedBuffs: HealerBuff[];
}

const HealerCard = React.memo<HealerCardProps>(
  ({ healerNum, healer, onChange, availableGroups, usedBuffs }) => {
    const healerTheme = useTheme();
    const healerIsDark = healerTheme.palette.mode === 'dark';
    const healerRoleColors = healerIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
    const glassSx = {
      '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        backgroundColor: healerIsDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        '& fieldset': {
          borderColor: healerIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
        },
        '&:hover fieldset': {
          borderColor: healerIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
        },
      },
    };
    const availableBuffs = Object.values(HealerBuff).filter(
      (buff) => !usedBuffs.includes(buff) || healer.healerBuff === buff,
    );
    const availableUltimates = Object.values(SupportUltimate);

    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: '12px',
          backgroundColor: healerIsDark
            ? `${healerRoleColors.healer}0a`
            : `${healerRoleColors.healer}06`,
          border: healerIsDark
            ? `1px solid ${healerRoleColors.healer}20`
            : `1px solid ${healerRoleColors.healer}18`,
          borderLeft: `3px solid ${healerRoleColors.healer}`,
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            borderColor: `${healerRoleColors.healer}35`,
            borderLeftColor: healerRoleColors.healer,
            boxShadow: `0 4px 16px ${healerRoleColors.healer}18, 0 2px 8px rgba(0,0,0,0.1)`,
          },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              pb: 1,
              borderBottom: `1px solid ${healerRoleColors.healer}25`,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.875,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: `${healerRoleColors.healer}18`,
                border: `1px solid ${healerRoleColors.healer}35`,
              }}
            >
              <FavoriteIcon sx={{ fontSize: '0.85rem', color: healerRoleColors.healer }} />
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: healerRoleColors.healer,
                  lineHeight: 1,
                }}
              >
                Healer {healerNum}
              </Typography>
            </Box>
          </Box>
          <Stack spacing={1.5}>
            {/* Essential Fields - Always Visible */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Player Name (Optional)"
                  value={healer.playerName || ''}
                  onChange={(e) => onChange({ playerName: e.target.value })}
                  sx={glassSx}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={[...availableGroups].sort()}
                  value={healer.group?.groupName || ''}
                  onChange={(_, value) =>
                    onChange({
                      group: value ? { groupName: value } : undefined,
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="Group" sx={glassSx} />
                  )}
                />
              </Box>
            </Box>

            {/* Equipment */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: '10px',
                backgroundColor: healerIsDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                border: healerIsDark
                  ? '1px solid rgba(255,255,255,0.04)'
                  : '1px solid rgba(0,0,0,0.04)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: healerIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  mb: 1,
                }}
              >
                Equipment
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={HEALER_5PIECE_OPTIONS}
                      value={healer.set1 ? getSetDisplayName(healer.set1) : ''}
                      onChange={(_, value) =>
                        onChange({ set1: value ? findSetIdByName(value) : undefined })
                      }
                      groupBy={(option) => {
                        const setId = findSetIdByName(option);
                        if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                        if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                        return 'Other';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Primary Set (Body)"
                          placeholder="e.g., Stone-Talker's Oath"
                          sx={glassSx}
                          InputProps={{
                            ...params.InputProps,
                          }}
                        />
                      )}
                      renderOption={(props, option) => <li {...props}>{option}</li>}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={HEALER_5PIECE_OPTIONS}
                      value={healer.set2 ? getSetDisplayName(healer.set2) : ''}
                      onChange={(_, value) =>
                        onChange({ set2: value ? findSetIdByName(value) : undefined })
                      }
                      groupBy={(option) => {
                        const setId = findSetIdByName(option);
                        if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                        if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                        return 'Other';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Secondary Set (Jewelry)"
                          placeholder="e.g., Worm's Raiment"
                          sx={glassSx}
                          InputProps={{
                            ...params.InputProps,
                          }}
                        />
                      )}
                      renderOption={(props, option) => <li {...props}>{option}</li>}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={HEALER_MONSTER_OPTIONS}
                      value={healer.monsterSet ? getSetDisplayName(healer.monsterSet) : ''}
                      onChange={(_, value) =>
                        onChange({
                          monsterSet: value ? findSetIdByName(value) : undefined,
                        })
                      }
                      groupBy={(_option) => {
                        return 'Monster Sets';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Monster/Mythic Set"
                          placeholder="e.g., Symphony of Blades"
                          sx={glassSx}
                          InputProps={{
                            ...params.InputProps,
                          }}
                        />
                      )}
                      renderOption={(props, option) => <li {...props}>{option}</li>}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <FormControl
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: healerIsDark
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.02)',
                          '& fieldset': {
                            borderColor: healerIsDark
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.12)',
                          },
                          '&:hover fieldset': {
                            borderColor: healerIsDark
                              ? 'rgba(255,255,255,0.15)'
                              : 'rgba(0,0,0,0.2)',
                          },
                        },
                      }}
                    >
                      <InputLabel>Champion Points</InputLabel>
                      <Select
                        value={healer.healerBuff || ''}
                        onChange={(e) =>
                          onChange({
                            healerBuff: (e.target.value as HealerBuff) || null,
                          })
                        }
                        label="Champion Points"
                        renderValue={(value) => (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getHealerBuffIcon(value)}
                            {value || <em>None</em>}
                          </Box>
                        )}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {availableBuffs.map((buff) => (
                          <MenuItem key={buff} value={buff}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getHealerBuffIcon(buff)}
                              {buff}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={availableUltimates}
                      value={healer.ultimate || null}
                      onChange={(_event, newValue) =>
                        onChange({ ultimate: newValue as string | null })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Ultimate"
                          placeholder="Select or type custom ultimate"
                          sx={glassSx}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getUltimateIcon(option)}
                            {option}
                          </Box>
                        </li>
                      )}
                    />
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Compatibility Warnings */}
            {(() => {
              const warnings = validateCompatibility(
                [
                  healer.set1 ? getSetDisplayName(healer.set1) : undefined,
                  healer.set2 ? getSetDisplayName(healer.set2) : undefined,
                  healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
                  ...(healer.additionalSets || []).map((id) => getSetDisplayName(id)),
                ].filter((s): s is string => s !== undefined),
                healer.ultimate,
              );
              if (warnings.length === 0) return null;
              return (
                <Stack spacing={1}>
                  {warnings.map((warning, index) => (
                    <Alert
                      key={index}
                      severity="warning"
                      sx={{
                        py: 0.5,
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,167,38,0.08)',
                        border: '1px solid rgba(255,167,38,0.2)',
                      }}
                    >
                      {warning}
                    </Alert>
                  ))}
                </Stack>
              );
            })()}

            {/* Advanced Options - Collapsible */}
            <Accordion
              elevation={0}
              disableGutters
              sx={{
                mt: 2,
                borderRadius: '10px !important',
                backgroundColor: 'transparent',
                border: healerIsDark
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0, marginTop: 2 },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ px: 1.5, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: healerIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                    fontWeight: 500,
                  }}
                >
                  Advanced Options
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
                <Stack spacing={1.25}>
                  {/* Assignment */}
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: healerIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      mt: 0.5,
                    }}
                  >
                    Assignment
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 40%', minWidth: 140 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Role Label"
                        placeholder={`H${healerNum}`}
                        value={healer.roleLabel || ''}
                        onChange={(e) => onChange({ roleLabel: e.target.value })}
                        sx={glassSx}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 15%', minWidth: 80 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Player #"
                        value={healer.playerNumber || ''}
                        onChange={(e) =>
                          onChange({
                            playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        sx={glassSx}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 40%', minWidth: 200 }}>
                      <Autocomplete
                        multiple
                        freeSolo
                        size="small"
                        options={[]}
                        value={healer.labels || []}
                        onChange={(_, value) => onChange({ labels: value })}
                        sx={{ mt: -0.5 }}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              key={option}
                              label={option}
                              size="small"
                              sx={{
                                borderRadius: '6px',
                                backgroundColor: healerIsDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.05)',
                                border: healerIsDark
                                  ? '1px solid rgba(255,255,255,0.1)'
                                  : '1px solid rgba(0,0,0,0.1)',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                              }}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Tags"
                            placeholder="Add tags"
                            sx={glassSx}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={1}
                    maxRows={4}
                    label="Role Notes"
                    placeholder="e.g., Main healer, ramp healing, shield uptime focus"
                    value={healer.roleNotes || ''}
                    onChange={(e) => onChange({ roleNotes: e.target.value })}
                    sx={glassSx}
                  />

                  {/* Extra Gear */}
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: healerIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      mt: 0.5,
                    }}
                  >
                    Extra Gear
                  </Typography>
                  <Autocomplete
                    multiple
                    freeSolo
                    size="small"
                    options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]
                      .map((id) => getSetDisplayName(id))
                      .sort()}
                    value={(healer.additionalSets || []).map((id) => getSetDisplayName(id))}
                    onChange={(_, value) =>
                      onChange({
                        additionalSets: value
                          .map((name) => findSetIdByName(name))
                          .filter((id): id is KnownSetIDs => id !== undefined),
                      })
                    }
                    groupBy={(option) => {
                      const setId = findSetIdByName(option);
                      if (setId && isHealer5PieceSet(setId)) return 'Healer Sets';
                      if (setId && isFlexible5PieceSet(setId)) return 'Hybrid Sets';
                      if (setId && isMonsterSet(setId)) return 'Monster Sets';
                      return 'Other';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Additional Sets"
                        helperText="e.g., monster sets, mythics (type custom set name if not listed)"
                        sx={glassSx}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />

                  {/* Build */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: healerIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      }}
                    >
                      Build
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={healer.skillLines.isFlex}
                          onChange={(e) =>
                            onChange({
                              skillLines: {
                                ...healer.skillLines,
                                isFlex: e.target.checked,
                              },
                            })
                          }
                          sx={{ p: 0.5 }}
                        />
                      }
                      label="Any class"
                      sx={{
                        ml: 'auto',
                        mr: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.75rem',
                          color: healerIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                        },
                      }}
                    />
                  </Box>
                  {!healer.skillLines.isFlex && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={[...CLASS_SKILL_LINES].sort()}
                          value={healer.skillLines.line1}
                          onChange={(_, value) =>
                            onChange({
                              skillLines: {
                                ...healer.skillLines,
                                line1: value || '',
                              },
                            })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Skill Line 1" sx={glassSx} />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSkillLineIcon(option)}
                                {option}
                              </Box>
                            </li>
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={[...CLASS_SKILL_LINES].sort()}
                          value={healer.skillLines.line2}
                          onChange={(_, value) =>
                            onChange({
                              skillLines: {
                                ...healer.skillLines,
                                line2: value || '',
                              },
                            })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Skill Line 2" sx={glassSx} />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSkillLineIcon(option)}
                                {option}
                              </Box>
                            </li>
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={[...CLASS_SKILL_LINES].sort()}
                          value={healer.skillLines.line3}
                          onChange={(_, value) =>
                            onChange({
                              skillLines: {
                                ...healer.skillLines,
                                line3: value || '',
                              },
                            })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Skill Line 3" sx={glassSx} />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSkillLineIcon(option)}
                                {option}
                              </Box>
                            </li>
                          )}
                        />
                      </Box>
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    multiline
                    size="small"
                    rows={2}
                    label="Notes"
                    value={healer.notes || ''}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    sx={glassSx}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </CardContent>
      </Card>
    );
  },
);
HealerCard.displayName = 'HealerCard';

// DPS Slot Card Component
interface DPSSlotCardProps {
  slot: DPSSlot;
  slotIndex: number;
  availableGroups: string[];
  onSlotChange: (slotIndex: number, updates: Partial<DPSSlot>) => void;
  onConvertToJail: (slotNumber: number, jailType: JailDDType) => void;
  onConvertToDPS: (slotNumber: number) => void;
}

const jailLabels: Record<string, string> = {
  banner: 'Banner',
  zenkosh: 'Zenkosh',
  wm: 'WM',
  'wm-mk': 'WM/MK',
  mk: 'MK',
  custom: 'Custom',
};

const DPSSlotCard = React.memo<DPSSlotCardProps>(
  ({ slot, slotIndex, availableGroups, onSlotChange, onConvertToJail, onConvertToDPS }) => {
    const onChange = useCallback(
      (updates: Partial<DPSSlot>) => onSlotChange(slotIndex, updates),
      [onSlotChange, slotIndex],
    );
    const dpsTheme = useTheme();
    const dpsIsDark = dpsTheme.palette.mode === 'dark';
    const dpsRoleColors = dpsIsDark ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
    const glassSx = {
      '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        '& fieldset': {
          borderColor: dpsIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
        },
        '&:hover fieldset': {
          borderColor: dpsIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
        },
      },
    };
    const availableUltimates = Object.values(SupportUltimate);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: slot.slotNumber,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const getJailDDTitle = (type: JailDDType): string => {
      switch (type) {
        case 'banner':
          return 'Banner Jail DD';
        case 'zenkosh':
          return 'Zenkosh Jail DD';
        case 'wm':
          return 'War Machine Jail DD';
        case 'wm-mk':
          return 'WM/MK Jail DD';
        case 'mk':
          return 'Martial Knowledge Jail DD';
        case 'custom':
          return slot.customDescription || 'Custom Jail DD';
        default:
          return 'Jail DD';
      }
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        variant="outlined"
        sx={{
          borderRadius: '12px',
          backgroundColor: dpsIsDark ? `${dpsRoleColors.dps}0a` : `${dpsRoleColors.dps}06`,
          border: dpsIsDark
            ? `1px solid ${dpsRoleColors.dps}20`
            : `1px solid ${dpsRoleColors.dps}18`,
          borderLeft: `3px solid ${dpsRoleColors.dps}`,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
          '&:hover': {
            transform: isDragging ? 'none' : 'translateY(-1px)',
            borderColor: `${dpsRoleColors.dps}35`,
            borderLeftColor: dpsRoleColors.dps,
            boxShadow: isDragging
              ? 'none'
              : `0 4px 16px ${dpsRoleColors.dps}18, 0 2px 8px rgba(0,0,0,0.1)`,
          },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              pb: 1,
              borderBottom: `1px solid ${dpsRoleColors.dps}25`,
            }}
          >
            <IconButton
              size="small"
              {...attributes}
              {...listeners}
              sx={{
                cursor: 'grab',
                borderRadius: '6px',
                backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                color: dpsIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
              }}
              aria-label={`Drag to reorder DPS ${slot.slotNumber}`}
            >
              <DragIndicatorIcon />
            </IconButton>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.875,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: `${dpsRoleColors.dps}18`,
                border: `1px solid ${dpsRoleColors.dps}35`,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: '0.85rem', color: dpsRoleColors.dps }} />
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: dpsRoleColors.dps,
                  lineHeight: 1,
                }}
              >
                DPS {slot.slotNumber}
              </Typography>
            </Box>
            {slot.jailDDType && (
              <Chip
                label={getJailDDTitle(slot.jailDDType)}
                size="small"
                sx={{
                  borderRadius: '6px',
                  backgroundColor: `${dpsRoleColors.dps}18`,
                  border: `1px solid ${dpsRoleColors.dps}35`,
                  color: dpsRoleColors.dps,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Box>
          <Stack spacing={1.5}>
            {/* Essential Fields - Always Visible */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Player Name (Optional)"
                  value={slot.playerName || ''}
                  onChange={(e) => onChange({ playerName: e.target.value })}
                  sx={glassSx}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={[...availableGroups].sort()}
                  value={slot.group?.groupName || ''}
                  onChange={(_, value) =>
                    onChange({
                      group: value ? { groupName: value } : undefined,
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="Group" sx={glassSx} />
                  )}
                />
              </Box>
            </Box>

            {/* Equipment */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: '10px',
                backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                border: dpsIsDark
                  ? '1px solid rgba(255,255,255,0.04)'
                  : '1px solid rgba(0,0,0,0.04)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: dpsIsDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  mb: 1,
                }}
              >
                Equipment
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={DPS_5PIECE_OPTIONS}
                      value={slot.set1 ? getSetDisplayName(slot.set1) : ''}
                      onChange={(_, value) =>
                        onChange({ set1: value ? findSetIdByName(value) : undefined })
                      }
                      groupBy={(option) => {
                        const setId = findSetIdByName(option);
                        if (setId && isDDSpecialSet(setId)) return 'DD Special Sets';
                        return 'Other Sets';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Primary Set (Body)"
                          placeholder="e.g., Roar of Alkosh"
                          sx={glassSx}
                          InputProps={{
                            ...params.InputProps,
                          }}
                        />
                      )}
                      renderOption={(props, option) => <li {...props}>{option}</li>}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={DPS_5PIECE_OPTIONS}
                      value={slot.set2 ? getSetDisplayName(slot.set2) : ''}
                      onChange={(_, value) =>
                        onChange({ set2: value ? findSetIdByName(value) : undefined })
                      }
                      groupBy={(option) => {
                        const setId = findSetIdByName(option);
                        if (setId && isDDSpecialSet(setId)) return 'DD Special Sets';
                        return 'Other Sets';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Secondary Set (Jewelry)"
                          placeholder="e.g., Way of Martial Knowledge"
                          sx={glassSx}
                          InputProps={{
                            ...params.InputProps,
                          }}
                        />
                      )}
                      renderOption={(props, option) => <li {...props}>{option}</li>}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={DPS_MONSTER_OPTIONS}
                      value={slot.monsterSet ? getSetDisplayName(slot.monsterSet) : ''}
                      onChange={(_, value) =>
                        onChange({
                          monsterSet: value ? findSetIdByName(value) : undefined,
                        })
                      }
                      groupBy={() => 'Monster Sets'}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Monster/Mythic Set"
                          placeholder="e.g., Zaan"
                          sx={glassSx}
                          InputProps={{
                            ...params.InputProps,
                          }}
                        />
                      )}
                      renderOption={(props, option) => <li {...props}>{option}</li>}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={[]}
                      value={slot.championPoint || null}
                      onChange={(_event, newValue) =>
                        onChange({ championPoint: newValue as string | null })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Champion Points"
                          placeholder="e.g., Fighting Finesse"
                          sx={glassSx}
                        />
                      )}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={availableUltimates}
                      value={slot.ultimate || null}
                      onChange={(_event, newValue) =>
                        onChange({ ultimate: newValue as string | null })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Ultimate"
                          placeholder="Select or type custom ultimate"
                          sx={glassSx}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getUltimateIcon(option)}
                            {option}
                          </Box>
                        </li>
                      )}
                    />
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Jail DD Type Selector */}
            {!slot.jailDDType ? (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    mb: 0.75,
                    display: 'block',
                    color: dpsIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  }}
                >
                  Convert to Jail DD:
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    flexWrap: 'wrap',
                    gap: '1px',
                    borderRadius: '10px',
                    padding: '3px',
                    backgroundColor: dpsIsDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: dpsIsDark
                      ? '1px solid rgba(255,255,255,0.06)'
                      : '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  {(['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'] as const).map((type) => (
                    <Box
                      key={type}
                      component="button"
                      onClick={() => onConvertToJail(slot.slotNumber, type)}
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: '7px',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        color: dpsIsDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                        background: 'transparent',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          color: dpsRoleColors.dps,
                          background: dpsIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        },
                      }}
                    >
                      {jailLabels[type]}
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box>
                <Box
                  component="button"
                  onClick={() => onConvertToDPS(slot.slotNumber)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.625,
                    borderRadius: '8px',
                    border: dpsIsDark
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: dpsIsDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                    background: 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      color: dpsIsDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                      background: dpsIsDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    },
                  }}
                >
                  Convert Back to Regular DPS
                </Box>
              </Box>
            )}

            {/* Advanced Options - Collapsible */}
            <Accordion
              elevation={0}
              disableGutters
              sx={{
                mt: 2,
                borderRadius: '10px !important',
                backgroundColor: 'transparent',
                border: dpsIsDark
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0, marginTop: 2 },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ px: 1.5, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: dpsIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                    fontWeight: 500,
                  }}
                >
                  Advanced Options
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
                <Stack spacing={1.25}>
                  {/* Assignment */}
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: dpsIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      mt: 0.5,
                    }}
                  >
                    Assignment
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 40%', minWidth: 140 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Role Label"
                        placeholder={`DD${slot.slotNumber}`}
                        value={slot.roleLabel || ''}
                        onChange={(e) => onChange({ roleLabel: e.target.value })}
                        sx={glassSx}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 15%', minWidth: 80 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Player #"
                        value={slot.playerNumber || ''}
                        onChange={(e) =>
                          onChange({
                            playerNumber: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        sx={glassSx}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 40%', minWidth: 200 }}>
                      <Autocomplete
                        multiple
                        freeSolo
                        size="small"
                        options={[]}
                        value={slot.labels || []}
                        onChange={(_, value) => onChange({ labels: value })}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              key={option}
                              label={option}
                              size="small"
                              sx={{
                                borderRadius: '6px',
                                backgroundColor: dpsIsDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.05)',
                                border: dpsIsDark
                                  ? '1px solid rgba(255,255,255,0.1)'
                                  : '1px solid rgba(0,0,0,0.1)',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                              }}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Tags"
                            placeholder="Add tags"
                            sx={glassSx}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={1}
                    maxRows={4}
                    label="Role Notes"
                    placeholder="e.g., Portal L, Z'en, Ele sus"
                    value={slot.roleNotes || ''}
                    onChange={(e) => onChange({ roleNotes: e.target.value })}
                    sx={glassSx}
                  />

                  {/* Extra Gear */}
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: dpsIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      mt: 0.5,
                    }}
                  >
                    Extra Gear
                  </Typography>
                  <Autocomplete
                    multiple
                    freeSolo
                    size="small"
                    options={[...ALL_5PIECE_SETS, ...MONSTER_SETS]
                      .map((id) => getSetDisplayName(id))
                      .sort()}
                    value={(slot.additionalSets || []).map((id) => getSetDisplayName(id))}
                    onChange={(_, value) =>
                      onChange({
                        additionalSets: value
                          .map((name) => findSetIdByName(name))
                          .filter((id): id is KnownSetIDs => id !== undefined),
                      })
                    }
                    groupBy={(option) => {
                      const setId = findSetIdByName(option);
                      if (setId && isDDSpecialSet(setId)) return 'DD Special Sets';
                      if (setId && isMonsterSet(setId)) return 'Monster Sets';
                      return 'Other';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Additional Sets"
                        helperText="e.g., arena weapons, mythics (type custom set name if not listed)"
                        sx={glassSx}
                      />
                    )}
                    renderOption={(props, option) => <li {...props}>{option}</li>}
                  />

                  {/* Build */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: dpsIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      }}
                    >
                      Build
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={slot.skillLines?.isFlex ?? true}
                          onChange={(e) =>
                            onChange({
                              skillLines: {
                                ...(slot.skillLines || {
                                  line1: '',
                                  line2: '',
                                  line3: '',
                                  isFlex: true,
                                }),
                                isFlex: e.target.checked,
                              },
                            })
                          }
                          sx={{ p: 0.5 }}
                        />
                      }
                      label="Any class"
                      sx={{
                        ml: 'auto',
                        mr: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.75rem',
                          color: dpsIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                        },
                      }}
                    />
                  </Box>
                  {slot.skillLines && !slot.skillLines.isFlex && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={[...CLASS_SKILL_LINES].sort()}
                          value={slot.skillLines.line1}
                          onChange={(_, value) =>
                            onChange({
                              skillLines: {
                                ...slot.skillLines!,
                                line1: value || '',
                              },
                            })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Skill Line 1" sx={glassSx} />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSkillLineIcon(option)}
                                {option}
                              </Box>
                            </li>
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={[...CLASS_SKILL_LINES].sort()}
                          value={slot.skillLines.line2}
                          onChange={(_, value) =>
                            onChange({
                              skillLines: {
                                ...slot.skillLines!,
                                line2: value || '',
                              },
                            })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Skill Line 2" sx={glassSx} />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSkillLineIcon(option)}
                                {option}
                              </Box>
                            </li>
                          )}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={[...CLASS_SKILL_LINES].sort()}
                          value={slot.skillLines.line3}
                          onChange={(_, value) =>
                            onChange({
                              skillLines: {
                                ...slot.skillLines!,
                                line3: value || '',
                              },
                            })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Skill Line 3" sx={glassSx} />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSkillLineIcon(option)}
                                {option}
                              </Box>
                            </li>
                          )}
                        />
                      </Box>
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    multiline
                    size="small"
                    rows={2}
                    label="Notes"
                    value={slot.notes || ''}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    sx={glassSx}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </CardContent>
      </Card>
    );
  },
);
DPSSlotCard.displayName = 'DPSSlotCard';

// DD Requirement Card Component
// Generate Discord formatted text
const generateDiscordFormat = (roster: RaidRoster): string => {
  const lines: string[] = [];

  lines.push(`**${roster.rosterName}**`);
  lines.push('');

  // Helper to format ultimate in brackets
  const formatUlt = (ult: string | null): string => {
    if (!ult) return '';
    // Return custom ultimates as-is, or use preset names
    return ` [${ult}]`;
  };

  // Helper to format healer buff
  const formatBuff = (buff: HealerBuff | null): string => {
    if (!buff) return '';
    // Enum values already contain the display names
    return buff;
  };

  // Helper to format skill lines compactly (returns empty string if nothing)
  const formatSkillLines = (skillLines: SkillLineConfig): string => {
    if (skillLines.isFlex) return 'Flexible';
    const lines = [skillLines.line1, skillLines.line2, skillLines.line3].filter(Boolean);
    return lines.join('/');
  };

  // Helper to format gear sets (returns empty string if no sets)
  const formatGearSets = (
    tank?: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
      additionalSets?: KnownSetIDs[];
    },
    healer?: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
      additionalSets?: KnownSetIDs[];
    },
  ): string => {
    const fivePieceSets: string[] = [];
    const monsterSets: string[] = [];

    const categorizeSet = (setId: KnownSetIDs): void => {
      const displayName = getSetDisplayName(setId);
      if (!displayName) return;

      // Check if it's a monster set
      if (MONSTER_SETS.includes(setId)) {
        monsterSets.push(displayName);
      } else {
        fivePieceSets.push(displayName);
      }
    };

    if (tank) {
      if (tank.set1) categorizeSet(tank.set1);
      if (tank.set2) categorizeSet(tank.set2);
      if (tank.monsterSet) categorizeSet(tank.monsterSet);
      if (tank.additionalSets) {
        tank.additionalSets.forEach(categorizeSet);
      }
    }
    if (healer) {
      if (healer.set1) categorizeSet(healer.set1);
      if (healer.set2) categorizeSet(healer.set2);
      if (healer.monsterSet) categorizeSet(healer.monsterSet);
      if (healer.additionalSets) {
        healer.additionalSets.forEach(categorizeSet);
      }
    }

    // Remove duplicates and sort
    const uniqueFivePiece = Array.from(new Set(fivePieceSets)).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    );
    const uniqueMonster = Array.from(new Set(monsterSets));

    // Combine: five-piece sets alphabetically, then monster sets
    return [...uniqueFivePiece, ...uniqueMonster].join('/');
  };

  // Tanks - always MT/OT
  [1, 2].forEach((num) => {
    const tank = roster[`tank${num}` as 'tank1' | 'tank2'];
    const label = num === 1 ? 'MT' : 'OT';
    const roleNote = tank.roleNotes ? ` [${tank.roleNotes}]` : '';
    const playerName = tank.playerName ? ` ${tank.playerName}` : '';
    const labels = tank.labels && tank.labels.length > 0 ? ` (${tank.labels.join(', ')})` : '';

    lines.push(`${label}${roleNote}:${playerName}${labels}`);
    const gearSets = formatGearSets(tank.gearSets);
    if (gearSets) lines.push(gearSets);
    const skillLines = formatSkillLines(tank.skillLines);
    const ult = formatUlt(tank.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (tank.notes) lines.push(`Notes: ${tank.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Healers
  [roster.healer1, roster.healer2].forEach((h, index) => {
    const label = h.roleLabel || (index === 0 ? 'H1' : 'H2');
    const roleNote = h.roleNotes ? ` [${h.roleNotes}]` : '';
    const playerName = h.playerName ? ` ${h.playerName}` : '';
    const groupName = h.group?.groupName ? ` (${h.group.groupName})` : '';
    const labels = h.labels && h.labels.length > 0 ? ` [${h.labels.join(', ')}]` : '';

    lines.push(`${label}${roleNote}:${playerName}${groupName}${labels}`);
    const gearSets = formatGearSets(undefined, h);
    if (gearSets) lines.push(gearSets);
    const buff = formatBuff(h.healerBuff);
    if (buff) lines.push(buff);
    const skillLines = formatSkillLines(h.skillLines);
    const ult = formatUlt(h.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (h.notes) lines.push(`Notes: ${h.notes}`);
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

  // DPS - all slots are now in dpsSlots array, some may have jailDDType
  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  // Check if any DDs have groups assigned
  const hasGroups = sortedDPS.some((dd) => dd.group?.groupName);

  if (hasGroups) {
    // Group DDs by their group
    const groupedDDs = new Map<string, DPSSlot[]>();

    sortedDPS.forEach((dd) => {
      const group = dd.group?.groupName || 'Unassigned';
      if (!groupedDDs.has(group)) {
        groupedDDs.set(group, []);
      }
      groupedDDs.get(group)!.push(dd);
    });

    // Helper to format DPS gear/build line
    const formatDPSDetails = (dd: DPSSlot): void => {
      const gearParts: string[] = [];
      if (dd.set1) gearParts.push(getSetDisplayName(dd.set1));
      if (dd.set2) gearParts.push(getSetDisplayName(dd.set2));
      if (dd.monsterSet) gearParts.push(getSetDisplayName(dd.monsterSet));
      if (dd.additionalSets) {
        dd.additionalSets.forEach((id) => gearParts.push(getSetDisplayName(id)));
      }
      if (gearParts.length) lines.push(gearParts.join('/'));
      if (dd.skillLines) {
        const sl = formatSkillLines(dd.skillLines);
        const ult = dd.ultimate ? formatUlt(dd.ultimate) : '';
        if (sl || ult) lines.push(`${sl}${ult}`);
      } else if (dd.ultimate) {
        lines.push(formatUlt(dd.ultimate).trim());
      }
    };

    // Print each group
    groupedDDs.forEach((dds, groupName) => {
      lines.push(groupName);
      dds.forEach((dd) => {
        const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
        const playerName = dd.playerName ? ` ${dd.playerName}` : '';
        const typeLabel = dd.jailDDType
          ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
          : '';
        const labels = dd.labels && dd.labels.length > 0 ? ` (${dd.labels.join(', ')})` : '';
        lines.push(`${dd.slotNumber}${typeLabel}${roleNote}:${playerName}${labels}`);
        formatDPSDetails(dd);
      });
      lines.push('');
    });
  } else {
    // Helper to format DPS gear/build line
    const formatDPSDetails = (dd: DPSSlot): void => {
      const gearParts: string[] = [];
      if (dd.set1) gearParts.push(getSetDisplayName(dd.set1));
      if (dd.set2) gearParts.push(getSetDisplayName(dd.set2));
      if (dd.monsterSet) gearParts.push(getSetDisplayName(dd.monsterSet));
      if (dd.additionalSets) {
        dd.additionalSets.forEach((id) => gearParts.push(getSetDisplayName(id)));
      }
      if (gearParts.length) lines.push(gearParts.join('/'));
      if (dd.skillLines) {
        const sl = formatSkillLines(dd.skillLines);
        const ult = dd.ultimate ? formatUlt(dd.ultimate) : '';
        if (sl || ult) lines.push(`${sl}${ult}`);
      } else if (dd.ultimate) {
        lines.push(formatUlt(dd.ultimate).trim());
      }
    };

    // No groups - print DDs sequentially
    sortedDPS.forEach((dd) => {
      const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
      const playerName = dd.playerName ? ` ${dd.playerName}` : '';
      const typeLabel = dd.jailDDType
        ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
        : '';
      const labels = dd.labels && dd.labels.length > 0 ? ` (${dd.labels.join(', ')})` : '';
      lines.push(`${dd.slotNumber}${typeLabel}${roleNote}:${playerName}${labels}`);
      formatDPSDetails(dd);
    });
    lines.push('');
  }

  // General Notes
  if (roster.notes) {
    lines.push('**General Notes:**');
    lines.push(roster.notes);
    lines.push('');
  }

  return lines.join('\n');
};
