import { createActorPositionsInputHash } from './actorPositionsSlice';
import { createDebuffLookupInputHash } from './debuffLookupSlice';

const ev = (timestamp: number, extra = {}) => ({
  timestamp,
  type: 'damage',
  sourceID: 1,
  targetID: 2,
  abilityGameID: 99,
  ...extra,
});

describe('worker task input hashes', () => {
  describe('createActorPositionsInputHash', () => {
    const base = {
      fight: { id: 7, startTime: 1000, endTime: 5000 },
      events: {
        damage: [ev(1000), ev(2000)],
        heal: [],
        death: [],
        resource: [],
        cast: [],
      },
      playersById: { 1: {} },
      actorsById: { 1: {}, 2: {} },
      debuffLookupData: { buffIntervals: { TAUNT: [{}, {}] } },
      reportCode: 'abc123',
    };

    it('is stable for identical inputs', () => {
      expect(createActorPositionsInputHash(base)).toBe(createActorPositionsInputHash({ ...base }));
    });

    it('separates same-length streams with different content', () => {
      const other = {
        ...base,
        events: { ...base.events, damage: [ev(1000), ev(3000)] },
      };
      expect(createActorPositionsInputHash(base)).not.toBe(createActorPositionsInputHash(other));
    });

    it('separates identical fights from different reports', () => {
      const other = { ...base, reportCode: 'zzz999' };
      expect(createActorPositionsInputHash(base)).not.toBe(createActorPositionsInputHash(other));
    });

    it('separates different debuff content with equal key counts', () => {
      const other = {
        ...base,
        debuffLookupData: { buffIntervals: { TAUNT: [{}] } },
      };
      expect(createActorPositionsInputHash(base)).not.toBe(createActorPositionsInputHash(other));
    });
  });

  describe('createDebuffLookupInputHash', () => {
    const base = {
      buffEvents: [ev(100, { abilityGameID: 1 }), ev(200, { abilityGameID: 2 })],
      fightEndTime: 5000,
      fightId: 7,
      fightStartTime: 1000,
    };

    it('is stable for identical inputs', () => {
      expect(createDebuffLookupInputHash(base)).toBe(createDebuffLookupInputHash({ ...base }));
    });

    it('separates same-count streams with different content', () => {
      const other = {
        ...base,
        buffEvents: [ev(100, { abilityGameID: 1 }), ev(250, { abilityGameID: 2 })],
      };
      expect(createDebuffLookupInputHash(base)).not.toBe(createDebuffLookupInputHash(other));
    });

    it('separates two empty streams from different fights', () => {
      const a = { buffEvents: [], fightEndTime: 5000, fightId: 7, fightStartTime: 1000 };
      const b = { buffEvents: [], fightEndTime: 5000, fightId: 8, fightStartTime: 1000 };
      expect(createDebuffLookupInputHash(a)).not.toBe(createDebuffLookupInputHash(b));
    });

    it('separates identical streams with different fight bounds', () => {
      const other = { ...base, fightStartTime: 1500 };
      expect(createDebuffLookupInputHash(base)).not.toBe(createDebuffLookupInputHash(other));
    });
  });
});
