import { describe, expect, it } from 'vitest';
import { buildChannelName, resolveChannelName } from './channel-name';

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
    const result = buildChannelName('{label}', {
      label: 'My Roster! (HM)',
    });
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
    const result = buildChannelName('{label}', { label: 'Sunday VLC Prog' });
    expect(result).toBe('sunday-vlc-prog');
  });
});

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
    const result = resolveChannelName('{label}', { label: 'test' }, '  ');
    expect(result).toBe('test');
  });
});
