import { DecompressionStream as NodeDecompressionStream } from 'node:stream/web';
import { deflateRawSync } from 'node:zlib';

import type { PlayerDetailsEntry } from '@/types/playerDetails';

import {
  decodeKalpaBuildEvidenceParam,
  fetchKalpaBuildEvidenceForReport,
  findAnonymousKalpaBuildEvidenceForPlayer,
  findKalpaBuildEvidenceForPlayer,
  getKalpaEvidenceDeflateParamFromLocation,
  getKalpaEvidenceParamFromLocation,
  KALPA_BUILD_EVIDENCE_DEFLATE_PARAM,
  KALPA_BUILD_EVIDENCE_PARAM,
  KALPA_BUILD_EVIDENCE_SOURCE,
  kalpaRaceIdToBuildRace,
  kalpaRaceIdToLabel,
  loadKalpaBuildEvidenceForReport,
  redactKalpaPlayerIdentity,
  type KalpaBuildEvidence,
} from './kalpaBuildEvidence';

const globalWithStreams = globalThis as typeof globalThis & {
  DecompressionStream?: typeof DecompressionStream;
};

if (typeof globalWithStreams.DecompressionStream === 'undefined') {
  globalWithStreams.DecompressionStream = NodeDecompressionStream as typeof DecompressionStream;
}

jest.mock('./envUtils', () => ({
  getRosterHubBaseUrl: () => 'https://worker.example.test',
}));

function encodeEvidence(evidence: KalpaBuildEvidence): string {
  const binary = encodeURIComponent(JSON.stringify(evidence)).replace(
    /%([0-9A-F]{2})/g,
    (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function encodeDeflateEvidence(evidence: KalpaBuildEvidence): string {
  return deflateRawSync(JSON.stringify(evidence))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function player(overrides: Partial<PlayerDetailsEntry>): PlayerDetailsEntry {
  return {
    name: 'Arc Spark',
    id: 1,
    guid: 111,
    type: 'Player',
    server: 'NA',
    displayName: '@tester',
    anonymous: false,
    icon: '',
    specs: [],
    potionUse: 0,
    healthstoneUse: 0,
    combatantInfo: { stats: [], talents: [], gear: [] },
    ...overrides,
  };
}

const evidence: KalpaBuildEvidence = {
  schemaVersion: 1,
  extractorVersion: 2,
  source: KALPA_BUILD_EVIDENCE_SOURCE,
  reportCode: 'REPORT123',
  players: [
    {
      unitId: '1',
      unitOccurrenceId: '1',
      characterName: 'Arc Spark',
      accountName: '@tester',
      characterId: '111',
      classId: 2,
      raceId: 9,
      level: 50,
      championPoints: 1700,
      className: 'Sorcerer',
      classMasteryPassives: [263870, 263871],
      championPointPassives: [142210, 142079],
      food: {
        abilityId: 68411,
        name: 'Increase All Primary Stats',
        icon: 'store_tricolor_food_01',
      },
      scribedSkills: [
        { abilityId: 220543, name: 'Dazing Trample', icon: 'ability_grimoire_assault' },
      ],
      evidence: 'raw-player-info',
      confidence: 'exact',
    },
  ],
};

describe('kalpaBuildEvidence', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    window.history.replaceState(null, '', '/');
    jest.restoreAllMocks();
  });

  it('reads the evidence param from hash-route queries and decodes it', () => {
    const encoded = encodeEvidence(evidence);
    const raw = getKalpaEvidenceParamFromLocation({
      search: '',
      hash: `#/report/REPORT123?${KALPA_BUILD_EVIDENCE_PARAM}=${encoded}`,
    });

    expect(raw).toBe(encoded);
    expect(decodeKalpaBuildEvidenceParam(raw)).toEqual(evidence);
  });

  it('reads compressed evidence params from hash-route queries and falls back to them on Worker miss', async () => {
    const encoded = encodeDeflateEvidence(evidence);
    const raw = getKalpaEvidenceDeflateParamFromLocation({
      search: '',
      hash: `#/report/REPORT123?${KALPA_BUILD_EVIDENCE_DEFLATE_PARAM}=${encoded}`,
    });
    expect(raw).toBe(encoded);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    window.history.replaceState(
      null,
      '',
      `/#/report/REPORT123?${KALPA_BUILD_EVIDENCE_DEFLATE_PARAM}=${encoded}`,
    );

    await expect(fetchKalpaBuildEvidenceForReport('REPORT123')).resolves.toEqual(evidence);
    expect(loadKalpaBuildEvidenceForReport('REPORT123', { search: '', hash: '' })).toEqual(
      evidence,
    );
  });

  it('passes an ESOTK Companion block through validation', () => {
    const withCompanion = {
      ...evidence,
      companion: {
        snapshots: [{ ts: 1749384000, char: 'Casts-A-Lot', cp: { total: 3600 } }],
      },
    };
    const decoded = decodeKalpaBuildEvidenceParam(encodeEvidence(withCompanion));
    expect(decoded?.companion?.snapshots).toHaveLength(1);
    expect(decoded?.companion?.snapshots?.[0]).toMatchObject({ char: 'Casts-A-Lot' });
  });

  it('persists matching report evidence in session storage and reloads it without the URL param', () => {
    const encoded = encodeEvidence(evidence);
    const first = loadKalpaBuildEvidenceForReport('REPORT123', {
      search: '',
      hash: `#/report/REPORT123?${KALPA_BUILD_EVIDENCE_PARAM}=${encoded}`,
    });
    const second = loadKalpaBuildEvidenceForReport('REPORT123', { search: '', hash: '' });

    expect(first).toEqual(evidence);
    expect(second).toEqual(evidence);
  });

  it('rejects evidence for a different report code', () => {
    const encoded = encodeEvidence(evidence);

    expect(
      loadKalpaBuildEvidenceForReport('OTHER', {
        search: '',
        hash: `#/report/OTHER?${KALPA_BUILD_EVIDENCE_PARAM}=${encoded}`,
      }),
    ).toBeUndefined();
  });

  it('matches players by exact character id or account plus character name', () => {
    expect(findKalpaBuildEvidenceForPlayer(evidence, player({ guid: 111 }))).toBe(
      evidence.players[0],
    );
    expect(
      findKalpaBuildEvidenceForPlayer(
        evidence,
        player({ guid: 0, name: 'Arc Spark', displayName: 'tester' }),
      ),
    ).toBe(evidence.players[0]);
  });

  it('requires single-field account matches to be unique', () => {
    const ambiguous: KalpaBuildEvidence = {
      ...evidence,
      players: [
        { ...evidence.players[0], unitId: '1', characterName: 'One', characterId: '111' },
        { ...evidence.players[0], unitId: '2', characterName: 'Two', characterId: '222' },
      ],
    };

    expect(
      findKalpaBuildEvidenceForPlayer(
        ambiguous,
        player({ guid: 0, name: 'Unknown', displayName: '@tester' }),
      ),
    ).toBeUndefined();
  });

  it('matches anonymous sidecar rows by unique class and CP fingerprint', () => {
    const anonymousEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          unitId: '40',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Nightblade',
          championPointPassives: [142210, 142079, 142092, 156008],
        },
        {
          ...evidence.players[0],
          unitId: '41',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Sorcerer',
          championPointPassives: [142210, 142079, 142092, 156008],
        },
      ],
    };

    expect(
      findAnonymousKalpaBuildEvidenceForPlayer(anonymousEvidence, {
        classNames: ['Nightblade', 'Warden'],
        championPointPassiveIds: [142079, 142092, 156008],
      }),
    ).toBe(anonymousEvidence.players[0]);
  });

  it('does not guess anonymous sidecar rows when the fingerprint is ambiguous', () => {
    const ambiguous: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          unitId: '40',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Nightblade',
          championPointPassives: [142079, 142092],
        },
        {
          ...evidence.players[0],
          unitId: '41',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Nightblade',
          championPointPassives: [142079, 142092],
        },
      ],
    };

    expect(
      findAnonymousKalpaBuildEvidenceForPlayer(ambiguous, {
        classNames: ['Nightblade'],
        championPointPassiveIds: [142079, 142092],
      }),
    ).toBeUndefined();
  });

  it('can match anonymous sidecar rows by unique class and scribed skill fingerprint', () => {
    const anonymousEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          unitId: '40',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Templar',
          championPointPassives: [],
          scribedSkills: [{ abilityId: 217784, name: 'Leashing Soul' }],
        },
        {
          ...evidence.players[0],
          unitId: '41',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Templar',
          championPointPassives: [],
          scribedSkills: [{ abilityId: 220543, name: 'Dazing Trample' }],
        },
      ],
    };

    expect(
      findAnonymousKalpaBuildEvidenceForPlayer(anonymousEvidence, {
        classNames: ['Templar'],
        scribedSkillIds: [217784],
      }),
    ).toBe(anonymousEvidence.players[0]);
  });

  it('excludes exact anonymous sidecar rows without blocking reused unit ids', () => {
    const anonymousEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          unitId: '45',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Templar',
          championPointPassives: [142079, 142092],
        },
        {
          ...evidence.players[0],
          unitId: '45',
          characterName: undefined,
          accountName: undefined,
          characterId: undefined,
          className: 'Nightblade',
          championPointPassives: [142079, 156008],
        },
      ],
    };

    expect(
      findAnonymousKalpaBuildEvidenceForPlayer(anonymousEvidence, {
        classNames: ['Nightblade'],
        championPointPassiveIds: [142079, 156008],
        excludedPlayers: new Set([anonymousEvidence.players[0]]),
      }),
    ).toBe(anonymousEvidence.players[1]);
  });

  it('does not use identified sidecar rows for anonymous matching and can redact identities', () => {
    expect(
      findAnonymousKalpaBuildEvidenceForPlayer(evidence, {
        classNames: ['Sorcerer'],
        championPointPassiveIds: [142210, 142079],
      }),
    ).toBeUndefined();

    expect(redactKalpaPlayerIdentity(evidence.players[0])).toEqual({
      ...evidence.players[0],
      characterName: undefined,
      accountName: undefined,
      characterId: undefined,
    });
  });

  it('preserves scribing sidecar facts without needing normal bars or gear', () => {
    const scribingEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          scribedSkills: [
            { abilityId: 217784, name: 'Leashing Soul', icon: 'ability_grimoire_soulmagic1' },
          ],
        },
      ],
    };

    expect(decodeKalpaBuildEvidenceParam(encodeEvidence(scribingEvidence))).toEqual(
      scribingEvidence,
    );
  });

  it('round-trips ground-truth focus/signature/affix scripts on scribed skills', () => {
    const scribingEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          scribedSkills: [
            {
              abilityId: 217784,
              name: 'Leashing Soul',
              icon: 'ability_grimoire_soulmagic1',
              focusScript: 'Pull',
              signatureScript: 'Lingering Torment',
              affixScript: 'Defile',
            },
          ],
        },
      ],
    };

    expect(decodeKalpaBuildEvidenceParam(encodeEvidence(scribingEvidence))).toEqual(
      scribingEvidence,
    );
  });

  it('round-trips the Mundus stone evidence', () => {
    const mundusEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          mundus: {
            abilityId: 13984,
            name: 'Boon: The Shadow',
            icon: 'ability_mundusstones_012',
          },
        },
      ],
    };

    expect(decodeKalpaBuildEvidenceParam(encodeEvidence(mundusEvidence))).toEqual(mundusEvidence);
  });

  it('round-trips the full passives list', () => {
    const passivesEvidence: KalpaBuildEvidence = {
      ...evidence,
      players: [
        {
          ...evidence.players[0],
          passives: [142079, 999999, 45301],
        },
      ],
    };

    expect(decodeKalpaBuildEvidenceParam(encodeEvidence(passivesEvidence))).toEqual(
      passivesEvidence,
    );
  });

  it('maps native race ids to build editor ids and labels', () => {
    expect(kalpaRaceIdToBuildRace(9)).toBe('khajiit');
    expect(kalpaRaceIdToLabel(9)).toBe('Khajiit');
    expect(kalpaRaceIdToBuildRace(999)).toBeUndefined();
    expect(kalpaRaceIdToLabel(null)).toBeUndefined();
  });

  it('fetches persisted report evidence from the Worker and caches it', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => evidence,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchKalpaBuildEvidenceForReport('REPORT123')).resolves.toEqual(evidence);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://worker.example.test/reports/REPORT123/build-evidence',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
    expect(loadKalpaBuildEvidenceForReport('REPORT123', { search: '', hash: '' })).toEqual(
      evidence,
    );
  });

  it('refreshes stale session storage from the Worker when remote evidence is available', async () => {
    const staleEvidence: KalpaBuildEvidence = {
      ...evidence,
      extractorVersion: 1,
      players: [
        {
          ...evidence.players[0],
          unitOccurrenceId: undefined,
          championPoints: 1700,
        },
      ],
    };
    const freshEvidence: KalpaBuildEvidence = {
      ...evidence,
      extractorVersion: 2,
      players: [
        {
          ...evidence.players[0],
          unitOccurrenceId: '1',
          championPoints: 1800,
        },
      ],
    };
    sessionStorage.setItem('kalpa.buildEvidence.REPORT123', JSON.stringify(staleEvidence));
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => freshEvidence,
    }) as unknown as typeof fetch;

    await expect(fetchKalpaBuildEvidenceForReport('REPORT123')).resolves.toEqual(freshEvidence);
    expect(loadKalpaBuildEvidenceForReport('REPORT123', { search: '', hash: '' })).toEqual(
      freshEvidence,
    );
  });

  it('ignores missing or mismatched persisted report evidence', async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    }) as unknown as typeof fetch;
    await expect(fetchKalpaBuildEvidenceForReport('REPORT123')).resolves.toBeUndefined();

    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...evidence, reportCode: 'OTHER' }),
    }) as unknown as typeof fetch;
    await expect(fetchKalpaBuildEvidenceForReport('REPORT123')).resolves.toBeUndefined();
  });
});
