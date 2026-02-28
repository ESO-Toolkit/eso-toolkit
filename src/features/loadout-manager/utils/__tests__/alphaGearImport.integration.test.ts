/**
 * @jest-environment jsdom
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseAlphaGearSavedVariables, parseLuaSavedVariables } from '../luaParser';
import {
  detectAlphaGearData,
  extractAlphaGearCharacters,
  convertAlphaGearToLoadoutState,
  convertLoadoutStateToAlphaGear,
  serializeAlphaGearToLua,
} from '../alphaGearConverter';

const SAMPLE_FILE = path.join(process.cwd(), 'tmp', 'AlphaGear.lua');
const hasSampleFile = fs.existsSync(SAMPLE_FILE);

const describeIf = hasSampleFile ? describe : describe.skip;

describeIf('AlphaGear import integration (real file)', () => {
  let luaContent: string;

  beforeAll(() => {
    luaContent = fs.readFileSync(SAMPLE_FILE, 'utf8');
  });

  // ── Stage 1: Raw Lua parsing ──────────────────────────────────────

  it('parses the raw Lua file into assignments', () => {
    const parsed = parseLuaSavedVariables(luaContent);
    expect(parsed).toBeDefined();
    expect(Object.keys(parsed)).toEqual(expect.arrayContaining(['AGX2_Account', 'AGX2_Character']));
  });

  // ── Stage 2: AlphaGear detection ─────────────────────────────────

  it('detects AlphaGear data in parsed assignments', () => {
    const parsed = parseLuaSavedVariables(luaContent);
    const detected = detectAlphaGearData(parsed);
    expect(detected).not.toBeNull();
    expect(detected!.tableName).toBe('AGX2_Character');
    expect(detected!.data.Default).toBeDefined();
  });

  // ── Stage 3: Character extraction ─────────────────────────────────

  it('extracts characters from the AlphaGear data', () => {
    const parsed = parseLuaSavedVariables(luaContent);
    const detected = detectAlphaGearData(parsed)!;
    const characters = extractAlphaGearCharacters(detected.data);

    expect(Object.keys(characters).length).toBeGreaterThan(0);

    // Each character should have setamount and numbered entries
    for (const [name, data] of Object.entries(characters)) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(data.setamount).toBeGreaterThan(0);
    }
  });

  // ── Stage 4: Full conversion to LoadoutState ──────────────────────

  it('converts to LoadoutState with valid structure', () => {
    const parsed = parseLuaSavedVariables(luaContent);
    const detected = detectAlphaGearData(parsed)!;
    const characters = extractAlphaGearCharacters(detected.data);
    const state = convertAlphaGearToLoadoutState(characters);

    // Top-level structure
    expect(state.characters.length).toBeGreaterThan(0);
    expect(state.currentCharacter).toBeTruthy();
    expect(state.currentTrial).toBe('GEN');
    expect(state.mode).toBe('basic');
    expect(Object.keys(state.pages).length).toBeGreaterThan(0);

    // Characters with pages must have valid page structure
    for (const character of state.characters) {
      expect(character.id).toBeTruthy();
      expect(character.name).toBeTruthy();
      const charPages = state.pages[character.id];
      // Some characters may have all-empty sets → no pages entry
      if (charPages) {
        expect(charPages.GEN).toBeDefined();
        expect(charPages.GEN!.length).toBeGreaterThan(0);
      }
    }

    // At least one character must have pages
    const charsWithPages = state.characters.filter((c) => state.pages[c.id]);
    expect(charsWithPages.length).toBeGreaterThan(0);
  });

  // ── Stage 5: Convenience function (full pipeline) ─────────────────

  it('works end-to-end via parseAlphaGearSavedVariables', () => {
    const result = parseAlphaGearSavedVariables(luaContent);
    expect(result).not.toBeNull();
    expect(result!.tableName).toBe('AGX2_Character');
    expect(Object.keys(result!.characters).length).toBeGreaterThan(0);

    const state = convertAlphaGearToLoadoutState(result!.characters);
    expect(state.characters.length).toBe(Object.keys(result!.characters).length);
  });

  // ── Stage 6: Data integrity checks ────────────────────────────────

  it('produces setups with valid gear slot indices', () => {
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const state = convertAlphaGearToLoadoutState(result.characters);

    // Valid internal slot indices (ESO EQUIP_SLOT enum values we support)
    const VALID_GEAR_SLOTS = new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 16, 20, 21]);

    for (const character of state.characters) {
      const charPages = state.pages[character.id];
      if (!charPages) continue; // Characters with all-empty sets have no pages
      for (const [, pages] of Object.entries(charPages)) {
        for (const page of pages) {
          for (const setup of page.setups) {
            for (const slotKey of Object.keys(setup.gear)) {
              const slot = Number(slotKey);
              expect(VALID_GEAR_SLOTS.has(slot)).toBe(true);
            }
          }
        }
      }
    }
  });

  it('produces setups with valid skill slot indices', () => {
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const state = convertAlphaGearToLoadoutState(result.characters);

    // Valid skill slots: 3-7 (abilities) and 8 (ultimate)
    const VALID_SKILL_SLOTS = new Set([3, 4, 5, 6, 7, 8]);

    for (const character of state.characters) {
      const charPages = state.pages[character.id];
      if (!charPages) continue;
      for (const [, pages] of Object.entries(charPages)) {
        for (const page of pages) {
          for (const setup of page.setups) {
            for (const barKey of [0, 1] as const) {
              const bar = setup.skills[barKey];
              if (bar) {
                for (const slotKey of Object.keys(bar)) {
                  const slot = Number(slotKey);
                  expect(VALID_SKILL_SLOTS.has(slot)).toBe(true);
                }
              }
            }
          }
        }
      }
    }
  });

  it('preserves item links from the original file', () => {
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const state = convertAlphaGearToLoadoutState(result.characters);

    let totalGearPieces = 0;
    let itemLinksWithIds = 0;

    for (const character of state.characters) {
      const charPages = state.pages[character.id];
      if (!charPages) continue;
      for (const pages of Object.values(charPages)) {
        for (const page of pages) {
          for (const setup of page.setups) {
            for (const piece of Object.values(setup.gear)) {
              totalGearPieces++;
              if (typeof piece.link === 'string' && piece.link.startsWith('|H')) {
                expect(piece.link).toMatch(/\|H[01]:item:\d+/);
                itemLinksWithIds++;
              }
            }
          }
        }
      }
    }

    // At least some gear pieces should have valid item links
    expect(totalGearPieces).toBeGreaterThan(0);
    expect(itemLinksWithIds).toBe(totalGearPieces);
  });

  it('handles the specific character data from this file', () => {
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const characters = result.characters;

    // We know this file has at least "z Tzu" character
    expect(characters['z Tzu']).toBeDefined();
    const tzu = characters['z Tzu'];

    // Access set 1 — character data has mixed keys (string "setamount" + numeric)
    // so it stays as an object, but nested arrays are 0-indexed by the parser.
    const set1 = tzu[1];
    expect(set1).toBeDefined();

    // Set.text is {[1]="Bosses",[2]=0,[3]=0} → parser converts to array ["Bosses", 0, 0]
    const text = set1.Set?.text;
    expect(text).toBeDefined();
    // Access via index 0 (parser converts 1-indexed Lua to 0-indexed JS array)
    const setText = Array.isArray(text) ? text[0] : text?.[1];
    expect(setText).toBe('Bosses');

    // Set.skill is {[1]=1,[2]=2} → parser converts to array [1, 2]
    const skill = set1.Set?.skill;
    const frontRef = Array.isArray(skill) ? skill[0] : skill?.[1];
    const backRef = Array.isArray(skill) ? skill[1] : skill?.[2];
    expect(frontRef).toBe(1); // front bar = set 1
    expect(backRef).toBe(2); // back bar = set 2

    // Verify the converted state merges the pair
    const state = convertAlphaGearToLoadoutState(characters);
    const tzuId = 'z-tzu';
    const genPages = state.pages[tzuId]?.GEN;
    expect(genPages).toBeDefined();

    // Find the "Bosses" setup
    const allSetups = genPages!.flatMap((p) => p.setups);
    const bossSetup = allSetups.find((s) => s.name === 'Bosses');
    expect(bossSetup).toBeDefined();

    // Because it has skill: {1:1, 2:2}, set 2 should be merged as back bar
    // Front bar: set 1 skills (AG skill 1 = 24328 → internal slot 3)
    expect(bossSetup!.skills[0][3]).toBe(24328);
    // Back bar: set 2 skills should be populated
    expect(Object.keys(bossSetup!.skills[1]).length).toBeGreaterThan(0);

    // Gear: AG slot 1 = Main Hand → internal slot 4
    // Item 106812 should be in Main Hand slot (4)
    expect(bossSetup!.gear[4]?.link).toContain('item:106812');
  });

  // ── Round-trip: parse → convert → JSON → re-import → compare ─────

  it('round-trips through JSON serialization', () => {
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const state = convertAlphaGearToLoadoutState(result.characters);

    // Serialize to JSON and back (simulating export and re-import)
    const json = JSON.stringify(state);
    const reimported = JSON.parse(json);

    // Should be structurally identical
    expect(reimported.characters).toEqual(state.characters);
    expect(reimported.currentCharacter).toEqual(state.currentCharacter);
    expect(reimported.currentTrial).toEqual(state.currentTrial);
    expect(reimported.pages).toEqual(state.pages);
  });

  // ── Full Lua round-trip: parse → LoadoutState → AG → Lua → reparse → LoadoutState ──

  it('round-trips through AlphaGear Lua serialization', () => {
    // Step 1: Parse the original file into LoadoutState
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const originalState = convertAlphaGearToLoadoutState(result.characters);

    // Step 2: Convert back to AlphaGear saved variables
    const agData = convertLoadoutStateToAlphaGear(originalState);

    // Step 3: Serialize to Lua source string
    const luaOutput = serializeAlphaGearToLua(agData);

    // Verify the output is valid Lua-like text
    expect(luaOutput).toContain('AGX2_Character');
    expect(luaOutput).toContain('Default');
    expect(luaOutput).toContain('Skill');
    expect(luaOutput).toContain('Gear');
    expect(luaOutput).toContain('Set');

    // Step 4: Reparse the generated Lua
    const reparsed = parseAlphaGearSavedVariables(luaOutput);
    expect(reparsed).not.toBeNull();

    // Step 5: Convert the reparsed data back to LoadoutState
    const roundTrippedState = convertAlphaGearToLoadoutState(reparsed!.characters);

    // Only characters with actual set data survive the round-trip
    // (characters with all-empty sets are dropped during reverse conversion)
    const origCharsWithData = originalState.characters.filter(
      (c) => originalState.pages[c.id]?.GEN,
    );
    const rtCharsWithData = roundTrippedState.characters.filter(
      (c) => roundTrippedState.pages[c.id]?.GEN,
    );
    expect(rtCharsWithData.length).toBe(origCharsWithData.length);

    // Character names should match for characters that have data
    const origNames = origCharsWithData.map((c) => c.name).sort();
    const rtNames = rtCharsWithData.map((c) => c.name).sort();
    expect(rtNames).toEqual(origNames);

    // For each character with data, compare setups
    for (const origChar of origCharsWithData) {
      const rtChar = roundTrippedState.characters.find((c) => c.name === origChar.name);
      expect(rtChar).toBeDefined();

      const origPages = originalState.pages[origChar.id]?.GEN;
      const rtPages = roundTrippedState.pages[rtChar!.id]?.GEN;

      if (!origPages) continue;
      expect(rtPages).toBeDefined();

      // Compare page-by-page to avoid name collisions between profiles
      // (e.g., both "Levelling" and "Sets" profiles can have "Build 1")
      expect(rtPages!.length).toBe(origPages.length);

      for (let pageIdx = 0; pageIdx < origPages.length; pageIdx++) {
        const origPage = origPages[pageIdx];
        const rtPage = rtPages![pageIdx];

        expect(rtPage.name).toBe(origPage.name);
        expect(rtPage.setups.length).toBe(origPage.setups.length);

        for (let setupIdx = 0; setupIdx < origPage.setups.length; setupIdx++) {
          const origSetup = origPage.setups[setupIdx];
          const rtSetup = rtPage.setups[setupIdx];

          expect(rtSetup.name).toBe(origSetup.name);

          // Gear should be identical (item links preserved)
          expect(rtSetup.gear).toEqual(origSetup.gear);

          // Front bar skills should be identical
          expect(rtSetup.skills[0]).toEqual(origSetup.skills[0]);

          // Back bar skills should be identical
          expect(rtSetup.skills[1]).toEqual(origSetup.skills[1]);
        }
      }
    }
  });

  it('preserves specific item links through Lua round-trip', () => {
    // Step 1: Parse original
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const originalState = convertAlphaGearToLoadoutState(result.characters);

    // Step 2: Round-trip through AG format
    const agData = convertLoadoutStateToAlphaGear(originalState);
    const luaOutput = serializeAlphaGearToLua(agData);
    const reparsed = parseAlphaGearSavedVariables(luaOutput)!;
    const rtState = convertAlphaGearToLoadoutState(reparsed.characters);

    // Step 3: Verify all item links survived the round-trip
    // Only check characters that have data in both states
    let itemLinkCount = 0;
    for (const origChar of originalState.characters) {
      const origPages = originalState.pages[origChar.id]?.GEN;
      if (!origPages) continue;

      const rtChar = rtState.characters.find((c) => c.name === origChar.name);
      if (!rtChar) continue; // Character had no data → dropped in reverse conversion
      const rtPages = rtState.pages[rtChar.id]?.GEN;
      if (!rtPages) continue;

      // Compare page-by-page to avoid name collisions between profiles
      const minPages = Math.min(origPages.length, rtPages.length);
      for (let pageIdx = 0; pageIdx < minPages; pageIdx++) {
        const origPage = origPages[pageIdx];
        const rtPage = rtPages[pageIdx];
        const minSetups = Math.min(origPage.setups.length, rtPage.setups.length);

        for (let setupIdx = 0; setupIdx < minSetups; setupIdx++) {
          const origSetup = origPage.setups[setupIdx];
          const rtSetup = rtPage.setups[setupIdx];
          for (const [slot, piece] of Object.entries(origSetup.gear)) {
            if (typeof piece.link === 'string' && piece.link.startsWith('|H')) {
              expect(rtSetup.gear[Number(slot)]?.link).toBe(piece.link);
              itemLinkCount++;
            }
          }
        }
      }
    }

    // We should have verified at least some item links
    expect(itemLinkCount).toBeGreaterThan(10);
  });

  it('preserves the "Bosses" setup data through Lua round-trip', () => {
    // Parse → LoadoutState → AlphaGear → Lua → reparse → LoadoutState
    const result = parseAlphaGearSavedVariables(luaContent)!;
    const state = convertAlphaGearToLoadoutState(result.characters);
    const agData = convertLoadoutStateToAlphaGear(state);
    const luaOutput = serializeAlphaGearToLua(agData);
    const reparsed = parseAlphaGearSavedVariables(luaOutput)!;
    const rtState = convertAlphaGearToLoadoutState(reparsed.characters);

    // Find the "Bosses" setup in the round-tripped state
    const tzuId = rtState.characters.find((c) => c.name === 'z Tzu')!.id;
    const rtSetups = rtState.pages[tzuId]!.GEN!.flatMap((p) => p.setups);
    const bosses = rtSetups.find((s) => s.name === 'Bosses');
    expect(bosses).toBeDefined();

    // Front bar: AG skill 1 (ability 24328) → internal slot 3
    expect(bosses!.skills[0][3]).toBe(24328);

    // Back bar should still be populated (from the paired set 2)
    expect(Object.keys(bosses!.skills[1]).length).toBeGreaterThan(0);

    // Main Hand weapon (item:106812) should be in slot 4
    expect(bosses!.gear[4]?.link).toContain('item:106812');
  });
});
