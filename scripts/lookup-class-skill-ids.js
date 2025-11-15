/**
 * Script to look up skill IDs from abilities.json for class skills
 * Usage: node scripts/lookup-class-skill-ids.js
 */

const fs = require('fs');
const path = require('path');

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

// Skills to look up (base skills only, not morphs)
const skillsToLookup = {
  // Arcanist - Curative Runeforms
  'Evolving Runemend': 'Arcanist - Curative Runeforms',
  'Runic Jolt': 'Arcanist - Curative Runeforms',
  'Runeguard of Freedom': 'Arcanist - Curative Runeforms',
  'Runic Defense': 'Arcanist - Curative Runeforms',
  'Runic Sorcery': 'Arcanist - Curative Runeforms',
  'Runic Embrace': 'Arcanist - Curative Runeforms',
  
  // Arcanist - Herald of the Tome
  'Fatecarver': 'Arcanist - Herald of the Tome',
  "Cephaliarch's Flail": 'Arcanist - Herald of the Tome',
  'Tome-Bearer\'s Inspiration': 'Arcanist - Herald of the Tome',
  'Hideous Clarity': 'Arcanist - Herald of the Tome',
  
  // Arcanist - Soldier of Apocrypha
  'Runeblades': 'Arcanist - Soldier of Apocrypha',
  'Abyssal Impact': 'Arcanist - Soldier of Apocrypha',
  'The Imperfect Ring': 'Arcanist - Soldier of Apocrypha',
  'Fulminating Rune': 'Arcanist - Soldier of Apocrypha',
  
  // Templar - Aedric Spear
  'Radial Sweep': 'Templar - Aedric Spear',
  'Puncturing Strikes': 'Templar - Aedric Spear',
  'Piercing Javelin': 'Templar - Aedric Spear',
  'Spear Shards': 'Templar - Aedric Spear',
  'Sun Shield': 'Templar - Aedric Spear',
  'Focused Charge': 'Templar - Aedric Spear',
  
  // Templar - Dawn's Wrath
  'Nova': 'Templar - Dawn\'s Wrath',
  'Sun Fire': 'Templar - Dawn\'s Wrath',
  'Solar Flare': 'Templar - Dawn\'s Wrath',
  'Backlash': 'Templar - Dawn\'s Wrath',
  'Eclipse': 'Templar - Dawn\'s Wrath',
  'Radiant Destruction': 'Templar - Dawn\'s Wrath',
  
  // Templar - Restoring Light
  'Rite of Passage': 'Templar - Restoring Light',
  'Rushed Ceremony': 'Templar - Restoring Light',
  'Cleansing Ritual': 'Templar - Restoring Light',
  'Rune Focus': 'Templar - Restoring Light',
  'Restoring Aura': 'Templar - Restoring Light',
  'Radiant Aura': 'Templar - Restoring Light',
  
  // Dragonknight - Ardent Flame
  'Dragonknight Standard': 'Dragonknight - Ardent Flame',
  'Lava Whip': 'Dragonknight - Ardent Flame',
  'Searing Strike': 'Dragonknight - Ardent Flame',
  'Fiery Breath': 'Dragonknight - Ardent Flame',
  'Inferno': 'Dragonknight - Ardent Flame',
  'Flames of Oblivion': 'Dragonknight - Ardent Flame',
  
  // Dragonknight - Draconic Power
  'Dragon Leap': 'Dragonknight - Draconic Power',
  'Spiked Armor': 'Dragonknight - Draconic Power',
  'Dragon Blood': 'Dragonknight - Draconic Power',
  'Reflective Scale': 'Dragonknight - Draconic Power',
  'Inhale': 'Dragonknight - Draconic Power',
  'Iron Skin': 'Dragonknight - Draconic Power',
  
  // Dragonknight - Earthen Heart
  'Magma Armor': 'Dragonknight - Earthen Heart',
  'Stonefist': 'Dragonknight - Earthen Heart',
  'Molten Weapons': 'Dragonknight - Earthen Heart',
  'Obsidian Shield': 'Dragonknight - Earthen Heart',
  'Petrify': 'Dragonknight - Earthen Heart',
  'Fossilize': 'Dragonknight - Earthen Heart',
  
  // Sorcerer - Daedric Summoning
  'Summon Storm Atronach': 'Sorcerer - Daedric Summoning',
  'Summon Unstable Familiar': 'Sorcerer - Daedric Summoning',
  'Daedric Curse': 'Sorcerer - Daedric Summoning',
  'Summon Winged Twilight': 'Sorcerer - Daedric Summoning',
  'Conjured Ward': 'Sorcerer - Daedric Summoning',
  'Bound Armor': 'Sorcerer - Daedric Summoning',
  
  // Sorcerer - Dark Magic
  'Negate Magic': 'Sorcerer - Dark Magic',
  'Crystal Shard': 'Sorcerer - Dark Magic',
  'Encase': 'Sorcerer - Dark Magic',
  'Rune Prison': 'Sorcerer - Dark Magic',
  'Dark Exchange': 'Sorcerer - Dark Magic',
  'Daedric Mines': 'Sorcerer - Dark Magic',
  
  // Sorcerer - Storm Calling
  'Overload': 'Sorcerer - Storm Calling',
  "Mages' Fury": 'Sorcerer - Storm Calling',
  'Lightning Form': 'Sorcerer - Storm Calling',
  'Lightning Splash': 'Sorcerer - Storm Calling',
  'Surge': 'Sorcerer - Storm Calling',
  'Bolt Escape': 'Sorcerer - Storm Calling',
  
  // Nightblade - Assassination
  'Death Stroke': 'Nightblade - Assassination',
  'Veiled Strike': 'Nightblade - Assassination',
  'Teleport Strike': 'Nightblade - Assassination',
  "Assassin's Blade": 'Nightblade - Assassination',
  'Mark Target': 'Nightblade - Assassination',
  'Grim Focus': 'Nightblade - Assassination',
  
  // Nightblade - Shadow
  'Consuming Darkness': 'Nightblade - Shadow',
  'Shadow Cloak': 'Nightblade - Shadow',
  'Blur': 'Nightblade - Shadow',
  'Path of Darkness': 'Nightblade - Shadow',
  'Aspect of Terror': 'Nightblade - Shadow',
  'Summon Shade': 'Nightblade - Shadow',
  
  // Nightblade - Siphoning
  'Soul Shred': 'Nightblade - Siphoning',
  'Strife': 'Nightblade - Siphoning',
  'Malevolent Offering': 'Nightblade - Siphoning',
  'Cripple': 'Nightblade - Siphoning',
  'Siphoning Strikes': 'Nightblade - Siphoning',
  'Drain Power': 'Nightblade - Siphoning',
  
  // Warden - Animal Companions
  'Feral Guardian': 'Warden - Animal Companions',
  'Dive': 'Warden - Animal Companions',
  'Scorch': 'Warden - Animal Companions',
  'Swarm': 'Warden - Animal Companions',
  'Betty Netch': 'Warden - Animal Companions',
  "Falcon's Swiftness": 'Warden - Animal Companions',
  
  // Warden - Green Balance
  'Secluded Grove': 'Warden - Green Balance',
  'Fungal Growth': 'Warden - Green Balance',
  'Healing Seed': 'Warden - Green Balance',
  'Living Vines': 'Warden - Green Balance',
  'Lotus Flower': 'Warden - Green Balance',
  "Nature's Grasp": 'Warden - Green Balance',
  
  // Warden - Winter's Embrace
  'Sleet Storm': 'Warden - Winter\'s Embrace',
  'Frost Cloak': 'Warden - Winter\'s Embrace',
  'Impaling Shards': 'Warden - Winter\'s Embrace',
  'Arctic Wind': 'Warden - Winter\'s Embrace',
  'Crystallized Shield': 'Warden - Winter\'s Embrace',
  'Frozen Gate': 'Warden - Winter\'s Embrace',
};

// Find base skill IDs (looking for skills with the fewest related abilities - likely base skills)
const results = {};
const notFound = [];

for (const [skillName, category] of Object.entries(skillsToLookup)) {
  const matches = [];
  
  for (const [id, ability] of Object.entries(abilities)) {
    if (ability.name === skillName) {
      matches.push({ id: parseInt(id), icon: ability.icon });
    }
  }
  
  if (matches.length === 0) {
    notFound.push(skillName);
  } else {
    // Sort by ID (lower IDs are usually base skills)
    matches.sort((a, b) => a.id - b.id);
    
    // Take the first match as the likely base skill
    results[skillName] = {
      category,
      id: matches[0].id,
      icon: matches[0].icon,
      totalMatches: matches.length
    };
  }
}

// Output results
console.log('=== FOUND SKILL IDs ===\n');
for (const [skill, data] of Object.entries(results)) {
  console.log(`${skill} (${data.category})`);
  console.log(`  ID: ${data.id}`);
  console.log(`  Icon: ${data.icon}`);
  console.log(`  Matches: ${data.totalMatches}\n`);
}

if (notFound.length > 0) {
  console.log('\n=== NOT FOUND ===');
  notFound.forEach(skill => console.log(`  - ${skill}`));
}

// Generate TypeScript update statements
console.log('\n=== QUICK REFERENCE (for copy/paste) ===\n');
const byCategory = {};
for (const [skill, data] of Object.entries(results)) {
  if (!byCategory[data.category]) {
    byCategory[data.category] = [];
  }
  byCategory[data.category].push({ skill, id: data.id });
}

for (const [category, skills] of Object.entries(byCategory)) {
  console.log(`// ${category}`);
  skills.forEach(({ skill, id }) => {
    console.log(`  { id: ${id}, name: '${skill}', ... },`);
  });
  console.log('');
}

console.log(`\nTotal found: ${Object.keys(results).length}`);
console.log(`Total not found: ${notFound.length}`);
