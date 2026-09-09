import {
  createEvidenceDrilldownSnapshot,
  type EvidenceDrilldownInput,
} from './evidenceDrilldownModel';

const validInput = () =>
  ({
    context: {
      esoUpdate: 'U46',
      partitionId: 'live-pc-na',
      encounterId: 'lucent-citadel',
      encounterVersion: '1',
      difficulty: 'veteran',
    },
    fight: { startTimestamp: 100, endTimestamp: 200 },
    entries: [
      {
        id: 'late',
        esoUpdate: 'U46',
        encounterId: 'lucent-citadel',
        encounterVersion: '1',
        partitionId: 'live-pc-na',
        difficulty: 'veteran',
        actorId: 'actor-2',
        role: 'damage',
        phaseId: 'execute',
        timestamp: 150,
        observed: 'observed-b',
        expected: 'expected-b',
        estimatedImpact: -12.5,
        confidence: 0.75,
        scoreContribution: -2,
      },
      {
        id: 'early',
        esoUpdate: 'U46',
        encounterId: 'lucent-citadel',
        encounterVersion: '1',
        partitionId: 'live-pc-na',
        difficulty: 'veteran',
        actorId: 'actor-1',
        role: 'healer',
        phaseId: 'opening',
        timestamp: 120,
        observed: 'observed-a',
        expected: 'expected-a',
        estimatedImpact: 8,
        confidence: 'unknown',
        scoreContribution: 5,
      },
    ],
  }) satisfies EvidenceDrilldownInput;

describe('createEvidenceDrilldownSnapshot', () => {
  it('isolates framework-free evidence and exposes its direct score contribution', () => {
    const snapshot = createEvidenceDrilldownSnapshot(validInput());

    expect(snapshot).toEqual({
      context: {
        esoUpdate: 'U46',
        partitionId: 'live-pc-na',
        encounterId: 'lucent-citadel',
        encounterVersion: '1',
        difficulty: 'veteran',
      },
      fight: { startTimestamp: 100, endTimestamp: 200 },
      entries: [
        expect.objectContaining({
          id: 'early',
          scope: {
            encounterId: 'lucent-citadel',
            partitionId: 'live-pc-na',
            actorId: 'actor-1',
            role: 'healer',
            phaseId: 'opening',
          },
          behavior: { observed: 'observed-a', expected: 'expected-a' },
          estimatedImpact: 8,
          confidence: 'unknown',
          scoreContribution: 5,
        }),
        expect.objectContaining({ id: 'late', scoreContribution: -2 }),
      ],
      scoreContributionTotal: 3,
    });
  });

  it('clips timestamps at fight boundaries while retaining the reported timestamp', () => {
    const input = validInput();
    input.entries[0] = { ...input.entries[0], timestamp: 300 };
    input.entries[1] = { ...input.entries[1], timestamp: 20 };

    const snapshot = createEvidenceDrilldownSnapshot(input);

    expect(
      snapshot?.entries.map(({ id, timestamp, originalTimestamp, timestampWasClipped }) => ({
        id,
        timestamp,
        originalTimestamp,
        timestampWasClipped,
      })),
    ).toEqual([
      { id: 'early', timestamp: 100, originalTimestamp: 20, timestampWasClipped: true },
      { id: 'late', timestamp: 200, originalTimestamp: 300, timestampWasClipped: true },
    ]);
  });

  it('retains timestamps exactly at inclusive fight boundaries', () => {
    const input = validInput();
    input.entries = [
      { ...input.entries[0], id: 'end', timestamp: 200 },
      { ...input.entries[1], id: 'start', timestamp: 100 },
    ];

    const snapshot = createEvidenceDrilldownSnapshot(input);

    expect(
      snapshot?.entries.map(({ id, timestampWasClipped }) => ({ id, timestampWasClipped })),
    ).toEqual([
      { id: 'start', timestampWasClipped: false },
      { id: 'end', timestampWasClipped: false },
    ]);
  });

  it('orders equal timestamps deterministically by scope, independent of input order', () => {
    const input = validInput();
    input.entries = [
      { ...input.entries[0], timestamp: 150, id: 'z' },
      { ...input.entries[1], timestamp: 150, id: 'a' },
    ];

    const snapshot = createEvidenceDrilldownSnapshot(input);

    expect(snapshot?.entries.map((entry) => entry.id)).toEqual(['a', 'z']);
  });

  it('uses the evidence id as the final deterministic ordering tiebreaker', () => {
    const input = validInput();
    input.entries = [
      {
        ...input.entries[0],
        id: 'z',
        actorId: 'same',
        role: 'same',
        phaseId: 'same',
        timestamp: 150,
      },
      {
        ...input.entries[1],
        id: 'a',
        actorId: 'same',
        role: 'same',
        phaseId: 'same',
        timestamp: 150,
      },
    ];

    const snapshot = createEvidenceDrilldownSnapshot(input);

    expect(snapshot?.entries.map((entry) => entry.id)).toEqual(['a', 'z']);
  });

  it('rejects zero-duration fights', () => {
    const input = validInput();
    input.fight = { startTimestamp: 100, endTimestamp: 100 };

    expect(createEvidenceDrilldownSnapshot(input)).toBeNull();
  });

  it('rejects duplicate evidence ids instead of merging distinct evidence', () => {
    const input = validInput();
    input.entries[1] = { ...input.entries[1], id: input.entries[0].id };

    expect(createEvidenceDrilldownSnapshot(input)).toBeNull();
  });

  it.each([
    ['ESO update', 'esoUpdate', 'U47'],
    ['partition', 'partitionId', 'pts-pc-na'],
    ['encounter', 'encounterId', 'cloudrest'],
    ['encounter version', 'encounterVersion', '2'],
    ['difficulty', 'difficulty', 'normal'],
  ] as const)('rejects cross-context %s evidence', (_label, field, value) => {
    const input = validInput();
    input.entries[0] = { ...input.entries[0], [field]: value };

    expect(createEvidenceDrilldownSnapshot(input)).toBeNull();
  });

  it.each([
    ['missing evidence field', { fight: { startTimestamp: 1, endTimestamp: 2 }, entries: [{}] }],
    ['unexpected input field', { ...validInput(), extra: true }],
    [
      'invalid fight bounds',
      { ...validInput(), fight: { startTimestamp: 201, endTimestamp: 200 } },
    ],
    [
      'nonfinite impact',
      (() => {
        const input = validInput();
        input.entries[0] = { ...input.entries[0], estimatedImpact: Number.POSITIVE_INFINITY };
        return input;
      })(),
    ],
    [
      'negative zero score contribution',
      (() => {
        const input = validInput();
        input.entries[0] = { ...input.entries[0], scoreContribution: -0 };
        return input;
      })(),
    ],
    [
      'out-of-range numeric confidence',
      (() => {
        const input = validInput();
        input.entries[0] = { ...input.entries[0], confidence: 1.01 };
        return input;
      })(),
    ],
  ])('fails closed for %s', (_name, malformedInput) => {
    expect(createEvidenceDrilldownSnapshot(malformedInput)).toBeNull();
  });

  it.each([
    [
      'fight start',
      (input: ReturnType<typeof validInput>) => ({
        ...input,
        fight: { ...input.fight, startTimestamp: Number.NaN },
      }),
    ],
    [
      'fight end',
      (input: ReturnType<typeof validInput>) => ({
        ...input,
        fight: { ...input.fight, endTimestamp: -0 },
      }),
    ],
    [
      'entry timestamp',
      (input: ReturnType<typeof validInput>) => ({
        ...input,
        entries: [{ ...input.entries[0], timestamp: Number.NEGATIVE_INFINITY }, input.entries[1]],
      }),
    ],
    [
      'impact',
      (input: ReturnType<typeof validInput>) => ({
        ...input,
        entries: [{ ...input.entries[0], estimatedImpact: -0 }, input.entries[1]],
      }),
    ],
    [
      'numeric confidence',
      (input: ReturnType<typeof validInput>) => ({
        ...input,
        entries: [{ ...input.entries[0], confidence: Number.POSITIVE_INFINITY }, input.entries[1]],
      }),
    ],
  ])('rejects nonfinite and negative-zero numeric %s values', (_field, makeInvalidInput) => {
    expect(createEvidenceDrilldownSnapshot(makeInvalidInput(validInput()))).toBeNull();
  });

  it('returns detached, deeply immutable snapshots', () => {
    const input = validInput();
    const snapshot = createEvidenceDrilldownSnapshot(input);
    input.entries[0] = { ...input.entries[0], observed: 'mutated' };

    expect(snapshot?.entries.find((entry) => entry.id === 'late')?.behavior.observed).toBe(
      'observed-b',
    );
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot?.fight)).toBe(true);
    expect(Object.isFrozen(snapshot?.context)).toBe(true);
    expect(Object.isFrozen(snapshot?.entries)).toBe(true);
    expect(Object.isFrozen(snapshot?.entries[0])).toBe(true);
    expect(Object.isFrozen(snapshot?.entries[0].scope)).toBe(true);
    expect(Object.isFrozen(snapshot?.entries[0].behavior)).toBe(true);
  });
});
