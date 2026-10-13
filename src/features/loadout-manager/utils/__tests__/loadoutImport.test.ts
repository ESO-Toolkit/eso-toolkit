import type { LoadoutSetup, LoadoutState } from '../../types/loadout.types';
import { parseLoadoutImport } from '../loadoutImport';

const setup: LoadoutSetup = {
  name: 'Boss setup',
  disabled: false,
  condition: { boss: 'Boss', trash: -1 },
  skills: { 0: { 3: 123, 8: 456 }, 1: {} },
  cp: { 1: 789 },
  food: { id: 1234, link: '|H1:item:1234|h|h' },
  gear: { 0: { id: '123', weight: 'heavy', trait: 'divines', enchant: 'magicka' }, mythic: 0 },
  code: 'Notes',
};
const backup: LoadoutState = {
  currentCharacter: 'character',
  currentTrial: 'GEN',
  currentPage: 0,
  mode: 'advanced',
  characters: [{ id: 'character', name: 'Character', skillLines: ['Warden_Green Balance'] }],
  pages: { character: { GEN: [{ name: 'Main page', setups: [setup] }] } },
};

describe('loadout JSON imports', () => {
  it('round-trips a complete backup with gear, bars, conditions and character metadata', () => {
    expect(parseLoadoutImport(JSON.stringify(backup), backup)).toEqual(backup);
  });

  it('restores the current ExportDialog format without overwriting existing characters', () => {
    const original = JSON.stringify(backup);
    const file = JSON.stringify({
      version: 1,
      exportDate: '2026-10-03',
      trial: { id: 'GEN', name: 'General' },
      setups: [setup],
    });
    const first = parseLoadoutImport(file, backup);
    const second = parseLoadoutImport(file, first);
    expect(first.pages['imported-loadout'].GEN[0].setups).toEqual([setup]);
    expect(second.currentCharacter).toBe('imported-loadout-1');
    expect(second.pages.character).toEqual(backup.pages.character);
    expect(second.characters).toHaveLength(3);
    expect(JSON.stringify(backup)).toBe(original);
  });

  it.each([
    null,
    [],
    { pages: {}, characters: null },
    { ...backup, currentPage: -1 },
    { ...backup, mode: 'invalid' },
    { ...backup, characters: [null] },
    { ...backup, characters: [backup.characters[0], backup.characters[0]] },
    { ...backup, currentCharacter: 'missing' },
    { ...backup, pages: { character: null } },
    { ...backup, pages: { character: { GEN: {} } } },
    { ...backup, pages: { character: { GEN: [null] } } },
    { ...backup, pages: { character: { GEN: [{ name: 'Page', setups: null }] } } },
  ])('rejects malformed state before it can replace existing data: %j', (input) => {
    const original = JSON.stringify(backup);
    expect(() => parseLoadoutImport(JSON.stringify(input), backup)).toThrow('Invalid loadout JSON');
    expect(JSON.stringify(backup)).toBe(original);
  });

  it.each([
    { gear: { 0: null } },
    { gear: { 0: 123 } },
    { gear: { mythic: {} } },
    { gear: { 0: { id: {} } } },
    { gear: { 0: { weight: 'paper' } } },
    { skills: null },
    { skills: { 0: {}, 1: [] } },
    { skills: { 0: { 3: '123' }, 1: {} } },
    { skills: { 0: { 3: -1 }, 1: {} } },
    { cp: { 1: null } },
    { condition: { boss: [] } },
    { food: { id: {} } },
    { disabled: 'false' },
  ])('rejects malformed nested setup data: %j', (changes) => {
    const input = {
      ...backup,
      pages: { character: { GEN: [{ name: 'Page', setups: [{ ...setup, ...changes }] }] } },
    };
    expect(() => parseLoadoutImport(JSON.stringify(input), backup)).toThrow('Invalid loadout JSON');
  });

  it.each(['__proto__', 'constructor', 'prototype'])('rejects unsafe map keys: %s', (key) => {
    const input = JSON.stringify(backup).replace('"GEN":', `"${key}":`);
    expect(() => parseLoadoutImport(input, backup)).toThrow('unsafe property');
    expect({}).not.toHaveProperty('polluted');
  });

  it('accepts an empty backup', () => {
    const empty: LoadoutState = {
      currentCharacter: null,
      currentTrial: 'GEN',
      currentPage: 0,
      mode: 'advanced',
      characters: [],
      pages: {},
    };
    expect(parseLoadoutImport(JSON.stringify(empty), backup)).toEqual(empty);
  });

  it('does not interpret a corrupt full backup as a page export', () => {
    const input = {
      ...backup,
      characters: null,
      version: 1,
      trial: { id: 'GEN', name: 'General' },
      setups: [setup],
    };
    expect(() => parseLoadoutImport(JSON.stringify(input), backup)).toThrow('Invalid loadout JSON');
  });
});
