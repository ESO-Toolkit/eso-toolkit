import { AffixScriptDetector } from './affix-detector';

type TestEvent = {
  type: string;
  abilityGameID: number;
  timestamp: number;
  sourceID: number;
};

const grimoire = { grimoireKey: 'test-grimoire', grimoireName: 'Test Grimoire' };

const detectEffectPatterns = (events: TestEvent[]) => {
  const detector = new AffixScriptDetector();
  const detect = Reflect.get(detector, 'detectAffixByEffectPattern') as (
    grimoireDetection: typeof grimoire,
    events: TestEvent[],
  ) => Array<{ affixScriptKey: string; affixScriptName: string; detectedEffects: unknown[] }>;

  return detect.call(detector, grimoire, events);
};

describe('Update 51 hybridized affix buff detection', () => {
  it('detects Major Savagery alone as the hybrid critical chance buff', () => {
    const detections = detectEffectPatterns([
      { type: 'applybuff', abilityGameID: 61667, timestamp: 1000, sourceID: 7 },
    ]);

    expect(detections).toEqual([
      expect.objectContaining({
        affixScriptKey: 'hybrid-savagery',
        affixScriptName: 'Hybrid Savagery',
        detectedEffects: [expect.objectContaining({ name: 'major-savagery', abilityId: 61667 })],
      }),
    ]);
  });

  it('detects Major Brutality alone as the hybrid damage buff', () => {
    const detections = detectEffectPatterns([
      { type: 'applybuff', abilityGameID: 61665, timestamp: 1000, sourceID: 7 },
    ]);

    expect(detections).toEqual([
      expect.objectContaining({
        affixScriptKey: 'hybrid-brutality',
        affixScriptName: 'Hybrid Brutality',
        detectedEffects: [expect.objectContaining({ name: 'major-brutality', abilityId: 61665 })],
      }),
    ]);
  });

  it('keeps the legacy paired-buff result when both historical buffs are present', () => {
    const detections = detectEffectPatterns([
      { type: 'applybuff', abilityGameID: 61667, timestamp: 1000, sourceID: 7 },
      { type: 'applybuff', abilityGameID: 61689, timestamp: 1000, sourceID: 7 },
      { type: 'applybuff', abilityGameID: 61665, timestamp: 1000, sourceID: 7 },
      { type: 'applybuff', abilityGameID: 61687, timestamp: 1000, sourceID: 7 },
    ]);

    expect(detections).toHaveLength(1);
    expect(detections[0].affixScriptKey).toBe('savagery-and-prophecy');
    expect(detections[0].affixScriptName).toBe('Savagery and Prophecy');
  });

  it.each([
    [217672, 'hybrid-savagery', 'major-savagery'],
    [219246, 'hybrid-brutality', 'major-brutality'],
  ])('detects combined U51 buff %i as %s', (abilityGameID, affixScriptKey, effectName) => {
    const detections = detectEffectPatterns([
      { type: 'applybuff', abilityGameID, timestamp: 1000, sourceID: 7 },
    ]);

    expect(detections).toEqual([
      expect.objectContaining({
        affixScriptKey,
        detectedEffects: [expect.objectContaining({ name: effectName, abilityId: abilityGameID })],
      }),
    ]);
  });

  it('does not mistake Minor Sorcery for Major Sorcery or hybrid brutality', () => {
    expect(
      detectEffectPatterns([
        { type: 'applybuff', abilityGameID: 61685, timestamp: 1000, sourceID: 7 },
      ]),
    ).toEqual([]);
  });
});
