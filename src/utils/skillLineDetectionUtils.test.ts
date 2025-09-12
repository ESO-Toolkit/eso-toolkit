import { abbreviateSkillLine } from './skillLineDetectionUtils';

describe('skillLineDetectionUtils', () => {
  describe('abbreviateSkillLine', () => {
    // Arcanist skill lines
    it('should abbreviate Herald of the Tome', () => {
      expect(abbreviateSkillLine('Herald of the Tome')).toBe('HERALD');
    });

    it('should abbreviate Soldier of Apocrypha', () => {
      expect(abbreviateSkillLine('Soldier of Apocrypha')).toBe('SOLDIER');
    });

    it('should abbreviate Curative Runeforms', () => {
      expect(abbreviateSkillLine('Curative Runeforms')).toBe('RUNEFORM');
    });

    // Dragonknight skill lines
    it('should abbreviate Ardent Flame', () => {
      expect(abbreviateSkillLine('Ardent Flame')).toBe('ARDENT');
    });

    it('should abbreviate Draconic Power', () => {
      expect(abbreviateSkillLine('Draconic Power')).toBe('DRACONIC');
    });

    it('should abbreviate Earthen Heart', () => {
      expect(abbreviateSkillLine('Earthen Heart')).toBe('EARTHEN');
    });

    // Necromancer skill lines
    it('should abbreviate Grave Lord', () => {
      expect(abbreviateSkillLine('Grave Lord')).toBe('GRAVE');
    });

    it('should abbreviate Bone Tyrant', () => {
      expect(abbreviateSkillLine('Bone Tyrant')).toBe('TYRANT');
    });

    it('should abbreviate Living Death', () => {
      expect(abbreviateSkillLine('Living Death')).toBe('DEATH');
    });

    // Nightblade skill lines
    it('should abbreviate Assassination', () => {
      expect(abbreviateSkillLine('Assassination')).toBe('ASSASSIN');
    });

    it('should abbreviate Shadow', () => {
      expect(abbreviateSkillLine('Shadow')).toBe('SHADOW');
    });

    it('should abbreviate Siphoning', () => {
      expect(abbreviateSkillLine('Siphoning')).toBe('SIPHON');
    });

    // Sorcerer skill lines
    it('should abbreviate Dark Magic', () => {
      expect(abbreviateSkillLine('Dark Magic')).toBe('DARK');
    });

    it('should abbreviate Storm Calling', () => {
      expect(abbreviateSkillLine('Storm Calling')).toBe('STORM');
    });

    it('should abbreviate Daedric Summoning', () => {
      expect(abbreviateSkillLine('Daedric Summoning')).toBe('DAEDRIC');
    });

    // Templar skill lines
    it('should abbreviate Aedric Spear', () => {
      expect(abbreviateSkillLine('Aedric Spear')).toBe('AEDRIC');
    });

    it("should abbreviate Dawn's Wrath", () => {
      expect(abbreviateSkillLine("Dawn's Wrath")).toBe('DAWN');
    });

    it('should abbreviate Restoring Light', () => {
      expect(abbreviateSkillLine('Restoring Light')).toBe('RESTORING');
    });

    // Warden skill lines
    it('should abbreviate Animal Companions', () => {
      expect(abbreviateSkillLine('Animal Companions')).toBe('ANIMAL');
    });

    it('should abbreviate Green Balance', () => {
      expect(abbreviateSkillLine('Green Balance')).toBe('GREEN');
    });

    it("should abbreviate Winter's Embrace", () => {
      expect(abbreviateSkillLine("Winter's Embrace")).toBe('WINTER');
    });

    // Unknown skill lines (fallback)
    it('should handle unknown skill lines with first letter abbreviation', () => {
      expect(abbreviateSkillLine('Unknown Skill Line')).toBe('USL');
      expect(abbreviateSkillLine('Random')).toBe('R');
      expect(abbreviateSkillLine('Two Words')).toBe('TW');
      expect(abbreviateSkillLine('Very Long Name With Many Words')).toBe('VLNW');
    });

    it('should handle empty or short names', () => {
      expect(abbreviateSkillLine('')).toBe('');
      expect(abbreviateSkillLine('A')).toBe('A');
      expect(abbreviateSkillLine('AB')).toBe('AB');
    });
  });
});
