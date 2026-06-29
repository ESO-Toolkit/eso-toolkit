import type { PlayerDetailsEntry } from '@/types/playerDetails';

import {
  decodeKalpaBuildEvidenceParam,
  findKalpaBuildEvidenceForPlayer,
  getKalpaEvidenceParamFromLocation,
  KALPA_BUILD_EVIDENCE_PARAM,
  KALPA_BUILD_EVIDENCE_SOURCE,
  loadKalpaBuildEvidenceForReport,
  type KalpaBuildEvidence,
} from './kalpaBuildEvidence';

function encodeEvidence(evidence: KalpaBuildEvidence): string {
  const binary = encodeURIComponent(JSON.stringify(evidence)).replace(
    /%([0-9A-F]{2})/g,
    (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
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
  source: KALPA_BUILD_EVIDENCE_SOURCE,
  reportCode: 'REPORT123',
  players: [
    {
      unitId: '1',
      characterName: 'Arc Spark',
      accountName: '@tester',
      characterId: '111',
      classId: 2,
      raceId: 9,
      level: 50,
      championPoints: 1700,
      className: 'Sorcerer',
      classMasteryPassives: [263870, 263871],
      frontBarSkillIds: [38901, 29489],
      backBarSkillIds: [23231, 23234],
      evidence: 'raw-player-info',
      confidence: 'exact',
    },
  ],
};

describe('kalpaBuildEvidence', () => {
  beforeEach(() => {
    sessionStorage.clear();
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
});
