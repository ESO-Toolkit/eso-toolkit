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
    const result = buildChannelName('{day-short}-{time}-{tag}', {
      dayShort: 'sun',
      time: '9pm',
      tag: 'vlc',
    });
    expect(result).toBe('sun-9pm-vlc');
  });

  it('handles missing tokens gracefully', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}', {
      dayShort: 'mon',
    });
    expect(result).toBe('mon');
  });

  it('sanitizes special characters', () => {
    const result = buildChannelName('My Roster! (HM)', {});
    expect(result).toBe('my-roster-hm');
  });

  it('collapses multiple hyphens', () => {
    const result = buildChannelName('{day-short}--{tag}', {
      dayShort: 'wed',
      tag: '',
    });
    expect(result).toBe('wed');
  });

  it('returns "roster" for empty result', () => {
    const result = buildChannelName('', {});
    expect(result).toBe('roster');
  });

  it('handles {trial} token', () => {
    const result = buildChannelName('{day-short}-{time}-{trial}-{tag}', {
      dayShort: 'sun',
      time: '8pm',
      trial: 'voc',
      tag: 'trainer',
    });
    expect(result).toBe('sun-8pm-voc-trainer');
  });

  it('lowercases everything', () => {
    const result = buildChannelName('Sunday VLC Prog', {});
    expect(result).toBe('sunday-vlc-prog');
  });
});

// ── buildChannelName (with difficulty prefix) ────────────────────────────────

describe('buildChannelName with difficulty', () => {
  it('builds the standard format: day-time-vtrial-trainer', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
      dayShort: 'sunday',
      time: '9pm',
      difficulty: 'veteran',
      trial: 'LC',
      trainer: 'trainer',
    });
    expect(result).toBe('sun-9pm-vlc-trainer');
  });

  it('handles veteran HRC on Monday', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
      dayShort: 'monday',
      time: '1pm',
      difficulty: 'veteran',
      trial: 'HRC',
      trainer: 'darkelf',
    });
    expect(result).toBe('mon-1pm-vhrc-darkelf');
  });

  it('handles normal mode with n prefix', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
      dayShort: 'friday',
      time: '8pm',
      difficulty: 'normal',
      trial: 'LC',
      trainer: 'newbie-lead',
    });
    expect(result).toBe('fri-8pm-nlc-newbie-lead');
  });

  it('sanitises special characters from trainer names', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
      dayShort: 'sat',
      time: '10am',
      difficulty: 'veteran',
      trial: 'KA',
      trainer: 'Cool Guy!@#$',
    });
    expect(result).toBe('sat-10am-vka-cool-guy');
  });

  it('handles spaces in trainer name by converting to hyphens', () => {
    const result = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
      dayShort: 'wed',
      time: '7pm',
      difficulty: 'veteran',
      trial: 'DSR',
      trainer: 'some trainer',
    });
    expect(result).toBe('wed-7pm-vdsr-some-trainer');
  });

  it('supports {difficulty} token', () => {
    const result = buildChannelName('{difficulty}-{trial}', {
      difficulty: 'veteran',
      trial: 'LC',
    });
    expect(result).toBe('vet-vlc');
  });

  it('supports {day-full} token', () => {
    const result = buildChannelName('{day-full}-{tag}', {
      dayShort: 'sunday',
      difficulty: 'veteran',
      trial: 'LC',
    });
    expect(result).toBe('sunday-vlc');
  });

  it('covers all known trials in veteran mode', () => {
    for (const trialId of Object.keys(TRIAL_ABBREVS)) {
      const result = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
        dayShort: 'sun',
        time: '9pm',
        difficulty: 'veteran',
        trial: trialId,
        trainer: 'test',
      });
      expect(result).toMatch(/^sun-9pm-v[a-z]+-test$/);
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
  it('parses the standard format: day-time-vtrial-trainer', () => {
    const result = parseChannelName('sun-9pm-vlc-trainer');
    expect(result).toEqual({
      day: 'sun',
      time: '9pm',
      difficulty: 'veteran',
      trialAbbrev: 'lc',
      trialId: 'LC',
      trainer: 'trainer',
    });
  });

  it('parses normal mode trials', () => {
    const result = parseChannelName('fri-8pm-nlc-newbie');
    expect(result.difficulty).toBe('normal');
    expect(result.trialAbbrev).toBe('lc');
    expect(result.trialId).toBe('LC');
  });

  it('parses multi-word trainer names', () => {
    const result = parseChannelName('mon-1pm-vhrc-some-dude');
    expect(result.trainer).toBe('some-dude');
  });

  it('handles channels without trainer', () => {
    const result = parseChannelName('sun-9pm-vlc');
    expect(result.day).toBe('sun');
    expect(result.time).toBe('9pm');
    expect(result.difficulty).toBe('veteran');
    expect(result.trialAbbrev).toBe('lc');
    expect(result.trainer).toBeNull();
  });

  it('handles channels without time', () => {
    const result = parseChannelName('sun-vlc-trainer');
    expect(result.day).toBe('sun');
    expect(result.time).toBeNull();
    expect(result.difficulty).toBe('veteran');
    expect(result.trainer).toBe('trainer');
  });

  it('returns nulls for unparseable names', () => {
    const result = parseChannelName('general-chat');
    expect(result.day).toBeNull();
    expect(result.difficulty).toBeNull();
    expect(result.trialId).toBeNull();
  });

  it('parses all known trial abbreviations in veteran mode', () => {
    for (const [id, abbrev] of Object.entries(TRIAL_ABBREVS)) {
      const name = `sun-9pm-v${abbrev}-lead`;
      const result = parseChannelName(name);
      expect(result.trialId).toBe(id);
      expect(result.difficulty).toBe('veteran');
    }
  });

  it('round-trips through buildChannelName → parseChannelName', () => {
    const name = buildChannelName('{day-short}-{time}-{tag}-{trainer}', {
      dayShort: 'thursday',
      time: '10pm',
      difficulty: 'veteran',
      trial: 'DSR',
      trainer: 'captain',
    });
    const parsed = parseChannelName(name);

    expect(parsed.day).toBe('thu');
    expect(parsed.time).toBe('10pm');
    expect(parsed.difficulty).toBe('veteran');
    expect(parsed.trialId).toBe('DSR');
    expect(parsed.trainer).toBe('captain');
  });
});
