/**
 * Build Editor Redux Slice
 * Flat state — one active build with up to 5 setups.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

import { getClassMasteryLine } from '@/data/skill-lines/class/classMastery';

import type {
  ArmorWeight,
  GearConfig,
  SkillsConfig,
} from '../../loadout-manager/types/loadout.types';
import { isTwoHandedWeapon } from '../../loadout-manager/utils/itemIconResolver';
import { EQUIP_SLOTS, getDefaultLinesForClass } from '../data/esoStaticData';
import { DEFAULT_STAT_OVERRIDES } from '../engine/stat-constants';
import type { StatOverrides } from '../engine/stat-types';
import type {
  Build,
  BuildAttributes,
  BuildChampionPoints,
  BuildConsumables,
  BuildEditorState,
  BuildSetup,
  ClassSkillLineId,
  QuickslotEntry,
  SidebarTopTab,
  SetupTab,
  SkilledAbility,
} from '../types/build.types';
import { CLASS_MASTERY_MAX_PICKS } from '../utils/classMasteryEligibility';
import {
  clearedSetupSection,
  cloneSetup,
  copySetupSection as copySetupSectionHelper,
  type SetupSection,
} from '../utils/setupTransfer';

/** Apparel slot indices — only these carry an armor weight. */
const APPAREL_SLOT_SET = new Set<number>(
  EQUIP_SLOTS.filter((s) => s.category === 'apparel').map((s) => s.slot),
);

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum screenshots per setup — guards against localStorage bloat from base64 data-URLs */
export const MAX_SCREENSHOTS = 8;

// ─── Factories ───────────────────────────────────────────────────────────────

const makeChampionPoints = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

const makeSetup = (name = 'Default'): BuildSetup => ({
  id: uuidv4(),
  name,
  attributes: { magicka: 0, health: 0, stamina: 0 },
  curse: 'none',
  mundusStone: '',
  gear: {},
  skills: {
    0: {},
    1: {},
  },
  cp: makeChampionPoints(),
  consumables: { potions: [], food: {} },
  passives: [],
  screenshots: [],
  statOverrides: { ...DEFAULT_STAT_OVERRIDES, buffs: { ...DEFAULT_STAT_OVERRIDES.buffs } },
});

const makeBuild = (): Build => ({
  id: uuidv4(),
  name: '',
  shortDescription: '',
  esoClass: 'dragonknight',
  classSkillLines: getDefaultLinesForClass('dragonknight'),
  classMasteryPassives: [],
  role: 'tank',
  gameMode: 'pve',
  races: [],
  setups: [makeSetup()],
  guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
  settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [0] },
  addonImportString: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ─── Persistence helpers ──────────────────────────────────────────────────────

export const BUILD_EDITOR_STORAGE_KEY = 'eso-build-editor-v1';

/** Attempt to restore a previously saved build from localStorage. */
function loadFromStorage(): Pick<BuildEditorState, 'build' | 'activeSetupIndex'> | null {
  try {
    const raw = localStorage.getItem(BUILD_EDITOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { build?: Build; activeSetupIndex?: number };
    // Minimal schema guard — ensure we have at least one setup
    if (!parsed.build?.setups?.length) return null;
    // Migration: builds saved before subclassing was added won't have classSkillLines
    if (!parsed.build.classSkillLines) {
      parsed.build.classSkillLines = getDefaultLinesForClass(
        parsed.build.esoClass ?? 'dragonknight',
      );
    }
    // Migration: builds saved before U50 won't have classMasteryPassives
    if (!Array.isArray(parsed.build.classMasteryPassives)) {
      parsed.build.classMasteryPassives = [];
    }
    // Migration: builds saved before stats feature won't have statOverrides
    for (const setup of parsed.build.setups) {
      if (!setup.statOverrides) {
        setup.statOverrides = {
          ...DEFAULT_STAT_OVERRIDES,
          buffs: { ...DEFAULT_STAT_OVERRIDES.buffs },
        };
      }
    }
    return {
      build: parsed.build,
      activeSetupIndex: parsed.activeSetupIndex ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Initial state ────────────────────────────────────────────────────────────

const savedState = loadFromStorage();

const initialState: BuildEditorState = {
  build: savedState?.build ?? makeBuild(),
  activeSetupIndex: savedState?.activeSetupIndex ?? 0,
  activeSidebarTab: 'general',
  activeSetupTab: 'info',
  isDirty: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

export const buildEditorSlice = createSlice({
  name: 'buildEditor',
  initialState,
  reducers: {
    // ── Navigation ────────────────────────────────────────────────────────────
    setSidebarTab(state, action: PayloadAction<SidebarTopTab>) {
      state.activeSidebarTab = action.payload;
    },
    setSetupTab(state, action: PayloadAction<SetupTab>) {
      state.activeSetupTab = action.payload;
    },
    setActiveSetupIndex(state, action: PayloadAction<number>) {
      if (action.payload >= 0 && action.payload < state.build.setups.length) {
        state.activeSetupIndex = action.payload;
      }
    },

    // ── Build-level fields ────────────────────────────────────────────────────
    setBuildName(state, action: PayloadAction<string>) {
      state.build.name = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setBuildDescription(state, action: PayloadAction<string>) {
      state.build.shortDescription = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setBuildClass(state, action: PayloadAction<Build['esoClass']>) {
      state.build.esoClass = action.payload;
      // Pre-fill all 3 skill line slots with the selected class's lines (convenience shortcut)
      state.build.classSkillLines = getDefaultLinesForClass(action.payload);
      // Class Mastery picks belong to the previous class — clear them
      state.build.classMasteryPassives = [];
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setClassSkillLine(
      state,
      action: PayloadAction<{ slot: 0 | 1 | 2; skillLineId: ClassSkillLineId | null }>,
    ) {
      state.build.classSkillLines[action.payload.slot] = action.payload.skillLineId;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setBuildRole(state, action: PayloadAction<Build['role']>) {
      state.build.role = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setBuildGameMode(state, action: PayloadAction<Build['gameMode']>) {
      state.build.gameMode = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setBuildRaces(state, action: PayloadAction<string[]>) {
      state.build.races = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setAddonImportString(state, action: PayloadAction<string>) {
      state.build.addonImportString = action.payload;
      state.isDirty = true;
    },

    // ── Guide ─────────────────────────────────────────────────────────────────
    setGuideContent(state, action: PayloadAction<string>) {
      state.build.guide.content = action.payload;
      state.isDirty = true;
    },
    setGuideYoutubeUrl(state, action: PayloadAction<string>) {
      state.build.guide.youtubeUrl = action.payload;
      state.isDirty = true;
    },
    setGuideBannerUrl(state, action: PayloadAction<string>) {
      state.build.guide.bannerImageUrl = action.payload;
      state.isDirty = true;
    },

    // ── Settings ──────────────────────────────────────────────────────────────
    setVisibility(state, action: PayloadAction<Build['settings']['visibility']>) {
      state.build.settings.visibility = action.payload;
      state.isDirty = true;
    },
    setDlc(state, action: PayloadAction<string>) {
      state.build.settings.dlc = action.payload;
      state.isDirty = true;
    },

    // ── Setup CRUD ────────────────────────────────────────────────────────────
    addSetup(state) {
      if (state.build.setups.length >= 5) return;
      const newSetup = makeSetup(`Setup ${state.build.setups.length + 1}`);
      state.build.setups.push(newSetup);
      state.build.settings.setupOrder = state.build.setups.map((_, i) => i);
      state.activeSetupIndex = state.build.setups.length - 1;
      state.isDirty = true;
    },
    renameSetup(state, action: PayloadAction<{ index: number; name: string }>) {
      const setup = state.build.setups[action.payload.index];
      if (setup) {
        setup.name = action.payload.name;
        state.isDirty = true;
      }
    },
    deleteSetup(state, action: PayloadAction<number>) {
      if (state.build.setups.length <= 1) return;
      state.build.setups.splice(action.payload, 1);
      state.build.settings.setupOrder = state.build.setups.map((_, i) => i);
      if (state.activeSetupIndex >= state.build.setups.length) {
        state.activeSetupIndex = state.build.setups.length - 1;
      }
      state.isDirty = true;
    },
    reorderSetups(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0) return;
      if (fromIndex >= state.build.setups.length || toIndex >= state.build.setups.length) return;

      // Track the currently active setup's id so we can follow it after reorder
      const activeSetupId = state.build.setups[state.activeSetupIndex]?.id;

      // Move the setup from fromIndex to toIndex
      const [moved] = state.build.setups.splice(fromIndex, 1);
      state.build.setups.splice(toIndex, 0, moved);

      // Update setupOrder to match new positions
      state.build.settings.setupOrder = state.build.setups.map((_, i) => i);

      // Keep the same setup active (follow it to its new index)
      if (activeSetupId) {
        const newIdx = state.build.setups.findIndex((s) => s.id === activeSetupId);
        if (newIdx !== -1) state.activeSetupIndex = newIdx;
      }

      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    /**
     * Clone setups[index], insert the clone immediately AFTER index, cap at 5
     * setups (no-op if already at 5), refresh setupOrder, and activate the new
     * clone.
     */
    duplicateSetup(state, action: PayloadAction<number>) {
      const index = action.payload;
      const source = state.build.setups[index];
      if (!source) return;
      if (state.build.setups.length >= 5) return;

      const clone = cloneSetup(source);
      state.build.setups.splice(index + 1, 0, clone);
      state.build.settings.setupOrder = state.build.setups.map((_, i) => i);
      state.activeSetupIndex = index + 1;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    /**
     * Copy one section FROM another setup INTO the currently active setup.
     * `fromIndex` must be a valid, different setup index. No-op on invalid input.
     */
    copySetupSection(state, action: PayloadAction<{ section: SetupSection; fromIndex: number }>) {
      const { section, fromIndex } = action.payload;
      const activeIndex = state.activeSetupIndex;
      if (fromIndex === activeIndex) return;
      const source = state.build.setups[fromIndex];
      const target = state.build.setups[activeIndex];
      if (!source || !target) return;

      state.build.setups[activeIndex] = copySetupSectionHelper(target, source, section);
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    /** Reset one section of the active setup to its empty default. */
    clearSetupSection(state, action: PayloadAction<{ section: SetupSection }>) {
      const idx = state.activeSetupIndex;
      const setup = state.build.setups[idx];
      if (!setup) return;
      state.build.setups[idx] = clearedSetupSection(setup, action.payload.section);
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    /**
     * Bulk-apply trait/enchant/weight to multiple gear slots of the ACTIVE
     * setup. Slots with no item are skipped. For trait/enchant: a string sets
     * the field, null deletes it, undefined leaves it unchanged. `weight`
     * applies ONLY to apparel slots (never weapons/jewelry).
     */
    bulkSetGear(
      state,
      action: PayloadAction<{
        slots: number[];
        trait?: string | null;
        enchant?: string | null;
        weight?: ArmorWeight | null;
      }>,
    ) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const { slots, trait, enchant, weight } = action.payload;

      let changed = false;
      for (const slot of slots) {
        const piece = setup.gear[slot];
        if (!piece || piece.id == null) continue;

        if (trait === null) {
          delete piece.trait;
          changed = true;
        } else if (trait !== undefined) {
          piece.trait = trait;
          changed = true;
        }

        if (enchant === null) {
          delete piece.enchant;
          changed = true;
        } else if (enchant !== undefined) {
          piece.enchant = enchant;
          changed = true;
        }

        if (APPAREL_SLOT_SET.has(slot)) {
          if (weight === null) {
            delete piece.weight;
            changed = true;
          } else if (weight !== undefined) {
            piece.weight = weight;
            changed = true;
          }
        }
      }

      if (changed) {
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    /**
     * Apply an imported (parsed) build. Parser-agnostic: merges only DEFINED
     * fields. `target: 'active'` merges setup fields into the active setup;
     * `target: 'new'` creates a fresh setup, merges into it, pushes (cap 5;
     * if at cap, falls back to 'active'), and activates it. `buildFields`
     * overwrite build-level fields (only defined keys).
     */
    applyImportedBuild(
      state,
      action: PayloadAction<{
        setup: Partial<
          Pick<
            BuildSetup,
            | 'gear'
            | 'skills'
            | 'cp'
            | 'consumables'
            | 'passives'
            | 'attributes'
            | 'mundusStone'
            | 'curse'
            | 'name'
          >
        >;
        buildFields?: Partial<
          Pick<
            Build,
            | 'esoClass'
            | 'classSkillLines'
            | 'races'
            | 'role'
            | 'gameMode'
            | 'name'
            | 'shortDescription'
          >
        >;
        target: 'active' | 'new';
      }>,
    ) {
      const { setup: imported, buildFields } = action.payload;
      const wantNew = action.payload.target === 'new';

      // Never silently overwrite the active setup when the user asked for a NEW
      // one but we're at the 5-setup cap — no-op instead (the UI also disables
      // the New-setup option at the cap).
      if (wantNew && state.build.setups.length >= 5) return;

      let target: BuildSetup | undefined;
      if (wantNew) {
        const created = makeSetup(imported.name ?? `Setup ${state.build.setups.length + 1}`);
        state.build.setups.push(created);
        state.build.settings.setupOrder = state.build.setups.map((_, i) => i);
        state.activeSetupIndex = state.build.setups.length - 1;
        target = state.build.setups[state.activeSetupIndex];
      } else {
        target = state.build.setups[state.activeSetupIndex];
      }
      if (!target) return;

      // MERGE imported fields into the target — never wipe data the parser
      // didn't include. (A fresh "new" setup starts empty, so merging there is
      // equivalent to replacing; applying to the "active" setup preserves
      // existing slots/potions/star allocations that weren't in the import.)
      if (imported.gear !== undefined) {
        target.gear = { ...target.gear, ...imported.gear };
        // A two-handed main-hand occupies both weapon slots — drop any stale
        // off-hand the merge would otherwise keep (mirrors EquipmentPicker's
        // auto-clear so exports/stats never read a phantom off-hand weapon).
        for (const [mainSlot, offSlot] of [
          [4, 5],
          [20, 21],
        ] as const) {
          const mainId = target.gear[mainSlot]?.id;
          if (mainId != null && isTwoHandedWeapon(Number(mainId))) {
            delete target.gear[offSlot];
          }
        }
      }
      if (imported.skills !== undefined) {
        target.skills = {
          0: { ...(target.skills?.[0] ?? {}), ...(imported.skills[0] ?? {}) },
          1: { ...(target.skills?.[1] ?? {}), ...(imported.skills[1] ?? {}) },
        };
      }
      if (imported.cp !== undefined) {
        // Take the imported slotted perks but keep existing passive-star points.
        const src = imported.cp;
        for (const tree of ['warfare', 'fitness', 'craft'] as const) {
          target.cp[tree] = {
            slots: [...src[tree].slots],
            passives: { ...target.cp[tree].passives },
          };
        }
      }
      if (imported.consumables !== undefined) {
        const food = imported.consumables.food;
        target.consumables = {
          potions: imported.consumables.potions.length
            ? imported.consumables.potions
            : target.consumables.potions,
          food: food && Object.keys(food).length ? food : target.consumables.food,
        };
      }
      if (imported.passives !== undefined) target.passives = imported.passives;
      if (imported.attributes !== undefined) target.attributes = imported.attributes;
      if (imported.mundusStone !== undefined) target.mundusStone = imported.mundusStone;
      if (imported.curse !== undefined) target.curse = imported.curse;
      if (imported.name !== undefined) target.name = imported.name;

      // Merge build-level fields — only defined keys.
      if (buildFields) {
        if (buildFields.esoClass !== undefined) state.build.esoClass = buildFields.esoClass;
        if (buildFields.classSkillLines !== undefined)
          state.build.classSkillLines = buildFields.classSkillLines;
        if (buildFields.races !== undefined) state.build.races = buildFields.races;
        if (buildFields.role !== undefined) state.build.role = buildFields.role;
        if (buildFields.gameMode !== undefined) state.build.gameMode = buildFields.gameMode;
        if (buildFields.name !== undefined) state.build.name = buildFields.name;
        if (buildFields.shortDescription !== undefined)
          state.build.shortDescription = buildFields.shortDescription;
      }

      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    // ── Character (per-setup) ─────────────────────────────────────────────────
    setAttributes(state, action: PayloadAction<BuildAttributes>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.attributes = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },
    setCurse(state, action: PayloadAction<string>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.curse = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },
    setMundusStone(state, action: PayloadAction<string>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.mundusStone = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    // ── Equipment (per-setup) ─────────────────────────────────────────────────
    setGear(state, action: PayloadAction<GearConfig>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.gear = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },
    setGearSlot(state, action: PayloadAction<{ slot: number; itemId: number | null }>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      if (action.payload.itemId === null) {
        delete setup.gear[action.payload.slot];
      } else {
        setup.gear[action.payload.slot] = { id: action.payload.itemId };
      }
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    setGearWeight(state, action: PayloadAction<{ slot: number; weight: ArmorWeight | undefined }>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const piece = setup.gear[action.payload.slot];
      if (piece) {
        piece.weight = action.payload.weight;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    setGearTrait(state, action: PayloadAction<{ slot: number; trait: string | undefined }>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const piece = setup.gear[action.payload.slot];
      if (piece) {
        piece.trait = action.payload.trait;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    setGearEnchant(state, action: PayloadAction<{ slot: number; enchant: string | undefined }>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const piece = setup.gear[action.payload.slot];
      if (piece) {
        piece.enchant = action.payload.enchant;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    // ── Skills (per-setup) ────────────────────────────────────────────────────
    setSkills(state, action: PayloadAction<SkillsConfig>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.skills = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    // ── Champion Points (per-setup) ───────────────────────────────────────────
    setChampionPoints(state, action: PayloadAction<BuildChampionPoints>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.cp = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },
    setChampionTreeSlot(
      state,
      action: PayloadAction<{
        tree: keyof BuildChampionPoints;
        slotIndex: number;
        cpId: number | null;
      }>,
    ) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      setup.cp[action.payload.tree].slots[action.payload.slotIndex] = action.payload.cpId;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setChampionPassive(
      state,
      action: PayloadAction<{
        tree: keyof BuildChampionPoints;
        cpId: string | number;
        points: number;
      }>,
    ) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const { tree, cpId, points } = action.payload;
      const key = String(cpId);
      if (points <= 0) {
        delete setup.cp[tree].passives[key];
      } else {
        setup.cp[tree].passives[key] = points;
      }
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    // ── Consumables (per-setup) ───────────────────────────────────────────────
    setConsumables(state, action: PayloadAction<BuildConsumables>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.consumables = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    // ── Passives (per-setup) ──────────────────────────────────────────────────
    togglePassive(state, action: PayloadAction<number>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const idx = setup.passives.indexOf(action.payload);
      if (idx === -1) {
        setup.passives.push(action.payload);
      } else {
        setup.passives.splice(idx, 1);
      }
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setPassives(state, action: PayloadAction<number[]>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      setup.passives = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    // ── Class Mastery (build-level, U50) ──────────────────────────────────────
    // Note: these reducers validate class ownership and the 2-pick cap but NOT
    // the subclassed gate — picks are intentionally kept (inert) while
    // subclassed; eligibility is enforced at the UI/display layer via
    // classMasteryEligibility.ts.
    toggleClassMasteryPassive(state, action: PayloadAction<number>) {
      // Only the base class's own Class Mastery passives are valid picks
      const line = getClassMasteryLine(state.build.esoClass);
      if (!line?.skills.some((skill) => skill.id === action.payload)) return;
      const picks = state.build.classMasteryPassives ?? [];
      const idx = picks.indexOf(action.payload);
      if (idx !== -1) {
        picks.splice(idx, 1);
      } else {
        if (picks.length >= CLASS_MASTERY_MAX_PICKS) return;
        picks.push(action.payload);
      }
      state.build.classMasteryPassives = picks;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setClassMasteryPassives(state, action: PayloadAction<number[]>) {
      const line = getClassMasteryLine(state.build.esoClass);
      const valid = new Set(line?.skills.map((skill) => skill.id) ?? []);
      state.build.classMasteryPassives = [...new Set(action.payload)]
        .filter((id) => valid.has(id))
        .slice(0, CLASS_MASTERY_MAX_PICKS);
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setQuickslots(state, action: PayloadAction<QuickslotEntry[]>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      setup.quickslots = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setSkilledAbilities(state, action: PayloadAction<SkilledAbility[]>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      setup.skilledAbilities = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },
    setScribedAbilityIds(state, action: PayloadAction<number[]>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      setup.scribedAbilityIds = action.payload;
      state.build.updatedAt = new Date().toISOString();
      state.isDirty = true;
    },

    // ── Stat Overrides (per-setup) ────────────────────────────────────────────
    setStatOverrides(state, action: PayloadAction<StatOverrides>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.statOverrides = action.payload;
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    // ── Screenshots (per-setup) ───────────────────────────────────────────────
    addScreenshot(state, action: PayloadAction<string>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup && setup.screenshots.length < MAX_SCREENSHOTS) {
        setup.screenshots.push(action.payload);
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },
    removeScreenshot(state, action: PayloadAction<number>) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (setup) {
        setup.screenshots.splice(action.payload, 1);
        state.build.updatedAt = new Date().toISOString();
        state.isDirty = true;
      }
    },

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    /** Load an entire build object (e.g. from a decoded URL share). */
    loadBuild(state, action: PayloadAction<Build>) {
      state.build = action.payload;
      state.activeSetupIndex = 0;
      state.activeSidebarTab = 'general';
      state.activeSetupTab = 'info';
      state.isDirty = false;
    },
    resetBuild(state) {
      state.build = makeBuild();
      state.activeSetupIndex = 0;
      state.activeSidebarTab = 'general';
      state.activeSetupTab = 'info';
      state.isDirty = false;
    },
    markSaved(state) {
      state.isDirty = false;
    },
  },
});

export const {
  setSidebarTab,
  setSetupTab,
  setActiveSetupIndex,
  setBuildName,
  setBuildDescription,
  setBuildClass,
  setClassSkillLine,
  setBuildRole,
  setBuildGameMode,
  setBuildRaces,
  setAddonImportString,
  setGuideContent,
  setGuideYoutubeUrl,
  setGuideBannerUrl,
  setVisibility,
  setDlc,
  addSetup,
  duplicateSetup,
  renameSetup,
  deleteSetup,
  reorderSetups,
  copySetupSection,
  clearSetupSection,
  bulkSetGear,
  applyImportedBuild,
  setAttributes,
  setCurse,
  setMundusStone,
  setGear,
  setGearSlot,
  setGearWeight,
  setGearTrait,
  setGearEnchant,
  setSkills,
  setChampionPoints,
  setChampionTreeSlot,
  setChampionPassive,
  setConsumables,
  togglePassive,
  setPassives,
  toggleClassMasteryPassive,
  setClassMasteryPassives,
  setQuickslots,
  setSkilledAbilities,
  setScribedAbilityIds,
  setStatOverrides,
  addScreenshot,
  removeScreenshot,
  loadBuild,
  resetBuild,
  markSaved,
} = buildEditorSlice.actions;

export default buildEditorSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export type { BuildEditorState };
