/**
 * Downloadable ESO SavedVariables (.lua) file generators.
 *
 * Turns the app's loadout state into a complete, game-ready SavedVariables file
 * for the two supported loadout addons — or a minimal "blank starter" file for a
 * user who doesn't have one yet. Both addons key their data by the in-game
 * account name (`@UserID`); ZO_SavedVars only loads `SV.Default[GetDisplayName()]`,
 * so the account name baked into the file MUST match the player's real account or
 * the addon silently ignores it. Callers pass the account name (prefilled from the
 * signed-in ESO Logs name, but editable) — see the install guide for why.
 *
 * Wizard's Wardrobe loadouts are written into the **account-wide** record
 * (`$AccountWide.accountWideStorage`) rather than a character record, because the
 * in-game numeric character id is unknowable from outside the game. The install
 * guide tells the user to switch WW to "Account Wide" once to see them.
 */

import type { LoadoutState, WizardWardrobeExport } from '../types/loadout.types';

import { convertLoadoutStateToAlphaGear, serializeAlphaGearToLua } from './alphaGearConverter';
import {
  serializeWizardsWardrobeSavedVariables,
  type WizardWardrobeSavedVariables,
} from './wizardsWardrobeSavedVariables';
import { convertLoadoutStateToWizardWardrobe } from './wizardWardrobeConverter';

export type LoadoutAddonFormat = 'wizards-wardrobe' | 'alphagear';

export interface GeneratedLuaFile {
  /** Suggested SavedVariables filename (matches the addon's on-disk file). */
  filename: string;
  /** Full Lua source to write to disk. */
  contents: string;
}

const EMPTY_STATE: LoadoutState = {
  currentCharacter: null,
  characters: [],
  currentTrial: null,
  currentPage: 0,
  mode: 'basic',
  pages: {},
};

/**
 * Normalise a user-supplied account name to the in-game `@UserID` form. ESO
 * account names always start with `@`; we add it if the user omitted it. Falls
 * back to a clearly-placeholder value the install guide tells them to replace.
 */
export function normalizeAccountName(input: string | undefined | null): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '@YourAccount';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

/**
 * Wrap a {@link WizardWardrobeExport} (setups/pages keyed by trial) into a
 * complete, ZO_SavedVars-shaped `WizardsWardrobeSV` table, under the account-wide
 * record. Missing account settings are intentionally omitted — ZO_SavedVars fills
 * its registered defaults on load, so a minimal record is safest.
 */
function buildWizardWardrobeSavedVariables(
  exportData: Pick<WizardWardrobeExport, 'setups' | 'pages'>,
  accountName: string,
): WizardWardrobeSavedVariables {
  return {
    Default: {
      [accountName]: {
        $AccountWide: {
          version: 1,
          // accountWideStorage is an addon-specific key (allowed by the
          // character record's index signature); WW reads setups/pages from here
          // when the player is in "Account Wide" mode.
          accountWideStorage: {
            setups: exportData.setups ?? {},
            pages: exportData.pages ?? {},
            prebuffs: {},
            autoEquipSetups: false,
          },
        },
      },
    },
  };
}

/** Full Wizard's Wardrobe SavedVariables file built from the current loadouts. */
export function generateWizardWardrobeLua(
  state: LoadoutState,
  accountName: string,
  characterName?: string,
): GeneratedLuaFile {
  const account = normalizeAccountName(accountName);
  const exportData = convertLoadoutStateToWizardWardrobe(state, characterName);
  const sv = buildWizardWardrobeSavedVariables(exportData, account);
  return {
    filename: 'WizardsWardrobe.lua',
    contents: serializeWizardsWardrobeSavedVariables(sv),
  };
}

/** Minimal, valid, empty Wizard's Wardrobe starter file keyed to the account. */
export function generateBlankWizardWardrobeLua(accountName: string): GeneratedLuaFile {
  const account = normalizeAccountName(accountName);
  const sv = buildWizardWardrobeSavedVariables({ setups: {}, pages: {} }, account);
  return {
    filename: 'WizardsWardrobe.lua',
    contents: serializeWizardsWardrobeSavedVariables(sv),
  };
}

/** Full AlphaGear SavedVariables file built from the current loadouts. */
export function generateAlphaGearLua(state: LoadoutState, accountName: string): GeneratedLuaFile {
  const account = normalizeAccountName(accountName);
  const sv = convertLoadoutStateToAlphaGear(state, account);
  return {
    filename: 'AlphaGear.lua',
    contents: serializeAlphaGearToLua(sv),
  };
}

/** Minimal, valid, empty AlphaGear starter file keyed to the account. */
export function generateBlankAlphaGearLua(accountName: string): GeneratedLuaFile {
  const account = normalizeAccountName(accountName);
  const sv = convertLoadoutStateToAlphaGear(EMPTY_STATE, account);
  return {
    filename: 'AlphaGear.lua',
    contents: serializeAlphaGearToLua(sv),
  };
}

/** Dispatch helper: produce a full or blank file for the chosen addon. */
export function generateLoadoutLuaFile(opts: {
  format: LoadoutAddonFormat;
  blank: boolean;
  state: LoadoutState;
  accountName: string;
  characterName?: string;
}): GeneratedLuaFile {
  const { format, blank, state, accountName, characterName } = opts;
  if (format === 'wizards-wardrobe') {
    return blank
      ? generateBlankWizardWardrobeLua(accountName)
      : generateWizardWardrobeLua(state, accountName, characterName);
  }
  return blank ? generateBlankAlphaGearLua(accountName) : generateAlphaGearLua(state, accountName);
}
