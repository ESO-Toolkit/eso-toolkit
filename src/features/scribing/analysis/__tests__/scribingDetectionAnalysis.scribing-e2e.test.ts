import { computeScribingDetection } from '../scribingDetectionAnalysis';
import type { CombatEventData } from '../scribingDetectionAnalysis';

describe('Scribing detection end-to-end', () => {
  const emptyEvents: CombatEventData = {
    buffs: [],
    debuffs: [],
    damage: [],
    casts: [],
    heals: [],
    resources: [],
  };

  it("detects Ulfsild's Contingency recipe from the scribing database", () => {
    const result = computeScribingDetection({
      abilityId: 240150,
      playerId: 7,
      combatEvents: emptyEvents,
    });

    expect(result).not.toBeNull();
    expect(result?.scribedSkillData?.recipe?.grimoire).toBe("Ulfsild's Contingency");
    expect(result?.scribedSkillData?.recipe?.transformation).toBe('Healing Contingency');
    expect(result?.scribedSkillData?.recipe?.matchMethod).toMatch(/database/i);
    expect(result?.effectiveAbilityId).toBe(240150);
  });
});
