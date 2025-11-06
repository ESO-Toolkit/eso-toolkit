# ESO Logs Set Discovery Tool

This script discovers missing set IDs from ESO Logs leaderboard data by analyzing top trial reports.

## Features

- 🔍 Searches leaderboard reports from all major trials
- 📊 Extracts all unique set IDs from combatant gear data
- 🆕 Identifies sets not currently in the codebase
- 📈 Shows usage frequency and sample item names
- 💾 Exports detailed results to JSON

## Prerequisites

1. **ESO Logs API Key**: You need an API key from https://www.esologs.com/api/clients
2. **Set Environment Variable**:
   ```powershell
   # PowerShell
   $env:ESOLOGS_API_KEY="your-api-key-here"
   
   # Or for persistent storage
   [System.Environment]::SetEnvironmentVariable('ESOLOGS_API_KEY', 'your-api-key-here', 'User')
   ```

## Usage

```bash
npm run discover-missing-sets
```

## What It Does

1. **Fetches Top Reports**: Downloads the top 10 leaderboard reports for each trial:
   - Sunspire
   - Cloudrest  
   - Halls of Fabrication
   - Asylum Sanctorium
   - Aetherian Archive
   - Hel Ra Citadel
   - Sanctum Ophidia
   - Maw of Lorkhaj
   - Rockgrove
   - Kyne's Aegis
   - Dreadsail Reef
   - Sanity's Edge
   - Lucent Citadel

2. **Processes Gear Data**: For each report (up to 3 per trial to avoid rate limiting):
   - Downloads combatant info events
   - Extracts all gear items with set IDs
   - Tracks item names and occurrence frequency

3. **Identifies Missing Sets**: Compares discovered set IDs against known sets in `abilities.ts`

4. **Generates Report**: Shows:
   - Total sets discovered vs known
   - List of missing sets with sample item names
   - Top 20 most common sets
   - Which reports contain each set

## Output

### Console Output

```
🔍 ESO Logs Set Discovery Tool
================================

✅ Connected to ESO Logs API

📊 Processing Sunspire (Zone 12)...
  Found 10 reports
  📥 Downloading: ABC123 - Sunspire Speed Run
    ✅ Processed 12 combatant events, 144 gear items

...

📊 DISCOVERY RESULTS
====================

Total unique set IDs discovered: 45
Known set IDs in codebase: 38

🆕 Found 7 MISSING set IDs:

Set ID 812:
  Occurrences: 24
  Reports: XYZ789, ABC123, DEF456
  Sample items:
    - New Set Amulet
    - New Set Ring
    - New Set Sword
```

### JSON Output

Results are saved to `data/missing-sets.json`:

```json
{
  "timestamp": "2025-11-06T12:00:00.000Z",
  "totalDiscovered": 45,
  "totalKnown": 38,
  "totalMissing": 7,
  "missingSets": [
    {
      "setId": 812,
      "count": 24,
      "itemNames": ["New Set Amulet", "New Set Ring", "New Set Sword"],
      "reportCodes": ["XYZ789", "ABC123", "DEF456"]
    }
  ]
}
```

## Rate Limiting

- Processes only 3 reports per trial (39 total reports)
- Adds 1-second delay between reports
- Total runtime: ~2-3 minutes

## Adding New Sets

Once missing sets are identified:

1. Add enum entries to `src/types/abilities.ts`:
   ```typescript
   NEW_SET_NAME = 812, // New Set Name
   ```

2. Add display name mapping to `src/utils/setNameUtils.ts`:
   ```typescript
   [KnownSetIDs.NEW_SET_NAME]: 'New Set Name',
   ```

3. Add to appropriate category in `src/types/roster.ts`:
   ```typescript
   export const TANK_5PIECE_SETS: readonly KnownSetIDs[] = [
     // ...
     KnownSetIDs.NEW_SET_NAME,
   ];
   ```

## Troubleshooting

**Error: ESOLOGS_API_KEY environment variable not set**
- Make sure you've set the environment variable before running
- Verify with: `$env:ESOLOGS_API_KEY`

**Error: No reports found**
- Some trials may have limited leaderboard data
- Try a different trial or check ESO Logs website

**Rate limit errors**
- Script already includes delays
- If you hit limits, increase the delay or reduce reports per trial

## Notes

- Only processes first 3 reports per trial to balance coverage with rate limits
- Focuses on recent, high-quality leaderboard runs
- Set IDs are stable across game updates but new sets are added with expansions
