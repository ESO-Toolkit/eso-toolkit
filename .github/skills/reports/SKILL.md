---
name: reports
description: Download ESO Logs report data for debugging production issues. Download full reports or individual fights, analyze fight structure, search for specific events, and compare fights. Use this when debugging log parsing or event processing issues.
---

You are a report debugging assistant for ESO Log Aggregator. You download and analyze ESO Logs combat report data.

## Report Code Format

ESO Logs report codes are 10-20 alphanumeric characters taken from the report URL:
`https://www.esologs.com/reports/<reportCode>`

Example: `3gjVGWB2dxCL8XAw`

Downloaded data is stored in: `data-downloads/<reportCode>/`

## Downloading Report Data

### Download all fights in a report
```powershell
npx tsx scripts/download-report-data.ts --report <reportCode>
```

This downloads all event types for all fights. Can be large (100MB+). Use when you need to analyze patterns across multiple fights.

### Download a specific fight only (faster)
```powershell
npx tsx scripts/download-report-data.ts --report <reportCode> --fight <fightId>
```

Use when debugging a specific encounter. `fightId` is a number (e.g., `32`).

## Analyzing Downloaded Data

### Check what was downloaded
```powershell
# List fight directories
Get-ChildItem "data-downloads/<reportCode>" -Directory | Select-Object Name

# Check event counts in a fight
Get-ChildItem "data-downloads/<reportCode>/fight-<id>" -File | Select-Object Name, Length
```

### Read fight metadata
```powershell
Get-Content "data-downloads/<reportCode>/fights.json" | ConvertFrom-Json | Select-Object -ExpandProperty fights | Select-Object id, name, startTime, endTime, kill
```

## Searching for Events

### Use PowerShell to search event files
```powershell
# Search for a specific ability in damage events
$data = Get-Content "data-downloads/<reportCode>/fight-<id>/damage.json" | ConvertFrom-Json
$data.events | Where-Object { $_.ability.name -like "*Anchorite*" }

# Search for an actor
$data.events | Where-Object { $_.source.name -eq "PlayerName" } | Select-Object -First 20

# Count events by type
$data.events | Group-Object type | Sort-Object Count -Descending
```

### Event file types per fight
Each fight directory contains JSON files for:
- `damage.json` — damage dealt events
- `healing.json` — healing events
- `casts.json` — ability cast events
- `buffs.json` — buff application/removal events
- `debuffs.json` — debuff events
- `resources.json` — resource gain/loss events
- `deaths.json` — death events
- `combatant-info.json` — player gear and stats

## Comparing Two Fights

```powershell
# Load both fights and compare event counts
$fight1 = Get-Content "data-downloads/<code>/fight-32/damage.json" | ConvertFrom-Json
$fight2 = Get-Content "data-downloads/<code>/fight-35/damage.json" | ConvertFrom-Json

$fight1.events.Count
$fight2.events.Count

# Find abilities in fight1 but not fight2
$abilities1 = $fight1.events | Select-Object -ExpandProperty ability | Select-Object -ExpandProperty name -Unique
$abilities2 = $fight2.events | Select-Object -ExpandProperty ability | Select-Object -ExpandProperty name -Unique
Compare-Object $abilities1 $abilities2
```

## Scribing Detection Context

When debugging scribing detection issues (signature scripts appearing in resource events), look at:
```powershell
$resources = Get-Content "data-downloads/<code>/fight-<id>/resources.json" | ConvertFrom-Json
$resources.events | Where-Object { $_.ability.name -like "*Runeblades*" -or $_.ability.name -like "*Fatecarver*" }
```

Signature scripts appear in **all event types** including resource events — this is expected behavior.

---

## Complete File Structure Reference

### Report-level files (`data-downloads/<reportCode>/`)

| File | Purpose |
|------|---------|
| `index.json` | Navigation guide and file inventory |
| `report-summary.json` | Human-readable overview: fights, duration, zone |
| `report-metadata.json` | Full GraphQL report data |
| `master-data.json` | All actors and abilities (use for ID→name lookups) |
| `actors-by-type.json` | Actors organized by type (players, NPCs, pets) |
| `abilities-by-type.json` | Abilities organized by type |
| `player-data.json` | Player rankings and performance metrics |
| `player-details.json` | Specs, gear, roles |

### Fight-level files (`data-downloads/<reportCode>/fight-<id>/`)

| File | Purpose |
|------|---------|
| `fight-info.json` | Duration, participants, boss info |
| `encounter-info.json` | Encounter details, boss mechanics, phases |

### Event files (`data-downloads/<reportCode>/fight-<id>/events/`)

**Standard event files:**

| File | Description |
|------|-------------|
| `all-events.json` | All types chronologically ordered |
| `damage-events.json` | Damage events |
| `healing-events.json` | Healing events |
| `cast-events.json` | Ability cast events |
| `resource-events.json` | Resource changes (Magicka, Stamina, Ultimate) |
| `death-events.json` | Death events |
| `combatant-info-events.json` | Gear, stats, specs at combat start |

**Buff/Debuff files — IMPORTANT, split by source target type:**

| File | Description |
|------|-------------|
| `buff-events.json` | All buff events (friendly + hostile sources) |
| `buff-events-friendlies.json` | Buffs from friendly sources only |
| `buff-events-enemies.json` | Buffs from hostile sources only |
| `debuff-events.json` | All debuff events |
| `debuff-events-friendlies.json` | Debuffs from friendly sources only |
| `debuff-events-enemies.json` | Debuffs from hostile sources only |

Why the split matters:
- **Penetration analysis**: needs friendly debuffs on enemies (`debuff-events-friendlies.json`)
- **Scribing detection**: signature scripts appear in buff/debuff events
- **Uptime analysis**: distinguish team buffs from enemy buffs

**Metadata files** exist for each event type:
- `{type}-metadata.json` — download info, pagination details, total event count, download timestamp
- `{type}-friendlies-metadata.json` / `{type}-enemies-metadata.json` for buff/debuff splits

**Total per fight: 26 files** in the `events/` directory.

### Verify a complete download
```powershell
# Check all expected files
Get-ChildItem "data-downloads/<code>/fight-<id>/events/*.json" | Select-Object Name | Sort-Object Name
# Should show 26 files
```

---

## Debugging Scenarios

### Missing damage or healing

1. Verify player is in the fight:
```powershell
$fight = Get-Content "data-downloads/<code>/fight-<id>/fight-info.json" | ConvertFrom-Json
$fight.data.reportData.report.fights[0].friendlyPlayers
```

2. Filter damage events by player:
```powershell
$damage = Get-Content "data-downloads/<code>/fight-<id>/events/damage-events.json" | ConvertFrom-Json
$damage.data.reportData.report.events.data | Where-Object { $_.sourceID -eq <playerId> }
```

3. Cross-reference ability IDs:
```powershell
$abilities = Get-Content "data-downloads/<code>/abilities-by-type.json" | ConvertFrom-Json
```

### Buff/debuff uptime issues

Use the correct split file for the analysis:
```powershell
# Friendly buffs (e.g. Major Courage)
$buffs = Get-Content "data-downloads/<code>/fight-<id>/events/buff-events-friendlies.json" | ConvertFrom-Json

# Friendly debuffs on enemies (e.g. Major Breach applied by player)
$debuffs = Get-Content "data-downloads/<code>/fight-<id>/events/debuff-events-friendlies.json" | ConvertFrom-Json
```

Check metadata for pagination — if events are truncated, data may be incomplete:
```powershell
$meta = Get-Content "data-downloads/<code>/fight-<id>/events/buffs-metadata.json" | ConvertFrom-Json
$meta.totalEvents  # compare to actual count
```

### Scribing detection issues

Signature scripts appear in **multiple event types** — check them all:
```powershell
$buffs     = Get-Content "data-downloads/<code>/fight-<id>/events/buff-events.json" | ConvertFrom-Json
$debuffs   = Get-Content "data-downloads/<code>/fight-<id>/events/debuff-events.json" | ConvertFrom-Json
$resources = Get-Content "data-downloads/<code>/fight-<id>/events/resource-events.json" | ConvertFrom-Json
$damage    = Get-Content "data-downloads/<code>/fight-<id>/events/damage-events.json" | ConvertFrom-Json

# Search by script name
$resources.data.reportData.report.events.data | Where-Object { $_.ability.name -like "*Anchorite*" }
```

Use `all-events.json` for chronological analysis around cast times.

### Resource management

```powershell
$resources = Get-Content "data-downloads/<code>/fight-<id>/events/resource-events.json" | ConvertFrom-Json
# Resource types: 0=Magicka, 1=Stamina, 2=Ultimate
$resources.data.reportData.report.events.data | Where-Object { $_.resourceType -eq 0 -and $_.sourceID -eq <playerId> }
```

---

## Data Analysis Helpers

### Find a player's ID
```powershell
$actors = Get-Content "data-downloads/<code>/actors-by-type.json" | ConvertFrom-Json
$player = $actors.players | Where-Object { $_.name -eq "PlayerName" }
$player.id
```

### Filter events by fight time window
```powershell
$events = Get-Content "data-downloads/<code>/fight-<id>/events/damage-events.json" | ConvertFrom-Json
$fight  = Get-Content "data-downloads/<code>/fight-<id>/fight-info.json" | ConvertFrom-Json
$start  = $fight.data.reportData.report.fights[0].startTime
$end    = $fight.data.reportData.report.fights[0].endTime

$events.data.reportData.report.events.data | Where-Object { $_.timestamp -ge $start -and $_.timestamp -le $end }
```

### Event type distribution
```powershell
$all = Get-Content "data-downloads/<code>/fight-<id>/events/all-events.json" | ConvertFrom-Json
$all.data.reportData.report.events.data | Group-Object __typename | Sort-Object Count -Descending
```

### File size considerations
- `all-events.json` is often the largest file. Use only for chronological analysis.
- Metadata files are always small — safe to read first for an overview.
- Download script limits to 100,000 events per type to prevent timeouts.
- Timestamps are **relative to fight start**, not absolute.

---

## Storage Limits

Downloaded data is for local debugging only. The `data-downloads/` directory is gitignored. Large reports may exceed 500MB. Clean up old downloads when no longer needed:
```powershell
Remove-Item "data-downloads/<reportCode>" -Recurse -Force
```
