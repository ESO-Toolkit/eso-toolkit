/**
 * Build Editor Redux Slice
 * Flat state — one active build with up to 5 setups.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

import type {
  ArmorWeight,
  GearConfig,
  SkillsConfig,
} from '../../loadout-manager/types/loadout.types';
import { getDefaultLinesForClass } from '../data/esoStaticData';
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
  SidebarTopTab,
  SetupTab,
} from '../types/build.types';

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

    setGearWeight(
      state,
      action: PayloadAction<{ slot: number; weight: ArmorWeight | undefined }>,
    ) {
      const setup = state.build.setups[state.activeSetupIndex];
      if (!setup) return;
      const piece = setup.gear[action.payload.slot];
      if (piece) {
        piece.weight = action.payload.weight;
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
  renameSetup,
  deleteSetup,
  setAttributes,
  setCurse,
  setMundusStone,
  setGear,
  setGearSlot,
  setGearWeight,
  setSkills,
  setChampionPoints,
  setChampionTreeSlot,
  setChampionPassive,
  setConsumables,
  togglePassive,
  setPassives,
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
