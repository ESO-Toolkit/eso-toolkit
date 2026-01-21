# AI Agent - Report Data Debugging Guide

## Overview

This guide enables AI agents to debug production issues in ESO Logs reports by analyzing downloaded report data. The data download process captures comprehensive event data, metadata, and combat logs from live reports for local analysis.

## Quick Start

### 1. Download Report Data

```powershell
# Download entire report (all fights)
npm run script -- scripts/download-report-data.ts <report-code>

# Download specific fight only
npm run script -- scripts/download-report-data.ts <report-code> <fight-id>

# Example: Download full report
npm run script -- scripts/download-report-data.ts 3gjVGWB2dxCL8XAw

# Example: Download fight 32 only
npm run script -- scripts/download-report-data.ts 3gjVGWB2dxCL8XAw 32
```

**Location**: Data is saved to `data-downloads/<report-code>/`

### 2. Verify Download

Check the `index.json` file for a complete inventory of downloaded files:

```powershell
# View the navigation guide
cat data-downloads/<report-code>/index.json
```

## Data Structure

### Report-Level Files

Located in `data-downloads/<report-code>/`:

| File | Purpose | Key Use Cases |
|------|---------|---------------|
| `index.json` | Navigation guide and file inventory | Quick reference for what was downloaded |
| `report-summary.json` | Human-readable report overview | Understand report context: fights, duration, zone |
| `report-metadata.json` | Full GraphQL report data | Complete report details including all fights |
| `master-data.json` | All actors and abilities | Cross-reference ability IDs and actor names |
| `actors-by-type.json` | Actors organized by type | Find players, NPCs, pets quickly |
| `abilities-by-type.json` | Abilities organized by type | Search abilities by type (buff, damage, etc.) |
| `player-data.json` | Player rankings and details | Player performance metrics |
| `player-details.json` | Detailed player information | Player specs, gear, roles |

### Fight-Level Files

Located in `data-downloads/<report-code>/fight-<id>/`:

| File | Purpose | Key Use Cases |
|------|---------|---------------|
| `fight-info.json` | Fight metadata and summary | Fight duration, participants, boss info |
| `encounter-info.json` | Encounter-specific details | Boss mechanics, fight phases |

### Event Files

Located in `data-downloads/<report-code>/fight-<id>/events/`:

#### Combined Event Files

| File | Event Type | Description |
|------|-----------|-------------|
| `all-events.json` | All types | Chronologically ordered events (all types combined) |
| `damage-events.json` | Damage | All damage events |
| `healing-events.json` | Healing | All healing events |
| `cast-events.json` | Casts | All cast/ability usage events |
| `resource-events.json` | Resources | Resource changes (Magicka, Stamina, Ultimate) |
| `death-events.json` | Deaths | Death events |
| `combatant-info-events.json` | Combatant Info | Gear, stats, specs at combat start |

#### Buff/Debuff Event Files

**IMPORTANT**: Buffs and debuffs are split by source target type!

| File | Description |
|------|-------------|
| `buff-events.json` | All buff events (friendly + hostile sources) |
| `buff-events-friendlies.json` | Buffs from friendly sources only |
| `buff-events-enemies.json` | Buffs from hostile sources only |
| `debuff-events.json` | All debuff events (friendly + hostile sources) |
| `debuff-events-friendlies.json` | Debuffs from friendly sources only |
| `debuff-events-enemies.json` | Debuffs from hostile sources only |

**Why separate files?**
- Penetration analysis: Need friendly debuffs on enemies
- Scribing detection: Many signature scripts appear in buff/debuff events
- Uptime analysis: Distinguish team buffs from enemy buffs

#### Metadata Files

Each event type has corresponding metadata files:
- `{type}-metadata.json`: Combined download info, pagination details
- `{type}-friendlies-metadata.json`: Friendly-specific metadata (buffs/debuffs only)
- `{type}-enemies-metadata.json`: Hostile-specific metadata (buffs/debuffs only)

**Metadata includes**:
- Total events downloaded
- Number of pages fetched
- Query filters used
- Pagination state
- Download timestamp

## Common Debugging Scenarios

### Scenario 1: Missing Damage/Healing

**Issue**: Player's damage or healing appears incorrect or missing.

**Investigation Steps**:

1. **Check fight info**:
   ```typescript
   const fightInfo = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/fight-info.json'));
   // Verify player is in friendlyPlayers list
   // Check fight duration and timing
   ```

2. **Review damage/healing events**:
   ```typescript
   const damageEvents = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/damage-events.json'));
   // Filter by sourceID to find player's damage
   // Check timestamps are within fight boundaries
   // Verify ability IDs are recognized
   ```

3. **Cross-reference abilities**:
   ```typescript
   const abilities = JSON.parse(fs.readFileSync('data-downloads/<code>/abilities-by-type.json'));
   // Look up ability names by ID
   // Verify ability types
   ```

### Scenario 2: Buff/Debuff Uptime Issues

**Issue**: Buff or debuff uptime calculations appear incorrect.

**Investigation Steps**:

1. **Identify event source type**:
   ```typescript
   // For friendly buffs (e.g., Major Courage):
   const friendlyBuffs = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/buff-events-friendlies.json'));
   
   // For enemy debuffs (e.g., Major Breach from player):
   const friendlyDebuffs = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/debuff-events-friendlies.json'));
   ```

2. **Check event structure**:
   ```typescript
   // Verify apply/remove/refresh stacks
   // Check timestamps for gaps
   // Validate sourceID and targetID
   ```

3. **Review metadata**:
   ```typescript
   const metadata = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/buffs-metadata.json'));
   // Check if pagination occurred
   // Verify all pages were downloaded
   ```

### Scenario 3: Scribing Detection Issues

**Issue**: Signature scripts not detected or incorrectly identified.

**CRITICAL**: Signature scripts appear in **multiple event types**!

**Investigation Steps**:

1. **Search ALL event types**:
   ```typescript
   // Check buffs (most common)
   const buffs = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/buff-events.json'));
   
   // Check debuffs (some scripts)
   const debuffs = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/debuff-events.json'));
   
   // Check resources (Anchorite's Potency!)
   const resources = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/resource-events.json'));
   
   // Check damage (some signature effects)
   const damage = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/damage-events.json'));
   ```

2. **Use all-events.json for chronological analysis**:
   ```typescript
   const allEvents = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/all-events.json'));
   // Search chronologically around cast times
   // Find signature effects within time windows
   ```

3. **Reference scribing documentation**:
   - See [documentation/features/scribing/](../features/scribing/) for detection patterns
   - Check [documentation/ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md](scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)

### Scenario 4: Resource Management Issues

**Issue**: Resource (Magicka/Stamina/Ultimate) tracking incorrect.

**Investigation Steps**:

1. **Review resource events**:
   ```typescript
   const resources = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/resource-events.json'));
   // Filter by sourceID for specific player
   // Check resource type (0=Magicka, 1=Stamina, 2=Ultimate)
   // Verify resource changes align with casts
   ```

2. **Correlate with cast events**:
   ```typescript
   const casts = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/cast-events.json'));
   // Match resource costs with ability casts
   // Check for resource-generating abilities
   ```

### Scenario 5: Death Analysis

**Issue**: Death timing or cause unclear.

**Investigation Steps**:

1. **Check death events**:
   ```typescript
   const deaths = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/death-events.json'));
   // Find death timestamp
   // Identify killing ability
   ```

2. **Review surrounding damage**:
   ```typescript
   const damage = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/damage-events.json'));
   // Filter damage in 5-10s window before death
   // Identify burst damage or DoT accumulation
   ```

### Scenario 6: Performance/Visualization Issues

**Issue**: Report rendering slow or data visualization incorrect.

**Investigation Steps**:

1. **Check event counts**:
   ```typescript
   const metadata = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/all-events-metadata.json'));
   // Look for extremely large event counts (>100k)
   // Check pagination details
   ```

2. **Review all-events structure**:
   ```typescript
   const allEvents = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/all-events.json'));
   // Check if events are properly chronological
   // Verify event type distribution
   ```

## Data Analysis Tips

### Finding Specific Players

```typescript
const actors = JSON.parse(fs.readFileSync('data-downloads/<code>/actors-by-type.json'));
const playerName = "PlayerName";
const player = actors.players.find(p => p.name === playerName);
const playerId = player.id;
```

### Filtering Events by Time Range

```typescript
const events = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/damage-events.json'));
const fightInfo = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/fight-info.json'));

const startTime = fightInfo.data.reportData.report.fights[0].startTime;
const endTime = fightInfo.data.reportData.report.fights[0].endTime;

const filteredEvents = events.data.reportData.report.events.data.filter(event => 
  event.timestamp >= startTime && event.timestamp <= endTime
);
```

### Ability Name Lookup

```typescript
const abilities = JSON.parse(fs.readFileSync('data-downloads/<code>/abilities-by-type.json'));

function getAbilityName(abilityId) {
  for (const [type, abilitiesList] of Object.entries(abilities)) {
    const ability = abilitiesList.find(a => a.gameID === abilityId);
    if (ability) return ability.name;
  }
  return `Unknown (${abilityId})`;
}
```

### Event Type Distribution

```typescript
const allEvents = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/all-events.json'));
const distribution = {};

allEvents.data.reportData.report.events.data.forEach(event => {
  const type = event.__typename || 'Unknown';
  distribution[type] = (distribution[type] || 0) + 1;
});

console.log('Event Type Distribution:', distribution);
```

## File Size Considerations

- **Large files** (>10MB): Consider loading incrementally or filtering
- **all-events.json**: Often the largest file; use for chronological analysis only when needed
- **Metadata files**: Always small; safe to load for overview
- **Event limits**: Download script limits to 100,000 events per type to prevent timeouts

## Common Pitfalls

1. **Timestamps**: Always relative to fight start, not absolute time
2. **Actor IDs**: Use master-data.json to map IDs to names
3. **Ability IDs**: Reference abilities-by-type.json for ability details
4. **Buff/Debuff split**: Remember to check both friendlies and enemies files
5. **Scribing events**: ALWAYS check multiple event types (buffs, debuffs, resources, damage)
6. **Pagination**: Check metadata files if data seems incomplete

## Jira Integration

When debugging report data issues:

1. **Start work**:
   ```powershell
   acli jira workitem transition --key ESO-XXX --status "In Progress"
   ```

2. **Document findings in Jira comments** (not separate markdown files):
   ```powershell
   acli jira workitem comment create -k ESO-XXX -b "Analysis of report 3gjVGWB2dxCL8XAw fight 32:
   - Issue: Missing damage for player X
   - Root cause: Ability ID Y not in master data
   - Fix: Added ability mapping in abilities.json"
   ```

3. **Complete work**:
   ```powershell
   acli jira workitem transition --key ESO-XXX --status "Done"
   ```

See [jira/AI_JIRA_ACLI_INSTRUCTIONS.md](jira/AI_JIRA_ACLI_INSTRUCTIONS.md) for complete Jira workflow.

## Related Documentation

- **Scribing Detection**: [scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md](scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)
- **Scribing Quick Reference**: [scribing/AI_SCRIBING_QUICK_REFERENCE.md](scribing/AI_SCRIBING_QUICK_REFERENCE.md)
- **Playwright Testing**: [playwright/AI_PLAYWRIGHT_TESTING_INSTRUCTIONS.md](playwright/AI_PLAYWRIGHT_TESTING_INSTRUCTIONS.md)
- **AI Agent Guidelines**: [AI_AGENT_GUIDELINES.md](AI_AGENT_GUIDELINES.md)

## Script Reference

### Download Report Data

**Script**: `scripts/download-report-data.ts`

**Usage**:
```powershell
npm run script -- scripts/download-report-data.ts <report-code> [fight-id]
```

**What it downloads**:
- Report metadata and summary
- Master data (actors and abilities)
- Player data and details
- Fight-specific data for each fight (or specified fight)
- All event types (damage, healing, buffs, debuffs, casts, resources, deaths, combatant info)
- Separate friendly/hostile files for buffs and debuffs
- Chronologically combined events (all-events.json)
- Metadata for all downloads (pagination, counts, timestamps)

**Output location**: `data-downloads/<report-code>/`

**Notes**:
- Automatically added to .gitignore
- Includes retry logic for API failures
- Limits to 100,000 events per type
- Downloads friendly and hostile buffs/debuffs separately for detailed analysis

## Testing Downloaded Data

Before analyzing production data, verify the download is complete:

```powershell
# Check index file exists
Test-Path data-downloads/<report-code>/index.json

# Check fight directory exists
Test-Path data-downloads/<report-code>/fight-<id>

# Check all event files exist
Get-ChildItem data-downloads/<report-code>/fight-<id>/events/*.json
```

Expected event files per fight:
- `all-events.json` + `all-events-metadata.json`
- `damage-events.json` + `damage-metadata.json`
- `healing-events.json` + `healing-metadata.json`
- `buff-events.json` + `buff-events-friendlies.json` + `buff-events-enemies.json` + 3 metadata files
- `debuff-events.json` + `debuff-events-friendlies.json` + `debuff-events-enemies.json` + 3 metadata files
- `cast-events.json` + `casts-metadata.json`
- `resource-events.json` + `resources-metadata.json`
- `death-events.json` + `deaths-metadata.json`
- `combatant-info-events.json` + `combatantInfo-metadata.json`

**Total**: 26 files per fight in the `events/` directory

## Summary

This guide provides AI agents with comprehensive instructions for debugging production ESO Logs reports using downloaded data. Key takeaways:

1. **Download data**: Use the `download-report-data.ts` script
2. **Navigate efficiently**: Start with `index.json` and summary files
3. **Check all event types**: Especially for scribing detection (buffs, debuffs, resources, damage)
4. **Use friendly/hostile splits**: Essential for penetration and buff analysis
5. **Document in Jira**: Add findings to ticket comments, not separate files
6. **Cross-reference**: Use master-data files to map IDs to names

For questions or issues, refer to the [AI Agent Guidelines](AI_AGENT_GUIDELINES.md) or relevant feature documentation.
