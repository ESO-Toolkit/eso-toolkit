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

describe('Scribing signature detection — grimoire-compatibility filter', () => {
  // Sage's Remedy (214987) is compatible with Banner Bearer; Leeching Thirst (217189) is NOT
  // (traveling-knife / smash only). Both fire at every banner pulse — the detector must pick the
  // grimoire-compatible Sage's Remedy and ignore the incompatible Leeching Thirst, even though
  // both reach the consistency threshold.
  const SAGES_REMEDY = 214987; // banner-compatible signature effect
  const LEECHING_THIRST = 217189; // traveling-knife/smash-only signature effect

  it('ignores a signature effect that is not compatible with the skill grimoire', () => {
    const buffs: BuffEvent[] = [];
    BANNER_PULSES.forEach((pulse) => {
      buffs.push(buff(SHOCKING_BANNER, pulse, CASTER, CASTER));
      // both signatures' effects land shortly after every banner pulse
      buffs.push(buff(SAGES_REMEDY, pulse + 50, CASTER, ALLY_IDS[0]));
      buffs.push(buff(LEECHING_THIRST, pulse + 60, CASTER, CASTER));
    });

    const result = computeScribingDetection({
      abilityId: SHOCKING_BANNER,
      playerId: CASTER,
      combatEvents: { buffs, debuffs: [], damage: [], casts: [], heals: [], resources: [] },
    });

    expect(result).not.toBeNull();
    const sig = result?.scribedSkillData?.signatureScript?.name;
    expect(sig).toBe("Sage's Remedy");
    expect(sig).not.toBe('Leeching Thirst');
  });
});

describe('Scribing affix detection — maintained-group-debuff guard', () => {
  // A Soul Burst caster who keeps Major Breach (61742) up on the boss group-wide would otherwise
  // have it mis-detected as their affix: it lands in nearly every cast window at high consistency
  // with no immediate-trigger signature, exactly like the original Courage→Berserk failure but for
  // debuffs. Because the player applies Breach far more than once per scribed cast (maintained), it
  // must be dropped in favour of the genuine once-per-cast affix (here, Maim 61723).
  const MAGICAL_BURST = 217459; // Soul Burst (magic-damage focus)
  const MAJOR_BREACH = 61742; // soul-burst-compatible debuff, kept up group-wide
  const MINOR_MAIM = 61723; // soul-burst-compatible debuff, the genuine once-per-cast affix
  const BOSS = 200;

  function debuff(
    abilityGameID: number,
    timestamp: number,
    sourceID: number,
    targetID: number,
  ): BuffEvent {
    return {
      timestamp,
      type: 'applydebuff',
      sourceID,
      targetID,
      sourceIsFriendly: true,
      targetIsFriendly: false,
      abilityGameID,
      fight: 34,
    } as BuffEvent;
  }

  it('drops a maintained group debuff in favour of the genuine once-per-cast affix', () => {
    const casts: import('../../../../types/combatlogEvents').UnifiedCastEvent[] = [];
    const debuffs: BuffEvent[] = [];
    const castTimes = Array.from({ length: 10 }, (_, i) => 1_000_000 + i * 3000);

    castTimes.forEach((t) => {
      casts.push({
        timestamp: t,
        type: 'cast',
        sourceID: CASTER,
        targetID: BOSS,
        sourceIsFriendly: true,
        targetIsFriendly: false,
        abilityGameID: MAGICAL_BURST,
        fight: 34,
      } as import('../../../../types/combatlogEvents').UnifiedCastEvent);

      // Maim: exactly one application per cast (the real affix) — apc ~1.
      debuffs.push(debuff(MINOR_MAIM, t + 40, CASTER, BOSS));

      // Breach: maintained group-wide — re-applied every ~500ms (~6 per 3s cast window) — apc ~6.
      for (let k = 0; k < 6; k++) {
        debuffs.push(debuff(MAJOR_BREACH, t + 40 + k * 500, CASTER, BOSS));
      }
    });

    const result = computeScribingDetection({
      abilityId: MAGICAL_BURST,
      playerId: CASTER,
      combatEvents: { buffs: [], debuffs, damage: [], casts, heals: [], resources: [] },
    });

    expect(result).not.toBeNull();
    const names = (result?.scribedSkillData?.affixScripts ?? []).map((a) => a.name);
    expect(names).not.toContain('Breach');
    expect(names).toContain('Maim');
  });
});
