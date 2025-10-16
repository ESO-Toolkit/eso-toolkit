# AI Agent Guidelines

## Documentation Policy

### ❌ Do NOT Create Documentation For:
- Minor bug fixes
- Small adjustments (tweaking constants, scaling factors, etc.)
- Code refactoring without behavior changes
- CSS/styling tweaks
- Simple variable renames

### ✅ DO Create Documentation For:
- **New features** or significant feature changes
- **Architectural changes** that affect multiple components
- **Breaking changes** that alter APIs or interfaces
- **Complex bug fixes** that require explanation of root cause
- **Performance optimizations** with measurable impact
- **Integration of new systems** (e.g., new libraries, APIs)
- **Major refactoring** that changes code structure

### Documentation Guidelines

When documentation IS warranted:

1. **Keep it concise** - Focus on the "why" not the "what"
2. **Location**:
   - Major features → `documentation/features/[feature-name]/`
   - Fixes → `documentation/fixes/` (only if complex)
   - Architecture → `documentation/architecture/`
   - AI-specific → `documentation/ai-agents/`
3. **Format**: Brief markdown with:
   - Problem statement (2-3 sentences)
   - Solution overview (1-2 paragraphs)
   - Key files changed (list)
   - Testing notes (if applicable)

### Instead of Documentation

For simple changes, use:
- **Clear commit messages** with context
- **Code comments** explaining non-obvious logic
- **Jira ticket updates** for tracked work
- **Inline documentation** in complex functions

## Jira Integration

**REQUIRED**: Use `acli` for Jira work item management.

See: [jira/AI_JIRA_ACLI_INSTRUCTIONS.md](jira/AI_JIRA_ACLI_INSTRUCTIONS.md)

## Testing Requirements

- Run tests before committing: `npm test`
- Run linting: `npm run lint`
- For UI changes, verify in browser
- Update tests if behavior changed

## Communication Style

- **Be concise** - Short explanations unless asked for details
- **Ask before extensive work** - Confirm approach for major changes
- **Provide options** - When multiple solutions exist, present choices
- **Show, don't tell** - Code examples over lengthy explanations
