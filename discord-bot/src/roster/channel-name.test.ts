import { describe, expect, it } from 'vitest';

import {
  buildChannelName,
  buildChannelNameFromTemplate,
  buildTrialTag,
  normaliseDay,
  parseChannelName,
  TRIAL_ABBREVS,
} from './channel-name.js';

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

// ── buildChannelName ──────────────────────────────────────────────────────────

describe('buildChannelName', () => {
  it('builds the standard format: day-time-vtrial-trainer', () => {
    expect(
      buildChannelName({
        day: 'sunday',
        time: '9pm',
        difficulty: 'veteran',
        trialId: 'LC',
        trainer: 'trainer',
      }),
    ).toBe('sun-9pm-vlc-trainer');
  });

  it('handles veteran HRC on Monday', () => {
    expect(
      buildChannelName({
        day: 'monday',
        time: '1pm',
        difficulty: 'veteran',
        trialId: 'HRC',
        trainer: 'darkelf',
      }),
    ).toBe('mon-1pm-vhrc-darkelf');
  });

  it('handles normal mode', () => {
    expect(
      buildChannelName({
        day: 'friday',
        time: '8pm',
        difficulty: 'normal',
        trialId: 'LC',
        trainer: 'newbie-lead',
      }),
    ).toBe('fri-8pm-nlc-newbie-lead');
  });

  it('sanitises special characters from trainer names', () => {
    expect(
      buildChannelName({
        day: 'sat',
        time: '10am',
        difficulty: 'veteran',
        trialId: 'KA',
        trainer: 'Cool Guy!@#$',
      }),
    ).toBe('sat-10am-vka-cool-guy');
  });

  it('handles spaces in trainer name by converting to hyphens', () => {
    expect(
      buildChannelName({
        day: 'wed',
        time: '7pm',
        difficulty: 'veteran',
        trialId: 'DSR',
        trainer: 'some trainer',
      }),
    ).toBe('wed-7pm-vdsr-some-trainer');
  });

  it('truncates names exceeding 100 characters', () => {
    const result = buildChannelName({
      day: 'sunday',
      time: '9pm',
      difficulty: 'veteran',
      trialId: 'LC',
      trainer: 'a'.repeat(120),
    });
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.startsWith('sun-9pm-vlc-')).toBe(true);
  });

  it('covers all known trials', () => {
    for (const trialId of Object.keys(TRIAL_ABBREVS)) {
      const result = buildChannelName({
        day: 'sun',
        time: '9pm',
        difficulty: 'veteran',
        trialId,
        trainer: 'test',
      });
      expect(result).toMatch(/^sun-9pm-v[a-z]+-test$/);
    }
  });
});

// ── buildChannelNameFromTemplate ──────────────────────────────────────────────

describe('buildChannelNameFromTemplate', () => {
  const ctx = {
    day: 'sunday',
    time: '9pm',
    difficulty: 'veteran' as const,
    trialId: 'LC',
    trainer: 'trainer',
  };

  it('replaces all tokens in a template', () => {
    expect(buildChannelNameFromTemplate('{day}-{time}-{tag}-{trainer}', ctx)).toBe(
      'sun-9pm-vlc-trainer',
    );
  });

  it('supports {day-short} and {day-full}', () => {
    expect(buildChannelNameFromTemplate('{day-short}', ctx)).toBe('sun');
    expect(buildChannelNameFromTemplate('{day-full}', ctx)).toBe('sunday');
  });

  it('supports {trial} as alias for {tag}', () => {
    expect(buildChannelNameFromTemplate('{trial}', ctx)).toBe('vlc');
  });

  it('supports {difficulty} token', () => {
    expect(buildChannelNameFromTemplate('{difficulty}-{trial}', ctx)).toBe('vet-vlc');
    expect(
      buildChannelNameFromTemplate('{difficulty}-{trial}', { ...ctx, difficulty: 'normal' }),
    ).toBe('norm-nlc');
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
    const input = {
      day: 'thursday',
      time: '10pm',
      difficulty: 'veteran' as const,
      trialId: 'DSR',
      trainer: 'captain',
    };
    const name = buildChannelName(input);
    const parsed = parseChannelName(name);

    expect(parsed.day).toBe('thu');
    expect(parsed.time).toBe('10pm');
    expect(parsed.difficulty).toBe('veteran');
    expect(parsed.trialId).toBe('DSR');
    expect(parsed.trainer).toBe('captain');
  });
});
