import type { BuildStatRow, KnowledgeDocRow } from '../types';

import { buildSystemPrompt } from './prompt-builder';

describe('buildSystemPrompt', () => {
  it('includes preamble with no data', () => {
    const prompt = buildSystemPrompt([], []);
    expect(prompt).toContain('ESO Toolkit AI assistant');
    expect(prompt).toContain('Important Rules');
  });

  it('includes build stats when provided', () => {
    const stats: BuildStatRow[] = [
      {
        weapon_combo: 'dual wield / bow',
        role: 'stamina dps',
        class: 'nightblade',
        front_bar_enchant: 'absorb stamina',
        back_bar_enchant: 'weapon damage',
        front_bar_trait: 'nirnhoned',
        back_bar_trait: 'infused',
        usage_count: 150,
        avg_parse_score: 125000,
        patch_version: 'U44',
        updated_at: '2026-01-01',
      },
    ];

    const prompt = buildSystemPrompt(stats, []);
    expect(prompt).toContain('ESO Logs Build Statistics');
    expect(prompt).toContain('dual wield / bow');
    expect(prompt).toContain('nightblade');
    expect(prompt).toContain('nirnhoned');
    expect(prompt).toContain('150 players');
  });

  it('includes knowledge docs when provided', () => {
    const docs: KnowledgeDocRow[] = [
      {
        id: 1,
        doc_type: 'trait',
        title: 'Nirnhoned Weapon Trait',
        content: 'Nirnhoned increases damage.',
        vectorize_id: 'doc-1',
        created_at: '2026-01-01',
      },
    ];

    const prompt = buildSystemPrompt([], docs);
    expect(prompt).toContain('Knowledge Base');
    expect(prompt).toContain('Nirnhoned Weapon Trait');
    expect(prompt).toContain('Nirnhoned increases damage.');
  });

  it('includes anti-hallucination rules', () => {
    const prompt = buildSystemPrompt([], []);
    expect(prompt).toContain('ONLY reference data explicitly provided');
    expect(prompt).toContain("don't have data on that yet");
  });
});
