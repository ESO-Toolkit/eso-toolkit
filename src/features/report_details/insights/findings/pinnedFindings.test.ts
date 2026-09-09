import {
  appendResolution,
  assignFinding,
  pinFinding,
  sharePinnedFinding,
  unpinFinding,
  type PinnedFindingSeed,
} from './pinnedFindings';

const seed: PinnedFindingSeed = {
  id: 'avoidable-damage-1',
  whatHappened: 'Ada stood in the blast zone during execute.',
  whyItMatters: 'The avoidable damage consumed a healer cooldown needed for the next mechanic.',
  evidence: [
    {
      timestampMs: 42_000,
      phaseId: 'execute',
      phaseName: 'Execute',
      eventId: 'event-42',
      observation: 'Blast landed for 12,000 damage.',
      actor: { id: 'player-ada', displayName: 'Ada', role: 'damage-dealer' },
    },
  ],
  confidence: { level: 'high', rationale: 'Matched an authoritative encounter event.' },
  provenance: {
    kind: 'authoritative-rule',
    source: 'Encounter definitions v1',
    sourceReference: 'boss-a/execute-blast',
    observedAt: '2026-09-08T12:00:00.000Z',
  },
  recommendedAction: {
    action: 'Move to the safe side before the execute blast.',
    expectedOutcome: 'Preserve healer resources for the next mechanic.',
  },
};

describe('pinned findings model', () => {
  it('pins and unpins without losing finding evidence or provenance', () => {
    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');
    const unpinned = unpinFinding(pinned, '2026-09-08T12:02:00.000Z');

    expect(pinned.pin).toEqual({
      status: 'pinned',
      pinnedAt: '2026-09-08T12:01:00.000Z',
      changedAt: '2026-09-08T12:01:00.000Z',
    });
    expect(unpinned.pin).toEqual({
      status: 'unpinned',
      pinnedAt: '2026-09-08T12:01:00.000Z',
      changedAt: '2026-09-08T12:02:00.000Z',
    });
    expect(unpinned.evidence).toEqual(seed.evidence);
    expect(unpinned.provenance).toEqual(seed.provenance);
    expect(pinned).not.toBe(unpinned);
  });

  it('fails closed when pinning or sharing a finding without evidence', () => {
    expect(() => pinFinding({ ...seed, evidence: [] }, '2026-09-08T12:01:00.000Z')).toThrow(
      'Invalid pinned finding',
    );

    expect(() =>
      sharePinnedFinding(
        { ...pinFinding(seed, '2026-09-08T12:01:00.000Z'), evidence: [] },
        { audience: 'external' },
      ),
    ).toThrow('Invalid pinned finding');
  });

  it('deep-clones persisted seed data so later caller mutations cannot rewrite it', () => {
    const mutableSeed: PinnedFindingSeed = {
      ...seed,
      evidence: seed.evidence.map((evidence) => ({
        ...evidence,
        actor: evidence.actor && { ...evidence.actor },
      })),
      confidence: { ...seed.confidence },
      provenance: { ...seed.provenance },
      recommendedAction: { ...seed.recommendedAction },
    };
    const pinned = pinFinding(mutableSeed, '2026-09-08T12:01:00.000Z');
    mutableSeed.evidence[0].actor!.displayName = 'Mutated caller';
    mutableSeed.confidence.rationale = 'Mutated caller';
    mutableSeed.provenance.sourceReference = 'mutated';
    mutableSeed.recommendedAction.action = 'mutated';

    expect(pinned.evidence[0].actor?.displayName).toBe('Ada');
    expect(pinned.confidence.rationale).toContain('authoritative');
    expect(pinned.provenance.sourceReference).toBe('boss-a/execute-blast');
    expect(pinned.recommendedAction.action).toContain('safe side');
  });

  it('records ownership transitions without mutating prior history', () => {
    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');
    const assigned = assignFinding(
      pinned,
      { kind: 'player', id: 'player-lead', displayName: 'Raid Lead', role: 'tank' },
      '2026-09-08T12:03:00.000Z',
      'Raid lead will coordinate the correction.',
    );
    const reassigned = assignFinding(
      assigned,
      { kind: 'role', role: 'damage-dealer' },
      '2026-09-08T12:04:00.000Z',
    );

    expect(pinned.ownership.history).toEqual([]);
    expect(assigned.ownership.history).toHaveLength(1);
    expect(reassigned.ownership.history).toHaveLength(2);
    expect(reassigned.ownership.history[1]).toMatchObject({
      from: { id: 'player-lead', displayName: 'Raid Lead' },
      to: { kind: 'role', role: 'damage-dealer' },
    });
    expect(reassigned.ownership.current).toEqual({ kind: 'role', role: 'damage-dealer' });
  });

  it('appends resolution history with transparent prior state', () => {
    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');
    const acknowledged = appendResolution(pinned, {
      id: 'resolution-1',
      at: '2026-09-08T12:05:00.000Z',
      status: 'acknowledged',
      note: 'Reviewed during raid debrief.',
      changedBy: { id: 'player-lead', displayName: 'Raid Lead', role: 'tank' },
    });
    const resolved = appendResolution(acknowledged, {
      id: 'resolution-2',
      at: '2026-09-08T12:06:00.000Z',
      status: 'resolved',
      note: 'Safe-side assignment was added to the pull plan.',
    });

    expect(pinned.resolutionHistory).toEqual([]);
    expect(acknowledged.resolutionHistory).toEqual([
      expect.objectContaining({ id: 'resolution-1', previousStatus: 'open' }),
    ]);
    expect(resolved.resolutionHistory).toEqual([
      expect.objectContaining({ id: 'resolution-1', previousStatus: 'open' }),
      expect.objectContaining({ id: 'resolution-2', previousStatus: 'acknowledged' }),
    ]);
  });

  it('rejects duplicate resolution ids and invalid status transitions', () => {
    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');

    expect(() =>
      appendResolution(pinned, {
        id: 'resolution-1',
        at: '2026-09-08T12:05:00.000Z',
        status: 'resolved',
        note: 'Cannot skip acknowledgement.',
      }),
    ).toThrow('Invalid resolution transition: open -> resolved');

    const acknowledged = appendResolution(pinned, {
      id: 'resolution-1',
      at: '2026-09-08T12:05:00.000Z',
      status: 'acknowledged',
      note: 'Reviewed.',
    });

    expect(() =>
      appendResolution(acknowledged, {
        id: 'resolution-1',
        at: '2026-09-08T12:06:00.000Z',
        status: 'in-progress',
        note: 'Duplicate id.',
      }),
    ).toThrow('Duplicate resolution id: resolution-1');
  });

  it('detaches nested resolution and ownership data on every update', () => {
    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');
    const assigned = assignFinding(
      pinned,
      { kind: 'player', id: 'player-lead', displayName: 'Raid Lead', role: 'tank' },
      '2026-09-08T12:03:00.000Z',
    );
    const acknowledged = appendResolution(assigned, {
      id: 'resolution-1',
      at: '2026-09-08T12:05:00.000Z',
      status: 'acknowledged',
      note: 'Reviewed.',
      changedBy: { id: 'player-lead', displayName: 'Raid Lead' },
    });

    (acknowledged.ownership.current as { displayName?: string }).displayName = 'Changed';
    (acknowledged.resolutionHistory[0].changedBy as { displayName?: string }).displayName =
      'Changed';
    expect(assigned.ownership.current?.displayName).toBe('Raid Lead');
    expect(assigned.resolutionHistory).toEqual([]);
  });

  it('always redacts player identifiers for external shares while retaining evidence context', () => {
    const assigned = assignFinding(
      pinFinding(seed, '2026-09-08T12:01:00.000Z'),
      { kind: 'player', id: 'player-lead', displayName: 'Raid Lead', role: 'tank' },
      '2026-09-08T12:03:00.000Z',
    );
    const shared = sharePinnedFinding(assigned, {
      audience: 'external',
      allowPlayerIdentifiers: true,
    });

    expect(shared.sharedWith).toEqual({ audience: 'external', includesPlayerIdentifiers: false });
    expect(shared.evidence[0]).toMatchObject({
      timestampMs: 42_000,
      phaseId: 'execute',
      eventId: 'event-42',
      actor: { role: 'damage-dealer' },
    });
    expect(shared.ownership.current).toEqual({ kind: 'player', role: 'tank' });
    expect(JSON.stringify(shared)).not.toContain('player-ada');
    expect(JSON.stringify(shared)).not.toContain('player-lead');
    expect(JSON.stringify(shared)).not.toContain('Ada');
    expect(JSON.stringify(shared)).not.toContain('Raid Lead');
    expect(shared.provenance).toEqual(seed.provenance);
  });

  it('redacts differently cased player identifiers and treats their punctuation literally', () => {
    const punctuatedSeed: PinnedFindingSeed = {
      ...seed,
      whatHappened: 'ada [lead] triggered the mechanic.',
      whyItMatters: 'PLAYER.ADA+42 needs the evidence without exposing identity.',
      evidence: [
        {
          ...seed.evidence[0],
          observation: 'Review ADA [LEAD] and player.ada+42 before sharing.',
          actor: {
            id: 'player.ada+42',
            displayName: 'Ada [Lead]',
            role: 'damage-dealer',
          },
        },
      ],
    };

    const shared = sharePinnedFinding(pinFinding(punctuatedSeed, '2026-09-08T12:01:00.000Z'), {
      audience: 'external',
    });
    const serializedShare = JSON.stringify(shared).toLowerCase();

    expect(serializedShare).not.toContain('ada [lead]');
    expect(serializedShare).not.toContain('player.ada+42');
    expect(shared.whatHappened).toContain('[player]');
    expect(shared.whyItMatters).toContain('[player]');
    expect(shared.evidence[0].observation).toContain('[player]');
  });

  it('includes player identifiers only with explicit recipient authorization', () => {
    const shared = sharePinnedFinding(pinFinding(seed, '2026-09-08T12:01:00.000Z'), {
      audience: 'raid-lead',
      allowPlayerIdentifiers: true,
    });

    expect(shared.sharedWith).toEqual({ audience: 'raid-lead', includesPlayerIdentifiers: true });
    expect(shared.evidence[0].actor).toEqual({
      id: 'player-ada',
      displayName: 'Ada',
      role: 'damage-dealer',
    });
  });

  it('rejects invalid timestamps and canonicalizes negative zero', () => {
    for (const timestampMs of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
    ]) {
      const invalidSeed: PinnedFindingSeed = {
        ...seed,
        evidence: [{ ...seed.evidence[0], timestampMs }],
      };

      expect(() => pinFinding(invalidSeed, '2026-09-08T12:01:00.000Z')).toThrow(
        'Invalid evidence timestampMs',
      );
    }

    const pinned = pinFinding(
      { ...seed, evidence: [{ ...seed.evidence[0], timestampMs: -0 }] },
      '2026-09-08T12:01:00.000Z',
    );

    expect(pinned.evidence[0].timestampMs).toBe(0);
    expect(Object.is(pinned.evidence[0].timestampMs, -0)).toBe(false);
  });

  it('validates ISO dates at pin, update, and share boundaries', () => {
    expect(() =>
      pinFinding(
        { ...seed, provenance: { ...seed.provenance, observedAt: '2026-02-30T12:00:00.000Z' } },
        '2026-09-08T12:01:00.000Z',
      ),
    ).toThrow('Invalid ISO date for provenance observedAt');
    expect(() => pinFinding(seed, 'not-an-iso-date')).toThrow('Invalid ISO date for pin changedAt');

    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');
    expect(() => unpinFinding(pinned, '2026-09-08T12:02:00')).toThrow(
      'Invalid ISO date for pin changedAt',
    );
    expect(() => unpinFinding(pinned, '2026-09-08T12:02:00+00:00')).not.toThrow();
    expect(() => assignFinding(pinned, { kind: 'team' }, '2026-13-08T12:03:00.000Z')).toThrow(
      'Invalid ISO date for ownership transition at',
    );
    expect(() =>
      appendResolution(pinned, {
        id: 'resolution-invalid-date',
        at: '2026-09-08T25:05:00.000Z',
        status: 'acknowledged',
        note: 'Invalid date must not enter lineage.',
      }),
    ).toThrow('Invalid ISO date for resolution event at');

    const malformed = {
      ...pinned,
      pin: { ...pinned.pin, changedAt: 'not-an-iso-date' },
    };
    expect(() => sharePinnedFinding(malformed, { audience: 'external' })).toThrow(
      'Invalid ISO date for pin changedAt',
    );
  });

  it('anchors lifecycle history to the original pin and rejects malformed persisted histories', () => {
    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');

    expect(() => unpinFinding(pinned, '2026-09-08T12:00:00.000Z')).toThrow('Backdated pin change');
    expect(() => assignFinding(pinned, { kind: 'team' }, '2026-09-08T12:00:00.000Z')).toThrow(
      'Backdated ownership transition',
    );
    expect(() =>
      appendResolution(pinned, {
        id: 'resolution-before-pin',
        at: '2026-09-08T12:00:00.000Z',
        status: 'acknowledged',
        note: 'This must not predate the pin.',
      }),
    ).toThrow('Backdated resolution event');
    const assigned = assignFinding(pinned, { kind: 'team' }, '2026-09-08T12:03:00.000Z');
    expect(() => unpinFinding(assigned, '2026-09-08T12:02:00.000Z')).toThrow(
      'Backdated pin change',
    );

    const malformedOwnership = {
      ...pinned,
      ownership: {
        current: { kind: 'team' },
        history: [{ at: '2026-09-08T12:00:00.000Z', to: { kind: 'team' } }],
      },
    } as typeof pinned;
    expect(() => sharePinnedFinding(malformedOwnership, { audience: 'external' })).toThrow(
      'Backdated ownership transition',
    );

    const malformedResolution = {
      ...pinned,
      resolutionHistory: [
        {
          id: 'resolution-before-pin',
          at: '2026-09-08T12:00:00.000Z',
          status: 'acknowledged',
          previousStatus: 'open',
          note: 'This must not predate the pin.',
        },
      ],
    } as typeof pinned;
    expect(() => sharePinnedFinding(malformedResolution, { audience: 'external' })).toThrow(
      'Backdated resolution event',
    );
  });

  it('fails closed for malformed runtime model and recipient values', () => {
    expect(() =>
      pinFinding({ ...seed, id: ' ' } as PinnedFindingSeed, '2026-09-08T12:01:00.000Z'),
    ).toThrow('Invalid finding id');
    expect(() =>
      pinFinding(
        {
          ...seed,
          evidence: [
            {
              ...seed.evidence[0],
              actor: { id: 'player-ada', displayName: 'Ada', role: 'invalid' },
            },
          ],
        } as unknown as PinnedFindingSeed,
        '2026-09-08T12:01:00.000Z',
      ),
    ).toThrow('Invalid evidence actor role');
    expect(() =>
      pinFinding(
        {
          ...seed,
          confidence: { ...seed.confidence, level: 'certain' },
        } as unknown as PinnedFindingSeed,
        '2026-09-08T12:01:00.000Z',
      ),
    ).toThrow('Invalid finding confidence');
    expect(() =>
      pinFinding(
        {
          ...seed,
          provenance: { ...seed.provenance, kind: 'unverified' },
        } as unknown as PinnedFindingSeed,
        '2026-09-08T12:01:00.000Z',
      ),
    ).toThrow('Invalid finding provenance');

    const pinned = pinFinding(seed, '2026-09-08T12:01:00.000Z');
    expect(() =>
      assignFinding(
        pinned,
        { kind: 'invalid' } as unknown as { kind: 'team' },
        '2026-09-08T12:03:00.000Z',
      ),
    ).toThrow('Invalid finding assignee');
    expect(() =>
      appendResolution(pinned, {
        id: ' ',
        at: '2026-09-08T12:03:00.000Z',
        status: 'acknowledged',
        note: 'Invalid id.',
      }),
    ).toThrow('Invalid resolution event id');
    expect(() =>
      sharePinnedFinding(pinned, { audience: 'untrusted' } as unknown as { audience: 'external' }),
    ).toThrow('Invalid finding share recipient audience');
    expect(() =>
      sharePinnedFinding(pinned, {
        audience: 'external',
        allowPlayerIdentifiers: 'yes',
      } as unknown as {
        audience: 'external';
      }),
    ).toThrow('Invalid finding share recipient allowPlayerIdentifiers');
    expect(() =>
      sharePinnedFinding(
        { ...pinned, recommendedAction: { action: ' ' } },
        { audience: 'external' },
      ),
    ).toThrow('Invalid recommendation action');
  });

  it('keeps shared finding and resolution ids stable, opaque, and lineage-safe', () => {
    const makeFinding = (displayName: string) =>
      appendResolution(
        pinFinding(
          {
            ...seed,
            id: `finding-${displayName}`,
            evidence: [
              {
                ...seed.evidence[0],
                actor: {
                  id: `player-${displayName.toLowerCase()}`,
                  displayName,
                  role: 'damage-dealer',
                },
              },
            ],
          },
          '2026-09-08T12:01:00.000Z',
        ),
        {
          id: `resolution-${displayName}`,
          at: '2026-09-08T12:05:00.000Z',
          status: 'acknowledged',
          note: `${displayName} reviewed this finding.`,
        },
      );

    const ada = appendResolution(makeFinding('Ada'), {
      id: 'resolution-Bob',
      at: '2026-09-08T12:06:00.000Z',
      status: 'resolved',
      note: 'Bob follow-up completed.',
      changedBy: { id: 'player-bob', displayName: 'Bob', role: 'healer' },
    });
    const sharedAda = sharePinnedFinding(ada, { audience: 'external' });
    const sharedAdaAgain = sharePinnedFinding(ada, { audience: 'external' });
    const sharedDurableIds = [
      sharedAda.id,
      ...sharedAda.resolutionHistory.map((event) => event.id),
    ];
    const rawIdentifiers = [
      'finding-Ada',
      'resolution-Ada',
      'resolution-Bob',
      'player-ada',
      'player-bob',
      'Ada',
      'Bob',
    ];

    expect(sharedAda.id).toBe(sharedAdaAgain.id);
    expect(sharedAda.resolutionHistory.map((event) => event.id)).toEqual(
      sharedAdaAgain.resolutionHistory.map((event) => event.id),
    );
    expect(new Set(sharedDurableIds).size).toBe(sharedDurableIds.length);
    rawIdentifiers.forEach((identifier) => {
      expect(JSON.stringify(sharedAda)).not.toContain(identifier);
    });
    expect(sharedAda.id).not.toBe('finding-Ada');
    expect(sharedAda.resolutionHistory[0].id).not.toBe('resolution-Ada');
    expect(sharedAda.resolutionHistory[1].id).not.toBe('resolution-Bob');
    expect(sharedAda.resolutionHistory[0].id).not.toBe(sharedAda.resolutionHistory[1].id);
    expect(sharedAda.resolutionHistory[0].previousStatus).toBe('open');
    expect(sharedAda.resolutionHistory[1].previousStatus).toBe('acknowledged');

    const opaque = appendResolution(
      pinFinding({ ...seed, id: 'finding-42' }, '2026-09-08T12:01:00.000Z'),
      {
        id: 'resolution-42',
        at: '2026-09-08T12:05:00.000Z',
        status: 'acknowledged',
        note: 'No identity is encoded in these durable ids.',
      },
    );
    const sharedOpaque = sharePinnedFinding(opaque, { audience: 'external' });
    expect(sharedOpaque.id).toMatch(/^shared-[0-9a-f]{32}-finding-ordinal-1$/);
    expect(sharedOpaque.resolutionHistory[0].id).toMatch(
      /^shared-[0-9a-f]{32}-resolution-ordinal-2$/,
    );
    expect(JSON.stringify(sharedOpaque)).not.toContain('finding-42');
    expect(JSON.stringify(sharedOpaque)).not.toContain('resolution-42');
    expect(JSON.stringify(sharedOpaque)).not.toContain('player-ada');
    expect(JSON.stringify(sharedOpaque)).not.toContain('Ada');
    expect(sharedOpaque.id).not.toBe(sharedOpaque.resolutionHistory[0].id);
  });

  it('uses stable non-identifying namespaces that do not collide across findings', () => {
    const first = pinFinding({ ...seed, id: 'opaque-finding-one' }, '2026-09-08T12:01:00.000Z');
    const second = pinFinding({ ...seed, id: 'opaque-finding-two' }, '2026-09-08T12:01:00.000Z');

    const firstShare = sharePinnedFinding(first, { audience: 'external' });
    const firstShareAgain = sharePinnedFinding(first, { audience: 'external' });
    const secondShare = sharePinnedFinding(second, { audience: 'external' });

    expect(firstShare.id).toBe(firstShareAgain.id);
    expect(firstShare.id).not.toBe(secondShare.id);
    expect(firstShare).not.toHaveProperty('shareNamespace');
    expect(JSON.stringify(firstShare)).not.toContain('opaque-finding-one');
    expect(JSON.stringify(secondShare)).not.toContain('opaque-finding-two');
  });

  it('redacts raw finding and resolution ids wherever they appear in shared text', () => {
    const findingId = 'opaque-finding-secret-991';
    const resolutionId = 'opaque-resolution-secret-992';
    const pinned = pinFinding(
      {
        ...seed,
        id: findingId,
        whatHappened: `Review ${findingId}.`,
        whyItMatters: `The lineage ${findingId} must remain private.`,
        evidence: [
          {
            ...seed.evidence[0],
            phaseName: `Phase for ${findingId}`,
            observation: `Evidence belongs to ${findingId}.`,
          },
        ],
        confidence: { ...seed.confidence, rationale: `Confirmed by ${findingId}.` },
        provenance: {
          ...seed.provenance,
          source: `Private source ${findingId}`,
          sourceReference: `Reference ${findingId}`,
        },
        recommendedAction: {
          action: `Resolve ${findingId}.`,
          expectedOutcome: `Close ${findingId}.`,
        },
      },
      '2026-09-08T12:01:00.000Z',
    );
    const assigned = assignFinding(
      pinned,
      { kind: 'team' },
      '2026-09-08T12:03:00.000Z',
      `Owner for ${findingId}`,
    );
    const acknowledged = appendResolution(assigned, {
      id: resolutionId,
      at: '2026-09-08T12:05:00.000Z',
      status: 'acknowledged',
      note: `Resolution ${resolutionId} closes ${findingId}.`,
    });

    for (const recipient of [
      { audience: 'external' as const },
      { audience: 'raid-lead' as const, allowPlayerIdentifiers: true },
    ]) {
      const serialized = JSON.stringify(sharePinnedFinding(acknowledged, recipient));
      expect(serialized).not.toContain(findingId);
      expect(serialized).not.toContain(resolutionId);
    }
  });

  it('rejects backdated ownership and resolution updates', () => {
    const assigned = assignFinding(
      pinFinding(seed, '2026-09-08T12:01:00.000Z'),
      { kind: 'team' },
      '2026-09-08T12:04:00.000Z',
    );
    expect(() =>
      assignFinding(assigned, { kind: 'role', role: 'healer' }, '2026-09-08T12:03:00.000Z'),
    ).toThrow('Backdated ownership transition');

    const acknowledged = appendResolution(assigned, {
      id: 'resolution-chronology-1',
      at: '2026-09-08T12:06:00.000Z',
      status: 'acknowledged',
      note: 'Reviewed.',
    });
    expect(() =>
      appendResolution(acknowledged, {
        id: 'resolution-chronology-2',
        at: '2026-09-08T12:05:00.000Z',
        status: 'resolved',
        note: 'Backdated.',
      }),
    ).toThrow('Backdated resolution event');
  });

  it('fails closed when persisted ownership or resolution lineage is malformed', () => {
    const assigned = assignFinding(
      pinFinding(seed, '2026-09-08T12:01:00.000Z'),
      { kind: 'team' },
      '2026-09-08T12:03:00.000Z',
    );
    const acknowledged = appendResolution(assigned, {
      id: 'resolution-lineage-1',
      at: '2026-09-08T12:05:00.000Z',
      status: 'acknowledged',
      note: 'Reviewed.',
    });
    const progressed = appendResolution(acknowledged, {
      id: 'resolution-lineage-2',
      at: '2026-09-08T12:06:00.000Z',
      status: 'in-progress',
      note: 'In progress.',
    });

    expect(() =>
      sharePinnedFinding(
        {
          ...progressed,
          resolutionHistory: [
            progressed.resolutionHistory[0],
            { ...progressed.resolutionHistory[1], id: 'resolution-lineage-1' },
          ],
        },
        { audience: 'external' },
      ),
    ).toThrow('Duplicate resolution id');
    expect(() =>
      sharePinnedFinding(
        {
          ...acknowledged,
          resolutionHistory: [{ ...acknowledged.resolutionHistory[0], previousStatus: 'resolved' }],
        },
        { audience: 'external' },
      ),
    ).toThrow('Invalid resolution lineage');
    expect(() =>
      sharePinnedFinding(
        {
          ...progressed,
          resolutionHistory: [
            progressed.resolutionHistory[0],
            { ...progressed.resolutionHistory[1], at: '2026-09-08T12:04:00.000Z' },
          ],
        },
        { audience: 'external' },
      ),
    ).toThrow('Backdated resolution event');
    expect(() =>
      sharePinnedFinding(
        { ...assigned, ownership: { ...assigned.ownership, current: undefined } },
        { audience: 'external' },
      ),
    ).toThrow('Invalid ownership lineage');
    expect(() =>
      sharePinnedFinding(
        { ...assigned, shareNamespace: 'raw-finding-id' },
        { audience: 'external' },
      ),
    ).toThrow('Invalid finding share namespace');
  });

  it('redacts role and team assignee ids and names by default', () => {
    const roleAssigned = assignFinding(
      pinFinding(seed, '2026-09-08T12:01:00.000Z'),
      { kind: 'role', id: 'role-secret-id', displayName: 'Secret Healer', role: 'healer' },
      '2026-09-08T12:03:00.000Z',
    );
    const teamAssigned = assignFinding(
      roleAssigned,
      { kind: 'team', id: 'team-secret-id', displayName: 'Secret Team' },
      '2026-09-08T12:04:00.000Z',
    );
    const shared = sharePinnedFinding(teamAssigned, { audience: 'external' });

    expect(shared.ownership.current).toEqual({ kind: 'team' });
    expect(shared.ownership.history[0].to).toEqual({ kind: 'role', role: 'healer' });
    expect(shared.ownership.history[1].from).toEqual({ kind: 'role', role: 'healer' });
    expect(JSON.stringify(shared)).not.toContain('role-secret-id');
    expect(JSON.stringify(shared)).not.toContain('Secret Healer');
    expect(JSON.stringify(shared)).not.toContain('team-secret-id');
    expect(JSON.stringify(shared)).not.toContain('Secret Team');
  });

  it('isolates nested shared objects from the original finding', () => {
    const assigned = assignFinding(
      pinFinding(seed, '2026-09-08T12:01:00.000Z'),
      { kind: 'player', id: 'player-lead', displayName: 'Raid Lead', role: 'tank' },
      '2026-09-08T12:03:00.000Z',
    );
    const source = appendResolution(assigned, {
      id: 'resolution-1',
      at: '2026-09-08T12:05:00.000Z',
      status: 'acknowledged',
      note: 'Reviewed.',
      changedBy: { id: 'player-lead', displayName: 'Raid Lead', role: 'tank' },
    });
    const shared = sharePinnedFinding(source, {
      audience: 'raid-lead',
      allowPlayerIdentifiers: true,
    });

    (shared.evidence[0].actor as { displayName?: string }).displayName = 'Changed actor';
    (shared.ownership.current as { displayName?: string }).displayName = 'Changed assignee';
    (shared.resolutionHistory[0].changedBy as { displayName?: string }).displayName =
      'Changed reviewer';

    expect(source.evidence[0].actor?.displayName).toBe('Ada');
    expect(source.ownership.current?.displayName).toBe('Raid Lead');
    expect(source.resolutionHistory[0].changedBy?.displayName).toBe('Raid Lead');
  });
});
