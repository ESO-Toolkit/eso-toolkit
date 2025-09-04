// Data structure
// Tooltip dictionary for non-gear buffs, passives & CP stars
const TOOLTIP_DICT = {
  // Group Buffs & Debuffs
  'Major Breach': 'Reduces target’s Physical and Spell Resistance by <strong>5948</strong>.',
  'Minor Breach': 'Reduces target’s Physical and Spell Resistance by <strong>2974</strong>.',
  'Minor Force': 'Increases Critical Damage by <strong>10%</strong>.',
  'Major Force': 'Increases Critical Damage by <strong>20%</strong>.',
  'Minor Brittle': 'Target takes <strong>10%</strong> more Critical Damage.',
  'Major Brittle': 'Target takes <strong>20%</strong> more Critical Damage.',
  'Elemental Catalyst':
    'Enemies take up to <strong>15%</strong> increased Critical Damage when affected by different elemental status effects.',

  // Gear sets or enchants that are not strictly ESO-Hub set pages
  'Legendary Infused Crusher Enchant':
    'Targets the closest enemy you damage, applying Crusher to reduce their Armor. Only one enemy can be affected at a time. Value scales with enchant quality and with the Infused trait on the weapon.',
  'Runic Sunder':
    '<em>Soldier of Apocrypha</em><br><strong>Target:</strong> Enemy • <strong>Range:</strong> 22m • <strong>Cost:</strong> 1377<div class="tt-head"><strong>Skill description</strong></div>Craft a defensive Apocryphal rune that deals 1161 Physical Damage. The rune steals <strong>2200 Armor</strong> and applies <strong>Minor Maim</strong> for 15 seconds, reducing their damage done by 5%. The rune also taunts for 15 seconds if it would not cause taunt immunity, and generates Crux. While slotted, damage taken is reduced by 2% per active Crux.',
  'Crystal Weapon':
    '<strong>Target:</strong> Self • <em>Dark Magic</em> • <strong>Cost:</strong> 2295<div class="tt-head"><strong>Skill description</strong></div>Encase your weapon in dark crystals for 6 seconds, causing your next two Light or Heavy Attacks to deal additional damage and reduce the target\'s Armor by <strong>1000</strong> for 5 seconds.<br>The first hit deals <strong>2091 Physical Damage</strong> and the second deals <strong>836 Physical Damage</strong>.<br>After casting, your next non-Ultimate ability used within 3 seconds costs 10% less.',
  "Velothi Ur-Mage's Amulet":
    'Mythic: Increases Penetration and Critical Damage, with reduced Healing Taken.',
  'Shattered Fate': 'Set effect grants significant Penetration based on stacks.',

  // Additional group gear
  'Roar of Alkosh': 'Trial set: On synergy use, reduces enemies’ Armor in an area.',
  "Crimson Oath's Rive":
    'Dungeon set: Applying a Major or Minor Breach also reduces Armor to nearby enemies.',
  Tremorscale: 'Monster set: Taunting an enemy triggers Physical Damage and reduces their Armor.',

  // Passives and class/armor bonuses (detailed)
  "Wood Elf Passive: Hunter's Eye":
    '<em>Wood Elf (Bosmer)</em><br><strong>Effect</strong><br><u>Rank 1</u>: Increases your Stealth Detection radius by 1 meter. Increases your Movement Speed by 1% and your Physical and Spell Penetration by 300.<br><u>Rank 2</u>: Increases your Stealth Detection radius by 2 meters. Increases your Movement Speed by 3% and your Physical and Spell Penetration by 600.<br><u>Rank 3</u>: Increases your Stealth Detection radius by 3 meters. Increases your Movement Speed by 5% and your Physical and Spell Penetration by 950.',
  'Grave Lord Passive: Dismember':
    '<em>Necromancer — Grave Lord</em><br><strong>Effect</strong><br><u>Rank 1</u>: While a Grave Lord ability is active, your Spell and Physical Penetration are increased by 1635.<br><u>Rank 2</u>: While a Grave Lord ability is active, your Spell and Physical Penetration are increased by 3271.',
  'Herald of the Tome: Splintered Secrets': `
      <em>Arcanist — Herald of the Tome</em><br>
      <strong>Effect</strong><br>
      <u>Rank 1</u>: Increase your Physical and Spell Penetration by 620 per Herald of the Tome ability slotted.<br>
      <u>Rank 2</u>: Increase your Physical and Spell Penetration by 1240 per Herald of the Tome ability slotted.
    `,
  'Light Armor Passive: Concentration': `
      <em>Light Armor</em><br>
      <div class="tt-head"><strong>Skill description</strong></div>
      Increases your Physical and Spell Penetration by <strong>939</strong> for each piece of Light Armor worn.
    `,
  'Dual Wield: Twin Blade and Blunt (Mace)': `
      <em>Dual Wield</em><br>
      <div class="tt-head"><strong>Skill description</strong></div>
      Grants a bonus based on the type of weapon equipped: Each <strong>axe</strong> increases your Critical Damage done by 6%. Each <strong>mace</strong> increases your Offensive Penetration by <strong>1487</strong>. Each <strong>sword</strong> increases your Weapon and Spell Damage by 129. Each <strong>dagger</strong> increases your Critical Chance rating by 657.
    `,
  'Two Handed: Heavy Weapons (Maul)': `
      <em>Two Handed</em><br>
      <div class="tt-head"><strong>Skill description</strong></div>
      Grants a bonus based on the type of weapon equipped: <strong>Greatswords</strong> increase your Weapon and Spell Damage by 258. <strong>Battle Axes</strong> increase your Critical Damage done by 12%. <strong>Mauls</strong> increase your Offensive Penetration by <strong>2974</strong>.
    `,

  // New detailed passive tooltips (Crit-related)
  'Assassination: Hemorrhage': `
      <em>Nightblade — Assassination</em><br>
      <strong>Effect</strong><br>
      <u>With an Assassination ability slotted</u><br>
      <u>Rank 1</u>: Increases your Critical Damage by <strong>5%</strong>. Dealing Critical Damage grants you and your group <strong>Minor Savagery</strong>, increasing Weapon Critical rating by <strong>1314</strong> for 10 seconds.<br>
      <u>Rank 2</u>: Increases your Critical Damage by <strong>10%</strong>. Dealing Critical Damage grants you and your group <strong>Minor Savagery</strong>, increasing Weapon Critical rating by <strong>1314</strong> for 20 seconds.
    `,
  'Herald of the Tome: Fated Fortune': `
      <em>Arcanist — Herald of the Tome</em><br>
      <strong>Effect</strong><br>
      <u>Rank 1</u>: When you generate or consume Crux, increase your Critical Damage and Critical Healing by <strong>6%</strong> for 7 seconds.<br>
      <u>Rank 2</u>: When you generate or consume Crux, increase your Critical Damage and Critical Healing by <strong>12%</strong> for 7 seconds.<br>
      <div class="tooltip-source"><em>Tooltips by ESO-Hub.com</em></div>
    `,
  'Aedric Spear: Piercing Spear': `
      <em>Templar — Aedric Spear</em><br>
      <strong>Effect</strong><br>
      <u>With an Aedric Spear ability slotted</u><br>
      <u>Rank 1</u>: Increases your Critical Damage by <strong>6%</strong>. Increases your damage done to blocking players by <strong>6%</strong>.<br>
      <u>Rank 2</u>: Increases your Critical Damage by <strong>12%</strong>. Increases your damage done to blocking players by <strong>12%</strong>.
    `,
  'Medium Armor: Dexterity': `
      <em>Medium Armor</em><br>
      <strong>Effect</strong><br>
      <u>Rank 1</u>: Increases your Critical Damage and Healing done by <strong>1%</strong> for every <strong>2</strong> pieces of Medium Armor equipped.<br>
      <u>Rank 2</u>: Increases your Critical Damage and Healing done by <strong>1%</strong> for every piece of Medium Armor equipped.<br>
      <u>Rank 3</u>: Increases your Critical Damage and Healing done by <strong>2%</strong> for every piece of Medium Armor equipped.
    `,
  'Animal Companions: Advanced Species': `
      <em>Warden — Animal Companions</em><br>
      <strong>Effect</strong><br>
      <u>Rank 1</u>: Increases your Critical Damage by <strong>2%</strong> for each Animal Companion ability slotted.<br>
      <u>Rank 2</u>: Increases your Critical Damage by <strong>5%</strong> for each Animal Companion ability slotted.
    `,
  'Dual Wield: Twin Blade and Blunt (Axe)': `
      <em>Dual Wield</em><br>
      <strong>Effect</strong><br>
      <u>While Dual Wielding</u><br>
      <u>Rank 1</u>: Each <strong>axe</strong> increases your Critical Damage done by <strong>3%</strong>. Each <strong>mace</strong> increases your Offensive Penetration by 743. Each <strong>sword</strong> increases your Weapon and Spell Damage by 64. Each <strong>dagger</strong> increases your Critical Chance rating by 328.<br>
      <u>Rank 2</u>: Each <strong>axe</strong> increases your Critical Damage done by <strong>6%</strong>. Each <strong>mace</strong> increases your Offensive Penetration by 1487. Each <strong>sword</strong> increases your Weapon and Spell Damage by 129. Each <strong>dagger</strong> increases your Critical Chance rating by 657.
    `,
  'Two Handed: Heavy Weapons (Axe)': `
      <em>Two Handed</em><br>
      <strong>Effect</strong><br>
      <u>With a Two-Handed weapon equipped</u><br>
      <u>Rank 1</u>: <strong>Greatswords</strong> +129 Weapon & Spell Damage. <strong>Battle Axes</strong> +6% Critical Damage done. <strong>Mauls</strong> +1487 Offensive Penetration.<br>
      <u>Rank 2</u>: <strong>Greatswords</strong> +258 Weapon & Spell Damage. <strong>Battle Axes</strong> +12% Critical Damage done. <strong>Mauls</strong> +2974 Offensive Penetration.
    `,
  'Khajiit Passive: Feline Ambush': `
      <em>Khajiit</em><br>
      <strong>Effect</strong><br>
      <u>Rank 1</u>: Increases your Critical Damage and Critical Healing by <strong>4%</strong>. Decreases your detection radius in Stealth by 1 meter.<br>
      <u>Rank 2</u>: Increases your Critical Damage and Critical Healing by <strong>8%</strong>. Decreases your detection radius in Stealth by 2 meters.<br>
      <u>Rank 3</u>: Increases your Critical Damage and Critical Healing by <strong>12%</strong>. Decreases your detection radius in Stealth by 3 meters.
    `,

  // Crit-related gear that may merit descriptions
  "Mora Scribe's Thesis": 'Set: Builds stacks to increase Critical Damage up to a maximum.',
  "Harpooner's Wading Kilt":
    'Mythic: Stacking Critical Chance/Critical Damage while staying in combat and avoiding direct damage.',

  // Additional sets used in this calculator
  'Lucent Echoes':
    'Set: Grants a burst of Critical Damage after proccing its condition; strong for sustained crit-focused builds.',
  "Sul-Xan's Torment":
    'Set: Provides Critical Damage when enemies are recently slain or affected; excels in add-heavy encounters.',
  'Shattered Fate': 'Set: Increases Penetration significantly via stacking mechanics.',
  'Armor Set Penetration Bonus': `
      Extra Penetration granted by certain armor sets when wearing multiple pieces.<br>
      Examples:
      <ul>
        <li><a href="https://eso-hub.com/en/sets/tide-born-wildstalker" target="_blank" rel="noopener">Tide-born Wildstalker</a></li>
        <li><a href="https://eso-hub.com/en/sets/ansuuls-torment" target="_blank" rel="noopener">Ansuul's Torment</a></li>
      </ul>
    `,
};

// Structured set tooltips with piece bonuses
const SET_TOOLTIPS = {
  'Lucent Echoes': {
    type: 'Trial Set (Heavy Armor, Jewels, Weapons)',
    source: 'Lucent Citadel (Gold Road DLC)',
    bonuses: {
      2: 'Adds 4% Healing Taken',
      3: 'Grants Minor Aegis (-5% damage from Dungeon/Trial/Arena monsters)',
      4: 'Adds 1206 Max Health',
      5: 'Above 50% Health: Increases Critical Damage and Critical Healing of group members by 11% within 28m.<br>50% or less Health: Reduces damage taken from monsters by 20%.',
      '5p': 'Adds an additional 1206 Max Health',
    },
  },
  'Shattered Fate': {
    type: 'Craftable — Level 50 - CP 160',
    bonuses: {
      5: 'Adds 7918 Offensive Penetration',
      10: 'Adds 687 Weapon and Spell Damage',
      12: 'Adds 1528 Critical Chance',
    },
  },
  "Sul-Xan's Torment": {
    type: 'Trial Set (Medium, Jewels, Weapons)',
    source: 'Rockgrove (Blackwood DLC)',
    bonuses: {
      2: '+6% Critical Damage',
      3: '+8% Critical Damage',
      4: '+6% Spell & Weapon Penetration',
      5: 'On dealing critical damage, gain Major Sorcery (+25% Spell Damage & Crit Damage) for 10s, stacking 3x',
    },
  },
  "Mora Scribe's Thesis": {
    type: 'Trial Set (Light Armor, Jewels, Weapons)',
    source: 'Lucent Citadel (Gold Road DLC)',
    bonuses: {
      2: 'Each time you cast a Magicka ability, gain 1% Critical Damage',
      3: 'Max 5 stacks (5%)',
      4: 'Max 10 stacks (10%)',
      5: 'Max 12 stacks (12%)',
    },
  },
  "Harpooner's Wading Kilt": {
    type: 'Mythic Item Set (Medium Armor, Legs)',
    source: 'Antiquities System (Blackwood DLC)',
    bonuses: {
      2: 'Gain 1% increased Critical Damage when you have a physical damage shield',
      3: 'Stacks up to 10 times (10%)',
      4: 'Stacks increase to 12 times (12%)',
      5: 'Stacks increase to max 15 times (15%)',
    },
  },
  "Crimson Oath's Rive": {
    type: 'Dungeon Set (Heavy Armor, Jewels, Weapons)',
    source: 'The Dread Cellar (Waking Flame DLC)',
    bonuses: {
      2: 'After casting a Sorcery ability, reduce enemy Physical and Spell Resistance by 1770 for 10s',
      3: 'Reduce enemy Physical and Spell Resistance by an additional 1181 for 10s (total 2951)',
      4: 'Further reduce enemy Physical and Spell Resistance by 590 for 10s (total 3541)',
      5: 'Gain a stack of Major Breach for 10s after casting a Sorcery ability, stacking up to 5 times',
    },
  },
  Tremorscale: {
    type: 'Monster Set (Medium Armor, Helm and Shoulders)',
    source: 'Volenfell (Base Game, Undaunted Pledge Vendor)',
    bonuses: {
      1: 'Adds 1096 Maximum Stamina',
      2: 'When you activate a taunt ability on an enemy, you cause a duneripper to burst from the ground beneath them after 1 second, dealing 0 Physical damage to all enemies within 4 meters and reducing their Armor by 0 for 15 seconds. This effect can occur once every 10 seconds and scales off the higher of your Physical or Spell Resistance.',
    },
  },
  'Roar of Alkosh': {
    type: 'Trial Set (Medium Armor, Jewels, Weapons)',
    source: 'Maw of Lorkhaj (Thieves Guild DLC)',
    bonuses: {
      2: 'After killing an enemy, your next light or heavy attack deals 25% more damage',
      3: 'The next two light or heavy attacks deal 25% more damage',
      4: 'Major Breach and Minor Slayer applied to the target for 10 seconds after killing an enemy',
      5: 'Have 4 seconds to kill another enemy after killing one to refresh the buff (Roar of Alkosh)',
    },
  },
  "Velothi Ur-Mage's Amulet": {
    type: 'Accessory (Amulet)',
    bonuses: {
      1: 'Adds 1650 Offensive Penetration, increase your damage done to monsters by 15%, gain Minor Force at all times (Critical Damage +10%), and reduce your Light and Heavy Attack damage by 99%.',
    },
  },
  "Spriggan's Thorns": {
    type: 'Overland — Level 50 - CP 160',
    bonuses: {
      2: 'Adds 1096 Maximum Stamina',
      3: 'Adds 1096 Maximum Stamina',
      4: 'Adds 129 Weapon and Spell Damage',
      5: 'Adds 3460 Offensive Penetration',
    },
  },
};

function buildSetTooltip(name) {
  const s = SET_TOOLTIPS[name];
  if (!s) return '';
  const parts = [];
  if (s.type || s.source) {
    parts.push(`<em>${[s.type, s.source].filter(Boolean).join(' — ')}</em>`);
  }
  if (s.bonuses) {
    const order = ['1', '2', '3', '4', '5', '5p'];
    const items = order
      .filter((k) => s.bonuses[k])
      .map((k) => {
        const label = k === '5p' ? '5 items (Perfected)' : `${k} items`;
        return `<li><strong>${label}:</strong> ${s.bonuses[k]}</li>`;
      })
      .join('');
    if (items) parts.push(`<ul>${items}</ul>`);
  }
  return parts.join('<br>');
}

// Critical Damage Buffs with rich tooltip descriptions
const critTooltips = {
  'Minor Force': `
    <strong>Minor Force (10% Critical Damage)</strong><br>
    One of the best consistent critical damage buffs.<br><br>

    <div><strong>Sources</strong></div>
    <div><em>Buff info</em>: <a href="https://eso-hub.com/en/buffs-debuffs/minor-force" target="_blank" rel="noopener">Minor Force</a></div>
    <div><strong>Skills</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/skills/guild/fighters-guild/barbed-trap" target="_blank" rel="noopener">Barbed Trap</a></li>
    </ul>
    <div><strong>Sets</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/sets/oakensoul-ring" target="_blank" rel="noopener">(M) Oakensoul Ring</a></li>
      <li><a href="https://eso-hub.com/en/sets/velothi-ur-mages-amulet" target="_blank" rel="noopener">Velothi Ur-Mage's Amulet</a></li>
    </ul>
  `,
  'Major Force': `
    <strong>Major Force (20% Critical Damage)</strong><br>
    A powerful burst critical damage buff.<br><br>
    
    <div><strong>Sources</strong></div>
    <div><em>Buff info</em>: <a href="https://eso-hub.com/en/buffs-debuffs/major-force" target="_blank" rel="noopener">Major Force</a></div>
    <div><strong>Skills</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/skills/alliance-war/assault/aggressive-horn" target="_blank" rel="noopener">Aggressive Horn</a></li>
    </ul>
    <div><strong>Sets</strong></div>
    <ul>
      <li>(5) <a href="https://eso-hub.com/en/sets/perfected-saxhleel-champion" target="_blank" rel="noopener">Saxhleel Champion</a></li>
      <li>(5) <a href="https://eso-hub.com/en/sets/vykands-soulfury" target="_blank" rel="noopener">Vykand's Soulfury</a></li>
      <li>(M) <a href="https://eso-hub.com/en/sets/monomyth-reforged" target="_blank" rel="noopener">Monomyth Reforged</a></li>
      <li>(M) <a href="https://eso-hub.com/en/sets/the-saint-and-the-seducer" target="_blank" rel="noopener">The Saint and the Seducer</a></li>
    </ul>
  `,
  'Minor Brittle': `
    <strong>Minor Brittle (10% Increased Crit Damage Taken)</strong><br>
    <em>The Chilled Status Effect:</em> Instant damage. Applies <strong>Minor Maim</strong> and <strong>Minor Brittle</strong> to the enemy. Chilled can be applied by skills that deal frost damage, weapon enchants, and sets.<br><br>
    <div><strong>Skills that apply Minor Brittle</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/skills/weapon/destruction-staff/elemental-susceptibility" target="_blank" rel="noopener">Elemental Susceptibility</a></li>
      <li><a href="https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha/rune-of-the-colorless-pool" target="_blank" rel="noopener">Rune of the Colorless Pool</a></li>
    </ul>
    <div><strong>Sets</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/sets/the-saint-and-the-seducer" target="_blank" rel="noopener">The Saint and the Seducer</a></li>
    </ul>
  `,
  'Major Brittle': `
    <strong>Major Brittle (20% Increased Crit Damage Taken)</strong><br>
    Strongest stacking debuff increasing incoming critical damage.<br><br>
    <em>How to obtain:</em>
    <ul>
      <li>Granted by the <a href="https://eso-hub.com/en/sets/nunatak" target="_blank" rel="noopener">Nunatak</a> monster set.</li>
    </ul>
  `,
  'Elemental Catalyst': `
    <strong>Elemental Catalyst (Up to 15% Critical Damage)</strong><br>
    Boosts critical damage based on how many elemental status effects affect the enemy.<br><br>
    <em>How to maximize:</em>
    <ul>
      <li>Apply multiple elemental damage types (Fire, Frost, Shock).</li>

    </ul>
    <div><strong>Good Ways to Proc</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/skills/weapon/destruction-staff/elemental-blockade" target="_blank" rel="noopener">Elemental Blockade</a></li>
      <li><a href="https://eso-hub.com/en/skills/dragonknight/ardent-flame/engulfing-flames" target="_blank" rel="noopener">Engulfing Flames</a></li>
      <li><a href="https://eso-hub.com/en/skills/guild/mages-guild/scalding-rune" target="_blank" rel="noopener">Scalding Rune</a></li>
      <li><a href="https://eso-hub.com/en/scribing/scripts/lingering-torment" target="_blank" rel="noopener">Lingering Torment (Script)</a></li>
    </ul>
  `,
};

// Penetration Buffs with rich tooltip descriptions
const penTooltips = {
  'Major Breach': `
    <strong>Major Breach</strong><br>
    Reduces target’s Physical and Spell Resistance significantly.<br><br>
    <em>Sources (U47):</em>
    <div><strong>Skills</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/skills/guild/psijic-order/crushing-weapon" target="_blank" rel="noopener">Crushing Weapon</a></li>
      <li><a href="https://eso-hub.com/en/skills/world/werewolf/deafening-roar" target="_blank" rel="noopener">Deafening Roar</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/destruction-staff/elemental-susceptibility" target="_blank" rel="noopener">Elemental Drain</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/destruction-staff/elemental-susceptibility" target="_blank" rel="noopener">Elemental Susceptibility</a></li>
      <li><a href="https://eso-hub.com/en/skills/nightblade/assassination/mark-target" target="_blank" rel="noopener">Mark Target</a></li>
      <li><a href="https://eso-hub.com/en/skills/dragonknight/ardent-flame/noxious-breath" target="_blank" rel="noopener">Noxious Breath</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/one-hand-and-shield/pierce-armor" target="_blank" rel="noopener">Pierce Armor</a></li>
      <li><a href="https://eso-hub.com/en/skills/nightblade/assassination/piercing-mark" target="_blank" rel="noopener">Piercing Mark</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/one-hand-and-shield/puncture" target="_blank" rel="noopener">Puncture</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/one-hand-and-shield/ransack" target="_blank" rel="noopener">Ransack</a></li>
      <li><a href="https://eso-hub.com/en/skills/alliance-war/assault/razor-caltrops" target="_blank" rel="noopener">Razor Caltrops</a></li>
      <li><a href="https://eso-hub.com/en/skills/nightblade/assassination/reapers-mark#:~:text=Reaper%27s%20Mark%20is%20a%20skill%20in%20the%20Assassination,and%20Spell%20Resistance%20by%205948%20for%2020%20seconds." target="_blank" rel="noopener">Reaper's Mark</a></li>
      <li><a href="https://eso-hub.com/en/skills/necromancer/grave-lord/unnerving-boneyard" target="_blank" rel="noopener">Unnerving Boneyard</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/destruction-staff/weakness-to-elements" target="_blank" rel="noopener">Weakness to Elements</a></li>
    </ul>
    <div><strong>Sets</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/sets/kynmarchers-cruelty" target="_blank" rel="noopener">Kynmarcher's Cruelty</a></li>
      <li><a href="https://eso-hub.com/en/sets/night-mothers-gaze" target="_blank" rel="noopener">Night Mother's Gaze</a></li>
    </ul>
  `,
  'Minor Breach': `
    <strong>Minor Breach</strong><br>
    Moderately reduces enemy resistances.<br><br>
    <em>Sources (U47):</em>
    <div><strong>Skills</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha/cruxweaver-armor" target="_blank" rel="noopener">Cruxweaver Armor</a></li>
      <li><a href="https://eso-hub.com/en/skills/warden/animal-companions/deep-fissure" target="_blank" rel="noopener">Deep Fissure</a></li>
      <li><a href="https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha/fatewoven-armor" target="_blank" rel="noopener">Fatewoven Armor</a></li>
      <li><a href="https://eso-hub.com/en/skills/weapon/one-hand-and-shield/pierce-armor" target="_blank" rel="noopener">Pierce Armor</a></li>
      <li><a href="https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha/unbreakable-fate" target="_blank" rel="noopener">Unbreakable Fate</a></li>
    </ul>
    <div><strong>Sets</strong></div>
    <ul>
      <li><a href="https://eso-hub.com/en/sets/corpseburster" target="_blank" rel="noopener">Corpseburster</a> (5)</li>
      <li><a href="https://eso-hub.com/en/sets/dragons-defilement" target="_blank" rel="noopener">Dragon's Defilement</a> (5)</li>
      <li><a href="https://eso-hub.com/en/sets/hand-of-mephala" target="_blank" rel="noopener">Hand of Mephala</a> (5)</li>
      <li><a href="https://eso-hub.com/en/sets/sunderflame" target="_blank" rel="noopener">Sunderflame</a> (5)</li>
      <li><a href="https://eso-hub.com/en/sets/the-saint-and-the-seducer" target="_blank" rel="noopener">The Saint and the Seducer</a> (M)</li>
    </ul>
  `,
};

// Champion Points tooltips for Penetration and Critical Damage
const cpTooltips = {
  'Champion Point: Piercing': `
    <strong>Champion Point: Piercing</strong><br>
    Increases Physical and Spell Penetration by 350 per stage.<br>
    Max 2 stages (700 total).
  `,
  'Champion Point: Force of Nature': `
    <strong>Champion Point: Force of Nature</strong><br>
    Increases Penetration based on unique status effects applied to the enemy.<br>
    Synergizes well with elemental status effects.
  `,
  'Fighting Finesse': `
    <strong>Fighting Finesse</strong><br>
    Raises Critical Damage and Healing by 4% per stage.<br>
    Max 2 stages (8% total).
  `,
  Backstabber: `
    <strong>Backstabber</strong><br>
    Increases Critical Damage by 2% per stage when attacking from behind enemies.<br>
    Max 5 stages (10%).
  `,
};

// Convert item name into an eso-hub.com slug automatically (for gear sets)
function getEsoHubLink(name) {
  return (
    'https://eso-hub.com/en/sets/' +
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .replace(/\s+/g, '-') // spaces -> hyphens
      .trim()
  );
}
const penData = {
  groupBuffs: [
    {
      name: 'Major Breach',
      enabled: true,
      quantity: 1,
      value: 5948,
      isFlat: true,
      category: 'group',
    },
    {
      name: 'Minor Breach',
      enabled: true,
      quantity: 1,
      value: 2974,
      isFlat: true,
      category: 'group',
    },
    {
      name: 'Roar of Alkosh',
      enabled: false,
      quantity: 1,
      value: 6000,
      isFlat: true,
      category: 'group',
    },
    {
      name: "Crimson Oath's Rive",
      enabled: false,
      quantity: 1,
      value: 3541,
      isFlat: true,
      category: 'group',
    },
    {
      name: 'Tremorscale',
      enabled: false,
      quantity: 1,
      value: 2640,
      isFlat: true,
      category: 'group',
    },
  ],
  gear: [
    {
      name: 'Legendary Infused Crusher Enchant',
      enabled: true,
      quantity: 1,
      value: 2108,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Runic Sunder',
      enabled: true,
      quantity: 1,
      value: 2200,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Crystal Weapon',
      enabled: false,
      quantity: 1,
      value: 1000,
      isFlat: true,
      category: 'gear',
      tooltip: `
          <strong>Crystal Weapon</strong><br>
          <strong>Target:</strong> Self • <em>Dark Magic</em> • <strong>Cost:</strong> 2295
          <div class="tt-head"><strong>Skill description</strong></div>
          Encase your weapon in dark crystals for 6 seconds, causing your next two Light or Heavy Attacks to deal additional damage and reduce the target's Armor by <strong>1000</strong> for 5 seconds. The first hit deals <strong>2091 Physical Damage</strong> and the second deals <strong>836 Physical Damage</strong>. After casting, your next non-Ultimate ability used within 3 seconds costs 10% less.
          <div class="tooltip-source">
            <a href="https://eso-hub.com/en/skills?search=Crystal%20Weapon" target="_blank" rel="noopener">View skill on ESO-Hub</a>
            <div><em>Tooltips by ESO-Hub.com</em></div>
          </div>
        `,
    },
    {
      name: "Velothi Ur-Mage's Amulet",
      enabled: true,
      quantity: 1,
      value: 1650,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Shattered Fate',
      enabled: false,
      quantity: 1,
      value: 7918,
      isFlat: true,
      category: 'gear',
      tooltip: `
          <strong>Shattered Fate</strong><br>
          <em>Craftable — Level 50 - CP 160</em>
          <ul>
            <li>(5 items) Adds <strong>7918</strong> Offensive Penetration</li>
            <li>(10 items) Adds <strong>687</strong> Weapon and Spell Damage</li>
            <li>(12 items) Adds <strong>1528</strong> Critical Chance</li>
          </ul>
          <div class="tooltip-source"><em>Source</em>: <a href="https://eso-hub.com/en/sets/shattered-fate" target="_blank" rel="noopener">View set on ESO-Hub</a></div>
        `,
    },
    {
      name: 'Armor Set Penetration Bonus',
      enabled: false,
      quantity: 1,
      per: 1487,
      maxQuantity: 2,
      category: 'gear',
    },
    {
      name: "Spriggan's Thorns",
      enabled: false,
      quantity: 1,
      value: 3460,
      isFlat: true,
      category: 'gear',
      tooltip: `
          <strong>Spriggan's Thorns</strong><br>
          <em>Overland — Level 50 - CP 160</em>
          <ul>
            <li>(2 items) Adds <strong>1096</strong> Maximum Stamina</li>
            <li>(3 items) Adds <strong>1096</strong> Maximum Stamina</li>
            <li>(4 items) Adds <strong>129</strong> Weapon and Spell Damage</li>
            <li>(5 items) Adds <strong>3460</strong> Offensive Penetration</li>
          </ul>
          <div class="tooltip-source">
            <a href="https://eso-hub.com/en/sets/spriggans-thorns" target="_blank" rel="noopener">Spriggan's Thorns Set ESO - Stats & Location</a>
            <div><em>Tooltips by ESO-Hub.com</em></div>
          </div>
        `,
    },
    // New entries
    {
      name: 'Sharpened (1H Trait)',
      enabled: false,
      quantity: 1,
      value: 1638,
      isFlat: true,
      category: 'gear',
      tooltip: `
          <strong>Sharpened (1H Trait)</strong><br>
          <div class="tt-inline-list" style="margin-top:4px; line-height:1.1; font-size:0.92em;">
            <div>Increases Physical and Spell Penetration by&nbsp;<strong>1428</strong></div>
            <div style="color:#34c759;">Increases Physical and Spell Penetration by&nbsp;<strong>1485</strong></div>
            <div style="color:#3b82f6;">Increases Physical and Spell Penetration by&nbsp;<strong>1542</strong></div>
            <div style="color:#a855f7;">Increases Physical and Spell Penetration by&nbsp;<strong>1580</strong></div>
            <div style="color:#f59e0b;">Increases Physical and Spell Penetration by&nbsp;<strong>1638</strong></div>
          </div>
          <div class="tooltip-source"><em>Source</em>: <a href="https://eso-hub.com/en/traits/weapon/sharpened" target="_blank" rel="noopener">ESO-Hub — Sharpened</a></div>
        `,
    },
    {
      name: 'Sharpened (2H Trait)',
      enabled: false,
      quantity: 1,
      value: 3276,
      isFlat: true,
      category: 'gear',
      tooltip: `
          <strong>Sharpened (2H Trait)</strong><br>
          <div class="tt-inline-list" style="margin-top:4px; line-height:1.1; font-size:0.92em;">
            <div>Increases Physical and Spell Penetration by&nbsp;<strong>2856</strong></div>
            <div style="color:#34c759;">Increases Physical and Spell Penetration by&nbsp;<strong>2970</strong></div>
            <div style="color:#3b82f6;">Increases Physical and Spell Penetration by&nbsp;<strong>3084</strong></div>
            <div style="color:#a855f7;">Increases Physical and Spell Penetration by&nbsp;<strong>3160</strong></div>
            <div style="color:#f59e0b;">Increases Physical and Spell Penetration by&nbsp;<strong>3276</strong></div>
          </div>
          <div class="tooltip-source"><em>Source</em>: <a href="https://eso-hub.com/en/traits/weapon/sharpened" target="_blank" rel="noopener">ESO-Hub — Sharpened</a></div>
        `,
    },
    {
      name: 'Arena 1-piece Bonus',
      enabled: false,
      quantity: 1,
      value: 1190,
      isFlat: true,
      category: 'gear',
      tooltip: `
          <strong>Arena 1-piece Bonus</strong><br>
          Examples of Perfected Arena sets that grant a 1-piece Offensive Penetration bonus:
          <ul>
            <li><a href="https://eso-hub.com/en/sets/perfected-crushing-wall" target="_blank" rel="noopener">Perfected Crushing Wall</a></li>
            <li><a href="https://eso-hub.com/en/sets/perfected-merciless-charge" target="_blank" rel="noopener">Perfected Merciless Charge</a></li>
            <li><a href="https://eso-hub.com/en/sets/perfected-titanic-cleave" target="_blank" rel="noopener">Perfected Titanic Cleave</a></li>
            <li><a href="https://eso-hub.com/en/sets/perfected-radial-uppercut" target="_blank" rel="noopener">Perfected Radial Uppercut</a></li>
            <li><a href="https://eso-hub.com/en/sets/perfected-wild-impulse" target="_blank" rel="noopener">Perfected Wild Impulse</a></li>
            <li><a href="https://eso-hub.com/en/sets/perfected-wrath-of-elements" target="_blank" rel="noopener">Perfected Wrath of Elements</a></li>
          </ul>
        `,
    },
    {
      name: 'Anthelmir',
      enabled: false,
      quantity: 5000,
      per: 1,
      maxQuantity: 100000,
      minQuantity: 0,
      step: 1,
      quantityTitle: 'Weapon Damage (enter WD)',
      category: 'gear',
      tooltip: `
          <strong>Anthelmir's Construct</strong><br>
          <em>Monster Set — Level 50 - CP 160</em>
          <ul>
            <li>(1 item) Adds <strong>129</strong> Weapon and Spell Damage</li>
            <li>(2 items) Attacking an enemy with a fully-charged Heavy Attack throws an axe at your enemy, dealing <strong>1572 Physical Damage</strong> and reducing their Armor by <strong>400</strong> for 5 seconds. This effect can occur once every 10 seconds and scales off the higher of your Weapon or Spell Damage. The axe drops to the ground after traveling to your target for 5 seconds. Touching the axe reduces the cooldown of this set by 5 seconds.</li>
          </ul>
          <div class="tooltip-source">
            <a href="https://eso-hub.com/en/sets/anthelmirs-construct" target="_blank" rel="noopener">View set on ESO-Hub</a>
            <div><em>Tooltips by ESO-Hub.com</em></div>
          </div>
        `,
    },
    {
      name: 'Balorgh',
      enabled: false,
      quantity: 70,
      per: 23,
      maxQuantity: 500,
      minQuantity: 0,
      step: 1,
      quantityTitle: '',
      category: 'gear',
      tooltip: `
          <strong>Balorgh</strong><br>
          <em>Monster Set — Level 50 - CP 160</em>
          <ul>
            <li>(1 item) Adds <strong>129</strong> Weapon and Spell Damage</li>
            <li>(2 items) When you use an Ultimate ability you gain Weapon and Spell Damage equal to the amount of total Ultimate consumed, and Physical and Spell Penetration equal to <strong>23</strong> times the amount for 12 seconds.</li>
          </ul>
          <div class="tooltip-source">
            <a href="https://eso-hub.com/en/sets/balorgh" target="_blank" rel="noopener">Balorgh — ESO-Hub</a>
          </div>
        `,
    },
  ],
  passives: [
    {
      name: "Wood Elf Passive: Hunter's Eye",
      enabled: false,
      quantity: 1,
      value: 950,
      isFlat: true,
      category: 'passive',
    },
    {
      name: 'Grave Lord Passive: Dismember',
      enabled: false,
      quantity: 1,
      value: 3271,
      isFlat: true,
      category: 'passive',
    },
    {
      name: 'Herald of the Tome: Splintered Secrets',
      enabled: true,
      quantity: 2,
      per: 1240,
      maxQuantity: 5,
      category: 'passive',
    },
    {
      name: 'Light Armor Passive: Concentration',
      enabled: true,
      quantity: 1,
      per: 939,
      maxQuantity: 7,
      category: 'passive',
    },
    {
      name: 'Dual Wield: Twin Blade and Blunt (Mace)',
      enabled: false,
      quantity: 1,
      per: 1487,
      maxQuantity: 2,
      category: 'passive',
    },
    {
      name: 'Two Handed: Heavy Weapons (Maul)',
      enabled: false,
      quantity: 1,
      value: 2974,
      isFlat: true,
      category: 'passive',
    },
  ],
  cp: [
    {
      name: 'Champion Point: Piercing',
      enabled: true,
      quantity: 2,
      per: 350,
      maxQuantity: 2,
      category: 'cp',
    },
    {
      name: 'Champion Point: Force of Nature',
      enabled: false,
      quantity: 3,
      per: 220,
      maxQuantity: 7,
      category: 'cp',
    },
  ],
};

const critData = {
  groupBuffs: [
    {
      name: 'Base Character Critical Damage',
      enabled: true,
      quantity: 1,
      value: 50,
      isFlat: true,
      isPercent: true,
      category: 'group',
      locked: true,
      hideTooltip: true,
    },
    {
      name: 'Minor Force',
      enabled: true,
      quantity: 1,
      value: 10,
      isFlat: true,
      isPercent: true,
      category: 'group',
    },
    {
      name: 'Major Force',
      enabled: false,
      quantity: 1,
      value: 20,
      isFlat: true,
      isPercent: true,
      category: 'group',
    },
    {
      name: 'Minor Brittle',
      enabled: true,
      quantity: 1,
      value: 10,
      isFlat: true,
      isPercent: true,
      category: 'group',
    },
    {
      name: 'Major Brittle',
      enabled: false,
      quantity: 1,
      value: 20,
      isFlat: true,
      isPercent: true,
      category: 'group',
    },
    {
      name: 'Elemental Catalyst',
      enabled: false,
      quantity: 3,
      per: 5,
      maxQuantity: 3,
      isPercent: true,
      category: 'group',
    },
  ],
  gear: [
    {
      name: 'Lucent Echoes',
      enabled: true,
      quantity: 1,
      value: 11,
      isFlat: true,
      isPercent: true,
      category: 'gear',
    },
    {
      name: "Sul-Xan's Torment",
      enabled: false,
      quantity: 1,
      value: 12,
      isFlat: true,
      isPercent: true,
      category: 'gear',
      tooltip: `
          <strong>Sul-Xan's Torment</strong><br>
          <ul>
            <li>(2 items) Adds <strong>129</strong> Weapon and Spell Damage</li>
            <li>(3 items) Gain <strong>Minor Slayer</strong> at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by <strong>5%</strong>.</li>
            <li>(4 items) Adds <strong>657</strong> Critical Chance</li>
            <li>(5 items) When an enemy you recently damaged dies, they leave behind a vengeful soul for 6 seconds. You can only create one vengeful soul at a time. Touching the soul increases your Critical Chance by <strong>2160</strong> and your Critical Damage by <strong>12%</strong> for 30 seconds.</li>
          </ul>
          <div class="tooltip-source"><em>Source</em>: <a href="https://eso-hub.com/en/sets/sul-xans-torment" target="_blank" rel="noopener">ESO-Hub — Sul-Xan's Torment</a></div>
        `,
    },
    {
      name: "Mora Scribe's Thesis",
      enabled: false,
      quantity: 12,
      per: 1,
      maxQuantity: 12,
      isPercent: true,
      category: 'gear',
    },
    {
      name: "Harpooner's Wading Kilt",
      enabled: false,
      quantity: 10,
      per: 1,
      maxQuantity: 10,
      isPercent: true,
      category: 'gear',
    },
  ],
  passives: [
    {
      name: 'Herald of the Tome: Fated Fortune',
      enabled: true,
      quantity: 2,
      per: 6,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Assassination: Hemorrhage',
      enabled: true,
      quantity: 2,
      per: 5,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Aedric Spear: Piercing Spear',
      enabled: false,
      quantity: 1,
      value: 12,
      isFlat: true,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Medium Armor: Dexterity',
      enabled: true,
      quantity: 6,
      per: 2,
      maxQuantity: 7,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Animal Companions: Advanced Species',
      enabled: false,
      quantity: 1,
      value: 15,
      isFlat: true,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Dual Wield: Twin Blade and Blunt (Axe)',
      enabled: false,
      quantity: 2,
      per: 6,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Two Handed: Heavy Weapons (Axe)',
      enabled: false,
      quantity: 2,
      per: 6,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
    },
    {
      name: 'Khajiit Passive: Feline Ambush',
      enabled: false,
      quantity: 1,
      value: 12,
      isFlat: true,
      isPercent: true,
      category: 'passive',
    },
  ],
  cp: [
    {
      name: 'Fighting Finesse',
      enabled: false,
      quantity: 2,
      per: 4,
      maxQuantity: 2,
      isPercent: true,
      category: 'cp',
    },
    {
      name: 'Backstabber',
      enabled: false,
      quantity: 5,
      per: 2,
      maxQuantity: 5,
      isPercent: true,
      category: 'cp',
    },
  ],
};

const PEN_CAP = 18200;
const CRIT_CAP = 125;

// Create item HTML
function createItem(item, index, type) {
  const hasQuantity = item.maxQuantity && item.maxQuantity > 1;

  // Calculate the value based on whether it's flat or per-item
  let value;
  let perDisplay = '';
  let perTitle = '';

  if (item.name === 'Anthelmir') {
    // Quantity is Weapon Damage; displayed value is Penetration = WD / 2.5
    const wd = parseFloat(item.quantity) || 0;
    value = Math.round(wd / 2.5);
    perDisplay = '';
    perTitle = 'Penetration = Weapon Damage ÷ 2.5';
  } else if (item.name === 'Balorgh') {
    // Quantity is Ultimate consumed; displayed value is Penetration = Ult × 23
    const ult = parseFloat(item.quantity) || 0;
    value = Math.round(ult * 23);
    perDisplay = '';
    perTitle = 'Penetration = Ultimate × 23';
  } else if (item.isFlat) {
    // Flat items just have their value
    value = item.value;
  } else {
    // Stackable items multiply quantity by per value
    value = item.quantity * item.per;
    perDisplay = item.per + (item.isPercent ? '%' : '');
    perTitle = `Value per stack/piece: ${perDisplay}`;
  }
  const lockedClass = item.locked ? 'is-locked' : '';
  const checkboxDisabled = item.locked ? 'disabled' : '';
  const checkboxChecked = item.enabled ? 'checked' : '';
  const lockBadge = item.locked
    ? '<span class="badge badge--locked" aria-label="Always active">🔒</span>'
    : '';

  // Build tooltip HTML (rich) using category + dictionaries + fallback
  let tooltipHTML = item.tooltip || '';
  if (!tooltipHTML) {
    if (item.category === 'gear') {
      const link = getEsoHubLink(item.name);
      const setHtml = buildSetTooltip(item.name);
      const dictExtra = TOOLTIP_DICT[item.name] ? `<br>${TOOLTIP_DICT[item.name]}` : '';
      const details = setHtml || dictExtra; // prefer structured set data; fallback to generic blurb
      tooltipHTML = `
                <strong>${item.name}</strong>${details ? `<br>${details}` : ''}<br>
                <div class="tooltip-source"><a href="${link}" target="_blank" rel="noopener"><span class="link-emoji" aria-hidden="true">🔗</span><span class="link-text">View Set on ESO-Hub</span></a></div>
            `;
    } else if (item.category === 'group') {
      // Prefer full set info for group-applied set effects like Alkosh/Crimson if available
      const setHtml = buildSetTooltip(item.name);
      if (setHtml) {
        const link = getEsoHubLink(item.name);
        tooltipHTML = `
                    <strong>${item.name}</strong><br>
                    ${setHtml}<br>
                    <div class="tooltip-source"><a href="${link}" target="_blank" rel="noopener"><span class="link-emoji" aria-hidden="true">🔗</span><span class="link-text">View Set on ESO-Hub</span></a></div>
                `;
      } else {
        // Use rich predefined tooltip content without adding a heading here;
        // the global normalization below will prepend a title if needed.
        tooltipHTML =
          penTooltips[item.name] || critTooltips[item.name] || TOOLTIP_DICT[item.name] || '';
      }
    } else if (item.category === 'cp' && cpTooltips[item.name]) {
      tooltipHTML = cpTooltips[item.name];
    } else {
      tooltipHTML = TOOLTIP_DICT[item.name]
        ? `<strong>${item.name}</strong><br>${TOOLTIP_DICT[item.name]}`
        : `<strong>${item.name}</strong><br>No additional info available.`;
    }

    // Normalize whitespace and avoid double titles if source already includes a heading
    const trimmed = (tooltipHTML || '').trim();
    if (trimmed && !/^<strong>/i.test(trimmed)) {
      tooltipHTML = `<strong>${item.name}</strong><br>${trimmed}`;
    } else {
      tooltipHTML = trimmed; // ensure no leading newlines create false negatives
    }

    // Remove accidental duplicated leading headings (e.g., <strong>Title</strong><br><strong>Title</strong>...)
    tooltipHTML = tooltipHTML.replace(
      /^<strong>([^<]+)<\/strong>\s*<br>\s*<strong>\1<\/strong>\s*(<br>|)/i,
      '<strong>$1</strong><br>',
    );

    // Append per-stack info if applicable
    if (!item.isFlat && item.per) {
      const perSuffix = item.isPercent ? '%' : '';
      const maxTxt = item.maxQuantity ? ` (max ${item.maxQuantity})` : '';
      tooltipHTML += `<br><em>Per stack/piece: ${item.per}${perSuffix}${maxTxt}</em>`;
    }
  }
  const tooltipAttr = (tooltipHTML || '').replace(/"/g, '&quot;');

  return `
        <div class="calculator__item ${!item.enabled ? 'is-disabled' : ''} ${lockedClass}" data-type="${type}" data-index="${index}" data-name="${item.name}" data-tooltip="${tooltipAttr}">
            <input class="calculator__item-checkbox" type="checkbox" ${checkboxChecked} ${checkboxDisabled}
                   onchange="toggleItem('${type}', ${index})">
            ${
              hasQuantity
                ? `<input class="calculator__item-qty" type="number" value="${item.quantity}" min="${item.minQuantity != null ? item.minQuantity : 1}" max="${item.maxQuantity}" step="${item.step != null ? item.step : 1}"
                        onchange="updateQuantity('${type}', ${index}, this.value)"
                        title="${item.quantityTitle ? item.quantityTitle : `Stacks/Pieces (max: ${item.maxQuantity})`}">`
                : `<span class="calculator__item-qty">${item.quantity}</span>`
            }
            <span class="calculator__item-name">
                ${item.name} ${lockBadge}
                ${item.hideTooltip ? '' : `<button type="button" class="item-tooltip-indicator" aria-label="Show info" title="Tap or hover for details">?</button>`}
            </span>
            <span class="calculator__item-per" ${perTitle ? `title="${perTitle}"` : ''}>${perDisplay}</span>
            <span class="calculator__item-value ${item.locked ? 'is-locked-value' : ''}" style="${item.locked ? 'text-shadow:none;' : ''}">
                ${
                  item.isPercent
                    ? `<span class="value-num">${value}</span><span class="value-suffix">%</span>`
                    : `${value}`
                }
            </span>
        </div>
    `;
}

// Mount functions for each calculator (called lazily when tab activates)
function mountPen() {
  if (window._calcMounted && window._calcMounted.pen) return;
  let penIndex = 0;
  let html = '';
  html = '';
  penData.groupBuffs.forEach((item) => {
    html += createItem(item, penIndex++, 'pen');
  });

  // Helper: animated close
  function closeTooltipAnimated() {
    if (_tooltipEl.style.display !== 'block') return;
    _tooltipPinned = false;
    _tooltipEl.style.pointerEvents = 'none';
    _tooltipEl.style.opacity = '0';
    setTimeout(() => {
      _tooltipEl.style.display = 'none';
      _tooltipBackdrop.style.display = 'none';
      document.body.classList.remove('no-scroll');
      _detachAncestorScrollClosers();
    }, 180);
  }
  const gb = document.querySelector(
    '.calculator__list[data-calc="pen"][data-section="group-buffs"]',
  );
  if (gb) gb.innerHTML = html;
  html = '';
  penData.gear.forEach((item) => {
    html += createItem(item, penIndex++, 'pen');
  });
  const gear = document.querySelector('.calculator__list[data-calc="pen"][data-section="gear"]');
  if (gear) gear.innerHTML = html;
  html = '';
  penData.passives.forEach((item) => {
    html += createItem(item, penIndex++, 'pen');
  });
  const passives = document.querySelector(
    '.calculator__list[data-calc="pen"][data-section="passives"]',
  );
  if (passives) passives.innerHTML = html;
  html = '';
  penData.cp.forEach((item) => {
    html += createItem(item, penIndex++, 'pen');
  });
  const cp = document.querySelector('.calculator__list[data-calc="pen"][data-section="cp"]');
  if (cp) cp.innerHTML = html;
  if (!window._calcMounted) window._calcMounted = {};
  window._calcMounted.pen = true;
  calculateTotals();
  // Apply any active mode filter after mount
  try {
    applyModeFilter();
  } catch {}
}

function mountCrit() {
  if (window._calcMounted && window._calcMounted.crit) return;
  let critIndex = 0;
  let html = '';
  html = '';
  critData.groupBuffs.forEach((item) => {
    html += createItem(item, critIndex++, 'crit');
  });
  const gb = document.querySelector(
    '.calculator__list[data-calc="crit"][data-section="group-buffs"]',
  );
  if (gb) gb.innerHTML = html;
  html = '';
  critData.gear.forEach((item) => {
    html += createItem(item, critIndex++, 'crit');
  });
  const gear = document.querySelector('.calculator__list[data-calc="crit"][data-section="gear"]');
  if (gear) gear.innerHTML = html;
  html = '';
  critData.passives.forEach((item) => {
    html += createItem(item, critIndex++, 'crit');
  });
  const passives = document.querySelector(
    '.calculator__list[data-calc="crit"][data-section="passives"]',
  );
  if (passives) passives.innerHTML = html;
  html = '';
  critData.cp.forEach((item) => {
    html += createItem(item, critIndex++, 'crit');
  });
  const cp = document.querySelector('.calculator__list[data-calc="crit"][data-section="cp"]');
  if (cp) cp.innerHTML = html;
  if (!window._calcMounted) window._calcMounted = {};
  window._calcMounted.crit = true;
  calculateTotals();
  // Apply any active mode filter after mount
  try {
    applyModeFilter();
  } catch {}
}

function mountArmor() {
  if (window._calcMounted && window._calcMounted.armor) return;
  // Placeholder content already present in HTML; in future, render like others
  if (!window._calcMounted) window._calcMounted = {};
  window._calcMounted.armor = true;
}

// Initialize tabs and mount active panel lazily
function initTabs() {
  const tabs = Array.from(document.querySelectorAll('.tabs [role="tab"]'));
  const panels = {
    pen: document.getElementById('panel-pen'),
    crit: document.getElementById('panel-crit'),
    armor: document.getElementById('panel-armor'),
  };
  const byId = {
    pen: document.getElementById('tab-pen'),
    crit: document.getElementById('tab-crit'),
    armor: document.getElementById('tab-armor'),
  };

  function showTab(id, setHash = true) {
    tabs.forEach((t) => {
      const active = t.id === 'tab-' + id;
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.tabIndex = active ? 0 : -1;
    });
    Object.entries(panels).forEach(([key, el]) => {
      if (!el) return;
      if (key === id) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
    // Lazy mount
    if (id === 'pen') mountPen();
    if (id === 'crit') mountCrit();
    if (id === 'armor') mountArmor();
    // persist
    try {
      localStorage.setItem('activeTab', id);
    } catch {}
    if (setHash) {
      const newHash = '#' + id;
      if (location.hash !== newHash) history.replaceState(null, '', newHash);
    }
    // Refresh fixed totals bar to reflect new active tab
    if (typeof updateFixedTotalsFromActive === 'function') {
      updateFixedTotalsFromActive();
    }
    // Ensure layout equalization after tab switch so measurements occur when panel is visible
    try {
      requestAnimationFrame(() => {
        equalizeSections();
        // Run again shortly after to catch any late content/font/layout changes
        setTimeout(equalizeSections, 80);
      });
    } catch {}
  }

  // Keyboard nav
  const tablist = document.querySelector('.tabs[role="tablist"]');
  if (tablist) {
    tablist.addEventListener('keydown', (e) => {
      const current = document.activeElement;
      const idx = tabs.indexOf(current);
      if (idx === -1) return;
      if (e.key === 'ArrowRight') {
        const next = tabs[(idx + 1) % tabs.length];
        next.focus();
        showTab(next.id.replace('tab-', ''));
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        prev.focus();
        showTab(prev.id.replace('tab-', ''));
        e.preventDefault();
      } else if (e.key === 'Home') {
        const first = tabs[0];
        first.focus();
        showTab(first.id.replace('tab-', ''));
        e.preventDefault();
      } else if (e.key === 'End') {
        const last = tabs[tabs.length - 1];
        last.focus();
        showTab(last.id.replace('tab-', ''));
        e.preventDefault();
      }
    });
  }

  // Clicks
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.id.replace('tab-', ''))));

  // Pick starting tab from hash or localStorage
  let start = (location.hash || '').replace('#', '');
  if (!['pen', 'crit', 'armor'].includes(start)) {
    try {
      start = localStorage.getItem('activeTab') || 'pen';
    } catch {
      start = 'pen';
    }
  }
  showTab(start, false);
}

// Get all items for a type
function getAllItems(type) {
  if (type === 'pen') {
    return [...penData.groupBuffs, ...penData.gear, ...penData.passives, ...penData.cp];
  } else {
    return [...critData.groupBuffs, ...critData.gear, ...critData.passives, ...critData.cp];
  }
}

// Toggle item
function toggleItem(type, index) {
  const items = getAllItems(type);
  const item = items[index];
  if (item && item.locked) {
    // Keep UI synced to locked state
    let cb = document.querySelector(
      `.calculator__item[data-type="${type}"][data-index="${index}"] input[type="checkbox"]`,
    );
    if (cb) cb.checked = true;
    return;
  }
  // Any individual toggle clears bulk button highlight for this calc
  clearBulkButtons(type);
  item.enabled = !item.enabled;
  updateItemDisplay(type, index);
  calculateTotals();
}

// Update quantity
function updateQuantity(type, index, value) {
  const items = getAllItems(type);
  const n = parseFloat(value);
  const item = items[index];
  if (!Number.isNaN(n)) {
    items[index].quantity = n;
  } else {
    // fallback to minQuantity if provided; otherwise 1
    items[index].quantity = item && item.minQuantity != null ? item.minQuantity : 1;
  }
  updateItemDisplay(type, index);
  calculateTotals();
}

// Update item display
function updateItemDisplay(type, index) {
  const items = getAllItems(type);
  const item = items[index];
  let itemEl = document.querySelector(
    `.calculator__item[data-type="${type}"][data-index="${index}"]`,
  );

  if (!itemEl) return; // Skip if element doesn't exist

  if (item.enabled) {
    itemEl.classList.remove('is-disabled');
  } else {
    itemEl.classList.add('is-disabled');
  }
  // locked styling
  if (item.locked) {
    itemEl.classList.add('is-locked');
  } else {
    itemEl.classList.remove('is-locked');
  }
  // sync checkbox attrs
  const cb = itemEl.querySelector('.calculator__item-checkbox');
  if (cb) {
    cb.disabled = !!item.locked;
    cb.checked = !!item.enabled;
  }

  // Calculate the value based on whether it's flat or per-item
  let value;
  if (item.name === 'Anthelmir') {
    const wd = parseFloat(item.quantity) || 0;
    value = Math.round(wd / 2.5);
  } else if (item.isFlat) {
    value = item.value;
  } else {
    value = item.quantity * item.per;
  }

  let valueEl = itemEl.querySelector('.calculator__item-value');
  if (valueEl) {
    // Re-render inner structure depending on percent or not
    if (item.isPercent) {
      valueEl.innerHTML = `
                <span class="value-num">${value}</span><span class="value-suffix">%</span>
            `;
    } else {
      valueEl.textContent = value;
    }
    // keep locked style on container (suppress text shadow)
    if (item.locked) {
      valueEl.classList.add('is-locked-value');
      valueEl.style.textShadow = 'none';
    } else {
      valueEl.classList.remove('is-locked-value');
      valueEl.style.textShadow = '';
    }
    // ensure number keeps default color (blue) even when locked
    const numEl = valueEl.querySelector('.value-num');
    if (numEl) {
      // ensure base color applies (blue via .calculator__item-value)
      numEl.style.color = '';
    }
  }
}

// Toggle all functions
function toggleAllPen(checked) {
  getAllItems('pen').forEach((item, index) => {
    if (item.locked) {
      item.enabled = true;
      let cb = document.querySelector(
        `.calculator__item[data-type="pen"][data-index="${index}"] input[type="checkbox"]`,
      );
      if (cb) cb.checked = true;
      updateItemDisplay('pen', index);
      return;
    }
    item.enabled = checked;
    let cb = document.querySelector(
      `.calculator__item[data-type="pen"][data-index="${index}"] input[type="checkbox"]`,
    );
    if (cb) cb.checked = checked;
    updateItemDisplay('pen', index);
  });
  // Highlight the pressed bulk button until another action
  highlightBulkButton('pen', !!checked);
  calculateTotals();
}

function toggleAllCrit(checked) {
  getAllItems('crit').forEach((item, index) => {
    if (item.locked) {
      item.enabled = true;
      let cb = document.querySelector(
        `.calculator__item[data-type="crit"][data-index="${index}"] input[type="checkbox"]`,
      );
      if (cb) cb.checked = true;
      updateItemDisplay('crit', index);
      return;
    }
    item.enabled = checked;
    let cb = document.querySelector(
      `.calculator__item[data-type="crit"][data-index="${index}"] input[type="checkbox"]`,
    );
    if (cb) cb.checked = checked;
    updateItemDisplay('crit', index);
  });
  // Highlight the pressed bulk button until another action
  highlightBulkButton('crit', !!checked);
  calculateTotals();
}

// Helper: current mode
function _currentMode() {
  try {
    return (localStorage.getItem('calcMode') || '').toLowerCase();
  } catch {
    return '';
  }
}

// Helper: caps by mode
function getPenCaps() {
  const mode = _currentMode();
  if (mode === 'pvp') return { cap: 33300, max: 37000 };
  return { cap: 18200, max: 18999 };
}
function getCritCaps() {
  return { cap: 125, max: 127 };
}

// Update legend text based on mode
function updateLegendForMode() {
  // If no mode is selected, show both PvE and PvP info in the legend/footer.
  const mode = _currentMode();
  const crit = getCritCaps();
  // Select the span next to the green OK swatch, regardless of item ordering
  let rangeEl = null;
  let okItemEl = null;
  try {
    const okRow = document.querySelector('.legend .legend__items .legend__color--ok');
    if (okRow && okRow.parentElement) {
      okItemEl = okRow.parentElement;
      rangeEl = okItemEl.querySelector('span');
    }
  } catch {}
  const tipPen = document.querySelector('.legend__tip--pen');
  const tipCrit = document.querySelector('.legend__tip--crit');

  if (!mode) {
    const pve = { cap: 18200, max: 18999 };
    const pvp = { cap: 33300, max: 37000 };
    if (rangeEl) {
      rangeEl.textContent = 'Optimal';
      if (okItemEl) okItemEl.classList.remove('legend__item--stacked');
    }
    if (tipPen) {
      tipPen.innerHTML = `<strong>Optimal Penetration:</strong> ${pve.cap.toLocaleString()}-${pve.max.toLocaleString()} (PvE) or ${pvp.cap.toLocaleString()}-${pvp.max.toLocaleString()} (PvP)`;
    }
    if (tipCrit) {
      const c = getCritCaps();
      tipCrit.innerHTML = `<strong>Optimal Critical Damage:</strong> ${c.cap}-${c.max}%`;
    }
    return;
  }

  // Otherwise, when a mode is active, still show 'Optimal' for the green legend span
  const pen = getPenCaps();
  if (rangeEl) {
    rangeEl.textContent = 'Optimal';
  }
  if (okItemEl) okItemEl.classList.remove('legend__item--stacked');
  if (tipPen) {
    tipPen.innerHTML = `<strong>Optimal Penetration:</strong> ${pen.cap.toLocaleString()}-${pen.max.toLocaleString()}`;
  }
  if (tipCrit) {
    const c = getCritCaps();
    tipCrit.innerHTML = `<strong>Optimal Critical Damage:</strong> ${c.cap}-${c.max}%`;
  }
}

// Calculate totals and update display
function calculateTotals() {
  const { cap: PEN_CAP, max: PEN_MAX } = getPenCaps();
  const { cap: CRIT_CAP, max: CRIT_MAX } = getCritCaps();

  // Penetration
  let penTotal = 0;
  const penItems = getAllItems('pen');
  penItems.forEach((item, idx) => {
    if (item.enabled) {
      if (item.name === 'Anthelmir') {
        const wd = parseFloat(item.quantity) || 0;
        penTotal += Math.round(wd / 2.5);
      } else if (item.name === 'Balorgh') {
        const ult = parseFloat(item.quantity) || 0;
        penTotal += Math.round(ult * 23);
      } else if (item.isFlat) {
        penTotal += item.value;
      } else {
        penTotal += item.quantity * item.per;
      }
    }
  });

  const penContainer = document.querySelector('.calculator[data-calc="pen"]');
  let penTotalEl = penContainer ? penContainer.querySelector('.calculator__total-value') : null;
  if (penTotalEl) {
    penTotalEl.textContent = penTotal.toLocaleString() + ' / ' + PEN_CAP.toLocaleString();
    penTotalEl.className = 'calculator__total-value';

    let penStatus = penContainer.querySelector('.calculator__cap-status');
    if (penStatus) {
      // reset status classes each update
      penStatus.className = 'calculator__cap-status';
      if (penTotal < PEN_CAP) {
        const missing = PEN_CAP - penTotal;
        penStatus.textContent = `Missing ${missing.toLocaleString()} penetration to reach cap`;
        penTotalEl.classList.add('under-cap', 'is-under-cap');
        penStatus.classList.add('under-cap', 'is-under-cap');
      } else if (penTotal <= PEN_MAX) {
        const over = penTotal - PEN_CAP;
        penStatus.textContent = `Optimal! (${over.toLocaleString()} over base cap)`;
        penTotalEl.classList.add('at-cap', 'is-at-cap');
        penStatus.classList.add('at-cap', 'is-at-cap');
      } else {
        const wasted = penTotal - PEN_MAX;
        penStatus.textContent = `${wasted.toLocaleString()} over optimal cap - consider reallocating stats`;
        penTotalEl.classList.add('over-cap', 'is-over-cap');
        penStatus.classList.add('over-cap', 'is-over-cap');
      }
    }
  }

  // Critical Damage
  let critTotal = 0;
  getAllItems('crit').forEach((item) => {
    if (item.enabled && item.isPercent) {
      if (item.isFlat) {
        critTotal += item.value;
      } else {
        critTotal += item.quantity * item.per;
      }
    }
  });

  const critContainer = document.querySelector('.calculator[data-calc="crit"]');
  let critTotalEl = critContainer ? critContainer.querySelector('.calculator__total-value') : null;
  if (critTotalEl) {
    critTotalEl.textContent = critTotal + '% / ' + CRIT_CAP + '%';
    critTotalEl.className = 'calculator__total-value';

    let critStatus = critContainer.querySelector('.calculator__cap-status');
    if (critStatus) {
      // reset status classes each update
      critStatus.className = 'calculator__cap-status';
      if (critTotal < CRIT_CAP) {
        const missing = CRIT_CAP - critTotal;
        critStatus.textContent = `${missing}% below critical damage cap`;
        critTotalEl.classList.add('under-cap', 'is-under-cap');
        critStatus.classList.add('under-cap', 'is-under-cap');
      } else if (critTotal <= CRIT_MAX) {
        const over = critTotal - CRIT_CAP;
        critStatus.textContent = `Optimal! (${over}% over base cap)`;
        critTotalEl.classList.add('at-cap', 'is-at-cap');
        critStatus.classList.add('at-cap', 'is-at-cap');
      } else {
        const wasted = critTotal - CRIT_MAX;
        critStatus.textContent = `${wasted}% over optimal cap - stats wasted`;
        critTotalEl.classList.add('over-cap', 'is-over-cap');
        critStatus.classList.add('over-cap', 'is-over-cap');
      }
    }
  }

  equalizeSections();
  updateFixedTotalsFromActive();
}

// Fixed totals bar helpers: mirror the active tab's totals into the fixed bar
function getActiveTab() {
  const btn = document.querySelector('.tabs [role="tab"][aria-selected="true"]');
  if (!btn) return 'pen';
  return btn.id.replace('tab-', '');
}

// ===============================
// Bulk button highlight utilities
// ===============================
function highlightBulkButton(type, isCheckAll) {
  const calc = document.querySelector(`.calculator[data-calc="${type}"]`);
  if (!calc) return;
  const controls = calc.querySelector('.calculator__controls');
  if (!controls) return;
  const checkSel = type === 'pen' ? 'toggleAllPen(true)' : 'toggleAllCrit(true)';
  const uncheckSel = type === 'pen' ? 'toggleAllPen(false)' : 'toggleAllCrit(false)';
  const checkBtn = controls.querySelector(`button[onclick="${checkSel}"]`);
  const uncheckBtn = controls.querySelector(`button[onclick="${uncheckSel}"]`);
  // Clear both first
  if (checkBtn) checkBtn.classList.remove('btn--bulk-active');
  if (uncheckBtn) uncheckBtn.classList.remove('btn--bulk-active');
  const target = isCheckAll ? checkBtn : uncheckBtn;
  if (target) target.classList.add('btn--bulk-active');
}

function clearBulkButtons(type) {
  const calc = document.querySelector(`.calculator[data-calc="${type}"]`);
  if (!calc) return;
  const controls = calc.querySelector('.calculator__controls');
  if (!controls) return;
  controls
    .querySelectorAll('.btn--bulk-active')
    .forEach((b) => b.classList.remove('btn--bulk-active'));
}

// Clear highlight when any non-bulk control button is clicked in a calculator
document.addEventListener(
  'click',
  (e) => {
    const btn = e.target.closest && e.target.closest('.calculator__controls .btn');
    if (!btn) return;
    const inline = btn.getAttribute('onclick') || '';
    // Ignore bulk toggles (they set highlight instead)
    if (inline.includes('toggleAllPen') || inline.includes('toggleAllCrit')) return;
    const calcEl = btn.closest('.calculator');
    const type = calcEl && calcEl.getAttribute('data-calc');
    if (type === 'pen' || type === 'crit') clearBulkButtons(type);
  },
  true,
);

function updateFixedTotalsFromActive() {
  const fixed = document.getElementById('fixedTotals');
  const labelEl = document.getElementById('fixedTotalsLabel');
  const valueEl = document.getElementById('fixedTotalsValue');
  const statusEl = document.getElementById('fixedTotalsStatus');
  if (!fixed || !labelEl || !valueEl || !statusEl) return;

  const active = getActiveTab();
  // Hide on armor (placeholder) for now
  if (active === 'armor') {
    fixed.setAttribute('hidden', '');
    return;
  }

  const calc = document.querySelector(`.calculator[data-calc="${active}"]`);
  if (!calc) {
    fixed.setAttribute('hidden', '');
    return;
  }
  const srcVal = calc.querySelector('.calculator__total-value');
  const srcStatus = calc.querySelector('.calculator__cap-status');
  if (!srcVal || !srcStatus) {
    fixed.setAttribute('hidden', '');
    return;
  }

  // Copy text
  labelEl.textContent =
    active === 'pen' ? 'Penetration' : active === 'crit' ? 'Critical Damage' : 'Totals';
  valueEl.textContent = srcVal.textContent.trim();
  statusEl.textContent = srcStatus.textContent.trim();

  // Sync status classes
  const classes = ['under-cap', 'at-cap', 'over-cap'];
  classes.forEach((c) => {
    valueEl.classList.remove(c);
    statusEl.classList.remove(c);
  });
  const appliedClass = classes.find(
    (c) => srcStatus.classList.contains(c) || srcVal.classList.contains(c),
  );
  if (appliedClass) {
    valueEl.classList.add(appliedClass);
    statusEl.classList.add(appliedClass);
  }

  fixed.removeAttribute('hidden');
}

// Section alignment
const _sections = ['group-buffs', 'gear', 'passives', 'cp'];

function equalizeSections() {
  const isDesktop = window.innerWidth >= 968;

  // Always clear first so mobile stacks naturally and measurements are fresh
  _sections.forEach((section) => {
    const left = document.querySelector(
      `.calculator__list[data-calc="pen"][data-section="${section}"]`,
    );
    const right = document.querySelector(
      `.calculator__list[data-calc="crit"][data-section="${section}"]`,
    );
    if (!left || !right) return;
    left.style.minHeight = '';
    right.style.minHeight = '';
  });

  if (!isDesktop) return;

  // Equalize only on desktop
  _sections.forEach((section) => {
    const left = document.querySelector(
      `.calculator__list[data-calc="pen"][data-section=\"${section}\"]`,
    );
    const right = document.querySelector(
      `.calculator__list[data-calc="crit"][data-section=\"${section}\"]`,
    );
    if (!left || !right) return;

    const max = Math.max(left.offsetHeight, right.offsetHeight);
    left.style.minHeight = max + 'px';
    right.style.minHeight = max + 'px';
  });
}

// Re-equalize on resize (debounced)
let _eqTimer;
window.addEventListener('resize', () => {
  clearTimeout(_eqTimer);
  _eqTimer = setTimeout(equalizeSections, 120);
});

// Lite Mode (compact layout)
function _syncLiteButtons(on) {
  const btns = document.querySelectorAll('.btn--lite');
  btns.forEach((b) => b.setAttribute('aria-pressed', on ? 'true' : 'false'));
  try {
    console.debug('[lite] _syncLiteButtons -> count:', btns.length, 'state:', !!on);
  } catch {}
}

function setLite(on) {
  document.body.classList.toggle('lite', !!on);
  try {
    localStorage.setItem('liteMode', on ? '1' : '0');
  } catch {}
  _syncLiteButtons(!!on);
  try {
    console.debug(
      '[lite] setLite -> on:',
      !!on,
      'body.has(lite):',
      document.body.classList.contains('lite'),
    );
  } catch {}
  setTimeout(equalizeSections, 0);
}

function toggleLiteMode() {
  const on = !document.body.classList.contains('lite');
  setLite(on);
  try {
    console.debug('[lite] toggleLiteMode -> toggled to', on ? 'ON' : 'OFF');
  } catch {}
}

function initLiteMode() {
  // Read persisted
  let enabled = false;
  try {
    enabled = localStorage.getItem('liteMode') === '1';
  } catch {}
  if (enabled) document.body.classList.add('lite');
  // Sync any present controls
  _syncLiteButtons(enabled);
  try {
    console.debug(
      '[lite] initLiteMode -> enabled:',
      enabled,
      'body.has(lite):',
      document.body.classList.contains('lite'),
    );
  } catch {}
  // Bind buttons defensively
  const liteBtns = document.querySelectorAll('.btn--lite');
  liteBtns.forEach((btn) => {
    // Avoid double-binding and avoid binding if there is an inline onclick already
    const hasInline = !!(btn.getAttribute && btn.getAttribute('onclick'));
    if (hasInline) {
      try {
        console.debug('[lite] initLiteMode -> skipping JS bind; inline onclick present');
      } catch {}
      return;
    }
    if (!btn._liteBound) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleLiteMode();
      });
      btn._liteBound = true;
    }
  });
  try {
    console.debug('[lite] initLiteMode -> buttons bound:', liteBtns.length);
  } catch {}
  // Back-compat: if a legacy checkbox exists, wire it too
  const checkbox = document.getElementById('lite-toggle');
  if (checkbox) {
    checkbox.checked = enabled;
    checkbox.addEventListener('change', () => setLite(!!checkbox.checked));
  }
}

// ======================
// Mode filter (PvE/PvP)
// ======================
// Configure allow-lists by item name per calculator. Fill these arrays with the exact item names to display per mode.
const MODE_FILTER = {
  pve: {
    pen: [
      // PvE Penetration (exact list and order from user)
      'Major Breach',
      'Minor Breach',
      'Roar of Alkosh',
      "Crimson Oath's Rive",
      'Tremorscale',
      'Legendary Infused Crusher Enchant',
      'Runic Sunder',
      "Velothi Ur-Mage's Amulet",
      'Armor Set Penetration Bonus',
      'Balorgh',
      'Dual Wield: Twin Blade and Blunt (Mace)',
      'Grave Lord Passive: Dismember',
      'Herald of the Tome: Splintered Secrets',
      'Light Armor Passive: Concentration',
      'Champion Point: Piercing',
      'Champion Point: Force of Nature',
    ],
    crit: [
      // PvE Critical Damage (exact list and order from user)
      'Base Character Critical Damage',
      'Minor Force',
      'Major Force',
      'Minor Brittle',
      'Major Brittle',
      'Elemental Catalyst',
      'Lucent Echoes',
      "Sul-Xan's Torment",
      "Mora Scribe's Thesis",
      "Harpooner's Wading Kilt",
      'Herald of the Tome: Fated Fortune',
      'Assassination: Hemorrhage',
      'Aedric Spear: Piercing Spear',
      'Medium Armor: Dexterity',
      'Animal Companions: Advanced Species',
      'Dual Wield: Twin Blade and Blunt (Axe)',
      'Khajiit Passive: Feline Ambush',
      'Fighting Finesse',
      'Backstabber',
    ],
  },
  pvp: {
    pen: [
      // PvP Penetration (exact list and order from user)
      'Major Breach',
      'Minor Breach',
      'Armor Set Penetration Bonus',
      'Dual Wield: Twin Blade and Blunt (Mace)',
      'Shattered Fate',
      "Spriggan's Thorns",
      'Two Handed: Heavy Weapons (Maul)',
      'Crystal Weapon',
      'Sharpened (1H Trait)',
      'Sharpened (2H Trait)',
      'Arena 1-piece Bonus',
      'Anthelmir',
      'Balorgh',
      "Wood Elf Passive: Hunter's Eye",
      'Grave Lord Passive: Dismember',
      'Champion Point: Piercing',
      'Champion Point: Force of Nature',
    ],
    crit: [
      // PvP Critical Damage (exact list and order from user)
      'Base Character Critical Damage',
      'Minor Force',
      'Major Force',
      'Minor Brittle',
      'Herald of the Tome: Fated Fortune',
      'Assassination: Hemorrhage',
      'Aedric Spear: Piercing Spear',
      'Medium Armor: Dexterity',
      'Animal Companions: Advanced Species',
      'Dual Wield: Twin Blade and Blunt (Axe)',
      'Two Handed: Heavy Weapons (Axe)',
      'Khajiit Passive: Feline Ambush',
      'Fighting Finesse',
    ],
  },
};

function _getPersistedMode() {
  try {
    return localStorage.getItem('calcMode') || '';
  } catch {
    return '';
  }
}

function _persistMode(mode) {
  try {
    if (mode) localStorage.setItem('calcMode', mode);
    else localStorage.removeItem('calcMode');
  } catch {}
}

function _syncModeButtons(activeMode) {
  const btns = document.querySelectorAll('.btn--mode');
  btns.forEach((b) => {
    const m = (b.getAttribute('data-mode') || '').toLowerCase();
    b.setAttribute('aria-pressed', m && activeMode === m ? 'true' : 'false');
  });
}

// Apply current mode to both calculators by showing only allowed items. If no list is defined, show all items.
function applyModeFilter() {
  const mode = _getPersistedMode();
  const allowed = MODE_FILTER[mode] || null;
  // Update body classes for visual indicator
  try {
    const b = document.body;
    if (b && b.classList) {
      b.classList.remove('mode-pve', 'mode-pvp');
      if (mode === 'pve') b.classList.add('mode-pve');
      else if (mode === 'pvp') b.classList.add('mode-pvp');
    }
  } catch {}
  // Update legend for current mode
  try {
    updateLegendForMode();
  } catch {}
  // Per calc type
  ['pen', 'crit'].forEach((type) => {
    const container = document.querySelector(`.calculator[data-calc="${type}"]`);
    if (!container) return;
    const items = container.querySelectorAll('.calculator__item');
    // If no mode or empty lists -> show all
    const allowList =
      allowed && Array.isArray(allowed[type]) && allowed[type].length
        ? new Set(allowed[type])
        : null;
    let anyChanged = false;
    const dataItems = getAllItems(type);
    items.forEach((el) => {
      if (!allowList) {
        // No active mode: show all, no auto-toggling
        el.style.display = '';
        return;
      }
      const name = el.getAttribute('data-name') || '';
      const isAllowed = allowList.has(name);
      el.style.display = isAllowed ? '' : 'none';
      // If not allowed and currently enabled (and not locked), deselect it
      if (!isAllowed) {
        const idx = parseInt(el.getAttribute('data-index'));
        if (!isNaN(idx)) {
          const item = dataItems[idx];
          if (item && !item.locked && item.enabled) {
            item.enabled = false;
            updateItemDisplay(type, idx);
            const cb = el.querySelector('.calculator__item-checkbox');
            if (cb) cb.checked = false;
            anyChanged = true;
          }
        }
      }
    });
    if (anyChanged) {
      // Recalculate once per calc if any item changed
      try {
        calculateTotals();
      } catch {}
    }
  });
  _syncModeButtons(mode);
  // Re-equalize heights since visibility changed
  try {
    equalizeSections();
  } catch {}
  // Caps may change even if items do not; ensure totals reflect current mode
  try {
    calculateTotals();
  } catch {}
}

function setMode(mode) {
  // Toggle off if clicking the same active mode
  const current = _getPersistedMode();
  const next = mode && mode === current ? '' : mode || '';
  _persistMode(next);
  applyModeFilter();
}

function initModeFilter() {
  // Bind buttons
  const modeBtns = document.querySelectorAll('.btn--mode');
  modeBtns.forEach((btn) => {
    if (btn._modeBound) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = (btn.getAttribute('data-mode') || '').toLowerCase();
      if (!mode) return;
      setMode(mode);
    });
    btn._modeBound = true;
  });
  // Initial sync and apply if lists exist
  _syncModeButtons(_getPersistedMode());
  applyModeFilter();
  // Expose
  if (typeof window !== 'undefined') {
    window.setMode = setMode;
    window.applyModeFilter = applyModeFilter;
  }
}

// Expose for inline onclick handlers
// Ensures <button onclick="toggleLiteMode()"> works reliably
if (typeof window !== 'undefined') {
  window.toggleLiteMode = toggleLiteMode;
  window.setLite = setLite;
}

// Initialize on load
initLiteMode();
initTabs();
initModeFilter();

// (Removed) Weapon Damage input helper and listeners; Anthelmir now uses quantity directly

// ===========================
// Tooltip: rich HTML hover/tap
// ===========================
const _tooltipEl = document.createElement('div');
_tooltipEl.className = 'tooltip-box';
document.body.appendChild(_tooltipEl);
// Backdrop for mobile/touch to allow outside-tap-to-close and to prevent accidental background interaction
const _tooltipBackdrop = document.createElement('div');
_tooltipBackdrop.className = 'tooltip-backdrop';
_tooltipBackdrop.style.display = 'none';
document.body.appendChild(_tooltipBackdrop);

// Fine-tuning offsets for tooltip placement
const TOOLTIP_GAP_ABOVE = 6; // positive brings tooltip closer/lower when above
const TOOLTIP_GAP_BELOW = 4; // pixels gap when below
const TOOLTIP_OFFSET_UNDER_NAME = 20; // desktop: fixed distance under item name
const TOOLTIP_OFFSET_ABOVE_NAME = 12; // desktop: fixed distance above item name when no space below

let _tooltipPinned = false;
let _tooltipHovering = false;
let _activeItemEl = null;
let _lastAnchorEl = null;
let _lastScrollTs = 0; // timestamp of last scroll; used to ignore resize during scrolling
let _isScrolling = false; // true while user is scrolling; can be used to debounce recenter on mobile
let _hideTimer = null;
let _bridgeRect = null;
let _ancestorScrollUnsubscribers = [];
let _tooltipOpenedAt = 0; // timestamp when tooltip was last shown
let _openedScrollY = 0; // window scrollY when tooltip opened

// Global helper: animated close (must be top-level for global listeners)
function closeTooltipAnimated() {
  if (!_tooltipEl || _tooltipEl.style.display !== 'block') return;
  _tooltipPinned = false;
  _tooltipEl.style.pointerEvents = 'none';
  _tooltipEl.style.opacity = '0';
  setTimeout(() => {
    // Guard in case it was reopened quickly
    if (!_tooltipEl) return;
    _tooltipEl.style.display = 'none';
    _tooltipBackdrop.style.display = 'none';
    document.body.classList.remove('no-scroll');
    _detachAncestorScrollClosers();
  }, 180);
}

function _detachAncestorScrollClosers() {
  _ancestorScrollUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch (_) {}
  });
  _ancestorScrollUnsubscribers = [];
}

function _attachAncestorScrollClosers(fromEl) {
  _detachAncestorScrollClosers();
  if (!fromEl) return;
  // On touch devices, skip ancestor scroll closers to avoid premature closes
  if (_isCoarsePointer) return;
  const handler = () => {
    if (_tooltipEl && _tooltipEl.style.display === 'block') closeTooltipAnimated();
  };
  // Traverse ancestors and attach to scrollable ones
  let el = fromEl;
  const seen = new Set();
  while (el && el !== document && !seen.has(el)) {
    seen.add(el);
    try {
      const cs = window.getComputedStyle(el);
      const canScroll =
        (cs.overflowY === 'auto' ||
          cs.overflowY === 'scroll' ||
          cs.overflow === 'auto' ||
          cs.overflow === 'scroll') &&
        el.scrollHeight > el.clientHeight;
      if (canScroll) {
        el.addEventListener('scroll', handler, { passive: true });
        _ancestorScrollUnsubscribers.push(() => el.removeEventListener('scroll', handler));
      }
    } catch (_) {}
    el = el.parentElement;
  }
  // Also attach to documentElement and window as a fallback
  const de = document.documentElement;
  de.addEventListener('scroll', handler, { passive: true });
  _ancestorScrollUnsubscribers.push(() => de.removeEventListener('scroll', handler));
  window.addEventListener('scroll', handler, { passive: true });
  _ancestorScrollUnsubscribers.push(() => window.removeEventListener('scroll', handler));
}

function _pointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// Allow interacting with links: when mouse enters tooltip, make it clickable and pause follow
_tooltipEl.addEventListener('mouseenter', () => {
  _tooltipHovering = true;
  _tooltipEl.style.pointerEvents = 'auto';
  if (_hideTimer) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
});
_tooltipEl.addEventListener('mouseleave', () => {
  _tooltipHovering = false;
  if (!_tooltipPinned) {
    // hide when leaving if not pinned
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
      _tooltipEl.style.display = 'none';
      _tooltipEl.style.pointerEvents = 'none';
      _hideTimer = null;
      _bridgeRect = null;
    }, 260);
  }
});

// Unified positioning helper
function positionTooltipBelowItem(itemEl, anchorEl) {
  const padding = 8;
  const maxW = 360;
  _tooltipEl.style.maxWidth = maxW + 'px';
  const ir = itemEl.getBoundingClientRect();
  const nr = (anchorEl || itemEl).getBoundingClientRect();
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;

  // Initial measure
  _tooltipEl.style.left = nr.left + scrollLeft + 'px';
  _tooltipEl.style.top = ir.top + scrollTop + 'px';
  let tr = _tooltipEl.getBoundingClientRect();

  // On coarse pointers (mobile/tablet), align under the item's name with fixed offset and internal scroll
  if (_isCoarsePointer) {
    _tooltipEl.classList.remove('is-centered');
    _tooltipEl.style.bottom = '';
    const nameEl = itemEl.querySelector('.calculator__item-name') || anchorEl || itemEl;
    const ar = nameEl.getBoundingClientRect();
    const desiredTop = ar.bottom + TOOLTIP_OFFSET_UNDER_NAME + scrollTop;
    const availableBelow = Math.max(120, scrollTop + vh - desiredTop - padding);
    _tooltipEl.style.maxHeight = availableBelow + 'px';
    _tooltipEl.style.overflowY = 'auto';
    _tooltipEl.style.webkitOverflowScrolling = 'touch';
    tr = _tooltipEl.getBoundingClientRect();
    let left = ar.left + (ar.width - tr.width) / 2 + scrollLeft;
    let top = desiredTop;
    if (left < scrollLeft + padding) left = scrollLeft + padding;
    if (left + tr.width + padding > scrollLeft + vw)
      left = Math.max(scrollLeft + padding, scrollLeft + vw - tr.width - padding);
    if (top < scrollTop + padding) top = scrollTop + padding;
    _tooltipEl.style.left = left + 'px';
    _tooltipEl.style.top = top + 'px';
    return;
  }

  // Desktop: choose above or below the item name based on available space
  const nameEl = itemEl.querySelector('.calculator__item-name') || anchorEl || itemEl;
  const ar = nameEl.getBoundingClientRect();
  // Desired top is fixed under the name
  const desiredTop = ar.bottom + TOOLTIP_OFFSET_UNDER_NAME + scrollTop;
  // Measure current tooltip to decide side and centering
  tr = _tooltipEl.getBoundingClientRect();
  const tooltipH = tr.height;
  const nameTop = ar.top + scrollTop;
  const nameBottom = ar.bottom + scrollTop;
  const spaceBelow = scrollTop + vh - (nameBottom + TOOLTIP_OFFSET_UNDER_NAME) - padding;
  const spaceAbove = nameTop - TOOLTIP_OFFSET_ABOVE_NAME - scrollTop - padding;

  // Prefer the side that can show more of the tooltip, allowing internal scroll as needed
  let placeAbove = false;
  if (spaceAbove > spaceBelow) {
    // If there's significantly more space above, or below cannot fit even half of the tooltip, place above
    placeAbove = true;
  }

  let top;
  if (placeAbove) {
    // Place above the name; keep a gap via TOOLTIP_OFFSET_ABOVE_NAME
    // Cap maxHeight by available space above
    const maxH = Math.max(120, spaceAbove);
    _tooltipEl.style.maxHeight = maxH + 'px';
    _tooltipEl.style.overflowY = 'auto';
    _tooltipEl.style.webkitOverflowScrolling = 'touch';
    tr = _tooltipEl.getBoundingClientRect();
    // Position so the bottom of the tooltip sits just above the name area
    top = Math.max(scrollTop + padding, nameTop - TOOLTIP_OFFSET_ABOVE_NAME - tr.height);
  } else {
    // Place below the name, biased toward viewport center to reduce downward scrolling
    const centeredTopEstimate = scrollTop + Math.max(padding, (vh - tooltipH) / 2);
    const topCandidate = Math.max(desiredTop, centeredTopEstimate);
    const availableBelow = Math.max(120, scrollTop + vh - topCandidate - padding);
    _tooltipEl.style.maxHeight = availableBelow + 'px';
    _tooltipEl.style.overflowY = 'auto';
    _tooltipEl.style.webkitOverflowScrolling = 'touch';
    tr = _tooltipEl.getBoundingClientRect();
    top = Math.max(scrollTop + padding, topCandidate);
  }

  // Finalize horizontal centering and apply
  let left = ar.left + (ar.width - tr.width) / 2 + scrollLeft;
  if (left < scrollLeft + padding) left = scrollLeft + padding;
  if (left + tr.width + padding > scrollLeft + vw)
    left = Math.max(scrollLeft + padding, scrollLeft + vw - tr.width - padding);
  _tooltipEl.style.left = left + 'px';
  _tooltipEl.style.top = top + 'px';
}

// Show tooltip only when hovering the question mark indicator
document.addEventListener('mouseover', (e) => {
  if (_isCoarsePointer) return; // disable hover behavior on touch devices
  if (_tooltipPinned) return;
  const indicator = e.target.closest('.item-tooltip-indicator');
  if (!indicator) return;
  const item = indicator.closest('.calculator__item');
  if (!item) return;
  if (_activeItemEl === item) return;
  if (_hideTimer) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  _activeItemEl = item;
  _lastAnchorEl = indicator;
  if (item.dataset.tooltip) {
    _tooltipEl.innerHTML = item.dataset.tooltip;
    _tooltipEl.style.display = 'block';
    _tooltipEl.style.opacity = '0';
    _tooltipEl.style.pointerEvents = 'none';
    _tooltipEl.classList.remove('is-centered');
    // Position centered below full item for consistent theme
    _tooltipEl.style.bottom = '';
    positionTooltipBelowItem(item);
    _attachAncestorScrollClosers(indicator);
    _tooltipOpenedAt = Date.now();
    _openedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    // fade in
    requestAnimationFrame(() => {
      _tooltipEl.style.opacity = '1';
    });
  }
});

document.addEventListener('mouseout', (e) => {
  if (_isCoarsePointer) return; // disable hover-out behavior on touch devices
  if (_tooltipPinned) return;
  const toEl = e.relatedTarget;
  // If moving into tooltip itself, keep shown
  if (toEl && _tooltipEl.contains(toEl)) return;
  const fromIndicator = e.target.closest('.item-tooltip-indicator');
  if (!fromIndicator) return;
  // If moving within the same indicator, ignore
  if (fromIndicator.contains(toEl)) return;
  // Leaving the indicator and not entering tooltip -> hide with a short delay
  _activeItemEl = null;
  if (_hideTimer) clearTimeout(_hideTimer);
  // Bridge between indicator and tooltip
  const ir = fromIndicator.getBoundingClientRect();
  const tr = _tooltipEl.getBoundingClientRect();
  const left = Math.min(ir.left, tr.left) - 8;
  const right = Math.max(ir.right, tr.right) + 8;
  const top = Math.min(ir.bottom, tr.top) - 8;
  const bottom = Math.max(ir.bottom, tr.top) + 8;
  _bridgeRect = { left, right, top, bottom };

  _hideTimer = setTimeout(() => {
    if (!_tooltipPinned && !_tooltipHovering) {
      closeTooltipAnimated();
    }
    _hideTimer = null;
    _bridgeRect = null;
  }, 200);
});

// If we are moving through the bridge rect, cancel pending hide
document.addEventListener('mousemove', (e) => {
  if (!_hideTimer) return;
  // Only cancel hide if the pointer actually entered the tooltip box
  const tr = _tooltipEl.getBoundingClientRect();
  if (
    e.clientX >= tr.left &&
    e.clientX <= tr.right &&
    e.clientY >= tr.top &&
    e.clientY <= tr.bottom
  ) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
    _tooltipEl.style.display = 'block';
    _tooltipEl.style.pointerEvents = 'auto';
  }
});

// Mobile/tablet: treat tap on the indicator as hover (show tooltip without pinning)
function handlePinTooltip(ev) {
  const target = ev.target;
  const indicator = target && target.closest && target.closest('.item-tooltip-indicator');
  if (!indicator) return;
  const item = indicator.closest('.calculator__item');
  if (!item) return;
  ev.preventDefault();
  if (_hideTimer) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  _activeItemEl = item;
  _lastAnchorEl = indicator;
  if (item.dataset.tooltip) {
    _tooltipEl.innerHTML = item.dataset.tooltip;
    _tooltipEl.style.display = 'block';
    _tooltipEl.style.opacity = '0';
    _tooltipEl.style.pointerEvents = 'auto'; // allow tapping links
    _tooltipEl.classList.remove('is-centered');
    _tooltipEl.style.bottom = '';
    positionTooltipBelowItem(item);
    _attachAncestorScrollClosers(indicator);
    _tooltipOpenedAt = Date.now();
    _openedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    requestAnimationFrame(() => {
      _tooltipEl.style.opacity = '1';
    });
  }
}

// Only enable tap-to-pin on touch/coarse pointer devices (mobile/tablet)
const _isCoarsePointer =
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
if (_isCoarsePointer) {
  document.addEventListener('pointerdown', handlePinTooltip, { passive: false });
}

// Click outside to unpin
document.addEventListener('click', (e) => {
  if (!_tooltipPinned) return;
  if (!e.target.closest('.calculator__item') && !e.target.closest('.tooltip-box')) {
    _tooltipPinned = false;
    _tooltipEl.style.display = 'none';
    _tooltipEl.style.pointerEvents = 'none';
    _tooltipBackdrop.style.display = 'none';
    document.body.classList.remove('no-scroll');
  }
});

// Helper: re-center tooltip when pinned on coarse pointers (mobile/tablet)
function recenterPinnedTooltip() {
  if (!_tooltipPinned || _tooltipEl.style.display !== 'block' || !_activeItemEl) return;
  positionTooltipToItem(
    _activeItemEl,
    _lastAnchorEl || _activeItemEl.querySelector('.item-tooltip-indicator'),
  );
}

// Recenter on resize/orientation change (debounced)
let _tooltipCenterTimer;
function _scheduleTooltipRecenter() {
  if (!_isCoarsePointer) return;
  // If a resize is happening as part of a scroll (mobile address bar show/hide),
  // keep the tooltip frozen where it initially appeared.
  const now = Date.now();
  if (now - _lastScrollTs < 350) return;
  clearTimeout(_tooltipCenterTimer);
  _tooltipCenterTimer = setTimeout(recenterPinnedTooltip, 120);
}
// Track scrolls to prevent resize-driven re-centering during scroll
let _scrollEndTimer;
window.addEventListener(
  'scroll',
  () => {
    _lastScrollTs = Date.now();
    _isScrolling = true;
    clearTimeout(_scrollEndTimer);
    // Consider scrolling stopped after 250ms of no scroll events
    _scrollEndTimer = setTimeout(() => {
      _isScrolling = false;
    }, 250);
  },
  { passive: true },
);
window.addEventListener('resize', _scheduleTooltipRecenter);
window.addEventListener('orientationchange', () => setTimeout(recenterPinnedTooltip, 200));

// Allow interacting with links: when mouse enters tooltip, make it clickable and pause follow
const _maybeCloseOnScroll = () => {
  if (!_tooltipEl || _tooltipEl.style.display !== 'block') return;
  const now = Date.now();
  // Desktop/mouse: close unless hovering
  if (!_isCoarsePointer) {
    if (!_tooltipHovering) closeTooltipAnimated();
    return;
  }
  // Mobile/tablet: short grace and small scroll delta before closing
  if (now - _tooltipOpenedAt < 250) return;
  const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
  const delta = Math.abs(currentY - _openedScrollY);
  if (delta > 6 && !_tooltipHovering) closeTooltipAnimated();
};
// Window scroll (page/body)
window.addEventListener('scroll', _maybeCloseOnScroll, { passive: true });
// Document-level scroll capture to catch scrolling elements that don't bubble
document.addEventListener('scroll', _maybeCloseOnScroll, { passive: true, capture: true });
// Body scroll (some browsers dispatch here)
document.body.addEventListener('scroll', _maybeCloseOnScroll, { passive: true, capture: true });
// Gestures that usually mean scrolling
window.addEventListener('wheel', _maybeCloseOnScroll, { passive: true });
window.addEventListener('touchmove', _maybeCloseOnScroll, { passive: true });
document.addEventListener('wheel', _maybeCloseOnScroll, { passive: true, capture: true });
document.addEventListener('touchmove', _maybeCloseOnScroll, { passive: true, capture: true });
// Do not close on gesture start; avoid immediate close on tap

// On mobile browsers, address-bar show/hide changes visual viewport; close on those too
if (window.visualViewport && !_isCoarsePointer) {
  window.visualViewport.addEventListener('resize', _maybeCloseOnScroll, { passive: true });
  window.visualViewport.addEventListener('scroll', _maybeCloseOnScroll, { passive: true });
}

// Do not auto-close when scrolling inside the tooltip; allow reading/clicking

// Also listen for scroll on common scroll containers (if present)
function _attachContainerScrollClose() {
  const containers = [
    document.querySelector('.calculators-wrapper'),
    document.querySelector('.container'),
    document.body,
  ].filter(Boolean);
  containers.forEach((el) => {
    el.addEventListener('scroll', _maybeCloseOnScroll, { passive: true, capture: true });
  });
}
_attachContainerScrollClose();

// Keyboard scrolling (arrows, page up/down, home/end, space)
window.addEventListener(
  'keydown',
  (e) => {
    const keys = [
      'ArrowDown',
      'ArrowUp',
      'ArrowLeft',
      'ArrowRight',
      'PageDown',
      'PageUp',
      'Home',
      'End',
      'Space',
      ' ',
    ];
    if (keys.includes(e.key)) _maybeCloseOnScroll();
  },
  { capture: true },
);

// Backdrop click closes tooltip (primarily for mobile)
_tooltipBackdrop.addEventListener('click', () => {
  if (!_tooltipPinned) return;
  closeTooltipAnimated();
});

// Global outside click closes tooltip when pinned (without needing a backdrop)
document.addEventListener(
  'click',
  (e) => {
    if (!_tooltipPinned) return;
    const target = e.target;
    // If clicking inside tooltip, ignore
    if (_tooltipEl.contains(target)) return;
    // If clicking an indicator of the active item, ignore (handled by pin toggle)
    if (_activeItemEl && target.closest && target.closest('.item-tooltip-indicator')) return;
    // Otherwise, close
    closeTooltipAnimated();
  },
  true,
);

// Click anywhere on an item row to toggle its checkbox (except on inner controls)
document.addEventListener('click', (e) => {
  const itemEl = e.target.closest && e.target.closest('.calculator__item');
  if (!itemEl) return;
  // Ignore clicks coming from interactive controls inside the item
  if (
    e.target.closest('input') ||
    e.target.closest('button') ||
    e.target.closest('a') ||
    e.target.closest('.item-tooltip-indicator')
  ) {
    return;
  }
  const type = itemEl.getAttribute('data-type');
  const index = parseInt(itemEl.getAttribute('data-index'));
  if (type == null || isNaN(index)) return;
  const items = getAllItems(type);
  const item = items && items[index];
  if (!item) return;
  // Respect locked items (toggleItem already enforces this, but guard anyway)
  if (item.locked) return;
  // Toggle state via the existing logic
  const cb = itemEl.querySelector('.calculator__item-checkbox');
  // Flip based on current state
  toggleItem(type, index);
  if (cb) cb.checked = !!items[index].enabled;
});
