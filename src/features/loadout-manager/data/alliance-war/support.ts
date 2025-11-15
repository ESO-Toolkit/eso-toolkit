import { SkillData } from '../types';

export const SUPPORT_SKILLS: SkillData[] = [
  // Barrier (Ultimate)
  { id: 38573, name: 'Barrier', category: 'Alliance War - Support', isUltimate: true },
  { id: 40237, name: 'Replenishing Barrier', category: 'Alliance War - Support', isUltimate: true, baseSkillId: 38573 },
  { id: 40239, name: 'Reviving Barrier', category: 'Alliance War - Support', isUltimate: true, baseSkillId: 38573 },

  // Banner Bearer (Active)
  { id: 217699, name: 'Banner Bearer', category: 'Alliance War - Support', baseSkillId: 217699 },

  // Siege Shield (Active)
  { id: 22469, name: 'Siege Shield', category: 'Alliance War - Support', baseSkillId: 22469 },
  { id: 40258, name: 'Propelling Shield', category: 'Alliance War - Support', baseSkillId: 22469 },
  { id: 40259, name: 'Siege Weapon Shield', category: 'Alliance War - Support', baseSkillId: 22469 },

  // Purge (Active)
  { id: 38571, name: 'Purge', category: 'Alliance War - Support', baseSkillId: 38571 },
  { id: 40232, name: 'Cleanse', category: 'Alliance War - Support', baseSkillId: 38571 },
  { id: 40234, name: 'Efficient Purge', category: 'Alliance War - Support', baseSkillId: 38571 },

  // Guard (Active)
  { id: 61511, name: 'Guard', category: 'Alliance War - Support', baseSkillId: 61511 },
  { id: 61512, name: 'Mystic Guard', category: 'Alliance War - Support', baseSkillId: 61511 },
  { id: 61513, name: 'Stalwart Guard', category: 'Alliance War - Support', baseSkillId: 61511 },

  // Revealing Flare (Active)
  { id: 61489, name: 'Revealing Flare', category: 'Alliance War - Support', baseSkillId: 61489 },
  { id: 61500, name: 'Blinding Flare', category: 'Alliance War - Support', baseSkillId: 61489 },
  { id: 61501, name: 'Lingering Flare', category: 'Alliance War - Support', baseSkillId: 61489 },

  // Passives
  { id: 45609, name: 'Magicka Aid', category: 'Alliance War - Support' },
  { id: 45610, name: 'Combat Medic', category: 'Alliance War - Support' },
  { id: 45611, name: 'Battle Resurrection', category: 'Alliance War - Support' },
];
