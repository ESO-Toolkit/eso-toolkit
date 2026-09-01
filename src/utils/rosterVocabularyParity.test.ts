import {
  CHAMPION_POINT_LIST as BOT_CHAMPION_POINTS,
  CLASS_SKILL_LINES as BOT_CLASS_SKILL_LINES,
  COMPOSITION_LIMITS as BOT_COMPOSITION_LIMITS,
  DEFAULT_COMPOSITION as BOT_DEFAULT_COMPOSITION,
  HEALER_BUFF_LIST as BOT_HEALER_BUFFS,
  JAIL_DD_TYPE_LIST as BOT_JAIL_DD_TYPES,
  ULTIMATE_LIST as BOT_ULTIMATES,
} from '../../discord-bot/src/roster/encoding-vocabulary';
import { CLASS_SKILL_LINES as BUILDER_CLASS_SKILL_LINES } from '../features/build-editor/data/esoStaticData';
import { CLASS_SKILL_LINES, DEFAULT_COMPOSITION } from '../types/roster';

import {
  ROSTER_CHAMPION_POINT_VOCABULARY,
  ROSTER_COMPOSITION_LIMITS,
  ROSTER_HEALER_BUFF_VOCABULARY,
  ROSTER_JAIL_DD_TYPE_VOCABULARY,
  ROSTER_ULTIMATE_VOCABULARY,
} from './rosterEncoding';

describe('compact roster vocabulary parity', () => {
  it('keeps frontend and bot wire indexes identical', () => {
    expect(BOT_CLASS_SKILL_LINES).toEqual(CLASS_SKILL_LINES);
    expect(BOT_ULTIMATES).toEqual(ROSTER_ULTIMATE_VOCABULARY);
    expect(BOT_HEALER_BUFFS).toEqual(ROSTER_HEALER_BUFF_VOCABULARY);
    expect(BOT_CHAMPION_POINTS).toEqual(ROSTER_CHAMPION_POINT_VOCABULARY);
    expect(BOT_JAIL_DD_TYPES).toEqual(ROSTER_JAIL_DD_TYPE_VOCABULARY);
    expect(BOT_DEFAULT_COMPOSITION).toEqual(DEFAULT_COMPOSITION);
    expect(BOT_COMPOSITION_LIMITS).toEqual(ROSTER_COMPOSITION_LIMITS);
  });

  it('keeps roster-builder labels aligned with the wire vocabulary', () => {
    expect(BUILDER_CLASS_SKILL_LINES.map(({ label }) => label)).toEqual(CLASS_SKILL_LINES);
  });
});
