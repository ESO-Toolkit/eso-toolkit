/**
 * Regression tests for scribing AFFIX detection accuracy.
 *
 * Primary case: report 3q6hFmcMzBN1TpVA, fight 34, player 93 (@blueblaze103, Arcanist Banner Bearer).
 * The user ran the COURAGE affix but the app reported BERSERK. Two compounding root causes:
 *   1. DATA: the Courage affix was missing the ability IDs real logs emit — Minor Courage 147417 and
 *      Major Courage 109966 — so Courage was never even a detection candidate (fixed in
 *      data/scribing-complete.json v6.4).
 *   2. ALGORITHM: detectAffixScripts (a) discarded ally-targeted banner buffs via a self-only target
 *      filter, (b) counted an unrelated, light-attack-cadence Minor Berserk that drifted into windows,
 *      and (c) emitted that 0.21-consistency / 0-immediate match with no confidence floor.
 *
 * These tests exercise the real computeScribingDetection() with synthetic combat events whose timing
 * signature mirrors the live log (banner pulses ~10s apart applying Minor Courage to ALLIES at +0ms;
 * Minor Berserk drifting in at ~275ms light-attack cadence from another source).
 */

import { computeScribingDetection } from '../scribingDetectionAnalysis';
import type { CombatEventData } from '../scribingDetectionAnalysis';
import type { BuffEvent } from '../../../../types/combatlogEvents';

const SHOCKING_BANNER = 217706; // Banner Bearer (shock-damage focus) — the scribed skill in the log
const MINOR_COURAGE = 147417; // the id real logs emit (was missing from the dataset pre-v6.4)
const MINOR_BERSERK = 61744; // unrelated, fired by another source at light-attack cadence

const CASTER = 93;
const ALLY_IDS = [1, 2, 3, 49, 120, 267, 283]; // banner Courage lands on allies, never the caster

// Banner pulse timestamps (~10s cadence) taken from the real log.
const BANNER_PULSES = [
  6040409, 6049397, 6059421, 6064398, 6070410, 6075390, 6079396, 6087414, 6096389, 6101389, 6102396,
  6103436, 6104408, 6108405, 6109387, 6114432, 6115421, 6117387, 6120393, 6122406, 6128409, 6130384,
  6136417, 6143388,
];

function buff(
  abilityGameID: number,
  timestamp: number,
  sourceID: number,
  targetID: number,
  type: BuffEvent['type'] = 'applybuff',
): BuffEvent {
  return {
    timestamp,
    type,
    sourceID,
    targetID,
    sourceIsFriendly: true,
    targetIsFriendly: true,
    abilityGameID: abilityGameID,
    fight: 34,
  } as BuffEvent;
}

function buildBlueblazeEvents(options: { includeCourage: boolean }): CombatEventData {
  const buffs: BuffEvent[] = [];

  BANNER_PULSES.forEach((pulse, i) => {
    // The banner itself is cast-less; its buff application drives the synthetic cast.
    buffs.push(buff(SHOCKING_BANNER, pulse, CASTER, CASTER));

    if (options.includeCourage) {
      // Minor Courage applies at the SAME instant as the pulse, but to an ALLY (never the caster).
      buffs.push(buff(MINOR_COURAGE, pulse, CASTER, ALLY_IDS[i % ALLY_IDS.length]));
    }
  });

  // Unrelated Minor Berserk from another source: light-attack cadence (~275ms), self-targeted.
  // It drifts into ~5 of the 24 banner windows (matching the live 0.21 consistency, 0 immediate-ratio).
  let t = BANNER_PULSES[0] + 60;
  for (let i = 0; i < 90; i++) {
    buffs.push(buff(MINOR_BERSERK, t, CASTER, CASTER));
    t += 275;
  }

  return { buffs, debuffs: [], damage: [], casts: [], heals: [], resources: [] };
}

describe('Scribing affix detection accuracy — blueblaze103 Courage case', () => {
  it('detects Courage (not Berserk) for an Arcanist Banner Bearer applying Minor Courage to allies', () => {
    const result = computeScribingDetection({
      abilityId: SHOCKING_BANNER,
      playerId: CASTER,
      combatEvents: buildBlueblazeEvents({ includeCourage: true }),
    });

    expect(result).not.toBeNull();
    const affixes = result?.scribedSkillData?.affixScripts ?? [];
    const names = affixes.map((a) => a.name);

    expect(names).toContain('Courage');
    expect(names).not.toContain('Berserk');
  });

  it('degrades to Unknown Affix (NOT a confident wrong Berserk) when no real affix is present', () => {
    // Pre-data-fix reproduction: Courage is absent, only the unrelated low-consistency Berserk drifts in.
    // The confidence floor must suppress it rather than naming a wrong script.
    const result = computeScribingDetection({
      abilityId: SHOCKING_BANNER,
      playerId: CASTER,
      combatEvents: buildBlueblazeEvents({ includeCourage: false }),
    });

    expect(result).not.toBeNull();
    const names = (result?.scribedSkillData?.affixScripts ?? []).map((a) => a.name);
    expect(names).not.toContain('Berserk');
    // The only emitted affix (if any) should be the honest "Unknown Affix" fallback.
    names.forEach((name) => expect(name).toBe('Unknown Affix'));
  });
});
