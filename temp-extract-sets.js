const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data-downloads/LCkmaT3A1FW7ZgMJ/fight-7/events/combatant-info-events.json', 'utf8'));

const setNames = {};

data.reportData.report.events.data.forEach(event => {
  if (event.gear) {
    event.gear.forEach(item => {
      if (item.setID && item.name) {
        // Extract set name by removing armor types and item types
        const setName = item.name
          .replace(/^(Perfected|Heavy|Light|Medium)\s+/g, '')
          .replace(/\s+(Greatsword|Dagger|Staff|Bow|Shield|Ring|Necklace|Sword|Mace|Axe|Helmet|Cuirass|Pauldrons|Gauntlets|Girdle|Greaves|Sabatons|Hat|Robe|Epaulets|Gloves|Jerkin|Guards|Shoes|Breeches|Boots|Mask|Sash|Belt|Destruction|Restoration|Inferno|Ice|Lightning)$/g, '')
          .trim();
        
        if (!setNames[item.setID]) {
          setNames[item.setID] = setName;
        }
      }
    });
  }
});

const sorted = Object.entries(setNames).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

console.log('Set IDs with Names from Fight 7:');
console.log('=====================================');
sorted.forEach(([id, name]) => {
  console.log(`${id.padStart(4)}: ${name}`);
});

console.log('\n');
console.log('Checking for specific sets:');
console.log('- Armor of the Trainee (281):', setNames[281] ? `FOUND: ${setNames[281]}` : 'NOT FOUND');
console.log('- Druid\'s Braid:', Object.entries(setNames).find(([id, name]) => name.includes('Druid')) ? 'FOUND' : 'NOT FOUND');
