# Enum Validation Scripts

Scripts for validating ability enum values against the abilities database.

## Available Scripts

### `check-enum-names.js`
Compares all enum names in `KnownAbilities` against actual ability names from `abilities.json`.

**Usage:**
```bash
node scripts/validation/check-enum-names.js
```

**Output:**
- Total enum entries checked
- Matching vs mismatched entries
- Detailed list of mismatches with suggestions

### `check-mismatched-abilities-in-reports.js`
Searches combat log data for occurrences of mismatched abilities to determine real-world impact.

**Usage:**
```bash
node scripts/validation/check-mismatched-abilities-in-reports.js
```

**Output:**
- Which mismatched enums appear in combat logs
- Frequency of occurrence
- File locations where they appear

### `check-enum-usage.js`
Identifies which mismatched enums are actively used in the codebase.

**Usage:**
```bash
node scripts/validation/check-enum-usage.js
```

**Output:**
- Enums used in code vs not used
- File locations where each enum is referenced
- Priority ranking by usage frequency

### `check-correct-names-for-used-enums.js`
For enums used in code, shows what the correct ability names should be if we assume the IDs are correct.

**Usage:**
```bash
node scripts/validation/check-correct-names-for-used-enums.js
```

**Output:**
- Current enum name vs actual ability name
- Suggested enum rename
- Alternative: IDs to fix if enum names are correct

### `check-enum-usage-table.js`
Generates a formatted table showing enum names, correct ability names, and usage locations.

**Usage:**
```bash
node scripts/validation/check-enum-usage-table.js
```

**Output:**
- Markdown table with all details
- Usage context (AOE detection, buff tracking, etc.)

## CI/CD Integration

Consider adding to GitHub Actions workflow:

```yaml
- name: Validate Ability Enums
  run: node scripts/validation/check-enum-names.js
  continue-on-error: true # Warning only
```

## When to Run

- After updating `abilities.json` from ESO data
- Before adding new ability enums
- When debugging unexpected ability behavior
- During major refactoring of ability-related code
