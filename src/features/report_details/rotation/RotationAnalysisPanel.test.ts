import { calculateRotationAnalysis, type RotationAnalysisInput } from './RotationAnalysisPanel';

const fight = { startTime: 0, endTime: 60_000, friendlyPlayers: [0, 1] };

const resources = (magicka: number, maxMagicka: number, stamina = 50, maxStamina = 100) => ({
  hitPoints: 100,
  maxHitPoints: 100,
  magicka,
  maxMagicka,
  stamina,
  maxStamina,
  ultimate: 0,
  maxUltimate: 0,
  werewolf: 0,
  maxWerewolf: 0,
  absorb: 0,
  championPoints: 0,
  x: 0,
  y: 0,
  facing: 0,
});

const cast = (sourceID = 1, timestamp = 0, abilityGameID = 42) =>
  ({
    type: 'cast',
    timestamp,
    sourceID,
    sourceIsFriendly: true,
    targetID: 2,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
  }) as never;

const resource = (targetID = 1, magicka = 50, maxMagicka = 100, stamina = 50, maxStamina = 100) =>
  ({
    type: 'resourcechange',
    timestamp: 0,
    sourceID: 2,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: true,
    abilityGameID: 0,
    fight: 1,
    resourceChange: 0,
    resourceChangeType: 0,
    otherResourceChange: 0,
    maxResourceAmount: 0,
    waste: 0,
    castTrackID: 0,
    sourceResources: resources(0, 1),
    targetResources: resources(magicka, maxMagicka, stamina, maxStamina),
  }) as never;

const input = (overrides: Partial<RotationAnalysisInput> = {}): RotationAnalysisInput => ({
  fight,
  castEvents: [cast()],
  resourceEvents: [resource()],
  playersById: { 0: { displayName: 'Zero' } as never, 1: { displayName: 'One' } as never },
  abilitiesById: { 0: { name: 'Zero Ability' }, 42: { name: 'Test Ability' } },
  ...overrides,
});

describe('calculateRotationAnalysis', () => {
  it('marks empty event streams unavailable instead of manufacturing measurements', () => {
    const result = calculateRotationAnalysis(input({ castEvents: [], resourceEvents: [] }));

    expect(result).toMatchObject({ state: 'unavailable', rotationAnalyses: [] });
    expect(result.message).toMatch(/No valid cast or resource data/i);
  });

  it.each([
    [{ startTime: 0, endTime: 0, friendlyPlayers: [1] }],
    [{ startTime: 60_000, endTime: 0, friendlyPlayers: [1] }],
    [{ startTime: 0, endTime: Number.POSITIVE_INFINITY, friendlyPlayers: [1] }],
    [{ startTime: 0, endTime: 24 * 60 * 60 * 1000 + 1, friendlyPlayers: [1] }],
  ])('rejects invalid or unbounded fight duration %#', (invalidFight) => {
    const result = calculateRotationAnalysis(input({ fight: invalidFight }));

    expect(result).toMatchObject({ state: 'invalid', rotationAnalyses: [] });
    expect(result.message).toMatch(/invalid fight (timing|duration)/i);
  });

  it('preserves timestamp and actor/ability id zero while retaining measured zeroes', () => {
    const result = calculateRotationAnalysis(
      input({
        castEvents: [cast(0, 0, 0)],
        resourceEvents: [resource(0, 50, 50, 50, 100)],
      }),
    );
    const analysis = result.rotationAnalyses[0];

    expect(result.state).toBe('ready');
    expect(analysis.playerId).toBe('0');
    expect(analysis.abilities[0]).toMatchObject({ abilityId: 0, abilityName: 'Zero Ability' });
    expect(analysis.averageAPM).toBe(1);
    expect(analysis.resourceEfficiency.magicka).toMatchObject({
      averageLevel: 100,
      lowestPoint: 100,
      wastePercentage: 0,
    });
  });

  it('keeps missing casts and partial resource streams explicitly unavailable', () => {
    const result = calculateRotationAnalysis(
      input({
        castEvents: null,
        resourceEvents: [resource(1, 0, 100, Number.NaN, 100)],
      }),
    );
    const analysis = result.rotationAnalyses[0];

    expect(result.state).toBe('partial');
    expect(analysis.dataState).toBe('partial');
    expect(analysis.averageAPM).toBeNull();
    expect(analysis.resourceEfficiency.magicka).toMatchObject({
      averageLevel: 0,
      lowestPoint: 0,
      wastePercentage: null,
    });
    expect(analysis.resourceEfficiency.stamina).toEqual({
      averageLevel: null,
      lowestPoint: null,
      wastePercentage: null,
    });
  });

  it('does not call entirely invalid resource payloads partial measurements', () => {
    const result = calculateRotationAnalysis(
      input({
        castEvents: [],
        resourceEvents: [resource(1, Number.NaN, 0, Number.POSITIVE_INFINITY, 1)],
      }),
    );

    expect(result.state).toBe('unavailable');
    expect(result.rotationAnalyses[0]).toMatchObject({
      dataState: 'unavailable',
      averageAPM: null,
      resourceEfficiency: {
        magicka: { averageLevel: null, lowestPoint: null, wastePercentage: null },
        stamina: { averageLevel: null, lowestPoint: null, wastePercentage: null },
      },
    });
  });
});
