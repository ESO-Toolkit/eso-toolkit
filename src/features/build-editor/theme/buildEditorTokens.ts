/**
 * Build Editor Design Tokens
 * Scoped tokens for the glassmorphism-based build editor UI.
 * These extend (not replace) the global theme from ReduxThemeProvider.
 */

export const BE_TOKENS = {
  // Glass panel
  glass: {
    bg: 'rgb(15, 23, 42)',
    bgLight: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(15, 23, 42, 0.1)',
    blur: 4,
    shadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
    shadowLight: '0 4px 16px rgba(15, 23, 42, 0.06)',
  },

  // Nav rail
  navRail: {
    width: 56,
    mobileHeight: 56,
  },

  // Bento grid
  grid: {
    gap: 16,
    minCardWidth: 280,
  },

  // Progress ring
  ring: {
    size: 36,
    strokeWidth: 3,
  },

  // Rarity border colors (for gear slots)
  rarity: {
    normal: '#9e9e9e',
    fine: '#4caf50',
    superior: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800',
    mythic: '#f44336',
  },

  // Attribute colors
  attributes: {
    magicka: '#6c8fff',
    health: '#e05c5c',
    stamina: '#4caf82',
  },

  // Animation durations
  duration: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
  },

  // Section IDs for scroll-spy
  sectionIds: [
    'general',
    'character',
    'equipment',
    'skills',
    'champion',
    'consumables',
    'passives',
    'guide',
    'screenshots',
    'settings',
  ] as const,
} as const;

export type SectionId = (typeof BE_TOKENS.sectionIds)[number];
