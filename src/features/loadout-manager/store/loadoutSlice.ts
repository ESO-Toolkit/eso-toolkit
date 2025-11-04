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
 * Initial state
 */
const initialState: LoadoutState = {
  currentTrial: null,
  currentPage: 0,
  mode: 'basic', // Start in basic mode (bosses only)
  pages: {},
};

const loadoutSlice = createSlice({
  name: 'loadout',
  initialState,
  reducers: {
    /**
     * Set the current trial
     */
    setCurrentTrial: (state, action: PayloadAction<string>) => {
      state.currentTrial = action.payload;
      state.currentPage = 0;

      // Initialize pages for this trial if not exists
      if (!state.pages[action.payload]) {
        state.pages[action.payload] = [
          {
            name: 'Default Page',
            setups: [],
          },
        ];
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
      if (!state.pages[trialId]) {
        state.pages[trialId] = [];
      }
      state.pages[trialId].push({
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
      if (state.pages[trialId]?.[pageIndex]) {
        state.pages[trialId][pageIndex].name = newName;
      }
    },

    /**
     * Delete a page
     */
    deletePage: (state, action: PayloadAction<{ trialId: string; pageIndex: number }>) => {
      const { trialId, pageIndex } = action.payload;
      if (state.pages[trialId]) {
        state.pages[trialId].splice(pageIndex, 1);
        // Adjust current page if needed
        if (state.currentPage >= state.pages[trialId].length && state.currentPage > 0) {
          state.currentPage = state.pages[trialId].length - 1;
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
      if (state.pages[trialId]?.[pageIndex]) {
        state.pages[trialId][pageIndex].setups.push(setup);
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
      if (!state.pages[trialId]?.[pageIndex]) return;

      const setups: LoadoutSetup[] = structure.map((item) => {
        const condition =
          item.type === 'trash'
            ? { boss: 'Trash', trash: item.trashIndex ?? -1 }
            : { boss: item.name };

        return createEmptySetup(item.name, condition);
      });

      state.pages[trialId][pageIndex].setups = setups;
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
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
      if (state.pages[trialId]?.[pageIndex]) {
        state.pages[trialId][pageIndex].setups.splice(setupIndex, 1);
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
      const setup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
      if (setup) {
        const duplicate = JSON.parse(JSON.stringify(setup)) as LoadoutSetup;
        duplicate.name = `${setup.name} (Copy)`;
        state.pages[trialId][pageIndex].setups.push(duplicate);
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
      if (state.pages[trialId]?.[pageIndex]) {
        state.pages[trialId][pageIndex].setups.push(setup);
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
      const existingSetup = state.pages[trialId]?.[pageIndex]?.setups[setupIndex];
      if (existingSetup) {
        // Preserve the name and condition, update everything else
        state.pages[trialId][pageIndex].setups[setupIndex] = {
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
} = loadoutSlice.actions;

export default loadoutSlice.reducer;
