import type { SkillData } from '../types';

export const WEREWOLF_SKILLS: SkillData[] = [
  // Ultimate
  { id: 32455, name: 'Werewolf Transformation', category: 'Werewolf', isUltimate: true },
  { id: 32632, name: 'Pack Leader', category: 'Werewolf', isUltimate: true, baseSkillId: 32455 },
  {
    id: 32634,
    name: 'Werewolf Berserker',
    category: 'Werewolf',
    isUltimate: true,
    baseSkillId: 32455,
  },

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

  // Gnash (renamed from Piercing Howl in U50)
  { id: 58405, name: 'Gnash', category: 'Werewolf' },
  { id: 58413, name: 'Bloody Gnash', category: 'Werewolf', baseSkillId: 58405 },
  { id: 58420, name: 'Rip and Tear', category: 'Werewolf', baseSkillId: 58405 },

  // Rending Claws (renamed from Infectious Claws in U50)
  { id: 58850, name: 'Rending Claws', category: 'Werewolf' },
  { id: 58855, name: 'Claw Fury', category: 'Werewolf', baseSkillId: 58850 },
  { id: 58857, name: 'Bloodclaws', category: 'Werewolf', baseSkillId: 58850 },

  // Passives
  { id: 32498, name: 'Insatiable Hunger', category: 'Werewolf' },
  { id: 32499, name: 'Master of the Chase', category: 'Werewolf' },
  { id: 32550, name: 'Blood Rage', category: 'Werewolf' },
  { id: 32554, name: 'Shadow of the Bloodmoon', category: 'Werewolf' },
  { id: 45038, name: 'Feral Cruelty', category: 'Werewolf' },
  { id: 45039, name: 'Call of the Hunt', category: 'Werewolf' },
];
