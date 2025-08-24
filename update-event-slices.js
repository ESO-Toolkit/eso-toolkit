const fs = require('fs');
const path = require('path');

// List of event slice files to update (excluding already updated ones)
const filesToUpdate = [
  'healingEventsSlice.ts',
  'buffEventsSlice.ts',
  'deathEventsSlice.ts',
  'debuffEventsSlice.ts',
  'castEventsSlice.ts',
  'resourceEventsSlice.ts',
  'playerEnterCombatEventsSlice.ts',
];

// Mapping for state access paths
const statePathMap = {
  'healingEventsSlice.ts': 'healing',
  'buffEventsSlice.ts': 'buffs',
  'deathEventsSlice.ts': 'deaths',
  'debuffEventsSlice.ts': 'debuffs',
  'castEventsSlice.ts': 'casts',
  'resourceEventsSlice.ts': 'resources',
  'playerEnterCombatEventsSlice.ts': 'playerEnterCombat',
};

// Mapping for old state names
const oldStateNames = {
  'healingEventsSlice.ts': 'healingEvents',
  'buffEventsSlice.ts': 'buffEvents',
  'deathEventsSlice.ts': 'deathEvents',
  'debuffEventsSlice.ts': 'debuffEvents',
  'castEventsSlice.ts': 'castEvents',
  'resourceEventsSlice.ts': 'resourceEvents',
  'playerEnterCombatEventsSlice.ts': 'playerEnterCombatEvents',
};

const basePath = 'src/store/events_data';

function updateFile(filename) {
  const filePath = path.join(basePath, filename);
  console.log(`Updating ${filename}...`);

  let content = fs.readFileSync(filePath, 'utf8');
  const statePath = statePathMap[filename];
  const oldStateName = oldStateNames[filename];

  // 1. Add RootState import
  content = content.replace(
    /import { createSlice, createAsyncThunk } from '@reduxjs\/toolkit';\n\nimport { createEsoLogsClient } from '\.\.\/\.\.\/esologsClient';/,
    `import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { createEsoLogsClient } from '../../esologsClient';`
  );

  // Add RootState import after other imports
  const lastImportMatch = content.match(/import.*from.*;\n(?!import)/);
  if (lastImportMatch) {
    const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
    content =
      content.slice(0, insertIndex) +
      `import { RootState } from '../storeWithHistory';\n` +
      content.slice(insertIndex);
  }

  // 2. Update cache metadata interface
  content = content.replace(
    /cacheMetadata: {\s*lastFetchedFightId: number \| null;\s*lastFetchedTimestamp: number \| null;\s*eventCount: number;\s*};/,
    `cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };`
  );

  // 3. Update initial state
  content = content.replace(
    /cacheMetadata: {\s*lastFetchedFightId: null,\s*lastFetchedTimestamp: null,\s*eventCount: 0,\s*}/,
    `cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  }`
  );

  // 4. Update thunk state type
  content = content.replace(
    new RegExp(`{ state: { ${oldStateName}: \\w+EventsState }; rejectValue: string }`),
    `{ state: RootState; rejectValue: string }`
  );

  // 5. Update state access in thunk function
  content = content.replace(
    new RegExp(`getState\\(\\)\\.${oldStateName}\\.loading`),
    `getState().events.${statePath}.loading`
  );

  // 6. Update condition function state access
  content = content.replace(
    new RegExp(`const state = getState\\(\\)\\.${oldStateName};`),
    `const state = getState().events.${statePath};`
  );

  // 7. Update condition function cache logic
  content = content.replace(
    /const isCached = state\.cacheMetadata\.lastFetchedFightId === requestedFightId;/,
    `const isCached = 
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;`
  );

  // Add requestedReportId variable
  content = content.replace(
    /const requestedFightId = Number\(fight\.id\);/,
    `const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);`
  );

  // 8. Update fulfilled action cache metadata
  content = content.replace(
    /state\.cacheMetadata\.eventCount = action\.payload\.length;\s*state\.cacheMetadata\.lastFetchedTimestamp = Date\.now\(\);\s*\/\/ Update lastFetchedFightId from the action meta\s*if \(action\.meta\.arg\.fight\.id\) {\s*state\.cacheMetadata\.lastFetchedFightId = Number\(action\.meta\.arg\.fight\.id\);\s*}/,
    `state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
        };`
  );

  // 9. Update clear action cache metadata
  content = content.replace(
    /state\.cacheMetadata = {\s*lastFetchedFightId: null,\s*lastFetchedTimestamp: null,\s*eventCount: 0,\s*};/,
    `state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      };`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated ${filename}`);
}

// Update all files
filesToUpdate.forEach(updateFile);

console.log('All event slices updated successfully!');
