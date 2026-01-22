# Git Workflow Tools

## Overview

The Copilot Agent Skill includes git workflow automation tools to streamline the contribution process. These tools enable AI agents to create branches, commit changes, push to remote, and handle complex branch tree rebasing without manual intervention.

## Available Tools

### 1. `git_create_branch`

Creates and checks out a new git branch following project naming conventions.

**Use Cases**:
- Starting work on a new Jira work item
- Creating feature branches
- Setting up branches for bug fixes

**Parameters**:
```json
{
  "branchName": "ESO-569-remove-duplicate-roles"
}
```

**Branch Naming Convention**:
- Format: `ESO-XXX-short-description`
- Example: `ESO-569-remove-duplicate-roles`
- Use kebab-case for description
- Keep description concise (3-5 words)

**Returns**:
```json
{
  "success": true,
  "action": "create",
  "branch": "ESO-569-remove-duplicate-roles",
  "message": "Created and checked out new branch: ESO-569-remove-duplicate-roles"
}
```

**Behavior**:
- If branch already exists, checks it out instead of creating
- Fails gracefully if there are uncommitted changes

---

### 2. `git_commit_changes`

Stages and commits changes with a descriptive message following project standards.

**Use Cases**:
- Committing completed work
- Creating checkpoint commits during development
- Documenting changes with proper messages

**Parameters**:
```json
{
  "message": "ESO-569: Remove duplicate roles in the roles dropdown\n\n- Removed redundant 'Damage Dealers' option (duplicate of 'DPS')\n- Updated RoleFilter type to remove 'damage-dealers'\n- Simplified filtering logic\n- Clarified 'Supports' label to 'Supports (Tanks & Healers)' for better UX",
  "files": [
    "src/features/report_details/insights/PlayersPanelView.tsx"
  ]
}
```

**Commit Message Format**:
```
ESO-XXX: Brief summary (50 chars or less)

- Bullet point 1
- Bullet point 2
- Bullet point 3
```

**Best Practices**:
- Start with Jira work item number (ESO-XXX)
- Use imperative mood ("Remove" not "Removed")
- Include bullet points for multi-change commits
- Keep summary line under 50 characters
- Separate subject and body with blank line

**Parameters (Optional)**:
- `files`: Array of file paths to stage (relative to project root)
  - If omitted, stages all modified files with `git add -u`
  - Use explicit file list for selective commits

**Returns**:
```json
{
  "success": true,
  "commitHash": "620591a4",
  "fullHash": "620591a4f2...",
  "stagedFiles": "M  src/features/report_details/insights/PlayersPanelView.tsx",
  "output": "[ESO-569-remove-duplicate-roles 620591a4] ESO-569: Remove duplicate roles..."
}
```

---

### 3. `git_push_branch`

Pushes current branch to remote origin with upstream tracking and provides PR creation URL.

**Use Cases**:
- Publishing completed work
- Preparing for pull request creation
- Sharing work-in-progress with team

**Parameters**:
```json
{
  "force": false
}
```

**Parameters (Optional)**:
- `force`: Boolean (default: false)
  - Set to `true` for force push (use with caution!)
  - Only use when rebasing or amending published commits

**Returns**:
```json
{
  "success": true,
  "branch": "ESO-569-remove-duplicate-roles",
  "forced": false,
  "prUrl": "https://github.com/bkrupa/eso-log-aggregator/pull/new/ESO-569-remove-duplicate-roles",
  "message": "Branch pushed successfully. Create PR at: https://github.com/..."
}
```

**Behavior**:
- Automatically sets upstream tracking (`-u origin`)
- Extracts PR creation URL from git output
- Fails if branch is already up-to-date
- Detects current branch automatically

---

### 4. `git_rebase_tree`

Rebases child branches in a tree structure after a parent branch is squashed into main. Automatically handles commit skipping to avoid conflicts.

**Use Cases**:
- After squash-merging a parent branch into main
- Managing stacked branches with twig
- Avoiding duplicate commit conflicts during rebase
- Batch rebasing multiple child branches

**Parameters**:
```json
{
  "parentBranch": "ESO-449/structure-redux-state",
  "targetBranch": "master",
  "childBranches": [],
  "dryRun": false,
  "autoStash": true
}
```

**Parameters**:
- `parentBranch`: The branch that was squashed (required)
- `targetBranch`: Branch to rebase onto (default: "master")
- `childBranches`: Specific children to rebase (default: auto-detect)
- `dryRun`: Preview changes without executing (default: false)
- `autoStash`: Automatically stash/pop changes (default: true)

**Returns**:
```json
{
  "success": true,
  "dryRun": false,
  "parentBranch": "ESO-449/structure-redux-state",
  "targetBranch": "master",
  "commitsSkipped": 13,
  "skipCommitsList": ["abc123...", "def456...", "..."],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "branch": "ESO-461/establish-foundations",
      "success": true,
      "message": "Successfully rebased ESO-461/establish-foundations onto master",
      "commitsSkipped": 13
    },
    {
      "branch": "ESO-465/worker-results-keyed",
      "success": true,
      "message": "Successfully rebased ESO-465/worker-results-keyed onto master",
      "commitsSkipped": 13
    }
  ],
  "message": "Successfully rebased all 2 child branches onto master."
}
```

**Behavior**:
- Detects child branches using `twig tree`
- Identifies commits from parent that were squashed
- Reparents children to target branch
- Rebases while skipping squashed commits
- Handles conflicts gracefully

**See Also**: [TREE_REBASE_GUIDE.md](./TREE_REBASE_GUIDE.md) for detailed usage

---

## Complete Workflow Example

### Scenario: Implementing a Jira Work Item

**Agent Instructions**:
```
Implement ESO-569: Remove duplicate roles in the roles dropdown
```

**Agent Actions**:

1. **Transition Jira work item to "In Progress"**:
   ```bash
   acli jira workitem transition --key ESO-569 --status "In Progress"
   ```

2. **Create feature branch**:
   ```json
   Tool: git_create_branch
   {
     "branchName": "ESO-569-remove-duplicate-roles"
   }
   ```

3. **Make code changes** (using file editing tools)

4. **Commit changes**:
   ```json
   Tool: git_commit_changes
   {
     "message": "ESO-569: Remove duplicate roles in the roles dropdown\n\n- Removed redundant 'Damage Dealers' option\n- Updated RoleFilter type\n- Simplified filtering logic\n- Improved UX with clearer labels",
     "files": ["src/features/report_details/insights/PlayersPanelView.tsx"]
   }
   ```

5. **Push to remote**:
   ```json
   Tool: git_push_branch
   {
     "force": false
   }
   ```

6. **Transition Jira work item to "Done"**:
   ```bash
   acli jira workitem transition --key ESO-569 --status "Done"
   ```

**Result**: Complete contribution workflow automated from start to finish!

---

## Error Handling

### Common Errors and Solutions

#### Branch Already Exists
```json
{
  "success": true,
  "action": "checkout",
  "message": "Checked out existing branch: ESO-569-..."
}
```
**Solution**: Tool automatically checks out existing branch instead.

#### Nothing to Commit
```json
{
  "success": false,
  "error": "nothing to commit, working tree clean"
}
```
**Solution**: Verify files were modified before committing.

#### Push Rejected (Non-Fast-Forward)
```json
{
  "success": false,
  "error": "Updates were rejected because the tip of your current branch is behind"
}
```
**Solution**: Pull latest changes first or use `force: true` if intentional.

#### Merge Conflicts on Push
```json
{
  "success": false,
  "error": "automatic merge failed; fix conflicts and then commit the result"
}
```
**Solution**: Resolve conflicts manually or rebase branch.

---

## Integration with Other Tools

### Jira Integration

Combine git workflow tools with Jira CLI (`acli`):

```bash
# Start work
acli jira workitem transition --key ESO-XXX --status "In Progress"
# Use git_create_branch
# Make changes
# Use git_commit_changes
# Use git_push_branch
acli jira workitem transition --key ESO-XXX --status "Done"
```

### Testing Integration

Run tests before committing:

```json
Tool: run_unit_tests
Tool: run_smoke_tests
Tool: git_commit_changes  // Only if tests pass
```

### Linting/Formatting Integration

Format and lint before committing:

```json
Tool: run_format
Tool: run_lint
Tool: git_commit_changes  // Include formatting changes
```

---

## Best Practices

### 1. **Single Responsibility Commits**
- One logical change per commit
- Use multiple commits for complex features
- Makes code review easier

### 2. **Descriptive Branch Names**
- Always include Jira work item number
- Use clear, concise descriptions
- Follow kebab-case convention

### 3. **Quality Commit Messages**
- Start with work item number
- Write clear subject line
- Include bullet points for multi-change commits
- Reference related issues/PRs if applicable

### 4. **Test Before Commit**
- Run relevant tests before committing
- Verify no linting errors
- Check TypeScript compilation

### 5. **Regular Pushes**
- Push work regularly to backup progress
- Don't wait until work is "perfect"
- Use draft PRs for work-in-progress

### 6. **Branch Management**
- Delete branches after merge
- Keep branches focused on single task
- Rebase frequently to stay current

---

## AI Agent Usage Patterns

### Pattern 1: Complete Feature Implementation

```
1. Transition Jira → In Progress
2. Create branch
3. Implement feature
4. Run tests
5. Commit changes
6. Push branch
7. Transition Jira → Done
8. Notify user with PR URL
```

### Pattern 2: Incremental Development

```
1. Create branch
2. Implement part 1
3. Commit ("WIP: Part 1")
4. Implement part 2
5. Commit ("WIP: Part 2")
6. Final commit ("Complete feature")
7. Push branch
```

### Pattern 3: Bug Fix Workflow

```
1. Create branch (ESO-XXX-fix-bug-description)
2. Reproduce bug
3. Fix issue
4. Run regression tests
5. Commit with detailed explanation
6. Push branch
```

---

## Security Considerations

### Safe Practices

1. **Never commit sensitive data**:
   - No API keys, tokens, passwords
   - No authentication state files
   - Check `.gitignore` coverage

2. **Review before force push**:
   - Only use `force: true` when necessary
   - Understand rewrite implications
   - Coordinate with team

3. **Validate file paths**:
   - Use relative paths from project root
   - Verify files exist before staging
   - Check for unintended inclusions

### Protected Operations

The tools automatically:
- Escape commit messages to prevent injection
- Validate branch names
- Check for existing branches
- Provide detailed error messages

---

## Troubleshooting

### Debug Mode

Enable verbose git output:
```bash
GIT_TRACE=1 git <command>
```

### Manual Verification

Check tool results manually:
```bash
git branch              # Verify branch created
git log -1             # Verify commit
git status             # Check working tree
git remote -v          # Verify remote
```

### Reset if Needed

Undo commit (keep changes):
```bash
git reset --soft HEAD~1
```

Abandon branch:
```bash
git checkout main
git branch -D ESO-XXX-branch-name
```

---

## Future Enhancements

Potential additions:
- `git_create_pr`: Auto-create GitHub PR with template
- `git_squash_commits`: Squash multiple commits before push
- `git_tag_release`: Create and push version tags
- `git_cherry_pick`: Cherry-pick specific commits

---

## Related Documentation

- [Tree Rebase Guide](./TREE_REBASE_GUIDE.md) - Detailed guide for git_rebase_tree
- [AI Agent Guidelines](../documentation/ai-agents/AI_AGENT_GUIDELINES.md)
- [Jira Workflow](../documentation/ai-agents/jira/AI_JIRA_ACLI_INSTRUCTIONS.md)
- [Testing Tools](./TEST_EXECUTION_TOOLS.md)
- [Dev Workflow](./WORKFLOW_TOOLS.md)
