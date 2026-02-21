import https from 'node:https';

const url = 'https://raw.githubusercontent.com/uesp/uesp-esolog/master/archive/esoRecipeData42.php';

const fetchData = () => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed. Status code: ${res.statusCode}`));
        res.resume();
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      reject(err);
    });
  });
};

const ENTRY_REGEX = /(\d+)\s*=>\s*array\(\s*([-\d]+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*([-\d]+)\s*\)/g;

try {
  const raw = await fetchData();
  const categories = new Set();
  const samplePerCategory = new Map();
  let match;
  while ((match = ENTRY_REGEX.exec(raw)) !== null) {
    const category = match[3];
    const name = match[4];
    categories.add(category);
    if (!samplePerCategory.has(category)) {
      samplePerCategory.set(category, name);
    }
  }

  console.log(`Found ${categories.size} unique categories`);
  const sorted = Array.from(categories).sort((a, b) => a.localeCompare(b));
  for (const category of sorted) {
    const sample = samplePerCategory.get(category);
    console.log(`${category} => ${sample}`);
  }
} catch (error) {
  console.error('Failed to fetch or parse data:', error);
  process.exit(1);
}
