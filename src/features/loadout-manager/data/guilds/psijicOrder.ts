import type { SkillData } from '../types';

export const PSIJIC_ORDER_SKILLS: SkillData[] = [
  // Undo
  { id: 103478, name: 'Undo', category: 'Psijic Order' },
  { id: 104059, name: 'Precognition', category: 'Psijic Order', baseSkillId: 103478 },
  { id: 104071, name: 'Temporal Guard', category: 'Psijic Order', baseSkillId: 103478 },

  // Time Stop
  { id: 103488, name: 'Time Stop', category: 'Psijic Order' },
  { id: 104083, name: 'Borrowed Time', category: 'Psijic Order', baseSkillId: 103488 },
  { id: 104090, name: 'Time Freeze', category: 'Psijic Order', baseSkillId: 103488 },

  // Imbue Weapon
  { id: 103483, name: 'Imbue Weapon', category: 'Psijic Order' },
  { id: 103623, name: 'Crushing Weapon', category: 'Psijic Order', baseSkillId: 103483 },
  { id: 103571, name: 'Elemental Weapon', category: 'Psijic Order', baseSkillId: 103483 },

  // Accelerate
  { id: 103503, name: 'Accelerate', category: 'Psijic Order' },
  { id: 103706, name: 'Channeled Acceleration', category: 'Psijic Order', baseSkillId: 103503 },
  { id: 103710, name: 'Race Against Time', category: 'Psijic Order', baseSkillId: 103503 },

  // Mend Wounds
  { id: 103543, name: 'Mend Wounds', category: 'Psijic Order' },
  { id: 103747, name: 'Mend Spirit', category: 'Psijic Order', baseSkillId: 103543 },
  { id: 103755, name: 'Symbiosis', category: 'Psijic Order', baseSkillId: 103543 },

  // Meditate
  { id: 103492, name: 'Meditate', category: 'Psijic Order' },
  { id: 104112, name: 'Deep Thoughts', category: 'Psijic Order', baseSkillId: 103492 },
  { id: 104115, name: 'Introspection', category: 'Psijic Order', baseSkillId: 103492 },

  // Passives
  { id: 103553, name: 'See the Unseen', category: 'Psijic Order' },
  { id: 103559, name: 'Clairvoyance', category: 'Psijic Order' },
  { id: 103564, name: 'Spell Orb', category: 'Psijic Order' },
  { id: 103567, name: 'Concentrated Barrier', category: 'Psijic Order' },
  { id: 103720, name: 'Deliberation', category: 'Psijic Order' },
];
