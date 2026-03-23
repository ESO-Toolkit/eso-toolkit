/**
 * Daedric Summoning - Sorcerer skill line
 *
 * The Daedric Summoning skill-line is part of the Sorcerer toolkit and has a focus on
 * summoned pets, defensive and offensive abilities.
 *
 * Source: https://eso-hub.com/en/skills/sorcerer/daedric-summoning
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const daedricSummoning: SkillLineData = {
  id: 'daedric-summoning',
  name: 'Daedric Summoning',
  class: 'Sorcerer',
  category: 'class',
  icon: 'ability_sorcerer_storm_atronach',
  skills: [
    // Ultimate: Summon Storm Atronach
    { id: 23634, alternateIds: [23636, 23639, 23658, 23659, 26833, 26836, 26837, 26838, 26839, 26849, 26850, 26851, 26852, 26853, 26854, 26855, 30529, 30530, 30531, 30532, 30534, 30535, 30536, 30537, 30539, 30540, 30541, 30542, 80459, 80460, 80461, 80462, 80465, 80466, 80467, 80473, 80474, 80475, 96476, 102309, 128075, 128479, 128814, 128826, 243899, 243900], name: 'Summon Storm Atronach', type: 'ultimate', baseAbilityId: 23634 },
    { id: 23492, alternateIds: [23662, 23663, 23665, 30565, 30566, 30567, 30568, 30570, 30571, 30572, 30573, 30576, 30577, 30578, 30579, 80463, 102322], name: 'Greater Storm Atronach', type: 'ultimate', baseAbilityId: 23634 },
    { id: 23495, alternateIds: [23666, 23667, 23668, 23669, 30544, 30545, 30546, 30547, 30549, 30550, 30551, 30552, 30554, 30555, 30556, 30557, 80468, 102329, 102330], name: 'Summon Charged Atronach', type: 'ultimate', baseAbilityId: 23634 },

    // Active: Summon Unstable Familiar
    { id: 23304, alternateIds: [77178, 108840, 108841, 108842, 108843], name: 'Summon Unstable Familiar', type: 'active', baseAbilityId: 23304 },
    { id: 23319, alternateIds: [76076, 80161], name: 'Summon Unstable Clannfear', type: 'active', baseAbilityId: 23304 },
    { id: 23316, alternateIds: [77182, 77187, 77243, 77246, 80146, 88933], name: 'Summon Volatile Familiar', type: 'active', baseAbilityId: 23304 },

    // Active: Daedric Curse
    { id: 24328, alternateIds: [24326, 24327, 28169, 30492, 30493, 30496, 30497, 30500, 30501, 30505, 30509, 30513, 44507, 44508, 44509, 44510, 56800, 56801, 88911, 88912, 89486, 91176, 91177, 91178, 165193, 165835], name: 'Daedric Curse', type: 'active', baseAbilityId: 24328 },
    { id: 24330, alternateIds: [24328, 24329, 28175, 30504, 30508, 30512, 44511, 44512, 44513, 44514, 63210, 63214, 63216, 63218], name: 'Daedric Prey', type: 'active', baseAbilityId: 24328 },
    { id: 24326, alternateIds: [24330, 24331, 28176, 29268, 30516, 30517, 30518, 30520, 30521, 30522, 30524, 30525, 30526, 44515, 44516, 44517, 44518, 89491, 89492, 89495, 89496, 89497, 89498, 89499, 89500, 91936], name: 'Haunting Curse', type: 'active', baseAbilityId: 24328 },

    // Active: Summon Winged Twilight
    { id: 23316, alternateIds: [24613, 24617, 24739, 28027, 55590, 59437, 69814, 69815, 69816, 69817, 69818, 70090, 77342, 131257, 131261, 188473, 188482], name: 'Summon Winged Twilight', type: 'active', baseAbilityId: 23316 },
    { id: 23495, alternateIds: [24639, 77376, 77380, 77383, 77409, 77412, 77414, 80066, 80155, 117320, 117321], name: 'Summon Twilight Matriarch', type: 'active', baseAbilityId: 23316 },
    { id: 23492, alternateIds: [24636, 24741, 77357, 77362, 77365, 117273, 117274], name: 'Summon Twilight Tormentor', type: 'active', baseAbilityId: 23316 },

    // Active: Conjured Ward
    { id: 28418, alternateIds: [28421, 28832, 30458, 30459, 30461, 30462, 30464, 30465, 177262, 215031], name: 'Conjured Ward', type: 'active', baseAbilityId: 28418 },
    { id: 28502, alternateIds: [29489, 29490, 29491, 29492, 30467, 30468, 30469, 30471, 30472, 30473, 30475, 30476, 30477, 52839, 52840, 52841, 52842, 82341, 82342, 82343, 82344, 177263, 197495, 197691, 200565, 204135, 215032], name: 'Hardened Ward', type: 'active', baseAbilityId: 28418 },
    { id: 28536, alternateIds: [29482, 29483, 29484, 177261, 215033], name: 'Regenerative Ward', type: 'active', baseAbilityId: 28418 },

    // Active: Bound Armor
    { id: 24163, alternateIds: [24158, 46712, 56797, 108849, 119333, 119334, 120337, 120340, 120341, 120574, 150099], name: 'Bound Armor', type: 'active', baseAbilityId: 24163 },
    { id: 24158, alternateIds: [24163, 46711, 56796, 108855], name: 'Bound Aegis', type: 'active', baseAbilityId: 24163 },
    { id: 24165, alternateIds: [62231, 62234, 62237, 108853, 108854, 130291, 130292, 130293, 130318, 130356, 203447, 203448, 203449, 207975], name: 'Bound Armaments', type: 'active', baseAbilityId: 24163 },

    // Passives
    { id: 31418, alternateIds: [31398, 45198, 64849, 64860, 64861, 143500], icon: 'ability_sorcerer_056', name: 'Rebate', type: 'passive', baseAbilityId: 31418 },
    { id: 31421, alternateIds: [31396, 45196], icon: 'ability_sorcerer_015', name: 'Power Stone', type: 'passive', baseAbilityId: 31421 },
    { id: 31425, alternateIds: [31417, 45200, 72543, 72544, 118510, 119579], icon: 'ability_sorcerer_044', name: 'Daedric Protection', type: 'passive', baseAbilityId: 31425 },
    { id: 31429, alternateIds: [31412, 45199, 215055, 215056, 215059, 215060], icon: 'ability_mage_065', name: 'Expert Summoner', type: 'passive', baseAbilityId: 31429 },
  ],
};
