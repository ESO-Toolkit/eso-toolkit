# Jira-Branch Status Sync Script

Automatically synchronizes Jira ticket statuses with Git branch states to keep your project management up-to-date with your actual development work.

## 🎯 Purpose

This script analyzes your Git repository and updates Jira ticket statuses based on branch activity:

- **Branch exists remotely** → Move ticket to "In Progress"
- **Branch merged to main** → Move ticket to "Done"
- **Multiple branches for same ticket** → Use most recent branch
- **Branch deleted** → No action (ticket stays in current state)

## 📋 Prerequisites

### 1. Install Atlassian CLI (acli)

```powershell
# Using npm
npm install -g @atlassianlabs/jira-cli

# Or download from: https://bobswift.atlassian.net/wiki/spaces/ACLI/overview
```

### 2. Authenticate with Jira

```powershell
# Configure your Jira instance
acli --server https://bkrupa.atlassian.net --user your-email@example.com --password your-api-token

# Or set environment variables
$env:JIRA_HOST="bkrupa.atlassian.net"
$env:JIRA_EMAIL="your-email@example.com"
$env:JIRA_API_TOKEN="your-api-token"
```

**Get your API token**: https://id.atlassian.com/manage-profile/security/api-tokens

### 3. Verify Git Access

Ensure you have access to the remote repository:

```powershell
git fetch --all
git branch -r  # Should list remote branches
```

## 🚀 Usage

### Dry Run (Safe - Shows What Would Change)

```powershell
npm run sync-jira
```

This will:

- ✅ Scan all branches matching `ESO-XXX` pattern
- ✅ Check current Jira status for each ticket
- ✅ Show proposed status changes
- ❌ **NOT** make any actual changes

### Apply Changes

```powershell
npm run sync-jira:apply
```

This will:

- ✅ Analyze branches and tickets
- ✅ Display proposed changes
- ⚠️ **Actually update Jira tickets**
- ✅ Show success/failure for each update

### Verbose Mode (Detailed Logging)

```powershell
npm run sync-jira:verbose
```

Shows additional debugging information including:

- Git command outputs
- Jira API responses
- Decision-making logic

## 📊 Status Transition Rules

| Branch State     | Current Jira Status    | New Status      | Condition                  |
| ---------------- | ---------------------- | --------------- | -------------------------- |
| Exists remotely  | To Do, Backlog         | **In Progress** | Branch pushed to remote    |
| Merged to main   | In Progress, In Review | **Done**        | Branch merged successfully |
| Deleted          | Any                    | No change       | Branch removed from remote |
| Stale (30+ days) | In Progress            | **To Do**       | No commits in 30 days      |

## 🔍 How It Works

### 1. **Branch Discovery**

```powershell
git branch -r --format="%(refname:short)|%(committerdate:iso8601)"
```

- Finds all remote branches matching `ESO-XXX` pattern
- Extracts ticket ID from branch name
- Records last commit date

### 2. **Merge Status Check**

```powershell
git branch -r --merged origin/main
```

- Checks if branch has been merged to main
- Handles both `master` and `main` branches

### 3. **Jira Status Query**

```typescript
const ticket = await getJiraTicket(ticketId);
// Returns: { key, status, summary }
```

### 4. **Rule Evaluation**

```typescript
if (branch.isRemote && !branch.isMerged && ticket.status === 'To Do') {
  proposedStatus = 'In Progress';
}
```

### 5. **Status Transition**

```typescript
await updateJiraTicketStatus(ticketId, newStatus);
// Uses Jira Transitions API
```

## 📝 Example Output

### Dry Run

```
╔═══════════════════════════════════════════════════════════════╗
║         Jira-Branch Status Sync Script                        ║
╚═══════════════════════════════════════════════════════════════╝

🔍 DRY RUN MODE - No changes will be made

🔗 Connected to: bkrupa.atlassian.net

📂 Fetching Git branches...
   Found 15 ESO-XXX branches

🔍 Analyzing branches and Jira tickets...

   ESO-372: In Progress - Replay System Architecture Improvements
   ESO-449: Done - Fix scribing detection for signature scripts
   ESO-569: To Do - Implement multiplayer path rendering

📋 Proposed Status Updates:

════════════════════════════════════════════════════════════════

ESO-569
  Current:  To Do
  Proposed: In Progress
  Reason:   Branch ESO-569/multiplayer-path exists and is active
  Branch:   origin/ESO-569/multiplayer-path

════════════════════════════════════════════════════════════════

Total updates: 1

✨ Done!
```

### Apply Mode

```
🚀 Applying updates...

✅ ESO-569: To Do → In Progress

════════════════════════════════════════════════════════════════

✅ Success: 1

✨ Done!
```

## ⚙️ Configuration

Edit [`scripts/sync-jira-status.ts`](sync-jira-status.ts) to customize:

```typescript
// Status transitions
const STATUS_TRANSITIONS = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

// Stale branch threshold
const STALE_DAYS = 30;

// Default branch
const DEFAULT_BRANCH = 'main';
```

## 🛡️ Safety Features

1. **Dry Run by Default** - Must explicitly use `--apply` to make changes
2. **Transaction Validation** - Checks for available transitions before attempting
3. **Error Handling** - Graceful failures with detailed error messages
4. **Rollback Safe** - Each update is independent; partial failures don't break the entire run

## 🚨 Troubleshooting

### Issue: "Missing Jira credentials"

```
❌ Error: Missing Jira credentials
Please set JIRA_EMAIL and JIRA_API_TOKEN environment variables
```

**Solution:**

```powershell
$env:JIRA_EMAIL="your-email@example.com"
$env:JIRA_API_TOKEN="your-api-token"
```

### Issue: "No transition available"

```
⚠️  No transition available from current status to "In Progress" for ESO-123
```

**Solution:** The Jira workflow doesn't allow this transition. Check your workflow in Jira settings.

### Issue: "Branch not found in Jira"

```
⚠️  ESO-999 - Ticket not found in Jira
```

**Solution:** Either:

- Ticket doesn't exist (typo in branch name?)
- You don't have permission to view it
- Ticket is in a different project

### Issue: "Failed to get transitions"

```
Error updating ESO-123: Failed to get transitions: HTTP 401
```

**Solution:** Re-authenticate with Jira:

```powershell
acli --server https://bkrupa.atlassian.net --user your-email --password your-api-token
```

## 🔗 Integration with CI/CD

### GitHub Actions

```yaml
name: Sync Jira Statuses
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0 # Full history for branch analysis

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Sync Jira Statuses
        env:
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        run: npm run sync-jira:apply
```

### Pre-Push Hook

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Checking Jira status sync..."
npm run sync-jira

exit 0  # Don't block push, just inform
```

## 📚 Related Documentation

- [Jira API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Git Branch Management](https://git-scm.com/docs/git-branch)
- [Atlassian CLI Documentation](https://bobswift.atlassian.net/wiki/spaces/ACLI/overview)

## 🤝 Contributing

When modifying this script:

1. Test in dry-run mode first
2. Test with a single ticket before batch operations
3. Add error handling for new failure modes
4. Update this README with new features

## 📄 License

Part of the ESO Toolkit project.
