const fs = require('fs');
const path = require('path');

// IDs we found in abilities.json
const skillIds = {
  "The Tide King\\'s Gaze": 189837,
  "Cephaliarch\\'s Flail": 183006,
  "Tome-Bearer\\'s Inspiration": 186452,
  "Winter\\'s Revenge": 86169,
};

const files = [
  'src/features/loadout-manager/data/classes/arcanist/heraldOfTheTome.ts',
  'src/features/loadout-manager/data/classes/arcanist/soldierOfApocrypha.ts',
  'src/features/loadout-manager/data/classes/warden/wintersEmbrace.ts',
];

let totalUpdates = 0;

files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updates = 0;

  Object.entries(skillIds).forEach(([skillName, skillId]) => {
    // Update pattern: { id: 0, name: 'SkillName'
    const pattern = new RegExp(
      `(\\{\\s*id:\\s*)0(\\s*,\\s*name:\\s*['"])${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`,
      'g'
    );

    const newContent = content.replace(pattern, `$1${skillId}$2${skillName}$3`);

    if (newContent !== content) {
      const matches = (content.match(pattern) || []).length;
      updates += matches;
      content = newContent;
    }
  });

  if (updates > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.basename(filePath)}: ${updates} skill(s) updated`);
    totalUpdates += updates;
  }
});

console.log(`\n✓ Total: ${totalUpdates} skill IDs updated`);
console.log('\nUpdated skills:');
Object.entries(skillIds).forEach(([name, id]) => {
  console.log(`  ${name}: ${id}`);
});
