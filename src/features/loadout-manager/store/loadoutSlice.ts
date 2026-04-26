/**
 * Redux slice for Loadout Manager
 * Manages state for trial setups, skill configurations, gear, CP, and food
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  LoadoutState,
  LoadoutSetup,
  SetupPage,
  SkillsConfig,
  ChampionPointsConfig,
  FoodConfig,
  GearConfig,
} from '../types/loadout.types';

/**
 * Create an empty loadout setup
 */
function createEmptySetup(name: string, condition: LoadoutSetup['condition']): LoadoutSetup {
  return {
    name,
    disabled: false,
    condition,
    skills: {
      0: {}, // Front bar
      1: {}, // Back bar
    },
    cp: {},
    food: {},
    gear: {},
    code: '',
  };
}

/**
 * Helper to get pages for current character and trial
 */
function getCharacterTrialPages(
  state: LoadoutState,
  characterId: string | null,
  trialId: string,
): SetupPage[] | undefined {
  if (!characterId) return undefined;
  return state.pages[characterId]?.[trialId];
}

/**
 * Helper to ensure character and trial pages exist
 */
function ensureCharacterTrialPages(
  state: LoadoutState,
  characterId: string | null,
  trialId: string,
): void {
  if (!characterId) return;

  if (!state.pages[characterId]) {
    state.pages[characterId] = {};
  }
  if (!state.pages[characterId][trialId]) {
    state.pages[characterId][trialId] = [
      {
        name: 'Default Page',
        setups: [],
      },
    ];
  }
}

function getSetupByIndices(
  state: LoadoutState,
  characterId: string | null,
  trialId: string,
  pageIndex: number,
  setupIndex: number,
): LoadoutSetup | undefined {
  const pages = getCharacterTrialPages(state, characterId, trialId);
  return pages?.[pageIndex]?.setups[setupIndex];
}

/**
 * Initial state
 */
const initialState: LoadoutState = {
  currentCharacter: null, // No character selected by default
  characters: [], // Empty character list
  currentTrial: 'GEN', // Default to General setups
  currentPage: 0,
  mode: 'advanced', // Always show trash setups
  pages: {},
};

const loadoutSlice = createSlice({
  name: 'loadout',
  initialState,
  reducers: {
    /**
     * Set the current character
     */
    setCurrentCharacter: (state, action: PayloadAction<string | null>) => {
      state.currentCharacter = action.payload;
      state.currentPage = 0;

      // Initialize pages for this character if not exists
      if (action.payload && !state.pages[action.payload]) {
        state.pages[action.payload] = {};
      }
    },

    /**
     * Set the current trial
     */
    setCurrentTrial: (state, action: PayloadAction<string>) => {
      state.currentTrial = action.payload;
      state.currentPage = 0;

      // Initialize pages for this trial if not exists and character is selected
      if (state.currentCharacter) {
        if (!state.pages[state.currentCharacter]) {
          state.pages[state.currentCharacter] = {};
        }
        if (!state.pages[state.currentCharacter][action.payload]) {
          state.pages[state.currentCharacter][action.payload] = [
            {
              name: 'Default Page',
              setups: [],
            },
          ];
        }
      }
    },

    /**
     * Set the current page index
     */
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },

    /**
     * Toggle between basic and advanced mode
     */
    toggleMode: (state) => {
      state.mode = state.mode === 'basic' ? 'advanced' : 'basic';
    },

    /**
     * Set mode explicitly
     */
    setMode: (state, action: PayloadAction<'basic' | 'advanced'>) => {
      state.mode = action.payload;
    },

    /**
     * Add a new page for the current trial
     */
    addPage: (state, action: PayloadAction<{ trialId: string; pageName: string }>) => {
      const { trialId, pageName } = action.payload;
      if (!state.currentCharacter) return;

      ensureCharacterTrialPages(state, state.currentCharacter, trialId);
      state.pages[state.currentCharacter][trialId].push({
        name: pageName,
        setups: [],
      });
    },

    /**
     * Rename a page
     */
    renamePage: (
      state,
      action: PayloadAction<{ trialId: string; pageIndex: number; newName: string }>,
    ) => {
      const { trialId, pageIndex, newName } = action.payload;
      if (!state.currentCharacter) return;

      const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
      if (pages?.[pageIndex]) {
        pages[pageIndex].name = newName;
      }
    },

    /**
     * Delete a page
     */
    deletePage: (state, action: PayloadAction<{ trialId: string; pageIndex: number }>) => {
      const { trialId, pageIndex } = action.payload;
      if (!state.currentCharacter) return;

      const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
      if (pages) {
        pages.splice(pageIndex, 1);
        // Adjust current page if needed
        if (state.currentPage >= pages.length && state.currentPage > 0) {
          state.currentPage = pages.length - 1;
        }
      }
    },

    /**
     * Add a new setup to a page
     */
    addSetup: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setup: LoadoutSetup;
      }>,
    ) => {
      const { trialId, pageIndex, setup } = action.payload;
      if (!state.currentCharacter) return;

      ensureCharacterTrialPages(state, state.currentCharacter, trialId);
      const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
      if (pages?.[pageIndex]) {
        pages[pageIndex].setups.push(setup);
      }
    },

    /**
     * Initialize setups for a trial based on structure
     */
    initializeSetups: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        structure: Array<{ type: 'trash' | 'boss'; name: string; trashIndex?: number }>;
      }>,
    ) => {
      const { trialId, pageIndex, structure } = action.payload;
      if (!state.currentCharacter) return;

      ensureCharacterTrialPages(state, state.currentCharacter, trialId);
      const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
      if (!pages?.[pageIndex]) return;

      const setups: LoadoutSetup[] = structure.map((item) => {
        const condition =
          item.type === 'trash'
            ? { boss: 'Trash', trash: item.trashIndex ?? -1 }
            : { boss: item.name };

        return createEmptySetup(item.name, condition);
      });

      pages[pageIndex].setups = setups;
    },

    /**
     * Update a specific setup
     */
    updateSetup: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
        updates: Partial<LoadoutSetup>;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex, updates } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        Object.assign(setup, updates);
      }
    },

    /**
     * Update skills for a setup
     */
    updateSkills: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
        skills: SkillsConfig;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex, skills } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.skills = skills;
      }
    },

    /**
     * Update Champion Points for a setup
     */
    updateChampionPoints: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
        cp: ChampionPointsConfig;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex, cp } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.cp = cp;
      }
    },

    /**
     * Update food for a setup
     */
    updateFood: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
        food: FoodConfig;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex, food } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.food = food;
      }
    },

    /**
     * Update gear for a setup
     */
    updateGear: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
        gear: GearConfig;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex, gear } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.gear = gear;
      }
    },

    /**
     * Clear skills for a setup
     */
    clearSkills: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.skills = { 0: {}, 1: {} };
      }
    },

    /**
     * Clear Champion Points for a setup
     */
    clearChampionPoints: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.cp = {};
      }
    },

    /**
     * Clear food for a setup
     */
    clearFood: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.food = {};
      }
    },

    /**
     * Clear gear for a setup
     */
    clearGear: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        setup.gear = {};
      }
    },

    /**
     * Delete a setup
     */
    deleteSetup: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex } = action.payload;
      if (!state.currentCharacter) return;

      const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
      const page = pages?.[pageIndex];
      if (page) {
        page.setups.splice(setupIndex, 1);
      }
    },

    /**
     * Duplicate a setup
     */
    duplicateSetup: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex } = action.payload;
      const setup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (setup) {
        const duplicate = JSON.parse(JSON.stringify(setup)) as LoadoutSetup;
        duplicate.name = `${setup.name} (Copy)`;
        const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
        pages?.[pageIndex]?.setups.push(duplicate);
      }
    },

    /**
     * Import a setup from clipboard data (adds as new setup)
     */
    importSetup: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setup: LoadoutSetup;
      }>,
    ) => {
      const { trialId, pageIndex, setup } = action.payload;
      if (!state.currentCharacter) return;

      ensureCharacterTrialPages(state, state.currentCharacter, trialId);
      const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
      if (pages?.[pageIndex]) {
        pages[pageIndex].setups.push(setup);
      }
    },

    /**
     * Replace an existing setup with imported data
     */
    replaceSetup: (
      state,
      action: PayloadAction<{
        trialId: string;
        pageIndex: number;
        setupIndex: number;
        setupData: LoadoutSetup;
      }>,
    ) => {
      const { trialId, pageIndex, setupIndex, setupData } = action.payload;
      const existingSetup = getSetupByIndices(
        state,
        state.currentCharacter,
        trialId,
        pageIndex,
        setupIndex,
      );
      if (existingSetup) {
        // Preserve the name and condition, update everything else
        const pages = getCharacterTrialPages(state, state.currentCharacter, trialId);
        if (!pages?.[pageIndex]) return;
        pages[pageIndex].setups[setupIndex] = {
          ...setupData,
          name: existingSetup.name,
          condition: existingSetup.condition,
        };
      }
    },

    /**
     * Load complete state (for importing from JSON)
     */
    loadState: (state, action: PayloadAction<LoadoutState>) => {
      return action.payload;
    },

    /**
     * Update a character's role
     */
    updateCharacterRole: (state, action: PayloadAction<{ characterId: string; role: string }>) => {
      const char = state.characters.find((c) => c.id === action.payload.characterId);
      if (char) {
        char.role = action.payload.role;
      }
    },

    /**
     * Reset to initial state
     */
    resetLoadout: () => initialState,
  },
});

export const {
  setCurrentTrial,
  setCurrentPage,
  toggleMode,
  setMode,
  addPage,
  renamePage,
  deletePage,
  addSetup,
  initializeSetups,
  updateSetup,
  updateSkills,
  updateChampionPoints,
  updateFood,
  updateGear,
  clearSkills,
  clearChampionPoints,
  clearFood,
  clearGear,
  deleteSetup,
  duplicateSetup,
  importSetup,
  replaceSetup,
  loadState,
  resetLoadout,
  setCurrentCharacter,
  updateCharacterRole,
} = loadoutSlice.actions;

export default loadoutSlice.reducer;
