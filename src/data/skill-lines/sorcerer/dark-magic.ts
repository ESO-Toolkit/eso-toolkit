/**
 * Dark Magic Skill Line Data
 *
 * The Dark Magic skill-line is part of the Sorcerer toolkit and has a focus on
 * offensive and support abilities. In addition to powerful abilities, you can also
 * select passives that increase your sustain and support capabilities even further.
 *
 * @source https://eso-hub.com/en/skills/sorcerer/dark-magic
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const darkMagic: SkillLineData = {
  id: 'sorcerer-dark-magic',
  name: 'Dark Magic',
  class: 'Sorcerer',
  category: 'class',
  icon: 'ability_sorcerer_crushing_monsoon',
  skills: [
    // Ultimate: Negate Magic and morphs
    { id: 28341, alternateIds: [27706, 27941, 29823, 29824, 29826, 29834, 29840, 29845, 44216, 47147, 47152, 47153, 47155, 47156, 47157, 47158, 50106, 50107, 50108, 51891, 51892, 51893, 51894, 54833, 72575, 72576, 72577, 72578, 75162, 75163, 75164, 75165, 80732, 80733, 80734, 80735, 99432, 99433, 99434, 100383, 100384, 100660, 100661, 100662, 100663, 100665, 114592, 114593, 114594, 114603, 114604, 145706, 145707, 145708, 145709, 150414, 150415, 150416, 150417, 163396, 163397, 163398, 163399, 168572, 168573, 168574, 168575, 196806, 196809, 196810, 196812], name: 'Negate Magic', type: 'ultimate', baseAbilityId: 28341 },
    { id: 47845, alternateIds: [28348, 28351, 47167, 47168, 62253, 62254, 62255, 62260, 62261, 62262, 62267, 62268, 62269, 80405, 80410, 80411, 80412], name: 'Absorption Field', type: 'ultimate', baseAbilityId: 28341 },
    { id: 47878, alternateIds: [28341, 28343, 29850, 29856, 29862, 47159, 47160, 47161, 47162, 47163, 47164, 47165, 47166, 54829, 80435, 80436, 80437, 80438, 116576, 116577, 116578, 116579], name: 'Suppression Field', type: 'ultimate', baseAbilityId: 28341 },

    // Active: Crystal Shard and morphs
    { id: 43714, alternateIds: [43715, 46335, 47549, 47551, 47553], name: 'Crystal Shard', type: 'active', baseAbilityId: 43714 },
    { id: 46324, alternateIds: [46325, 46326, 46327, 47566, 47568, 47570, 114716, 114721], name: 'Crystal Fragments', type: 'active', baseAbilityId: 43714 },
    { id: 46340, alternateIds: [46331, 143804, 143805, 143808, 181056], name: 'Crystal Weapon', type: 'active', baseAbilityId: 43714 },

    // Active: Encase and morphs
    { id: 28308, alternateIds: [4737, 28025, 35561, 43759, 43760, 43761, 43771, 43772, 43773, 43774, 43775, 43776, 43777, 43778, 43779, 43783, 43784, 43785, 43786, 43787, 43788, 43789, 43790, 43791, 43795, 43796, 43797, 43798, 43799, 43800, 43801, 43802, 43803, 47318, 47319, 47320, 54797, 54798, 54799, 66276, 68054, 68055, 70894, 70895, 72150, 72151, 74506, 74510, 74522, 74533, 74534, 74535, 74536, 74537, 80726, 80727, 92897, 98182, 121719, 131692, 143659, 201242, 214474, 215486, 215487, 215490, 215491, 226749], name: 'Encase', type: 'active', baseAbilityId: 28308 },
    { id: 47878, alternateIds: [28308, 28309, 43780, 43781, 43782, 143663, 214477], name: 'Shattering Spines', type: 'active', baseAbilityId: 28308 },
    { id: 118355, alternateIds: [28311, 43792, 43793, 43794, 108835, 143668], name: 'Vibrant Shroud', type: 'active', baseAbilityId: 28308 },

    // Active: Rune Prison and morphs
    { id: 24371, alternateIds: [24559, 30156, 30161, 30166], name: 'Rune Prison', type: 'active', baseAbilityId: 24371 },
    { id: 47874, alternateIds: [24574, 24576, 62290, 62294, 62298, 62302, 112179, 114602], name: 'Defensive Rune', type: 'active', baseAbilityId: 24371 },
    { id: 47890, alternateIds: [24578, 24581, 62280, 62284, 62288, 100118], name: 'Rune Cage', type: 'active', baseAbilityId: 24371 },

    // Active: Dark Exchange and morphs
    { id: 24595, alternateIds: [24584, 24585, 24587, 29997, 30006, 30014, 30025, 30035, 30045, 30058, 30066, 30074, 54813, 114903], name: 'Dark Exchange', type: 'active', baseAbilityId: 24595 },
    { id: 47867, alternateIds: [24589, 24591, 24592, 114909], name: 'Dark Conversion', type: 'active', baseAbilityId: 24595 },
    { id: 47884, alternateIds: [24595, 24596, 24597, 54809, 114908], name: 'Dark Deal', type: 'active', baseAbilityId: 24595 },

    // Active: Daedric Mines and morphs
    { id: 24828, alternateIds: [24829, 24830, 24832, 24833, 25144, 27935, 29892, 29893, 29894, 29896, 29897, 29898, 29902, 29903, 29904, 29906, 29907, 29908, 29912, 29913, 29914, 29916, 29917, 29918, 29922, 29924, 29925, 29926, 29932, 29934, 29935, 29936, 29942, 29944, 29945, 29946, 29952, 29953, 29954, 29955, 29956, 29960, 29964, 29965, 29966, 29967, 29968, 29972, 29976, 29977, 29978, 29979, 29980, 29984, 42709, 42716, 42739, 42749, 42763, 42770, 42777, 54820, 54821, 54823, 54826, 54827, 54828, 76645, 76660, 76676, 91181, 91182, 91183, 91187, 91188, 91189, 141151, 141158, 141162, 141164, 141165, 141166, 141172, 141290, 167565, 170640, 207902, 207903, 207904, 207905, 207906, 207907, 207908], name: 'Daedric Mines', type: 'active', baseAbilityId: 24828 },
    { id: 215371, alternateIds: [24834, 25155, 25157, 25158, 25159, 25160, 25161, 25162, 25193, 62329], name: 'Daedric Refuge', type: 'active', baseAbilityId: 24828 },
    { id: 47899, alternateIds: [24842, 24843, 24844, 24846, 24847, 25195, 28452, 28466, 29927, 29928, 29937, 29938, 29947, 29948, 62325, 77437], name: 'Daedric Tomb', type: 'active', baseAbilityId: 24828 },

    // Passives
    { id: 31375, alternateIds: [31386, 45176, 97323, 112346, 114898, 114899], icon: 'ability_sorcerer_045', name: 'Unholy Knowledge', type: 'passive', baseAbilityId: 31375 },
    { id: 31380, alternateIds: [31383, 31384, 45172, 45173, 129973, 130015, 130017, 183703, 183704], icon: 'ability_mage_065', name: 'Blood Magic', type: 'passive', baseAbilityId: 31380 },
    { id: 31382, alternateIds: [31378, 45165, 108858, 108862], icon: 'ability_mage_065', name: 'Persistence', type: 'passive', baseAbilityId: 31382 },
    { id: 45182, alternateIds: [31389, 45181], icon: 'ability_mage_065', name: 'Exploitation', type: 'passive', baseAbilityId: 45182 },
  ],
};
