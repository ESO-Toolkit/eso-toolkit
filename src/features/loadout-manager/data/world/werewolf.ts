import type { SkillData } from '../types';

export const WEREWOLF_SKILLS: SkillData[] = [
  // Ultimate
  { id: 32455, name: 'Werewolf Transformation', category: 'Werewolf', isUltimate: true },
  { id: 32632, name: 'Pack Leader', category: 'Werewolf', isUltimate: true, baseSkillId: 32455 },
  { id: 32634, name: 'Werewolf Berserker', category: 'Werewolf', isUltimate: true, baseSkillId: 32455 },

  // Pounce
  { id: 9291, name: 'Pounce', category: 'Werewolf' },
  { id: 32633, name: 'Brutal Pounce', category: 'Werewolf', baseSkillId: 9291 },
  { id: 32635, name: 'Feral Pounce', category: 'Werewolf', baseSkillId: 9291 },

  // Hircine's Bounty
  { id: 58310, name: "Hircine's Bounty", category: 'Werewolf' },
  { id: 58317, name: "Hircine's Fortitude", category: 'Werewolf', baseSkillId: 58310 },
  { id: 58864, name: "Hircine's Rage", category: 'Werewolf', baseSkillId: 58310 },

  // Roar
  { id: 25402, name: 'Roar', category: 'Werewolf' },
  { id: 39113, name: 'Deafening Roar', category: 'Werewolf', baseSkillId: 25402 },
  { id: 39114, name: 'Ferocious Roar', category: 'Werewolf', baseSkillId: 25402 },

  // Piercing Howl
  { id: 58405, name: 'Piercing Howl', category: 'Werewolf' },
  { id: 58413, name: 'Howl of Agony', category: 'Werewolf', baseSkillId: 58405 },
  { id: 58420, name: 'Howl of Despair', category: 'Werewolf', baseSkillId: 58405 },

  // Infectious Claws
  { id: 58850, name: 'Infectious Claws', category: 'Werewolf' },
  { id: 58855, name: 'Claws of Anguish', category: 'Werewolf', baseSkillId: 58850 },
  { id: 58857, name: 'Claws of Life', category: 'Werewolf', baseSkillId: 58850 },

  // Passives
  { id: 32498, name: 'Devour', category: 'Werewolf' },
  { id: 32499, name: 'Pursuit', category: 'Werewolf' },
  { id: 32550, name: 'Blood Rage', category: 'Werewolf' },
  { id: 32554, name: 'Bloodmoon', category: 'Werewolf' },
  { id: 45038, name: 'Savage Strength', category: 'Werewolf' },
  { id: 45039, name: 'Call of the Pack', category: 'Werewolf' },
];
