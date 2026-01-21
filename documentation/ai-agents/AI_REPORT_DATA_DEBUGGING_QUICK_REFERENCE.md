# Report Data Debugging - Quick Reference

## Download Data

```powershell
# Full report (all fights)
npm run script -- scripts/download-report-data.ts <report-code>

# Single fight
npm run script -- scripts/download-report-data.ts <report-code> <fight-id>
```

**Output**: `data-downloads/<report-code>/`

## File Locations

```
data-downloads/<report-code>/
├── index.json                    # Navigation guide
├── report-summary.json           # Human-readable overview
├── report-metadata.json          # Full report data
├── master-data.json              # All actors & abilities
├── actors-by-type.json           # Players, NPCs, pets
├── abilities-by-type.json        # Abilities by type
├── player-data.json              # Player rankings
├── player-details.json           # Player specs/gear
└── fight-<id>/
    ├── fight-info.json           # Fight metadata
    ├── encounter-info.json       # Boss mechanics
    └── events/
        ├── all-events.json       # All events chronologically
        ├── damage-events.json    # Damage events
        ├── healing-events.json   # Healing events
        ├── buff-events.json      # All buffs (friendly + hostile)
        ├── buff-events-friendlies.json
        ├── buff-events-enemies.json
        ├── debuff-events.json    # All debuffs (friendly + hostile)
        ├── debuff-events-friendlies.json
        ├── debuff-events-enemies.json
        ├── cast-events.json      # Cast events
        ├── resource-events.json  # Resource events
        ├── death-events.json     # Death events
        ├── combatant-info-events.json
        └── *-metadata.json       # Download metadata
```

## Common Tasks

### Find Player ID

```typescript
const actors = JSON.parse(fs.readFileSync('data-downloads/<code>/actors-by-type.json'));
const player = actors.players.find(p => p.name === "PlayerName");
const playerId = player.id;
```

### Lookup Ability Name

```typescript
const abilities = JSON.parse(fs.readFileSync('data-downloads/<code>/abilities-by-type.json'));
function getAbilityName(abilityId) {
  for (const [type, list] of Object.entries(abilities)) {
    const ability = list.find(a => a.gameID === abilityId);
    if (ability) return ability.name;
  }
  return `Unknown (${abilityId})`;
}
```

### Filter Events by Player

```typescript
const events = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/damage-events.json'));
const playerEvents = events.data.reportData.report.events.data.filter(
  e => e.sourceID === playerId
);
```

### Check Event Counts

```typescript
const metadata = JSON.parse(fs.readFileSync('data-downloads/<code>/fight-<id>/events/damage-metadata.json'));
console.log('Total events:', metadata.totalEvents);
console.log('Pages fetched:', metadata.pagesFetched);
```

## Debugging Scenarios

### Missing Damage/Healing

1. Check `fight-info.json` - verify player in friendlyPlayers
2. Review `damage-events.json` or `healing-events.json` - filter by sourceID
3. Cross-reference `abilities-by-type.json` - lookup ability names

### Buff/Debuff Uptime

1. Identify source type (friendly vs hostile)
2. Use correct file:
   - Friendly buffs → `buff-events-friendlies.json`
   - Enemy debuffs (from player) → `debuff-events-friendlies.json`
3. Check metadata for pagination issues

### Scribing Detection

**CRITICAL**: Check ALL event types!

```typescript
// Check buffs (most common)
const buffs = JSON.parse(fs.readFileSync('.../buff-events.json'));

// Check debuffs
const debuffs = JSON.parse(fs.readFileSync('.../debuff-events.json'));

// Check resources (Anchorite's Potency!)
const resources = JSON.parse(fs.readFileSync('.../resource-events.json'));

// Check damage
const damage = JSON.parse(fs.readFileSync('.../damage-events.json'));
```

### Death Analysis

1. Find death in `death-events.json`
2. Review `damage-events.json` 5-10s before death
3. Identify burst or DoT accumulation

### Performance Issues

1. Check `all-events-metadata.json` for event counts
2. Look for >100k events
3. Review pagination details

## Quick Checks

```powershell
# Verify download complete
Test-Path data-downloads/<report-code>/index.json

# List fight directories
Get-ChildItem data-downloads/<report-code>/fight-*

# Count event files (should be 26 per fight)
(Get-ChildItem data-downloads/<report-code>/fight-<id>/events/*.json).Count
```

## Important Notes

- **Timestamps**: Relative to fight start, not absolute
- **Buff/Debuff split**: Always check friendlies vs enemies
- **Scribing**: Search multiple event types (buffs, debuffs, resources, damage)
- **Pagination**: Check metadata if data seems incomplete
- **File size**: all-events.json is often largest; use sparingly

## Jira Workflow

```powershell
# Start work
acli jira workitem transition --key ESO-XXX --status "In Progress"

# Add findings to ticket (not separate file)
acli jira workitem comment create -k ESO-XXX -b "Analysis: ..."

# Complete work
acli jira workitem transition --key ESO-XXX --status "Done"
```

## Full Documentation

See [AI_REPORT_DATA_DEBUGGING.md](AI_REPORT_DATA_DEBUGGING.md) for complete guide.

## Related Docs

- [Scribing Detection](scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)
- [Scribing Quick Ref](scribing/AI_SCRIBING_QUICK_REFERENCE.md)
- [Jira Instructions](jira/AI_JIRA_ACLI_INSTRUCTIONS.md)
- [AI Guidelines](AI_AGENT_GUIDELINES.md)
