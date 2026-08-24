import { CLASS_COLOR_MAP, type ClassTheme } from '../../build-editor/theme/classColorMap';
import type { ESOClass } from '../../build-editor/types/build.types';

const CLASS_KEYS = new Set<ESOClass>(Object.keys(CLASS_COLOR_MAP) as ESOClass[]);

export const DPS_DATA_COLOR = '#f59e0b';

export function getLeaderboardClassTheme(esoClass: string): ClassTheme {
  const normalized = esoClass.toLowerCase().replace(/[^a-z]/g, '') as ESOClass;
  return CLASS_KEYS.has(normalized) ? CLASS_COLOR_MAP[normalized] : CLASS_COLOR_MAP['any-class'];
}
