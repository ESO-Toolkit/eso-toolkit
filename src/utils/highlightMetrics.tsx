import React from 'react';

// ── ESO color palette (dark / light pairs) ───────────────────────────

type ColorPair = { dark: string; light: string };

const DAMAGE_COLORS: Record<string, ColorPair> = {
  Magic: { dark: '#94d2ff', light: '#0284c7' },
  Physical: { dark: '#f0b232', light: '#92400e' },
  Flame: { dark: '#ff8c42', light: '#c2410c' },
  Frost: { dark: '#67e8f9', light: '#0891b2' },
  Shock: { dark: '#c084fc', light: '#7c3aed' },
  Poison: { dark: '#a3e635', light: '#4d7c0f' },
  Disease: { dark: '#d4a853', light: '#854d0e' },
  Bleed: { dark: '#f87171', light: '#dc2626' },
  Oblivion: { dark: '#a78bfa', light: '#6d28d9' },
};

const RESOURCE_COLORS: Record<string, ColorPair> = {
  Magicka: { dark: '#94d2ff', light: '#0284c7' },
  Stamina: { dark: '#4ade80', light: '#16a34a' },
  Ultimate: { dark: '#fbbf24', light: '#d97706' },
  Health: { dark: '#f87171', light: '#dc2626' },
};

const STAT_ACCENT: ColorPair = { dark: '#b8e0f7', light: '#0369a1' };
const BUFF_ACCENT: ColorPair = { dark: '#fcd34d', light: '#b45309' };

const pick = (pair: ColorPair, isDark: boolean) => (isDark ? pair.dark : pair.light);

const numCss = (color: string): React.CSSProperties => ({
  color,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
});

const tagCss = (color: string): React.CSSProperties => ({
  color,
  fontWeight: 600,
});

// ── Highlight rules (priority order — first match wins) ──────────────

interface Rule {
  re: RegExp;
  render: (m: RegExpExecArray, isDark: boolean, k: number) => React.ReactNode;
}

const DMG = 'Magic|Physical|Flame|Frost|Shock|Poison|Disease|Bleed|Oblivion';
const RES = 'Magicka|Stamina|Ultimate|Health';
const STATS = [
  'Armor',
  'Offensive Penetration',
  'Critical Chance',
  'Weapon and Spell Damage',
  'Physical and Spell Resistance',
  'Physical and Spell Penetration',
  'Physical Resistance',
  'Spell Resistance',
  'Physical Penetration',
  'Spell Penetration',
  'Health Recovery',
  'Magicka Recovery',
  'Stamina Recovery',
].join('|');

const RULES: Rule[] = [
  // 0 — "1392 Magic Damage"
  {
    re: new RegExp(`(\\d[\\d,]*\\.?\\d*)\\s+(${DMG})\\s+[Dd]amage`, 'g'),
    render: (m, isDark, k) => {
      const c = pick(DAMAGE_COLORS[m[2]], isDark);
      return (
        <React.Fragment key={k}>
          <span style={numCss(c)}>{m[1]}</span>{' '}
          <span style={tagCss(c)}>{m[2]} Damage</span>
        </React.Fragment>
      );
    },
  },
  // 1 — "Magic Damage" (bare, no number)
  {
    re: new RegExp(`(${DMG})\\s+[Dd]amage`, 'g'),
    render: (m, isDark, k) => (
      <span key={k} style={tagCss(pick(DAMAGE_COLORS[m[1]], isDark))}>
        {m[0]}
      </span>
    ),
  },
  // 2 — "2295 Stamina"
  {
    re: new RegExp(`(\\d[\\d,]*)\\s+(${RES})\\b`, 'g'),
    render: (m, isDark, k) => {
      const c = pick(RESOURCE_COLORS[m[2]], isDark);
      return (
        <React.Fragment key={k}>
          <span style={numCss(c)}>{m[1]}</span>{' '}
          <span style={tagCss(c)}>{m[2]}</span>
        </React.Fragment>
      );
    },
  },
  // 3 — "1206 Maximum Health"
  {
    re: /(\d[\d,]*)\s+Maximum\s+(Health|Magicka|Stamina)/g,
    render: (m, isDark, k) => {
      const c = pick(RESOURCE_COLORS[m[2]], isDark);
      return (
        <React.Fragment key={k}>
          <span style={numCss(c)}>{m[1]}</span>{' '}
          <span style={tagCss(c)}>Maximum {m[2]}</span>
        </React.Fragment>
      );
    },
  },
  // 4 — "1487 Armor", "129 Weapon and Spell Damage"
  {
    re: new RegExp(`(\\d[\\d,]*)\\s+(${STATS})`, 'g'),
    render: (m, isDark, k) => (
      <React.Fragment key={k}>
        <span style={numCss(pick(STAT_ACCENT, isDark))}>{m[1]}</span>
        {' '}
        {m[2]}
      </React.Fragment>
    ),
  },
  // 5 — "30%"
  {
    re: /\d[\d,]*\.?\d*%/g,
    render: (m, isDark, k) => (
      <span key={k} style={numCss(pick(STAT_ACCENT, isDark))}>
        {m[0]}
      </span>
    ),
  },
  // 6 — "Major Expedition", "Minor Courage"
  {
    re: /(Major|Minor)\s+[A-Z][a-z]+/g,
    render: (m, isDark, k) => (
      <span key={k} style={tagCss(pick(BUFF_ACCENT, isDark))}>
        {m[0]}
      </span>
    ),
  },
  // 7 — "12 seconds"
  {
    re: /(\d[\d,]*\.?\d*)\s+(seconds?)/g,
    render: (m, isDark, k) => (
      <React.Fragment key={k}>
        <span style={numCss(pick(STAT_ACCENT, isDark))}>{m[1]}</span>
        {' '}
        {m[2]}
      </React.Fragment>
    ),
  },
  // 8 — "8 meters"
  {
    re: /(\d[\d,]*\.?\d*)\s+(meters?)/g,
    render: (m, isDark, k) => (
      <React.Fragment key={k}>
        <span style={numCss(pick(STAT_ACCENT, isDark))}>{m[1]}</span>
        {' '}
        {m[2]}
      </React.Fragment>
    ),
  },
  // 9 — "by 300" (stat modifiers)
  {
    re: /\bby\s+(\d[\d,]*)\b/g,
    render: (m, isDark, k) => (
      <React.Fragment key={k}>
        {'by '}
        <span style={numCss(pick(STAT_ACCENT, isDark))}>{m[1]}</span>
      </React.Fragment>
    ),
  },
];

// ── String parser (rules applied recursively by priority) ────────────

function parseText(
  text: string,
  isDark: boolean,
  ruleIdx: number,
  ctx: { k: number },
): React.ReactNode[] {
  if (ruleIdx >= RULES.length || !text) return [text];

  const rule = RULES[ruleIdx];
  rule.re.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = rule.re.exec(text)) !== null) {
    const before = text.slice(last, match.index);
    if (before) parts.push(...parseText(before, isDark, ruleIdx + 1, ctx));
    parts.push(rule.render(match, isDark, ctx.k++));
    last = match.index + match[0].length;
  }

  const after = text.slice(last);
  if (after) parts.push(...parseText(after, isDark, ruleIdx + 1, ctx));

  return parts;
}

// ── ReactNode walker ─────────────────────────────────────────────────

function walkNode(node: React.ReactNode, isDark: boolean, ctx: { k: number }): React.ReactNode {
  if (typeof node === 'string') {
    const parts = parseText(node, isDark, 0, ctx);
    return parts.length === 1 && typeof parts[0] === 'string'
      ? parts[0]
      : React.createElement(React.Fragment, null, ...parts);
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={`w${i}`}>{walkNode(child, isDark, ctx)}</React.Fragment>
    ));
  }

  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (props.children != null) {
      return React.cloneElement(
        node as React.ReactElement,
        {},
        walkNode(props.children as React.ReactNode, isDark, ctx),
      );
    }
    return node;
  }

  return node;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Highlight inline metrics — damage types, resources, buffs, percentages,
 * durations — within tooltip description text. Walks the full ReactNode
 * tree so it handles strings, arrays, Fragments, and <br/> tags from the
 * skill tooltip mapper.
 */
export function highlightMetrics(node: React.ReactNode, isDark: boolean): React.ReactNode {
  return walkNode(node, isDark, { k: 0 });
}
