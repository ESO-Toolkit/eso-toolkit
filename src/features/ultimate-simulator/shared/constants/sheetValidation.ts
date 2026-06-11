/**
 * SHEET VALIDATION preset — reproduces the original Google Sheet's exact numbers
 * so the engine has a known-good regression target ("validate, then extend").
 *
 * These rows mirror the sheet's `Ticks` and `Raw Ult per Tick` columns literally,
 * including its quirks (Implacable fixed at 15 ticks, not 180/8). The sheet's
 * Decisive figures decode to:
 *   - Half  ≈ 0.2768 per eligible instance  → 112.06 over 404.8 instances
 *   - Full  ≈ 0.5387 per eligible instance  → 218.06 (a LINEAR 2× of ~0.2694,
 *     which slightly overstates a real 2H weapon vs the correct binomial
 *     1-(1-p)^2; the real raid preset uses the binomial instead).
 *
 * Do not "improve" these — they exist to lock the port's fidelity to the sheet.
 */

import type { UltimateSource } from '../types';

export const SHEET_FIGHT_DURATION_SECONDS = 180;

/** Total ult-gain instances the sheet sums (row 21, "SUM Ticks"). */
export const SHEET_SUM_TICKS = 404.8;

/** The sheet's reported Decisive means (Monte Carlo over 100 runs). */
export const SHEET_DECISIVE_HALF = 112.06;
export const SHEET_DECISIVE_FULL = 218.06;

/** The sheet's decoded per-eligible-instance Decisive values. */
export const SHEET_DECISIVE_HALF_PER_INSTANCE = SHEET_DECISIVE_HALF / SHEET_SUM_TICKS; // ≈ 0.2768
export const SHEET_DECISIVE_FULL_PER_INSTANCE = SHEET_DECISIVE_FULL / SHEET_SUM_TICKS; // ≈ 0.5387

/**
 * The sheet's five non-Decisive rows, expressed so that
 *   instancesPerSecond * duration * uptime === sheet "Ticks"
 * and amountPerInstance === sheet "Raw Ult per Tick".
 *
 * Encoded as uptime=1 with instancesPerSecond = ticks/duration so the instance
 * counts reproduce the sheet exactly (the sheet already folded uptime into ticks).
 */
function row(id: string, label: string, ticks: number, ultPerTick: number): UltimateSource {
  return {
    id,
    label,
    kind: 'periodic',
    amountPerInstance: ultPerTick,
    instancesPerSecond: ticks / SHEET_FIGHT_DURATION_SECONDS,
    uptime: 1,
    rollsDecisive: true,
  };
}

export const SHEET_VALIDATION_SOURCES: readonly UltimateSource[] = [
  row('minor-heroism', 'Minor Heroism', 114, 1),
  row('implacable-outcome', 'Implacable Outcome', 15, 4),
  row('major-heroism', 'Major Heroism', 93.6, 3),
  row('base', 'Base', 178.2, 3),
  row('pillagers-profit', "Pillager's Profit", 4, 50),
  // Cryptcannon row in the sheet is disabled (0 ticks) — omitted.
];
