/**
 * Trial difficulty / Hard Mode determination for a run.
 *
 * ESO specifics that this encodes (and that the old per-fight heuristic got
 * wrong):
 *   - **Mini-bosses have no Hard Mode.** Spiral Descender, Bow Breaker, Sail
 *     Ripper, Haj Mota, etc. are always Veteran, so they must NOT drag a full-HM
 *     clear down to "Partial Veteran HM".
 *   - HM is judged on the **kill** difficulty of the HM-capable bosses, not on
 *     wipes. Wiping a boss on Veteran and later killing it on HM is an HM kill.
 *   - Most trials are **linear** (per-boss HM, or final-boss-only HM). Cloudrest
 *     and Asylum Sanctorium are **"skip to the end"** trials whose HM is encoded
 *     as +0..+3 difficulty codes (122–125) on the final boss.
 *
 * Getting HM right is the foundation for trifecta reasoning (Veteran HM + speed
 * + no-death), so this is intentionally explicit and unit-tested.
 */

import type { RunEncounter } from './fightGrouping';
import { isBossFight, wasKill } from './fightGrouping';

// ESO Logs difficulty codes for trials: Normal ≤ 120, Veteran 121,
// Veteran Hard Mode 122 (Cloudrest/Asylum go 123/124/125 for +1/+2/+3).
const VETERAN = 121;
const VETERAN_HM = 122; // +0; Cloudrest/Asylum go 123/124/125 for +1/+2/+3.

/** A positive difficulty code below Veteran (e.g. 120) is a Normal clear. */
function isNormalCode(d: number): boolean {
  return d > 0 && d < VETERAN;
}

/**
 * Lowercased name fragments for bosses that have **no Hard Mode option** —
 * mini-bosses and optional "trash bosses". They are always Veteran and are
 * excluded from the trial's HM determination.
 */
const NON_HM_BOSS_TOKENS: readonly string[] = [
  // Mini-bosses
  'haj mota',
  'bow breaker',
  'sail ripper',
  'spiral descender',
  'the hollow one',
  'gedna relvel',
  'tortured trio',
  'tortured amkaos',
  'tortured kathutet',
  'tortured ranyu',
  'blood drinker thisa',
  // Optional non-HM bosses
  'basks-in-snakes',
  'basks-in-snake',
  'ash titan',
];

/** True when a boss can be done on Hard Mode (i.e. is not a mini / non-HM boss). */
export function isHmCapableBoss(name: string | null | undefined): boolean {
  const n = (name ?? '').toLowerCase();
  if (!n) return true;
  return !NON_HM_BOSS_TOKENS.some((token) => n.includes(token));
}

export type TrialHMType = 'per-boss' | 'final-boss-only' | 'special';

/** How a trial exposes Hard Mode. */
export function getTrialHMType(trialName: string): TrialHMType {
  const specialTrials = ['Cloudrest', 'Asylum'];
  if (specialTrials.some((t) => trialName.includes(t))) return 'special';

  const perBossHMTrials = [
    'Sunspire',
    "Kyne's Aegis",
    'Rockgrove',
    'Dreadsail Reef',
    "Sanity's Edge",
    'Lucent Citadel',
    'Ossein Cage',
    'Opulent Ordeal',
  ];
  if (perBossHMTrials.some((t) => trialName.includes(t))) return 'per-boss';

  return 'final-boss-only';
}

export interface RunDifficulty {
  /** Representative difficulty code (e.g. 122). 0 when normal/unknown. */
  difficulty: number;
  /** Human label, or null for a bossless segment. */
  label: string | null;
}

/**
 * The difficulty a boss encounter was *completed* at: the highest difficulty
 * among its kills, or — if it was never killed — the highest difficulty it was
 * attempted at (so an in-progress HM prog still reads as HM).
 */
function encounterResultDifficulty(encounter: RunEncounter): number {
  const bosses = encounter.bossFights.filter(isBossFight);
  const kills = bosses.filter(wasKill);
  const pool = kills.length > 0 ? kills : bosses;
  return pool.reduce((max, f) => Math.max(max, f.difficulty ?? 0), 0);
}

/**
 * Determine the overall difficulty/HM label for a run from its encounters.
 *
 * Returns `{ label: null }` for a run with no boss encounters (pure trash).
 */
export function determineRunDifficulty(
  encounters: readonly RunEncounter[],
  zoneName: string,
): RunDifficulty {
  const bossEncounters = encounters.filter((e) => e.bossFights.some(isBossFight));
  if (bossEncounters.length === 0) return { difficulty: 0, label: null };

  const hmType = getTrialHMType(zoneName);

  if (hmType === 'special') {
    // Cloudrest / Asylum: HM (and +1/+2/+3) is encoded on the final-boss kill.
    const killed = bossEncounters
      .map((e) => {
        const kills = e.bossFights.filter((f) => isBossFight(f) && wasKill(f));
        return kills.reduce((m, f) => Math.max(m, f.difficulty ?? 0), 0);
      })
      .filter((d) => d > 0);
    const code = killed.length
      ? Math.max(...killed)
      : Math.max(0, ...bossEncounters.map(encounterResultDifficulty));

    if (code >= 125) return { difficulty: 125, label: 'Veteran HM +3' };
    if (code >= 124) return { difficulty: 124, label: 'Veteran HM +2' };
    if (code >= 123) return { difficulty: 123, label: 'Veteran HM +1' };
    if (code >= VETERAN_HM) return { difficulty: VETERAN_HM, label: 'Veteran HM' };
    if (code >= VETERAN) return { difficulty: VETERAN, label: 'Veteran' };
    return { difficulty: 0, label: 'Normal' };
  }

  // Per-boss and final-boss-only: only HM-capable bosses count toward HM status.
  const hmCapable = bossEncounters.filter((e) => isHmCapableBoss(e.name));
  const pool = hmCapable.length > 0 ? hmCapable : bossEncounters;
  const results = pool.map(encounterResultDifficulty);

  const hm = results.filter((d) => d >= VETERAN_HM).length;
  const vet = results.filter((d) => d === VETERAN).length;
  const normal = results.filter((d) => isNormalCode(d)).length;

  if (hmType === 'final-boss-only') {
    // Older trials: HM lives only on the final boss, so any HM-capable HM kill
    // makes the run HM.
    if (hm > 0) return { difficulty: VETERAN_HM, label: 'Veteran HM' };
    if (vet > 0) return { difficulty: VETERAN, label: 'Veteran' };
    if (normal > 0) return { difficulty: 0, label: 'Normal' };
    return { difficulty: VETERAN, label: 'Veteran' };
  }

  // per-boss
  if (hm > 0 && vet === 0) return { difficulty: VETERAN_HM, label: 'Veteran HM' };
  if (hm > 0 && vet > 0) return { difficulty: VETERAN_HM, label: 'Partial Veteran HM' };
  if (vet > 0) return { difficulty: VETERAN, label: 'Veteran' };
  if (normal > 0) return { difficulty: 0, label: 'Normal' };
  return { difficulty: VETERAN, label: 'Veteran' };
}
