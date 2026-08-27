import { detectTalentInfo, isWerewolfBuild } from './talent-mapper';
import type { TalentItem } from './esologs-client';

// TalentItem requires a `type` field that detectTalentInfo never reads.
const t = (guid: number): TalentItem => ({ guid, type: 0 });

// Werewolf builds previously produced NO signal at all: none of their ability
// IDs appear in ABILITY_TO_LINE, and they cannot simply be added there because
// CLASS_SKILL_LINES has no Werewolf index to encode.
describe('werewolf detection', () => {
  it('flags a build slotted with core Werewolf abilities', () => {
    // Werewolf Berserker ultimate + Ferocious Roar morph.
    expect(detectTalentInfo([t(39076), t(39113)])).toMatchObject({ werewolf: true });
    expect(isWerewolfBuild([t(39076), t(39113)])).toBe(true);
  });

  it('recognises base abilities and every morph family', () => {
    const ids = [
      32455, // Werewolf Transformation
      32632, // Pounce
      58310, // Hircine's Bounty
      32633, // Roar
      58405, // Gnash
      58850, // Rending Claws
      39075, // Pack Leader
      39104, // Feral Pounce
      39105, // Brutal Pounce
      58317, // Hircine's Rage
      58325, // Hircine's Fortitude
      39113, // Ferocious Roar
      39114, // Deafening Roar
      58798, // Bloody Gnash
      58742, // Rip and Tear
      58864, // Claw Fury
      58879, // Bloodclaws
    ];
    ids.forEach((id) => expect(isWerewolfBuild([t(id)])).toBe(true));
  });

  it('does not flag class builds', () => {
    // 3463 = Ardent Flame (searing strike family), 25255 = Assassination.
    expect(isWerewolfBuild([t(3463), t(25255)])).toBe(false);
    expect(detectTalentInfo([t(3463)]).werewolf).toBeUndefined();
  });

  it('tolerates empty or malformed talent lists', () => {
    expect(() => isWerewolfBuild([])).not.toThrow();
    expect(isWerewolfBuild([{ guid: undefined } as never])).toBe(false);
    expect(detectTalentInfo([])).toEqual({});
  });
});
