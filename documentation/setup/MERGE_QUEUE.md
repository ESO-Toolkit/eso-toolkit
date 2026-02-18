# 🎯 Merge Queue System

An automated merge queue system that uses GitHub's merge button API to automatically merge pull requests when all requirements are met.

## 🚀 Quick Start

### 1. Add a PR to the Queue

```bash
# Add PR to standard queue
npm run queue:add 123

# Add PR with priority
npm run queue:add 456 --priority
```

### 2. Check Queue Status

```bash
npm run queue:status
```

### 3. Manual Queue Processing

```bash
npm run queue:process
```

## 📋 Labels

| Label | Purpose | Description |
|-------|---------|-------------|
| `merge-queue` | Standard queue | PR will be merged when ready |
| `auto-merge` | Priority queue | High-priority merge with priority processing |
| `priority`, `hotfix`, `critical` | Priority flags | Move PR to front of queue |
| `do not merge`, `wip`, `waiting on parent`, etc. | Blocking labels | Prevent PR from being merged |

## ⚙️ How It Works

1. **Label Detection**: PRs with `merge-queue` or `auto-merge` labels are added to the queue
2. **Requirements Check**: System verifies all requirements are met:
   - All required status checks pass ✅
   - Required approvals received ✅
   - No merge conflicts ✅
   - No blocking labels ✅
   - Branch protection rules satisfied ✅
3. **Auto-Merge**: Uses GitHub's merge button API to merge the PR
4. **Retry Logic**: Automatically retries when conditions change

## 🔧 Configuration

The merge queue respects all repository settings:

- **Merge Method**: Uses repository's default merge method (merge, squash, or rebase)
- **Branch Protection**: Honors all branch protection rules
- **Required Checks**: Configurable list of required status checks
- **Required Reviews**: Configurable number of required approvals

### Required Status Checks

Current configuration requires these checks to pass:

```javascript
const REQUIRED_CHECKS = [
  'build',
  'lint', 
  'format',
  'test',
  'typecheck',
  'build-storybook',
  'playwright-smoke',
  'check-do-not-merge-label'
];
```

## 🎮 CLI Commands

### Add PR to Queue
```bash
npm run queue:add <pr_number> [--priority]
```

Examples:
```bash
npm run queue:add 123              # Add PR #123 to queue
npm run queue:add 456 --priority   # Add PR #456 with priority
```

### Remove PR from Queue
```bash
npm run queue:remove <pr_number>
```

### Check Queue Status
```bash
npm run queue:status
```

Output example:
```
📋 MERGE QUEUE STATUS
==================================================

1. ✅ PR #123 🔥 PRIORITY
   Title: Fix critical bug in authentication
   Author: developer1
   Status: Ready to merge
   Labels: auto-merge, priority, bug

2. ❌ PR #124
   Title: Add new feature
   Author: developer2
   Status: Waiting for checks to complete: test, playwright-smoke
   Labels: merge-queue, feature
```

### Trigger Manual Processing
```bash
npm run queue:process
```

### Show Help
```bash
npm run queue:help
```

## 🤖 Automatic Processing

The merge queue is automatically triggered by:

- **Label Changes**: When `merge-queue` or `auto-merge` labels are added/removed
- **Status Updates**: When CI checks complete
- **Review Changes**: When PR reviews are submitted
- **PR Updates**: When PRs are synchronized or reopened

## 📝 Status Updates

The merge queue provides detailed status updates via PR comments:

### ⏳ Queued Status
```
⏳ Merge Queue Status: QUEUED

Reason: Waiting for checks to complete: test, playwright-smoke
```

### ✅ Ready Status  
```
✅ Merge Queue Status: READY

Reason: All requirements met, attempting merge...
```

### ❌ Blocked Status
```
❌ Merge Queue Status: BLOCKED

Reason: PR has merge conflicts
```

### 🎉 Merged Status
```
🎉 Auto-Merged via Merge Queue

This PR was automatically merged using GitHub's merge button because:
- All required checks passed ✅
- Required reviews were approved ✅
- No blocking labels present ✅
- Branch protection rules satisfied ✅

Merge method: squash
Commit SHA: abc123def456
```

## 🔒 Security & Safety

### Branch Protection Rules
- The merge queue **respects all branch protection rules**
- It uses GitHub's native merge API, which enforces the same rules as clicking the merge button manually
- If branch protection requires additional checks or approvals, the merge will fail safely

### Safety Checks
- ✅ Verifies PR is in mergeable state
- ✅ Checks for merge conflicts
- ✅ Validates required status checks
- ✅ Confirms required approvals
- ✅ Respects blocking labels
- ✅ Honors repository merge method settings

### Error Handling
- Detailed error messages with helpful suggestions
- Automatic retry when conditions change
- No risk of bypassing repository protections

## 🛠️ Troubleshooting

### Common Issues

**PR not merging despite being in queue:**
1. Check that all required status checks have passed
2. Ensure required approvals are present
3. Verify no merge conflicts exist
4. Check for blocking labels

**Merge queue not processing:**
1. Verify the PR has the correct label (`merge-queue` or `auto-merge`)
2. Check GitHub Actions logs for errors
3. Ensure `GITHUB_TOKEN` has sufficient permissions

**Permission errors:**
1. The workflow needs `contents: write` and `pull-requests: write` permissions
2. Repository settings must allow the merge method being used

### Manual Processing
If automatic processing fails, you can trigger it manually:

```bash
npm run queue:process
```

### Configuration Updates
To modify the required checks or other settings, update the configuration in:
- `.github/workflows/merge-queue.yml` (main workflow)
- `scripts/merge-queue/config.json` (CLI configuration)

## 🎯 Best Practices

1. **Use Priority Labels**: Add `priority`, `hotfix`, or `critical` labels for urgent PRs
2. **Keep Queue Small**: Don't queue too many PRs at once to avoid conflicts
3. **Update Branches**: Keep PR branches up-to-date with the target branch
4. **Monitor Status**: Check queue status regularly with `npm run queue:status`
5. **Remove When Not Ready**: Remove PRs from queue if they need more work

## 📊 Queue Processing Logic

```
1. Get all open PRs with merge-queue labels
2. Sort by priority (priority labels first, then by creation date)
3. For each PR in order:
   a. Check if all requirements are met
   b. If ready: attempt merge using GitHub API
   c. If not ready: update status and continue to next PR
   d. If merge succeeds: stop processing (one at a time)
   e. If merge fails: update status with error details
4. Automatic retry when any PR conditions change
```

## 🔧 Environment Variables

For CLI usage, set these environment variables:

```bash
export GITHUB_TOKEN="your_github_token"
export GITHUB_REPOSITORY_OWNER="ESO-Toolkit"
export GITHUB_REPOSITORY_NAME="eso-toolkit"
```

Or the script will attempt to detect them from git remotes automatically.

## 📈 Metrics & Monitoring

The merge queue provides insights through:

- **GitHub Actions logs**: Detailed processing information
- **PR comments**: Real-time status updates  
- **CLI status**: Current queue state and PR readiness
- **Error reporting**: Detailed error messages with helpful suggestions

## 🔄 Integration with Existing Workflows

The merge queue integrates seamlessly with your existing CI/CD:

- ✅ Works with all existing GitHub Actions workflows
- ✅ Respects branch protection rules
- ✅ Uses same merge methods as manual merging
- ✅ Preserves commit history and authorship
- ✅ Compatible with required status checks
- ✅ Works with CODEOWNERS requirements

---

## 🛠️ Initial Setup

### 1. Add Labels to Repository

Create these labels in your GitHub repository (Settings → Labels):

| Label Name | Color | Description |
|------------|-------|-------------|
| `merge-queue` | `#0e8a16` | PR is in the standard merge queue |
| `auto-merge` | `#d73a49` | PR is in the priority merge queue |
| `priority` | `#ff6b6b` | High priority PR |
| `hotfix` | `#ff9f43` | Urgent hotfix |
| `critical` | `#ee5a24` | Critical issue fix |

### 2. Set Environment Variables (for CLI)

```bash
# Windows PowerShell
$env:GITHUB_TOKEN = "your_github_personal_access_token"

# Linux/macOS
export GITHUB_TOKEN="your_github_personal_access_token"
```

The `GITHUB_TOKEN` needs: read access to repository, write access to pull requests, issues (for comments), and contents (for merging).

### 3. Repository Settings

Ensure your repository has:
- Branch protection enabled on main/master branch
- Required status checks configured
- Merge methods enabled (squash, merge, or rebase)
- Actions permissions set to allow workflows

---

*For issues or feature requests, please create a GitHub issue or contact the development team.*