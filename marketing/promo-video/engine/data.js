// Values shown on screen, taken from the site's public sample report
// (esotk.com/report/F4f2bMwWtgVKxjB9, Dreadsail Reef Veteran HM, Tideborn Taleria kill) and
// from the Calculator's default penetration setup.

export const DATA = {
  // Damage Done per player (k DPS), top to bottom, as the fight's damage table lists them.
  dps: [197.8, 189.7, 181.5, 176.4, 170.4, 165.0, 134.5, 94.7, 90.7, 13.0, 9.9, 4.1],

  // Fight Insights uptimes (buff uptimes and a status effect on the boss).
  uptimes: [
    { name: 'Minor Savagery', value: 100 },
    { name: 'Pearlescent Ward', value: 94 },
    { name: 'Major Resolve', value: 84 },
    { name: 'Hemorrhaging', value: 63 },
  ],

  // One player's card, extracted into the Build Editor.
  build: {
    role: 'Tank',
    lines: ['Soldier of Apocrypha', 'Curative Runeforms', 'Earthen Heart'],
    gear: ['7 Turning Tide', '5 Perfected Pearlescent Ward', '2 Archdruid Devyric'],
    champion: ['Expert Evasion', 'Juggernaut', 'Sprinter', 'Bulwark'],
  },

  // The scribed skill and what ESO Toolkit detected about it.
  scribing: {
    skill: 'Leashing Soul',
    grimoire: 'Wield Soul',
    focus: 'Pull',
    signature: "Druid's Resurgence",
    confidence: 95,
    affix: 'Maim',
  },
  // Back bar (row 1), fourth slot.
  scribed: { row: 1, slot: 3 },

  // Calculator: Stats tab default, penetration against the PvE cap.
  penetration: { total: 18999, cap: 18200 },
};
