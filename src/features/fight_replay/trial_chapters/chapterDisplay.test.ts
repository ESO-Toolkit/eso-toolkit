import { chapterDisplayName, chapterStatusLabel, formatChapterDuration } from './chapterDisplay';

describe('chapterDisplayName', () => {
  it('passes boss names through untouched', () => {
    expect(chapterDisplayName({ name: 'Xalvakka', kind: 'boss' })).toBe('Xalvakka');
  });

  it('disambiguates trash that shares a boss name', () => {
    // ESO Logs names trash after its dominant enemy — without the prefix,
    // "Up next: Lylanar and Turlassil" reads as a boss pull.
    expect(chapterDisplayName({ name: 'Lylanar and Turlassil', kind: 'trash' })).toBe(
      'Trash · Lylanar and Turlassil',
    );
  });
});

describe('chapterStatusLabel', () => {
  it('labels trash cleared/wipe', () => {
    expect(
      chapterStatusLabel({ kind: 'trash', isKill: false, isWipe: false, bossPercentage: null }),
    ).toBe('Cleared');
    expect(
      chapterStatusLabel({ kind: 'trash', isKill: false, isWipe: true, bossPercentage: null }),
    ).toBe('Wipe');
  });

  it('labels boss kill / % left / wipe', () => {
    expect(
      chapterStatusLabel({ kind: 'boss', isKill: true, isWipe: false, bossPercentage: 0 }),
    ).toBe('Kill');
    expect(
      chapterStatusLabel({ kind: 'boss', isKill: false, isWipe: true, bossPercentage: 35 }),
    ).toBe('35% left');
    expect(
      chapterStatusLabel({ kind: 'boss', isKill: false, isWipe: true, bossPercentage: null }),
    ).toBe('Wipe');
  });
});

describe('formatChapterDuration', () => {
  it('formats m:ss with zero-padded seconds', () => {
    expect(formatChapterDuration(0)).toBe('0:00');
    expect(formatChapterDuration(61000)).toBe('1:01');
    expect(formatChapterDuration(-500)).toBe('0:00');
  });
});
