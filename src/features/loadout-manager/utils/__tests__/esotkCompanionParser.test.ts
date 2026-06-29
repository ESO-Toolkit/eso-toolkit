import { isESOTKCompanionFormat, parseESOTKCompanionSavedVariables } from '../esotkCompanionParser';

const SAMPLE = `
ESOTKCompanionSV =
{
    ["Default"] =
    {
        ["@brayden"] =
        {
            ["$AccountWide"] =
            {
                ["schemaVersion"] = 1,
                ["season"] = "U50",
                ["enabled"] = true,
                ["snapshots"] =
                {
                    [1] =
                    {
                        ["ts"] = 1749384000,
                        ["char"] = "Casts-A-Lot",
                        ["account"] = "@brayden",
                        ["server"] = "NA",
                        ["zoneId"] = 1196,
                        ["classId"] = 6,
                        ["className"] = "Arcanist",
                        ["raceId"] = 4,
                        ["raceName"] = "Khajiit",
                        ["level"] = 50,
                        ["cpRank"] = 3600,
                        ["role"] = 1,
                        ["reason"] = "combatEnd",
                        ["cp"] =
                        {
                            ["total"] = 3600,
                            ["disciplines"] =
                            {
                                [1] =
                                {
                                    ["id"] = 1,
                                    ["type"] = 0,
                                    ["spent"] = 100,
                                    ["skills"] =
                                    {
                                        [25] = 50,
                                        [27] = 50,
                                    },
                                },
                            },
                            ["slotted"] =
                            {
                                [1] = 29,
                                [5] = 25,
                                [9] = 4,
                            },
                        },
                        ["stats"] =
                        {
                            ["spellDamage"] = 4500,
                            ["physicalPen"] = 18200,
                            ["weaponCrit"] = 8000,
                            ["critDamage"] = 125,
                        },
                        ["attrs"] =
                        {
                            ["magicka"] = 0,
                            ["health"] = 0,
                            ["stamina"] = 64,
                        },
                        ["effects"] =
                        {
                            [1] =
                            {
                                ["id"] = 13984,
                                ["name"] = "Boon: The Lover",
                                ["duration"] = 0,
                            },
                        },
                        ["bars"] =
                        {
                            ["front"] = { [3] = 28800, [4] = 38901 },
                            ["back"] = { [3] = 46324 },
                        },
                    },
                    [2] =
                    {
                        ["ts"] = 1749384600,
                        ["char"] = "Casts-A-Lot",
                        ["server"] = "NA",
                        ["reason"] = "manual",
                        ["cp"] = { ["total"] = 3600, ["disciplines"] = {}, ["slotted"] = {} },
                    },
                },
            },
        },
    },
}
`;

describe('parseESOTKCompanionSavedVariables', () => {
  it('detects the companion format', () => {
    expect(isESOTKCompanionFormat(SAMPLE)).toBe(true);
    expect(isESOTKCompanionFormat('SomethingElseSV = {}')).toBe(false);
  });

  it('returns null for non-companion files', () => {
    expect(parseESOTKCompanionSavedVariables('WizardsWardrobeSV = {}')).toBeNull();
  });

  it('parses snapshots grouped by account, ordered by timestamp', () => {
    const result = parseESOTKCompanionSavedVariables(SAMPLE);
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(1);
    expect(result!.season).toBe('U50');
    expect(Object.keys(result!.byAccount)).toEqual(['@brayden']);
    expect(result!.all).toHaveLength(2);
    expect(result!.all[0].ts).toBeLessThan(result!.all[1].ts);
  });

  it('captures the full champion point allocation — the gap ESO Logs lacks', () => {
    const result = parseESOTKCompanionSavedVariables(SAMPLE)!;
    const cp = result.all[0].championPoints!;
    expect(cp.total).toBe(3600);

    // per-star allocation, keyed by skill id
    expect(cp.disciplines[1].spent).toBe(100);
    expect(cp.disciplines[1].skills[25]).toBe(50);
    expect(cp.disciplines[1].skills[27]).toBe(50);

    // the 12 slotted stars (sparse)
    expect(cp.slotted[1]).toBe(29);
    expect(cp.slotted[5]).toBe(25);
    expect(cp.slotted[9]).toBe(4);
  });

  it('captures final stats and attributes the API never exposes', () => {
    const snap = parseESOTKCompanionSavedVariables(SAMPLE)!.all[0];
    expect(snap.stats!.spellDamage).toBe(4500);
    expect(snap.stats!.physicalPen).toBe(18200);
    expect(snap.stats!.weaponCrit).toBe(8000);
    expect(snap.stats!.critDamage).toBe(125);
    expect(snap.attributes).toEqual({ magicka: 0, health: 0, stamina: 64 });
  });

  it('captures match keys, effects and bars', () => {
    const snap = parseESOTKCompanionSavedVariables(SAMPLE)!.all[0];
    expect(snap.char).toBe('Casts-A-Lot');
    expect(snap.server).toBe('NA');
    expect(snap.ts).toBe(1749384000);
    expect(snap.classId).toBe(6);
    expect(snap.className).toBe('Arcanist');
    expect(snap.raceId).toBe(4);
    expect(snap.raceName).toBe('Khajiit');
    expect(snap.effects).toEqual([{ id: 13984, name: 'Boon: The Lover', duration: 0 }]);
    expect(snap.bars!.front).toEqual({ 3: 28800, 4: 38901 });
    expect(snap.bars!.back).toEqual({ 3: 46324 });
  });

  it('drops snapshots missing the match keys (ts / char)', () => {
    const broken = `
      ESOTKCompanionSV = { ["Default"] = { ["@x"] = { ["$AccountWide"] = {
        ["schemaVersion"] = 1,
        ["snapshots"] = { [1] = { ["char"] = "NoTimestamp" }, [2] = { ["ts"] = 1 } },
      } } } }
    `;
    // both snapshots are unusable (one lacks ts, one lacks char) → no result
    expect(parseESOTKCompanionSavedVariables(broken)).toBeNull();
  });
});
