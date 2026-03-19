---
name: create-skill
description: Create a new SKILL.md agent skill for this project. Use this when you need to add a new reusable skill to .agents/skills/ so it can be invoked in future chat sessions.
---

You are creating a new agent skill for the ESO Log Aggregator project.

## What Is a Skill?

A skill is a `SKILL.md` file inside a named subfolder of `.agents/skills/`. This follows the [Agent Skills specification](https://agentskills.io/specification) — a cross-client convention that AI agents (Claude Code, Copilot, etc.) discover automatically. Each skill is a prompt file — plain markdown with YAML frontmatter — that instructs the agent how to perform a specific task using terminal commands, file reads, and other available tools.

Skills are **not** MCP servers. They contain no code — only natural-language instructions and shell commands.

## File Location Convention

The `.agents/skills/` directory is the **cross-client interoperability path** — compliant AI agents scan this directory automatically, making skills visible to Claude Code, Copilot, and other spec-compliant tools without duplication.

```
.agents/skills/
  <skill-name>/
    SKILL.md            # Required: metadata + instructions
    scripts/            # Optional: executable code
    references/         # Optional: additional documentation
    assets/             # Optional: templates, resources
```

Use a short, lowercase, kebab-case folder name that clearly identifies the skill's purpose. Examples: `workflow`, `playwright`, `jira`, `git`, `rebase`.

## SKILL.md Format

```markdown
---
name: folder-name-here
description: One sentence describing what this skill does and when to use it.
---

[Skill instructions here — written as instructions to the agent that will execute this skill]
```

### Frontmatter Fields

Per the [Agent Skills specification](https://agentskills.io/specification):

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | 1–64 chars. Lowercase letters, numbers, hyphens only. Must not start/end with hyphen. No consecutive hyphens (`--`). **Must match parent folder name.** |
| `description` | Yes | 1–1024 chars. Non-empty. Describes what the skill does and when to use it. Include specific keywords that help agents identify relevant tasks. |
| `license` | No | License name or reference to a bundled license file. |
| `compatibility` | No | 1–500 chars. Environment requirements (intended product, system packages, network access, etc.). Most skills don't need this. |
| `metadata` | No | Arbitrary key-value mapping (string keys → string values) for additional properties. |
| `allowed-tools` | No | Space-delimited list of pre-approved tools. Experimental — support varies by agent. |

**`name` examples:**
- Valid: `pdf-processing`, `data-analysis`, `code-review`
- Invalid: `PDF-Processing` (uppercase), `-pdf` (starts with hyphen), `pdf--processing` (consecutive hyphens)

**`description` — should answer:**
- What does this skill do?
- When should it be used?
- What triggers it? (e.g., "Use this when asked to run tests")

This is what AI agents use to decide when to invoke the skill. Be specific — "Helps with PDFs" is too vague; "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents." is good.

### Body Rules

- Write instructions **to the agent**, not to the human user
- Use second person imperative: "Run this command", "Check if...", "Return the result as..."
- Include exact shell commands (PowerShell for this project — Windows environment)
- Include file paths relative to the project root
- Cover: prerequisites, main steps, output interpretation, troubleshooting
- Keep it focused — one skill per concern
- **Keep SKILL.md under 500 lines** — move detailed reference material to `references/` files
- When referencing bundled files, use **relative paths from the skill directory** (e.g., `scripts/extract.py`, `references/REFERENCE.md`)

### Progressive Disclosure

Skills are designed for efficient context usage across three tiers:

1. **Metadata** (~100 tokens): `name` and `description` — loaded at session start for all skills
2. **Instructions** (<5000 tokens recommended): Full SKILL.md body — loaded when activated
3. **Resources** (as needed): Files in `scripts/`, `references/`, `assets/` — loaded only on demand

## Step-by-Step: Creating a New Skill

### 1. Determine the skill name and folder

```
.agents/skills/<folder-name>/SKILL.md
```

### 2. Write the frontmatter

The `description` is the most important field — it must clearly describe when the agent should invoke this skill. Be specific about the trigger condition.

### 3. Write the skill body

Structure:
1. **Context**: 1–2 lines about what this skill does
2. **Prerequisites**: Any tools or files that must exist
3. **Steps**: Numbered or sectioned instructions with exact commands
4. **Output**: What to report back to the user
5. **Troubleshooting** (optional): Common failure modes

For complex skills, split detailed reference material into `references/` files rather than making SKILL.md too long.

### 4. Create the file

```powershell
# Create the directory
New-Item -ItemType Directory -Path ".agents/skills/<folder-name>" -Force

# Create the SKILL.md (then write content to it)
New-Item -ItemType File -Path ".agents/skills/<folder-name>/SKILL.md"
```

### 5. Update AGENTS.md

Add an entry to the "Agent Skills" table in [AGENTS.md](../../AGENTS.md) under the `### Agent Skills (SKILL.md files in .agents/skills/)` section:

```markdown
- **New Skill Name**: [.agents/skills/<folder>/SKILL.md](.agents/skills/<folder>/SKILL.md) - Brief description
```

Also add usage examples in the "Tool Usage Patterns" section if this skill has common invocation patterns.

### 6. Lint and verify

Run the skills linter to confirm the frontmatter is spec-compliant:

```powershell
python scripts/lint-skills.py
```

This validates the `name` field, `description` length, and naming conventions against the [agentskills.io](https://agentskills.io/specification) open spec. The same check runs in CI on every PR.

You can also use the reference library directly:

```bash
skills-ref validate .agents/skills/<folder-name>
```

After that, compliant AI agents should pick up the new skill automatically from the `.agents/skills/` directory. Verify by invoking it with a prompt that matches the description.

## Existing Skills (for reference)

| Folder | Purpose |
|--------|---------|
| `auth/` | OAuth token generation and browser injection |
| `class-skill-regen/` | Refresh class skill descriptions/icons from ESO-Hub |
| `create-pr/` | PR creation with PowerShell-safe `--body-file` pattern |
| `create-skill/` | This skill — creating new skills |
| `debug-ci-failure/` | End-to-end CI failure debugging |
| `fix-lint/` | Diagnose and fix ESLint errors |
| `fix-types/` | Diagnose and fix TypeScript type errors |
| `gear-data-regen/` | Gear set bonus/tooltip data from ESO-Hub |
| `git/` | Branch management (twig with plain git fallbacks) |
| `github-actions-logs/` | Parse and analyze GitHub Actions logs |
| `jira/` | Jira ticket management via acli |
| `no-edit-generated/` | Never manually edit generated files |
| `playwright/` | E2E test execution |
| `rebase/` | Post-squash branch tree recovery |
| `rebase-conflicts/` | Rebase branches and resolve merge conflicts |
| `reports/` | ESO Logs report data debugging |
| `rollbar/` | Production error triage via Rollbar |
| `scratch-dir/` | Gitignored directory for ad-hoc output files |
| `skill-data-regen/` | ESO skill line TypeScript data files |
| `testing/` | Dev server, unit tests, format/lint/build |
| `troubleshoot/` | Quick-reference fixes for common dev issues |
| `uesp-data/` | Item icon database management |
| `ui-updates/` | Theme-consistent UI changes |
| `workflow/` | Git branch enforcement before ticket work |
| `write-playwright-tests/` | Authoring visual/E2E tests |

## Good Skill Design

✅ **Do:**
- Cover one well-defined task per skill
- Include all commands needed — don't rely on the agent knowing them
- Specify the exact PowerShell syntax (this is a Windows project)
- Include example outputs so the agent knows what success looks like
- Mention related skills if relevant
- Use `scripts/`, `references/`, `assets/` subdirectories for supporting files
- Keep file references one level deep from SKILL.md

❌ **Don't:**
- Create a skill for something already covered by an existing skill — extend it instead
- Include secrets or tokens in the skill body
- Make skills so broad they overlap significantly with existing ones
- Write instructions for the human — write instructions for the agent executing the skill
- Exceed 500 lines in SKILL.md — split into reference files instead
- Use deeply nested reference chains between files
