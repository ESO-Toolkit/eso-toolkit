# Skill Data Regeneration Skill

Regenerates ESO skill line TypeScript data files by scraping ESO-Hub.com and cross-referencing with `abilities.json`.

## Quick Start

```
@workspace List all ESO skill lines
@workspace Look up ability "Runeblades" in abilities.json
@workspace Validate skill module src/data/skill-lines/class/heraldOfTheTome.ts
@workspace Generate validation report for all skill modules
@workspace Get regeneration instructions
```

## Available Tools

### 1. `list_skill_lines`

Lists all ESO skill lines organized by category with their ESO-Hub URLs.

**Usage:**
```
@workspace List all skill lines
@workspace Show class skill lines
@workspace List weapon skill lines
```

### 2. `lookup_ability`

Searches `data/abilities.json` for skills by name or ID. Essential during regeneration to resolve numeric IDs and icon names.

**Usage:**
```
@workspace Look up ability "Runeblades"
@workspace Find ability ID 12345
@workspace Search for "Fatecarver" in abilities.json
```

### 3. `validate_skill_module`

Validates a generated skill line `.ts` module against `abilities.json`. Checks ID resolution, file structure, and reports issues.

**Usage:**
```
@workspace Validate skill module src/data/skill-lines/class/heraldOfTheTome.ts
```

### 4. `generate_validation_report`

Scans all skill line modules and generates a comprehensive validation report saved to `validation-reports/skill-line-regeneration.json`.

**Usage:**
```
@workspace Generate validation report for all skill modules
@workspace Check which skills still need IDs
```

### 5. `get_regen_instructions`

Returns the full regeneration workflow: step-by-step process, critical rules, execution order, common pitfalls, and conventions.

**Usage:**
```
@workspace How do I regenerate skill data?
@workspace Get skill data regeneration instructions
```

## Workflow

1. **Get instructions**: Use `get_regen_instructions` for the full workflow
2. **List targets**: Use `list_skill_lines` to see what needs regenerating
3. **Scrape ESO-Hub**: Use MCP Playwright to navigate skill pages and extract data
4. **Resolve IDs**: Use `lookup_ability` to find numeric IDs for each active/ultimate skill
5. **Validate**: Use `validate_skill_module` after creating each file
6. **Report**: Use `generate_validation_report` for a full status check

## Data Flow

```
ESO-Hub.com (skill hierarchies, names, types)
    ↓ MCP Playwright browser scraping
    ↓
abilities.json (numeric IDs, icon names)
    ↓ lookup_ability tool
    ↓
src/data/skill-lines/{category}/{skillLine}.ts
    ↓ validate_skill_module
    ↓
validation-reports/skill-line-regeneration.json
```

## Related Documentation

- [Skill Data Regeneration Prompt](../../../documentation/ai-agents/SKILL_DATA_REGENERATION_PROMPT.md) — Full reference with examples and URL list
