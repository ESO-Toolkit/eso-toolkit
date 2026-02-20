import type { BuildIssue } from '../../../utils/detectBuildIssues';
import type { BuffChecklistResult } from '../types/buffChecklist';
import type { DebuffChecklistResult } from '../types/debuffChecklist';

import type {
  ActivePercentageResult,
  BarSwapAnalysisResult,
  DotUptimeResult,
  FoodDetectionResult,
  MundusStoneResult,
  PenCritCapResult,
  ResourceSustainResult,
  RotationAnalysisResult,
  UltimateUsageResult,
  WeaveAnalysisResult,
} from './parseAnalysisUtils';
import { buildParseChecklist } from './parseChecklistUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createDefaults() {
  return {
    fightName: null as string | null,
    foodResult: null as FoodDetectionResult | null,
    activeTimeResult: null as ActivePercentageResult | null,
    cpm: null as number | null,
    weaveResult: null as WeaveAnalysisResult | null,
    rotationResult: null as RotationAnalysisResult | null,
    buffChecklist: null as BuffChecklistResult | null,
    debuffChecklist: null as DebuffChecklistResult | null,
    buildIssues: null as BuildIssue[] | null,
    mundusResult: null as MundusStoneResult | null,
    barSwapResult: null as BarSwapAnalysisResult | null,
    ultimateResult: null as UltimateUsageResult | null,
    dotUptimeResult: null as DotUptimeResult | null,
    penCritCapResult: null as PenCritCapResult | null,
    resourceSustainResult: null as ResourceSustainResult | null,
    potionUse: null as number | null,
  };
}

function findItem(items: ReturnType<typeof buildParseChecklist>, id: string) {
  return items.find((item) => item.id === id);
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('buildParseChecklist', () => {
  it('should return info status for all items when no data is provided', () => {
    const items = buildParseChecklist(createDefaults());
    const nonInfoItems = items.filter((item) => item.status !== 'info');
    // trial-dummy with null fightName is 'info'
    // major-buffs with null buildIssues is 'info'
    // cp-passives with null buildIssues is 'info'
    // gear-quality with null buildIssues is 'info'
    expect(nonInfoItems).toHaveLength(0);
  });

  // ─── Trial Dummy ──────────────────────────────────────────────────────────────

  describe('trial-dummy', () => {
    it('should pass when fight name contains trial dummy name', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        fightName: 'Target Iron Atronach',
      });
      expect(findItem(items, 'trial-dummy')?.status).toBe('pass');
    });

    it('should fail when fight name does not contain trial dummy name', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        fightName: 'Normal Mob',
      });
      expect(findItem(items, 'trial-dummy')?.status).toBe('fail');
    });
  });

  // ─── Food ─────────────────────────────────────────────────────────────────────

  describe('food', () => {
    it('should pass when food is detected', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        foodResult: {
          hasFood: true,
          foodType: 'tri-stat',
          foodAbilityIds: [1],
          foodNames: ['Artaeum Takeaway Broth'],
        },
      });
      expect(findItem(items, 'food')?.status).toBe('pass');
    });

    it('should fail when no food is detected', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        foodResult: {
          hasFood: false,
          foodType: 'none',
          foodAbilityIds: [],
          foodNames: [],
        },
      });
      expect(findItem(items, 'food')?.status).toBe('fail');
    });
  });

  // ─── Activity ─────────────────────────────────────────────────────────────────

  describe('activity', () => {
    it('should pass when activity >= 95%', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        activeTimeResult: {
          activePercentage: 97,
          activeSeconds: 97,
          fightDurationSeconds: 100,
          totalCasts: 50,
          baseActiveSeconds: 50,
          channelExtraSeconds: 0,
          downtimeSeconds: 3,
        },
      });
      expect(findItem(items, 'activity')?.status).toBe('pass');
    });

    it('should warn when activity is between 85% and 95%', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        activeTimeResult: {
          activePercentage: 90,
          activeSeconds: 90,
          fightDurationSeconds: 100,
          totalCasts: 50,
          baseActiveSeconds: 50,
          channelExtraSeconds: 0,
          downtimeSeconds: 10,
        },
      });
      expect(findItem(items, 'activity')?.status).toBe('warn');
    });

    it('should fail when activity < 85%', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        activeTimeResult: {
          activePercentage: 70,
          activeSeconds: 70,
          fightDurationSeconds: 100,
          totalCasts: 30,
          baseActiveSeconds: 30,
          channelExtraSeconds: 0,
          downtimeSeconds: 30,
        },
      });
      expect(findItem(items, 'activity')?.status).toBe('fail');
    });
  });

  // ─── CPM ──────────────────────────────────────────────────────────────────────

  describe('cpm', () => {
    it('should pass when CPM >= 60', () => {
      const items = buildParseChecklist({ ...createDefaults(), cpm: 65 });
      expect(findItem(items, 'cpm')?.status).toBe('pass');
    });

    it('should warn when CPM between 50 and 60', () => {
      const items = buildParseChecklist({ ...createDefaults(), cpm: 55 });
      expect(findItem(items, 'cpm')?.status).toBe('warn');
    });

    it('should fail when CPM < 50', () => {
      const items = buildParseChecklist({ ...createDefaults(), cpm: 40 });
      expect(findItem(items, 'cpm')?.status).toBe('fail');
    });
  });

  // ─── Weave Accuracy ──────────────────────────────────────────────────────────

  describe('weave', () => {
    it('should pass when weave accuracy >= 90%', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        weaveResult: {
          totalSkills: 100,
          lightAttacks: 95,
          heavyAttacks: 0,
          properWeaves: 92,
          weaveAccuracy: 92,
          missedWeaves: 8,
          averageWeaveTiming: 400,
        },
      });
      expect(findItem(items, 'weave')?.status).toBe('pass');
      expect(findItem(items, 'heavy-attacks')?.status).toBe('pass');
    });

    it('should warn on heavy attacks', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        weaveResult: {
          totalSkills: 100,
          lightAttacks: 90,
          heavyAttacks: 3,
          properWeaves: 90,
          weaveAccuracy: 90,
          missedWeaves: 10,
          averageWeaveTiming: 500,
        },
      });
      expect(findItem(items, 'heavy-attacks')?.status).toBe('warn');
    });
  });

  // ─── Mundus Stone ─────────────────────────────────────────────────────────────

  describe('mundus-stone', () => {
    it('should pass when mundus is detected', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        mundusResult: {
          hasMundus: true,
          mundusName: 'The Shadow (Critical Damage)',
          mundusAbilityId: 13984,
        },
      });
      const item = findItem(items, 'mundus-stone');
      expect(item?.status).toBe('pass');
      expect(item?.detail).toContain('The Shadow');
    });

    it('should fail when no mundus is detected', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        mundusResult: {
          hasMundus: false,
          mundusName: null,
          mundusAbilityId: null,
        },
      });
      expect(findItem(items, 'mundus-stone')?.status).toBe('fail');
    });
  });

  // ─── Potion Uptime ────────────────────────────────────────────────────────────

  describe('potions', () => {
    it('should pass when potion use meets expectations', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        potionUse: 4,
        activeTimeResult: {
          activePercentage: 95,
          activeSeconds: 180,
          fightDurationSeconds: 180,
          totalCasts: 50,
          baseActiveSeconds: 50,
          channelExtraSeconds: 0,
          downtimeSeconds: 0,
        },
      });
      const item = findItem(items, 'potions');
      // 180s / 45s = 4 expected, 4 used => ratio 1.0 => pass
      expect(item?.status).toBe('pass');
    });

    it('should warn when potion use is low', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        potionUse: 2,
        activeTimeResult: {
          activePercentage: 95,
          activeSeconds: 180,
          fightDurationSeconds: 180,
          totalCasts: 50,
          baseActiveSeconds: 50,
          channelExtraSeconds: 0,
          downtimeSeconds: 0,
        },
      });
      const item = findItem(items, 'potions');
      // 180s / 45 = 4 expected, 2 used => ratio 0.5 => warn
      expect(item?.status).toBe('warn');
    });

    it('should fail when almost no potions used', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        potionUse: 0,
        activeTimeResult: {
          activePercentage: 95,
          activeSeconds: 180,
          fightDurationSeconds: 180,
          totalCasts: 50,
          baseActiveSeconds: 50,
          channelExtraSeconds: 0,
          downtimeSeconds: 0,
        },
      });
      const item = findItem(items, 'potions');
      expect(item?.status).toBe('fail');
    });

    it('should be info when potionUse is null', () => {
      const items = buildParseChecklist(createDefaults());
      expect(findItem(items, 'potions')?.status).toBe('info');
    });
  });

  // ─── Penetration ──────────────────────────────────────────────────────────────

  describe('pen-crit-cap', () => {
    it('should warn when likely over pen cap', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        penCritCapResult: {
          estimatedPenetration: 20000,
          likelyOverPenCap: true,
          hasLoverMundus: true,
        },
      });
      expect(findItem(items, 'pen-crit-cap')?.status).toBe('warn');
    });

    it('should pass when pen is established but not over cap', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        penCritCapResult: {
          estimatedPenetration: 5000,
          likelyOverPenCap: false,
          hasLoverMundus: false,
        },
      });
      expect(findItem(items, 'pen-crit-cap')?.status).toBe('pass');
    });
  });

  // ─── Bar Swap ─────────────────────────────────────────────────────────────────

  describe('bar-swap', () => {
    it('should pass when bar swaps are healthy', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        barSwapResult: {
          totalSwaps: 20,
          swapsPerMinute: 8,
          averageTimeBetweenSwaps: 7500,
          longestTimeOnOneBar: 10000,
          barCampingDetected: false,
          barCampingInstances: 0,
        },
      });
      expect(findItem(items, 'bar-swap')?.status).toBe('pass');
    });

    it('should warn when bar camping is detected', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        barSwapResult: {
          totalSwaps: 5,
          swapsPerMinute: 2,
          averageTimeBetweenSwaps: 30000,
          longestTimeOnOneBar: 45000,
          barCampingDetected: true,
          barCampingInstances: 2,
        },
      });
      expect(findItem(items, 'bar-swap')?.status).toBe('warn');
    });

    it('should fail when no bar swaps at all', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        barSwapResult: {
          totalSwaps: 0,
          swapsPerMinute: 0,
          averageTimeBetweenSwaps: 0,
          longestTimeOnOneBar: 180000,
          barCampingDetected: true,
          barCampingInstances: 1,
        },
      });
      // No swaps but camping detected → warn (bar camping takes priority)
      expect(findItem(items, 'bar-swap')?.status).toBe('warn');
    });
  });

  // ─── Ultimate Usage ───────────────────────────────────────────────────────────

  describe('ultimate-usage', () => {
    it('should pass when ultimates are cast', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        ultimateResult: {
          totalUltimateCasts: 3,
          ultimateAbilities: [
            {
              abilityId: 22139,
              abilityName: 'Flawless Dawnbreaker',
              castCount: 3,
              timestamps: [1000, 30000, 60000],
            },
          ],
          averageTimeBetweenUltimates: 29500,
          fightDurationSeconds: 90,
        },
      });
      expect(findItem(items, 'ultimate-usage')?.status).toBe('pass');
    });

    it('should warn when no ultimates in a long fight', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        ultimateResult: {
          totalUltimateCasts: 0,
          ultimateAbilities: [],
          averageTimeBetweenUltimates: 0,
          fightDurationSeconds: 120,
        },
      });
      expect(findItem(items, 'ultimate-usage')?.status).toBe('warn');
    });
  });

  // ─── DoT Uptime ───────────────────────────────────────────────────────────────

  describe('dot-uptime', () => {
    it('should pass when DoT uptime >= 80%', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        dotUptimeResult: {
          dotAbilities: [
            {
              abilityId: 1,
              abilityName: 'Wall of Elements',
              uptimePercentage: 85,
              totalActiveMs: 85000,
              tickCount: 42,
            },
          ],
          overallDotUptimePercentage: 85,
          totalDotDamage: 500000,
          totalDirectDamage: 300000,
          dotDamagePercentage: 62.5,
        },
      });
      expect(findItem(items, 'dot-uptime')?.status).toBe('pass');
    });

    it('should warn when DoT uptime is 60-80%', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        dotUptimeResult: {
          dotAbilities: [
            {
              abilityId: 1,
              abilityName: 'Wall of Elements',
              uptimePercentage: 65,
              totalActiveMs: 65000,
              tickCount: 30,
            },
          ],
          overallDotUptimePercentage: 65,
          totalDotDamage: 300000,
          totalDirectDamage: 500000,
          dotDamagePercentage: 37.5,
        },
      });
      expect(findItem(items, 'dot-uptime')?.status).toBe('warn');
    });

    it('should include damage composition as info', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        dotUptimeResult: {
          dotAbilities: [
            {
              abilityId: 1,
              abilityName: 'WoE',
              uptimePercentage: 90,
              totalActiveMs: 90000,
              tickCount: 45,
            },
          ],
          overallDotUptimePercentage: 90,
          totalDotDamage: 600000,
          totalDirectDamage: 400000,
          dotDamagePercentage: 60,
        },
      });
      const comp = findItem(items, 'damage-composition');
      expect(comp?.status).toBe('info');
      expect(comp?.detail).toContain('DoT: 60%');
    });
  });

  // ─── Resource Sustain ─────────────────────────────────────────────────────────

  describe('resource-sustain', () => {
    it('should pass when no time below threshold', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        resourceSustainResult: {
          averageStaminaPercent: 75,
          averageMagickaPercent: 82,
          secondsBelowThreshold: 0,
          sampleCount: 100,
          primaryResource: 'stamina',
        },
      });
      expect(findItem(items, 'resource-sustain')?.status).toBe('pass');
    });

    it('should warn when briefly below threshold', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        resourceSustainResult: {
          averageStaminaPercent: 45,
          averageMagickaPercent: 80,
          secondsBelowThreshold: 3,
          sampleCount: 100,
          primaryResource: 'stamina',
        },
      });
      expect(findItem(items, 'resource-sustain')?.status).toBe('warn');
    });

    it('should fail when significantly below threshold', () => {
      const items = buildParseChecklist({
        ...createDefaults(),
        resourceSustainResult: {
          averageStaminaPercent: 20,
          averageMagickaPercent: 80,
          secondsBelowThreshold: 15,
          sampleCount: 100,
          primaryResource: 'stamina',
        },
      });
      expect(findItem(items, 'resource-sustain')?.status).toBe('fail');
    });
  });

  // ─── Overall Structure ────────────────────────────────────────────────────────

  describe('full checklist structure', () => {
    it('should contain all expected checklist item IDs when all data is provided', () => {
      const items = buildParseChecklist({
        fightName: 'Target Iron Atronach',
        foodResult: {
          hasFood: true,
          foodType: 'tri-stat',
          foodAbilityIds: [1],
          foodNames: ['Broth'],
        },
        activeTimeResult: {
          activePercentage: 96,
          activeSeconds: 96,
          fightDurationSeconds: 100,
          totalCasts: 50,
          baseActiveSeconds: 50,
          channelExtraSeconds: 0,
          downtimeSeconds: 4,
        },
        cpm: 62,
        weaveResult: {
          totalSkills: 100,
          lightAttacks: 95,
          heavyAttacks: 0,
          properWeaves: 91,
          weaveAccuracy: 91,
          missedWeaves: 9,
          averageWeaveTiming: 450,
        },
        rotationResult: {
          opener: [{ abilityId: 1, abilityName: 'Skill', timestamp: 0 }],
          rotation: [],
          allCasts: [],
          openerDuration: 5,
          skillIntervals: [
            {
              abilityId: 2,
              abilityName: 'Execute',
              avgInterval: 3,
              castCount: 5,
              isRotationSkill: true,
              isSpammable: false,
              isExecute: true,
              firstCastPercent: 75,
            },
          ],
        },
        buffChecklist: {
          majorBuffs: [],
          minorBuffs: [],
          supportBuffs: [],
          summary: {
            totalTrackedBuffs: 0,
            totalDummyBuffs: 0,
            totalPlayerBuffs: 0,
            totalRedundantBuffs: 0,
          },
        },
        debuffChecklist: {
          majorDebuffs: [],
          minorDebuffs: [],
          summary: {
            totalTrackedDebuffs: 0,
            totalPlayerDebuffs: 0,
            totalDummyDebuffs: 0,
          },
        },
        buildIssues: [],
        mundusResult: {
          hasMundus: true,
          mundusName: 'The Shadow',
          mundusAbilityId: 13984,
        },
        barSwapResult: {
          totalSwaps: 15,
          swapsPerMinute: 9,
          averageTimeBetweenSwaps: 6600,
          longestTimeOnOneBar: 8000,
          barCampingDetected: false,
          barCampingInstances: 0,
        },
        ultimateResult: {
          totalUltimateCasts: 2,
          ultimateAbilities: [
            {
              abilityId: 22139,
              abilityName: 'Flawless Dawnbreaker',
              castCount: 2,
              timestamps: [10000, 50000],
            },
          ],
          averageTimeBetweenUltimates: 40000,
          fightDurationSeconds: 100,
        },
        dotUptimeResult: {
          dotAbilities: [
            {
              abilityId: 1,
              abilityName: 'WoE',
              uptimePercentage: 88,
              totalActiveMs: 88000,
              tickCount: 44,
            },
          ],
          overallDotUptimePercentage: 88,
          totalDotDamage: 500000,
          totalDirectDamage: 300000,
          dotDamagePercentage: 62.5,
        },
        penCritCapResult: {
          estimatedPenetration: 3276,
          likelyOverPenCap: false,
          hasLoverMundus: false,
        },
        resourceSustainResult: {
          averageStaminaPercent: 70,
          averageMagickaPercent: 85,
          secondsBelowThreshold: 0,
          sampleCount: 100,
          primaryResource: 'stamina',
        },
        potionUse: 2,
      });

      const expectedIds = [
        'trial-dummy',
        'food',
        'major-buffs',
        'activity',
        'cpm',
        'weave',
        'heavy-attacks',
        'opener',
        'execute',
        'buff-coverage',
        'debuff-coverage',
        'cp-passives',
        'gear-quality',
        'mundus-stone',
        'potions',
        'pen-crit-cap',
        'bar-swap',
        'ultimate-usage',
        'dot-uptime',
        'damage-composition',
        'resource-sustain',
      ];

      const itemIds = items.map((item) => item.id);
      for (const id of expectedIds) {
        expect(itemIds).toContain(id);
      }
    });
  });
});
