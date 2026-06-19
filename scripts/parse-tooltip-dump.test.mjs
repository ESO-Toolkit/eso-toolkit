import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLuaTable, transform } from './parse-tooltip-dump.mjs';

function parseFixture(luaBody) {
  return parseLuaTable(`ESOTooltipDumpSV = ${luaBody}`);
}

describe('parse-tooltip-dump transform', () => {
  it('preserves exhaustive ability scan rank variants and dump metadata', () => {
    const sv = parseFixture(`{
      ["formatVersion"] = 3,
      ["apiVersion"] = 101050,
      ["abilityIdMode"] = "exhaustive-scan",
      ["abilityIdScanMin"] = 1,
      ["abilityIdScanMax"] = 300000,
      ["abilityIdRequestedCount"] = 300000,
      ["combatLogSeededAbilityIdCount"] = 2,
      ["abilityRanksById"] = {
        [1] = {
          ["id"] = 28858,
          ["name"] = "Puncturing Strikes",
          ["ranks"] = {
            [1] = { ["id"] = 28858, ["rank"] = 1, ["name"] = "Puncturing Strikes", ["description"] = "Rank 1 text" },
            [2] = { ["id"] = 28858, ["rank"] = 2, ["name"] = "Puncturing Strikes", ["description"] = "Rank 2 text" },
          },
          ["bestRank"] = 2,
        },
      },
      ["abilitiesById"] = {
        [1] = { ["id"] = 28858, ["rank"] = 2, ["name"] = "Puncturing Strikes", ["description"] = "Rank 2 text" },
      },
    }`);

    const result = transform(sv);

    assert.equal(result.meta.abilityIdMode, 'exhaustive-scan');
    assert.equal(result.meta.abilityIdScanMax, 300000);
    assert.equal(result.meta.abilityIdRequestedCount, 300000);
    assert.equal(result.meta.combatLogSeededAbilityIdCount, 2);
    assert.equal(result.abilityRanksById.length, 1);
    assert.deepEqual(
      result.abilityRanksById[0].ranks.map((rank) => rank.description),
      ['Rank 1 text', 'Rank 2 text'],
    );
    assert.equal(result.abilityRanksById[0].bestRank, 2);
  });

  it('preserves set item/link/category metadata for downstream data-source checks', () => {
    const sv = parseFixture(`{
      ["sets"] = {
        [1] = {
          ["id"] = 587,
          ["name"] = "Perfected Test Set",
          ["maxEquipped"] = 5,
          ["itemId"] = 12345,
          ["referenceItemLink"] = "|H1:item:12345:370:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:0:10000:0|h|h",
          ["itemIcon"] = "/esoui/art/icons/gear_test.dds",
          ["sourceTypes"] = { [1] = 1, [2] = 13 },
          ["setType"] = 2,
          ["equipTypes"] = { [1] = 1, [2] = 2 },
          ["bonuses"] = {
            [1] = { ["numRequired"] = 2, ["description"] = "Adds 129 Weapon and Spell Damage", ["perfected"] = false },
            [2] = { ["numRequired"] = 5, ["description"] = "Perfected bonus", ["perfected"] = true },
          },
        },
      },
    }`);

    const result = transform(sv);

    assert.equal(result.sets[0].itemId, 12345);
    assert.equal(result.sets[0].referenceItemLink.includes('item:12345'), true);
    assert.equal(result.sets[0].itemIcon, '/esoui/art/icons/gear_test.dds');
    assert.deepEqual(result.sets[0].sourceTypes, [1, 13]);
    assert.equal(result.sets[0].setType, 2);
    assert.deepEqual(result.sets[0].equipTypes, [1, 2]);
  });
});
