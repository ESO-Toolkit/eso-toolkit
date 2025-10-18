import {
  KYNE_S_AEGIS_PHASE_BUFF_IDS,
  detectKyneAegisPhaseTransitions,
  hasKyneAegisPhaseSignature,
} from './kyneAegisPhaseUtils';
import type { BuffEvent } from '../../types/combatlogEvents';

const createBuffEvent = (abilityId: number, timestamp: number): BuffEvent => ({
  timestamp,
  type: 'applybuff',
  sourceID: 1,
  sourceIsFriendly: true,
  targetID: 1,
  targetIsFriendly: true,
  abilityGameID: abilityId,
  fight: 1,
  extraAbilityGameID: 0,
});

describe('detectKyneAegisPhaseTransitions', () => {
  it('returns base phase when no buffs found', () => {
    const phases = detectKyneAegisPhaseTransitions([], 0, 120000);

    expect(phases).toHaveLength(1);
    expect(phases[0]).toEqual({ id: 1, startTime: 0 });
  });

  it('detects explicit phase 2 and phase 3 buffs', () => {
    const buffEvents: BuffEvent[] = [
      createBuffEvent(KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_2, 45000),
      createBuffEvent(KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_3, 90000),
    ];

    const phases = detectKyneAegisPhaseTransitions(buffEvents, 0, 150000);

    expect(phases).toHaveLength(3);
    expect(phases[1]).toMatchObject({
      id: 2,
      startTime: 45000,
      abilityId: KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_2,
    });
    expect(phases[2]).toMatchObject({
      id: 3,
      startTime: 90000,
      abilityId: KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_3,
    });
  });

  it('estimates phase 2 when only phase 3 buff exists', () => {
    const buffEvents: BuffEvent[] = [createBuffEvent(KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_3, 120000)];

    const phases = detectKyneAegisPhaseTransitions(buffEvents, 0, 180000);

    expect(phases).toHaveLength(3);
    expect(phases[1]).toMatchObject({ id: 2 });
    expect(phases[1].startTime).toBeGreaterThan(0);
    expect(phases[1].startTime).toBeLessThan(phases[2].startTime);
  });
});

describe('hasKyneAegisPhaseSignature', () => {
  it('detects signature phase buffs', () => {
    const buffEvents: BuffEvent[] = [
      createBuffEvent(999999, 1000),
      createBuffEvent(KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_2, 2000),
    ];

    expect(hasKyneAegisPhaseSignature(buffEvents)).toBe(true);
  });

  it('returns false when no buff signature present', () => {
    const buffEvents: BuffEvent[] = [createBuffEvent(999999, 1000)];

    expect(hasKyneAegisPhaseSignature(buffEvents)).toBe(false);
  });
});
