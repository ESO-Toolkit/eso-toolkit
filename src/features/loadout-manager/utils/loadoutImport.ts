import { z } from 'zod';

import type { LoadoutState } from '../types/loadout.types';

const safeKey = z
  .string()
  .min(1)
  .refine((key) => !['__proto__', 'constructor', 'prototype'].includes(key));
const slot = z.string().regex(/^(0|[1-9]\d*)$/);
const id = z.number().int().nonnegative().safe();
const bar = z.record(slot, id);
const setup = z.object({
  name: z.string(),
  disabled: z.boolean(),
  condition: z.object({ boss: z.string().optional(), trash: z.number().int().optional() }),
  skills: z.object({ 0: bar, 1: bar }),
  cp: bar,
  food: z.object({ link: z.string().optional(), id: id.optional() }),
  gear: z
    .record(
      z.union([slot, z.literal('mythic')]),
      z.union([
        id,
        z.object({
          link: z.string().optional(),
          id: z.union([z.string(), id]).optional(),
          trait: z.string().optional(),
          enchant: z.string().optional(),
          weight: z.enum(['light', 'medium', 'heavy']).optional(),
        }),
      ]),
    )
    .refine((gear) =>
      Object.entries(gear).every(([key, value]) =>
        key === 'mythic' ? typeof value === 'number' : typeof value === 'object',
      ),
    ),
  code: z.string().optional(),
});
const page = z.object({ name: z.string(), setups: z.array(setup) });
const stateSchema = z
  .object({
    currentCharacter: safeKey.nullable(),
    characters: z.array(
      z.object({
        id: safeKey,
        name: z.string(),
        // Values are checked structurally here so future class lines remain importable.
        skillLines: z.array(z.string()).max(3).optional(),
        role: z.string().optional(),
      }),
    ),
    currentTrial: safeKey.nullable(),
    currentPage: id,
    mode: z.enum(['basic', 'advanced']),
    pages: z.record(safeKey, z.record(safeKey, z.array(page))),
  })
  .refine((state) => {
    const characterIds = new Set(state.characters.map((character) => character.id));
    return (
      characterIds.size === state.characters.length &&
      (state.currentCharacter === null || characterIds.has(state.currentCharacter)) &&
      Object.keys(state.pages).every((key) => characterIds.has(key))
    );
  }, 'Character references must match the character list');
const pageExportSchema = z.object({
  version: z.literal(1),
  trial: z.object({ id: safeKey, name: z.string() }),
  setups: z.array(setup),
});

/** Validate the entire file before returning anything that can replace persisted state. */
export function parseLoadoutImport(text: string, existingState: LoadoutState): LoadoutState {
  const input: unknown = JSON.parse(text, (key: string, value: unknown): unknown => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      throw new Error('Invalid loadout JSON: unsafe property name.');
    }
    return value;
  });
  const fullState = stateSchema.safeParse(input);
  if (fullState.success) {
    // The schema checks all runtime fields; class-line strings remain forward compatible.
    return fullState.data as LoadoutState;
  }
  // ExportDialog historically exports the selected page, not a whole-state backup.
  // Restore it as a separate character so importing never overwrites existing setups.
  const exportedPage = pageExportSchema.safeParse(input);
  const isFullState =
    typeof input === 'object' && input !== null && ('pages' in input || 'characters' in input);
  if (exportedPage.success && !isFullState) {
    const { trial, setups } = exportedPage.data;
    let characterId = 'imported-loadout';
    let suffix = 1;
    while (
      existingState.characters.some((character) => character.id === characterId) ||
      Object.hasOwn(existingState.pages, characterId)
    ) {
      characterId = `imported-loadout-${suffix++}`;
    }
    return {
      ...existingState,
      currentCharacter: characterId,
      currentTrial: trial.id,
      currentPage: 0,
      characters: [...existingState.characters, { id: characterId, name: 'Imported loadout' }],
      pages: {
        ...existingState.pages,
        [characterId]: {
          [trial.id]: [
            {
              name: trial.name,
              setups: setups as LoadoutState['pages'][string][string][number]['setups'],
            },
          ],
        },
      },
    };
  }
  throw new Error(
    'Invalid loadout JSON. Choose a loadout backup or a JSON file exported by Loadout Manager.',
  );
}
