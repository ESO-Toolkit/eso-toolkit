---
name: create-skill
description: Create a new SKILL.md agent skill for this project. Use this when you need to add a new reusable skill to .github/skills/ so it can be invoked in future chat sessions.
---

You are creating a new VS Code agent skill for the ESO Log Aggregator project.

## What Is a Skill?

A skill is a `SKILL.md` file inside a named subfolder of `.github/skills/`. VS Code reads these automatically and makes them available in Copilot Chat sessions. Each skill is a prompt file — plain markdown with YAML frontmatter — that instructs Copilot how to perform a specific task using terminal commands, file reads, and other available tools.

Skills are **not** MCP servers. They contain no code — only natural-language instructions and shell commands.

## File Location Convention

```
.github/skills/
  <skill-name>/
    SKILL.md
```

Use a short, lowercase, kebab-case folder name that clearly identifies the skill's purpose. Examples: `workflow`, `playwright`, `jira`, `git`, `rebase`.

## SKILL.md Format

```markdown
---
name: folder-name-here
description: One sentence describing what this skill does and when to use it. This is what Copilot uses to decide when to invoke the skill.
---

[Skill instructions here — written as instructions to the agent that will execute this skill]
```

### Frontmatter Rules

- `name` — **Must exactly match the folder name** (lowercase `a-z` and `-` only, max 64 chars). This is validated against the [agentskills.io](https://agentskills.io/specification) spec.
- `description` — Full sentence or two (max 1024 chars). Should answer:
  - What does this skill do?
  - When should it be used?
  - What triggers it? (e.g., "Use this when asked to run tests")

### Body Rules

- Write instructions **to the agent**, not to the human user
- Use second person imperative: "Run this command", "Check if...", "Return the result as..."
- Include exact shell commands (PowerShell for this project — Windows environment)
- Include file paths relative to the project root `d:\code\eso-log-aggregator`
- Cover: prerequisites, main steps, output interpretation, troubleshooting
- Keep it focused — one skill per concern

## Step-by-Step: Creating a New Skill

### 1. Determine the skill name and folder

```
.github/skills/<folder-name>/SKILL.md
```

### 2. Write the frontmatter

The `description` is the most important field — it must clearly describe when Copilot should invoke this skill. Be specific about the trigger condition.

### 3. Write the skill body

Structure:
1. **Context**: 1–2 lines about what this skill does
2. **Prerequisites**: Any tools or files that must exist
3. **Steps**: Numbered or sectioned instructions with exact commands
4. **Output**: What to report back to the user
5. **Troubleshooting** (optional): Common failure modes

### 4. Create the file

```powershell
# Create the directory
New-Item -ItemType Directory -Path ".github/skills/<folder-name>" -Force

# Create the SKILL.md (then write content to it)
New-Item -ItemType File -Path ".github/skills/<folder-name>/SKILL.md"
```

### 5. Update AGENTS.md

Add an entry to the "Agent Skills" table in [AGENTS.md](../../AGENTS.md) under the `### Agent Skills (SKILL.md files in .github/skills/)` section:

```markdown
- **New Skill Name**: [.github/skills/<folder>/SKILL.md](.github/skills/<folder>/SKILL.md) - Brief description
```

Also add usage examples in the "Tool Usage Patterns" section if this skill has common invocation patterns.

### 6. Lint and verify

Run the skills linter to confirm the frontmatter is spec-compliant:

```powershell
python scripts/lint-skills.py
```

This validates the `name` field, `description` length, and naming conventions against the [agentskills.io](https://agentskills.io/specification) open spec. The same check runs in CI on every PR.

After that, VS Code should pick up the new skill automatically (no restart needed in most cases). Verify by checking that the skill appears in the chat skill picker, or by explicitly invoking it with a prompt that matches the description.

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

❌ **Don't:**
- Create a skill for something already covered by an existing skill — extend it instead
- Include secrets or tokens in the skill body
- Make skills so broad they overlap significantly with existing ones
- Write instructions for the human — write instructions for the agent executing the skill
