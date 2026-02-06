import fs from 'fs';
import path from 'path';

interface LanguageMap {
  [language: string]: string;
}

interface OutputPayload {
  metadata: {
    generatedAt: string;
    source: string;
    totalSets: number;
    languages: string[];
  };
  sets: Record<string, LanguageMap>;
}

const libSetsNamesPath = path.join(
  __dirname,
  '..',
  'tmp',
  'libsets-data',
  'LibSets_Data_SetNames.lua'
);
const outputPath = path.join(__dirname, '..', 'data', 'libsets-set-names.json');

if (!fs.existsSync(libSetsNamesPath)) {
  console.error('❌ Missing LibSets set names data. Download LibSets_Data_SetNames.lua first.');
  process.exit(1);
}

function decodeLuaString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"');
}

function parseSetNames(content: string): Record<string, LanguageMap> {
  const result: Record<string, LanguageMap> = {};
  const entryRegex = /\[(\d+)\]\s*=\s*\{([^}]*)\}/g;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryRegex.exec(content)) !== null) {
    const setId = entryMatch[1];
    const block = entryMatch[2];
    const langRegex = /\["([A-Za-z-]+)"\]\s*=\s*"((?:\\"|\\\\|[^"])*)"/g;
    const languages: LanguageMap = {};
    let langMatch: RegExpExecArray | null;

    while ((langMatch = langRegex.exec(block)) !== null) {
      const language = langMatch[1];
      const value = decodeLuaString(langMatch[2]);
      languages[language] = value;
    }

    if (Object.keys(languages).length > 0) {
      result[setId] = languages;
    }
  }

  return result;
}

function main() {
  console.log('🔍 Parsing LibSets set names...');
  const fileContent = fs.readFileSync(libSetsNamesPath, 'utf-8');
  const sets = parseSetNames(fileContent);
  const languages = Array.from(
    new Set(Object.values(sets).flatMap((entry) => Object.keys(entry)))
  ).sort();

  const payload: OutputPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: path.relative(process.cwd(), libSetsNamesPath),
      totalSets: Object.keys(sets).length,
      languages,
    },
    sets,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  console.log(`✅ Wrote ${payload.metadata.totalSets} set names to ${path.relative(process.cwd(), outputPath)}`);
}

main();
