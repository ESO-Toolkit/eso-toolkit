import { resolveGrimoireIcon, resolveScribingSkillLine } from './scribingSkillLineResolver';
import { ALL_SKILL_LINES } from './skillLinesRegistry';

describe('scribingSkillLineResolver', () => {
  describe('resolveGrimoireIcon', () => {
    it('resolves a scribed ability id to its grimoire icon via the generated table', () => {
      // 220542 = "Magical Trample" (a Trample grimoire morph)
      expect(resolveGrimoireIcon(220542)).toBe('ability_grimoire_assault');
    });

    it('uses the fallback icon when the id is not in the table', () => {
      expect(resolveGrimoireIcon(999999, 'ability_grimoire_bow')).toBe('ability_grimoire_bow');
    });

    it('prefers the generated table over the fallback icon', () => {
      // The live master-data icon for a sub-effect may not be the grimoire icon;
      // the generated table is authoritative.
      expect(resolveGrimoireIcon(220542, 'ability_mage_065')).toBe('ability_grimoire_assault');
    });

    it('returns undefined for non-grimoire icons', () => {
      expect(resolveGrimoireIcon(undefined, 'ability_mage_065')).toBeUndefined();
      expect(resolveGrimoireIcon(999999)).toBeUndefined();
      expect(resolveGrimoireIcon()).toBeUndefined();
    });
  });

  describe('resolveScribingSkillLine', () => {
    it('resolves Trample grimoire morphs to the Assault skill line', () => {
      // 220541-220545 are Sundering/Magical/Dazing/Dispelling Trample morphs.
      for (const id of [220541, 220542, 220543, 220544, 220545]) {
        expect(resolveScribingSkillLine(id)).toEqual({
          className: 'alliance-war',
          skillLineName: 'Assault',
        });
      }
    });

    it('resolves Banner Bearer morphs to the Support skill line', () => {
      // 217699 = Banner Bearer grimoire base.
      expect(resolveScribingSkillLine(217699)).toEqual({
        className: 'alliance-war',
        skillLineName: 'Support',
      });
    });

    it('resolves weapon grimoires from their icon', () => {
      expect(resolveScribingSkillLine(undefined, 'ability_grimoire_bow')).toEqual({
        className: 'Weapon',
        skillLineName: 'Bow',
      });
      expect(resolveScribingSkillLine(undefined, 'ability_grimoire_staffresto')).toEqual({
        className: 'Weapon',
        skillLineName: 'Restoration Staff',
      });
    });

    it('maps both Soul Magic grimoires to the Soul Magic line', () => {
      expect(resolveScribingSkillLine(undefined, 'ability_grimoire_soulmagic1')).toEqual({
        className: 'world',
        skillLineName: 'Soul Magic',
      });
      expect(resolveScribingSkillLine(undefined, 'ability_grimoire_soulmagic2')).toEqual({
        className: 'world',
        skillLineName: 'Soul Magic',
      });
    });

    it('returns null for non-scribed abilities', () => {
      expect(resolveScribingSkillLine(46947, 'ability_mage_065')).toBeNull();
      expect(resolveScribingSkillLine(undefined, undefined)).toBeNull();
    });
  });

  // Drift guard: every skill line the resolver claims must exist in the registry
  // with a matching class/weapon label, so a future skill-line rename can't
  // silently desync the grimoire mapping.
  it('every mapped grimoire line matches a real skill line in the registry', () => {
    const grimoireIcons = [
      'ability_grimoire_1handed',
      'ability_grimoire_2handed',
      'ability_grimoire_bow',
      'ability_grimoire_dualwield',
      'ability_grimoire_staffdestro',
      'ability_grimoire_staffresto',
      'ability_grimoire_fightersguild',
      'ability_grimoire_magesguild',
      'ability_grimoire_soulmagic1',
      'ability_grimoire_soulmagic2',
      'ability_grimoire_assault',
      'ability_grimoire_support',
    ];

    for (const icon of grimoireIcons) {
      const label = resolveScribingSkillLine(undefined, icon);
      expect(label).not.toBeNull();
      const line = ALL_SKILL_LINES.find((sl) => sl.name === label!.skillLineName);
      expect(line).toBeDefined();
      const labelSource = line as unknown as { class?: string; weapon?: string };
      expect(labelSource.class ?? labelSource.weapon).toBe(label!.className);
    }
  });
});
