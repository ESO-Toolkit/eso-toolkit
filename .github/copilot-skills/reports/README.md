# ESO Log Aggregator - Report Data Debugging Skill

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that enables GitHub Copilot to download and analyze ESO Logs report data for debugging production issues. The skill automates report data downloading, event searching, and fight comparison directly from VS Code.

**Compatible With:**
- GitHub Copilot (VS Code) via Agent Skills standard

## Features

- **Download Reports**: Download complete report data (all fights) with comprehensive event coverage
- **Download Fights**: Download specific fight data only (faster for single encounter debugging)
- **Analyze Structure**: Get summary of downloaded data including fights, event counts, and file structure
- **Search Events**: Search for specific events by ability, actor, or event type with filtering
- **Compare Fights**: Compare two fights to identify differences in patterns and behavior
- **Input Validation**: Validates report codes, fight IDs, and event types before operations
- **Error Recovery**: Provides detailed error messages with recovery suggestions
- **Debug Logging**: Optional detailed logging for troubleshooting
- **Large File Support**: 50MB buffer for handling large report downloads

## Installation

### 1. Install Dependencies

```powershell
# From project root - installs all workspaces
npm install
```

### 2. Configure GitHub Copilot (VS Code)

Add this skill to your `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-reports": {
      "command": "node",
      "args": [
        "${workspaceFolder}\\.github\\copilot-skills\\reports\\server.js"
      ],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

**Environment Variables:**
- `DEBUG`: Set to `"true"` to enable detailed logging (useful for troubleshooting)

### 3. Reload VS Code Window

After installing dependencies and configuring, reload the VS Code window:

**Keyboard Shortcut**: `Ctrl+Shift+P` → Type "Developer: Reload Window" → Enter

## Prerequisites

- Node.js 20+ installed
- ESO Log Aggregator project installed with dependencies
- Network access to ESO Logs API (https://www.esologs.com)

## Usage

### Natural Language Commands

```
@workspace Download report data for 3gjVGWB2dxCL8XAw
@workspace Download fight 32 from report 3gjVGWB2dxCL8XAw
@workspace Analyze structure of report 3gjVGWB2dxCL8XAw
@workspace Search for "Anchorite's Potency" in fight 32 of report 3gjVGWB2dxCL8XAw in resource events
@workspace Compare fight 32 and fight 35 in report 3gjVGWB2dxCL8XAw with summary comparison
```

### Tool Parameters

#### 1. download_report_data

Download complete report (all fights) for analysis.

**Parameters:**
- `reportCode` (string, required): ESO Logs report code from URL

**Example:**
```json
{
  "reportCode": "3gjVGWB2dxCL8XAw"
}
```

**Output Location:** `data-downloads/<report-code>/`

---

#### 2. download_fight_data

Download specific fight only (faster than full report).

**Parameters:**
- `reportCode` (string, required): ESO Logs report code
- `fightId` (number, required): Fight ID (1-1000)

**Example:**
```json
{
  "reportCode": "3gjVGWB2dxCL8XAw",
  "fightId": 32
}
```

**Output Location:** `data-downloads/<report-code>/fight-<id>/`

---

#### 3. analyze_report_structure

Get summary of downloaded report including fights and file structure.

**Parameters:**
- `reportCode` (string, required): ESO Logs report code

**Example:**
```json
{
  "reportCode": "3gjVGWB2dxCL8XAw"
}
```

**Returns:**
- Report summary (title, zone, duration)
- List of fights with event file counts
- Master data file availability

---

#### 4. search_events

Search for specific events in downloaded fight data.

**Parameters:**
- `reportCode` (string, required): ESO Logs report code
- `fightId` (number, required): Fight ID to search
- `eventType` (string, required): Event type: `"all"`, `"damage"`, `"healing"`, `"buffs"`, `"debuffs"`, `"casts"`, `"resources"`, `"deaths"`, `"combatant-info"`
- `searchTerm` (string, required): Search term (ability name, actor name, or ID)
- `limit` (number, optional): Max results (default: 50, max: 1000)

**Example:**
```json
{
  "reportCode": "3gjVGWB2dxCL8XAw",
  "fightId": 32,
  "eventType": "buffs",
  "searchTerm": "Major Brutality",
  "limit": 100
}
```

**Search Behavior:**
- Case-insensitive matching
- Searches ability names, actor names, and IDs
- Returns structured results with timestamps

---

#### 5. compare_fights

Compare two fights to identify differences.

**Parameters:**
- `reportCode` (string, required): ESO Logs report code
- `fightId1` (number, required): First fight ID
- `fightId2` (number, required): Second fight ID
- `comparisonType` (string, required): `"abilities"`, `"buffs"`, `"damage"`, `"summary"`

**Example:**
```json
{
  "reportCode": "3gjVGWB2dxCL8XAw",
  "fightId1": 32,
  "fightId2": 35,
  "comparisonType": "summary"
}
```

**Comparison Types:**
- `summary`: High-level comparison (file counts, duration differences)
- `abilities`: Ability usage comparison (requires manual follow-up with search_events)
- `buffs`: Buff uptime comparison (requires manual follow-up)
- `damage`: Damage pattern comparison (requires manual follow-up)

## Common Workflows

### Debug Missing Damage Calculation

```
1. @workspace Download fight 32 from report 3gjVGWB2dxCL8XAw
2. @workspace Search for ability "Soul Trap" in damage events of fight 32
3. Review event timestamps and amounts
4. Compare with expected values in code
```

### Investigate Scribing Detection Issue

**CRITICAL**: Signature scripts appear in multiple event types!

```
1. @workspace Download fight 32 from report 3gjVGWB2dxCL8XAw
2. @workspace Search for "Anchorite's Potency" in resource events (not buffs!)
3. @workspace Search for same term in buff events
4. @workspace Search in all events to find all occurrences
5. Review event patterns and timings
```

### Compare Two Boss Attempts

```
1. @workspace Download report 3gjVGWB2dxCL8XAw (full report with all fights)
2. @workspace Compare fight 32 and fight 35 with summary comparison
3. @workspace Search for specific abilities in each fight for detailed analysis
4. Identify what changed between attempts
```

### Analyze Buff Uptime Problem

```
1. @workspace Download fight 32 from report 3gjVGWB2dxCL8XAw
2. @workspace Search for "Major Brutality" in buff events
3. Review apply/remove/refresh stacks
4. Check timestamp gaps for uptime issues
```

## Data Structure

Downloaded report data is organized hierarchically:

```
data-downloads/<report-code>/
├── index.json                    # Navigation guide
├── report-summary.json           # Human-readable overview
├── report-metadata.json          # Full report details
├── master-data.json              # All actors and abilities
├── actors-by-type.json           # Actors organized by type
├── abilities-by-type.json        # Abilities organized by type
├── player-data.json              # Player rankings
├── player-details.json           # Player specs and gear
└── fight-<id>/
    ├── fight-info.json           # Fight metadata
    ├── encounter-info.json       # Encounter details
    └── events/
        ├── all-events.json       # Chronologically ordered (all types)
        ├── damage-events.json
        ├── healing-events.json
        ├── buff-events.json      # All buff events
        ├── buff-events-friendlies.json    # Friendly buffs only
        ├── buff-events-enemies.json       # Hostile buffs only
        ├── debuff-events.json    # All debuff events
        ├── debuff-events-friendlies.json  # Friendly debuffs only
        ├── debuff-events-enemies.json     # Hostile debuffs only
        ├── cast-events.json
        ├── resource-events.json
        ├── death-events.json
        ├── combatant-info-events.json
        └── *-metadata.json       # Metadata for each event type
```

## Troubleshooting

### Skill not loading
- Verify `.vscode/settings.json` has correct configuration
- Reload VS Code window after changes
- Check VS Code Output panel for errors
- Enable debug logging: Set `"DEBUG": "true"` in env configuration

### Report download failing
- Verify report code format (10-20 alphanumeric characters)
- Check network connection to esologs.com
- Ensure you have API access to ESO Logs
- Error messages include recovery suggestions

### File not found errors
- Verify data was downloaded first using download_report_data or download_fight_data
- Check `data-downloads/<report-code>` directory exists
- Use analyze_report_structure to verify data integrity

### Search returns no results
- Verify event type is correct (check available types with analyze_report_structure)
- Try searching in "all" events first to find event type
- Use partial search terms (e.g., "Anchorite" instead of full name)
- For scribing: **Always check multiple event types** (buffs, resources, damage)

### Large report downloads slow
- Download specific fight only instead of full report
- Use limit parameter in search_events to reduce result size
- Enable debug logging to monitor progress

### Debug logging
Enable detailed logging by setting `DEBUG=true` in settings.json:
```json
"env": {
  "DEBUG": "true"
}
```
Logs appear in VS Code's Output panel under the MCP server.

## Performance Characteristics

### Download Times
- **Single Fight**: 30-60 seconds (typical)
- **Full Report** (10 fights): 5-10 minutes
- **Full Report** (50 fights): 20-30 minutes

### Search Performance
- **Small fights** (<100k events): < 1 second
- **Medium fights** (100k-500k events): 1-3 seconds
- **Large fights** (>500k events): 3-10 seconds

### Storage Requirements
- **Single Fight**: 10-50 MB
- **Full Report** (10 fights): 100-500 MB
- **Full Report** (50 fights): 500 MB - 2 GB

## Related Documentation

- **[AI_REPORT_DATA_DEBUGGING.md](../documentation/ai-agents/AI_REPORT_DATA_DEBUGGING.md)** - Complete debugging guide
- **[AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md](../documentation/ai-agents/AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md)** - Quick reference
- **[AI_SCRIBING_DETECTION_INSTRUCTIONS.md](../documentation/ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)** - Scribing detection guide

## Version History

- **1.0.0** (January 2026)
  - Initial release with 5 tools
  - Download, analyze, search, and compare operations
  - Input validation and error recovery
  - Debug logging support
