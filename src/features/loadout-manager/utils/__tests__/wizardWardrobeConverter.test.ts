/**
 * @jest-environment jsdom
 */

import { convertAllCharactersToLoadoutState } from '../wizardWardrobeConverter';
import type { ChampionPointsConfig, WizardWardrobeExport } from '../../types/loadout.types';

describe('wizardWardrobeConverter', () => {
  it('normalizes champion point arrays into 1-based slot maps', () => {
    const wizardData: WizardWardrobeExport = {
      version: 1,
      selectedZoneTag: 'SUB',
      setups: {
        SUB: [
          {
            1: {
              name: 'Test Setup',
              disabled: false,
              condition: { boss: 'Test Boss' },
              skills: { 0: {}, 1: {} },
              cp: [
                92, 82, 66, 78, 24, 28, 263, 262, 2, 34, 270, 56,
              ] as unknown as ChampionPointsConfig,
              food: {},
              gear: {},
              code: '',
            },
          },
        ],
      },
      pages: {
        SUB: [{ name: 'Page 1' }],
      },
      $LastCharacterName: 'Test Person',
    };

    const state = convertAllCharactersToLoadoutState({ characterKey: wizardData });
    const characterId = 'test-person-characterKey';
    const cpConfig = state.pages[characterId].SUB[0].setups[0].cp;

    expect(cpConfig[1]).toBe(92);
    expect(cpConfig[12]).toBe(56);
    expect(cpConfig[0]).toBeUndefined();
    expect(Object.keys(cpConfig)).toContain('1');
    expect(Object.keys(cpConfig)).toContain('12');
  });

  it('maps tree-structured champion point exports into slot indices', () => {
    const wizardData: WizardWardrobeExport = {
      version: 1,
      selectedZoneTag: 'SS',
      setups: {
        SS: [
          {
            1: {
              name: 'Tree CP Setup',
              disabled: false,
              condition: {},
              skills: { 0: {}, 1: {} },
              cp: {
                green: {
                  1: 101,
                  2: 102,
                  3: 103,
                  4: 104,
                },
                blue: [201, 202, 203],
                red: {
                  1: 301,
                  2: 302,
                },
              } as unknown as ChampionPointsConfig,
              food: {},
              gear: {},
            },
          },
        ],
      },
      pages: {
        SS: [{ name: 'Page 1' }],
      },
      $LastCharacterName: 'Test Person',
    };

    const state = convertAllCharactersToLoadoutState({ characterKey: wizardData });
    const characterId = 'test-person-characterKey';
    const cpConfig = state.pages[characterId].SS[0].setups[0].cp;

    expect(cpConfig[1]).toBe(101);
    expect(cpConfig[4]).toBe(104);
    expect(cpConfig[5]).toBe(201);
    expect(cpConfig[7]).toBe(203);
    expect(cpConfig[9]).toBe(301);
    expect(cpConfig[10]).toBe(302);
    expect(cpConfig[8]).toBeUndefined();
    expect(cpConfig[12]).toBeUndefined();
  });

  it('preserves food id and link when present', () => {
    const wizardData: WizardWardrobeExport = {
      version: 1,
      selectedZoneTag: 'SS',
      setups: {
        SS: [
          {
            1: {
              name: 'Food Test',
              disabled: false,
              condition: {},
              skills: { 0: {}, 1: {} },
              cp: {},
              food: {
                id: 87697,
                link: '|H0:item:87697:5:1:0:0:0:0:0:0:0:0:0:0:0:0:0:1:0:0:0:0|h|h',
              },
              gear: {},
            },
          },
        ],
      },
      pages: {
        SS: [{ name: 'Page 1' }],
      },
      $LastCharacterName: 'Test Person',
    };

    const state = convertAllCharactersToLoadoutState({ characterKey: wizardData });
    const characterId = 'test-person-characterKey';
    const foodConfig = state.pages[characterId].SS[0].setups[0].food;

    expect(foodConfig.id).toBe(87697);
    expect(foodConfig.link).toBe('|H0:item:87697:5:1:0:0:0:0:0:0:0:0:0:0:0:0:0:1:0:0:0:0|h|h');
  });

  it('maps Wizard Wardrobe gear indices to the correct internal slots', () => {
    const makeLink = (itemId: number) =>
      `|H0:item:${itemId}:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h`;

    const wizardData: WizardWardrobeExport = {
      version: 1,
      selectedZoneTag: 'SS',
      setups: {
        SS: [
          {
            1: {
              name: 'Gear Slots Test',
              disabled: false,
              condition: {},
              skills: { 0: {}, 1: {} },
              cp: {},
              food: {},
              gear: {
                11: { link: makeLink(1115), id: 'ring-1' },
                12: { link: makeLink(1116), id: 'ring-2' },
                16: { link: makeLink(6027), id: 'hands' },
                20: { link: makeLink(117099), id: 'back-main' },
                21: { link: makeLink(117100), id: 'back-off' },
              },
            },
          },
        ],
      },
      pages: {
        SS: [{ name: 'Page 1' }],
      },
      $LastCharacterName: 'Slot Tester',
    };

    const state = convertAllCharactersToLoadoutState({ charKey: wizardData });
    const characterId = 'slot-tester-charKey';
    const gear = state.pages[characterId].SS[0].setups[0].gear;

  expect(gear[11]?.link).toContain('item:1115');
  expect(gear[12]?.link).toContain('item:1116');
  expect(gear[16]?.link).toContain('item:6027');
  expect(gear[20]?.link).toContain('item:117099');
  expect(gear[21]?.link).toContain('item:117100');
    expect(gear[10]).toBeUndefined();
  });
});
