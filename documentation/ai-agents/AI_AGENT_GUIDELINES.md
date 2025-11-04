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
   - Architecture → `documentation/architecture/`
   - AI-specific → `documentation/ai-agents/`
   - **Bug fixes/implementation details** → Jira ticket comments (NOT separate markdown files)
3. **Format**: Brief markdown with:
   - Problem statement (2-3 sentences)
   - Solution overview (1-2 paragraphs)
   - Key files changed (list)
   - Testing notes (if applicable)

### Instead of Documentation

For simple changes, use:
- **Clear commit messages** with context
- **Code comments** explaining non-obvious logic
- **Jira ticket comments** for implementation details, fixes, and work summaries
- **Inline documentation** in complex functions

### Jira Ticket Comments

**When to use Jira comments instead of markdown files:**
- Implementation details for bug fixes
- Work summaries and completion notes
- Root cause analysis
- Testing results and verification
- Next steps and follow-up items

Use `acli jira workitem comment create -k TICKET-ID -b "Your comment"` to add detailed implementation notes directly to the ticket.

## Jira Integration

**REQUIRED**: Use `acli` for Jira work item management.

See: [jira/AI_JIRA_ACLI_INSTRUCTIONS.md](jira/AI_JIRA_ACLI_INSTRUCTIONS.md)

## Branch Management (Twig)

- Always confirm branch stacking with `twig tree` before and after creating feature branches.
- If a branch appears under *Orphaned branches*, fix it immediately with `twig branch depend <child> <parent>` (or the appropriate `twig branch` command).
- Keep replay-system work aligned: `ESO-449` → `ESO-488` → `ESO-463` unless instructed otherwise.
- Document any intentional deviations in the relevant Jira ticket/comment so reviewers understand the stack layout.

## Testing Requirements

- Run tests before committing: `npm test`
- Run linting: `npm run lint`
- For UI changes, verify in browser
- Update tests if behavior changed

## TypeScript Practices

- Trust the existing TypeScript types—avoid redundant runtime type checks for properties that are already strongly typed.
- Prefer refining or extending type definitions when you need different guarantees, instead of sprinkling `typeof` or defensive checks.
- Use narrow type guards only when interacting with truly unknown input (e.g., external APIs) and document the rationale in code comments.

## Communication Style

- **Be concise** - Short explanations unless asked for details
- **Ask before extensive work** - Confirm approach for major changes
- **Provide options** - When multiple solutions exist, present choices
- **Show, don't tell** - Code examples over lengthy explanations
