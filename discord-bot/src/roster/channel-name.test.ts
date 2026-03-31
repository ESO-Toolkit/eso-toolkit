import { describe, expect, it } from 'vitest';

import {
  buildChannelName,
  buildTrialTag,
  normaliseDay,
  parseChannelName,
  resolveChannelName,
  TRIAL_ABBREVS,
} from './channel-name';

// ── buildChannelName (template mode, backwards compat) ────────────────────────

describe('buildChannelName', () => {
  it('replaces all tokens', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'sun',
      time: '9pm',
      trial: 'vlc',
    });
    expect(result).toBe('sun-9pm-vlc');
  });

  it('handles missing tokens gracefully', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'mon',
    });
    expect(result).toBe('mon');
  });

  it('sanitizes special characters', () => {
    const result = buildChannelName('My Roster! (HM)', {});
    expect(result).toBe('my-roster-hm');
  });

  it('collapses multiple hyphens', () => {
    const result = buildChannelName('{day-short}--{trial}', {
      dayShort: 'wed',
    });
    expect(result).toBe('wed');
  });

  it('returns "roster" for empty result', () => {
    const result = buildChannelName('', {});
    expect(result).toBe('roster');
  });

  it('resolves legacy {tag} token as alias for {trial}', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}', {
      dayShort: 'sun',
      time: '8pm',
      trial: 'SS',
      difficulty: 'veteran',
    });
    expect(result).toBe('sun-8pm-vss');
  });

  it('resolves legacy {trainer} token as empty string', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}-{trainer}', {
      dayShort: 'sun',
      time: '9pm',
      trial: 'LC',
      difficulty: 'veteran',
    });
    expect(result).toBe('sun-9pm-vlc');
  });

  it('lowercases everything', () => {
    const result = buildChannelName('Sunday VLC Prog', {});
    expect(result).toBe('sunday-vlc-prog');
  });

  it('appends extra tags after the channel name', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'sun',
      time: '9pm',
      trial: 'SS',
      difficulty: 'veteran',
      extraTags: ['hm'],
    });
    expect(result).toBe('sun-9pm-vss-hm');
  });

  it('appends multiple extra tags', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'mon',
      time: '8pm',
      trial: 'LC',
      difficulty: 'veteran',
      extraTags: ['hm', 'score-push'],
    });
    expect(result).toBe('mon-8pm-vlc-hm-score-push');
  });

  it('handles empty extraTags array', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'sun',
      time: '9pm',
      trial: 'SS',
      difficulty: 'veteran',
      extraTags: [],
    });
    expect(result).toBe('sun-9pm-vss');
  });
});

// ── buildChannelName (with difficulty prefix) ────────────────────────────────

describe('buildChannelName with difficulty', () => {
  it('builds the standard format: day-time-vtrial', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'sunday',
      time: '9pm',
      difficulty: 'veteran',
      trial: 'LC',
    });
    expect(result).toBe('sun-9pm-vlc');
  });

  it('handles veteran HRC on Monday', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'monday',
      time: '1pm',
      difficulty: 'veteran',
      trial: 'HRC',
    });
    expect(result).toBe('mon-1pm-vhrc');
  });

  it('handles normal mode with n prefix', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'friday',
      time: '8pm',
      difficulty: 'normal',
      trial: 'LC',
    });
    expect(result).toBe('fri-8pm-nlc');
  });

  it('supports {difficulty} token for legacy patterns', () => {
    const result = buildChannelName('{difficulty}-{trial}', {
      difficulty: 'veteran',
      trial: 'LC',
    });
    expect(result).toBe('vet-vlc');
  });

  it('supports {day-full} token', () => {
    const result = buildChannelName('{day-full}-{trial}', {
      dayShort: 'sunday',
      difficulty: 'veteran',
      trial: 'LC',
    });
    expect(result).toBe('sunday-vlc');
  });

  it('covers all known trials in veteran mode', () => {
    for (const trialId of Object.keys(TRIAL_ABBREVS)) {
      const result = buildChannelName('{day-short}-{time}-{trial}', {
        dayShort: 'sun',
        time: '9pm',
        difficulty: 'veteran',
        trial: trialId,
      });
      expect(result).toMatch(/^sun-9pm-v[a-z]+$/);
    }
  });
});

// ── buildTrialTag ─────────────────────────────────────────────────────────────

describe('buildTrialTag', () => {
  it('prefixes veteran trials with "v"', () => {
    expect(buildTrialTag('LC', 'veteran')).toBe('vlc');
    expect(buildTrialTag('HRC', 'veteran')).toBe('vhrc');
    expect(buildTrialTag('AA', 'veteran')).toBe('vaa');
  });

  it('prefixes normal trials with "n"', () => {
    expect(buildTrialTag('LC', 'normal')).toBe('nlc');
    expect(buildTrialTag('KA', 'normal')).toBe('nka');
  });

  it('handles case-insensitive trial IDs', () => {
    expect(buildTrialTag('lc', 'veteran')).toBe('vlc');
    expect(buildTrialTag('Hrc', 'veteran')).toBe('vhrc');
  });

  it('falls back to sanitised input for unknown trials', () => {
    expect(buildTrialTag('CUSTOM', 'veteran')).toBe('vcustom');
  });
});

// ── normaliseDay ──────────────────────────────────────────────────────────────

describe('normaliseDay', () => {
  it('normalises full names to 3-letter abbreviations', () => {
    expect(normaliseDay('Sunday')).toBe('sun');
    expect(normaliseDay('monday')).toBe('mon');
    expect(normaliseDay('WEDNESDAY')).toBe('wed');
  });

  it('passes through already-short names', () => {
    expect(normaliseDay('sun')).toBe('sun');
    expect(normaliseDay('fri')).toBe('fri');
  });

  it('handles alternate abbreviations', () => {
    expect(normaliseDay('tues')).toBe('tue');
    expect(normaliseDay('thurs')).toBe('thu');
  });
});

// ── resolveChannelName ────────────────────────────────────────────────────────

describe('resolveChannelName', () => {
  it('uses override when provided', () => {
    const result = resolveChannelName('{day-short}-{time}', {}, 'my-custom-name');
    expect(result).toBe('my-custom-name');
  });

  it('falls back to template when no override', () => {
    const result = resolveChannelName('{day-short}-{time}', {
      dayShort: 'fri',
      time: '8pm',
    });
    expect(result).toBe('fri-8pm');
  });

  it('ignores empty override', () => {
    const result = resolveChannelName(
      '{day-short}-{trial}',
      { dayShort: 'tue', trial: 'rg' },
      '  ',
    );
    expect(result).toBe('tue-rg');
  });
});

// ── parseChannelName ──────────────────────────────────────────────────────────

describe('parseChannelName', () => {
  it('parses the standard format: day-time-vtrial', () => {
    const result = parseChannelName('sun-9pm-vlc');
    expect(result).toEqual({
      day: 'sun',
      time: '9pm',
      difficulty: 'veteran',
      trialAbbrev: 'lc',
      trialId: 'LC',
      remainder: null,
    });
  });

  it('parses with extra segments as remainder', () => {
    const result = parseChannelName('sun-9pm-vlc-trainer');
    expect(result).toEqual({
      day: 'sun',
      time: '9pm',
      difficulty: 'veteran',
      trialAbbrev: 'lc',
      trialId: 'LC',
      remainder: 'trainer',
    });
  });

  it('parses normal mode trials', () => {
    const result = parseChannelName('fri-8pm-nlc-newbie');
    expect(result.difficulty).toBe('normal');
    expect(result.trialAbbrev).toBe('lc');
    expect(result.trialId).toBe('LC');
  });

  it('parses multi-word remainder', () => {
    const result = parseChannelName('mon-1pm-vhrc-some-dude');
    expect(result.remainder).toBe('some-dude');
  });

  it('handles channels without extra segments', () => {
    const result = parseChannelName('sun-9pm-vlc');
    expect(result.day).toBe('sun');
    expect(result.time).toBe('9pm');
    expect(result.difficulty).toBe('veteran');
    expect(result.trialAbbrev).toBe('lc');
    expect(result.remainder).toBeNull();
  });

  it('handles channels without time', () => {
    const result = parseChannelName('sun-vlc-prog');
    expect(result.day).toBe('sun');
    expect(result.time).toBeNull();
    expect(result.difficulty).toBe('veteran');
    expect(result.remainder).toBe('prog');
  });

  it('returns nulls for unparseable names', () => {
    const result = parseChannelName('general-chat');
    expect(result.day).toBeNull();
    expect(result.difficulty).toBeNull();
    expect(result.trialId).toBeNull();
  });

  it('parses all known trial abbreviations in veteran mode', () => {
    for (const [id, abbrev] of Object.entries(TRIAL_ABBREVS)) {
      const name = `sun-9pm-v${abbrev}`;
      const result = parseChannelName(name);
      expect(result.trialId).toBe(id);
      expect(result.difficulty).toBe('veteran');
    }
  });

  it('round-trips through buildChannelName → parseChannelName', () => {
    const name = buildChannelName('{day-short}-{time}-{trial}', {
      dayShort: 'thursday',
      time: '10pm',
      difficulty: 'veteran',
      trial: 'DSR',
    });
    const parsed = parseChannelName(name);

    expect(parsed.day).toBe('thu');
    expect(parsed.time).toBe('10pm');
    expect(parsed.difficulty).toBe('veteran');
    expect(parsed.trialId).toBe('DSR');
    expect(parsed.remainder).toBeNull();
  });
});
