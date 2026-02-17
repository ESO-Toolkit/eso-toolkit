# ESO-438: Add CI Check for "Waiting on Parent" and "Do Not Merge" Labels

## 📋 JIRA Ticket
- **Key**: ESO-438
- **Type**: Task
- **Summary**: Add a CI check to make sure the PR doesn't have the waiting on parent or do not merge labels
- **Status**: To Do → In Progress

## 🎯 Objective
Implement a CI check that prevents PRs from being merged if they have blocking labels, specifically:
- "do not merge" / "do-not-merge"
- "wip" / "work in progress"
- "waiting on parent" / "waiting-on-parent" (NEW)

## ✅ Implementation

### 1. Updated GitHub Actions Workflow (`.github/workflows/pr-checks.yml`)

**Changes:**
- Updated job name from "Check for Do Not Merge label" to "Check for Do Not Merge or Waiting on Parent labels"
- Added "waiting on parent" and "waiting-on-parent" to the blocking labels list
- Enhanced error message to show all matched blocking labels
- Improved success message for clarity

**Before:**
```javascript
const doNotMergeLabels = ['do not merge', 'do-not-merge', 'wip', 'work in progress'];
```

**After:**
```javascript
const doNotMergeLabels = ['do not merge', 'do-not-merge', 'wip', 'work in progress', 'waiting on parent', 'waiting-on-parent'];
```

**Enhanced Error Message:**
```javascript
core.setFailed(`❌ This PR has blocking label(s): ${matchedLabels.join(', ')}. The PR cannot be merged until these labels are removed.`);
```

### 2. Updated Merge Queue Configuration (`scripts/merge-queue/config.json`)

**Changes:**
- Added "waiting on parent" and "waiting-on-parent" to the blocking labels array

**Before:**
```json
"blocking": ["do not merge", "do-not-merge", "wip", "work in progress", "needs review"]
```

**After:**
```json
"blocking": ["do not merge", "do-not-merge", "wip", "work in progress", "needs review", "waiting on parent", "waiting-on-parent"]
```

### 3. Updated Documentation (`documentation/MERGE_QUEUE.md`)

**Changes:**
- Updated the Labels table to include "waiting on parent" in the blocking labels description

**Before:**
```markdown
| `do not merge`, `wip`, etc. | Blocking labels | Prevent PR from being merged |
```

**After:**
```markdown
| `do not merge`, `wip`, `waiting on parent`, etc. | Blocking labels | Prevent PR from being merged |
```

## 🔍 Testing Strategy

The implementation will be automatically tested when:

1. **On PR Label Changes**: The workflow triggers on `labeled` and `unlabeled` events
2. **On PR Updates**: The workflow triggers on `opened`, `synchronize`, and `reopened` events
3. **Manual Testing**: Apply "waiting on parent" label to a test PR to verify the check fails

### Test Scenarios:
- ✅ PR without any blocking labels → Check passes
- ✅ PR with "do not merge" label → Check fails
- ✅ PR with "wip" label → Check fails
- ✅ PR with "waiting on parent" label → Check fails (NEW)
- ✅ PR with "waiting-on-parent" label → Check fails (NEW)
- ✅ Multiple blocking labels → Check fails with all labels listed

## 📝 Files Modified

1. `.github/workflows/pr-checks.yml` - CI workflow configuration
2. `scripts/merge-queue/config.json` - Merge queue configuration
3. `documentation/MERGE_QUEUE.md` - Documentation update

## 🚀 Deployment

This change will take effect immediately after merging to master:
- The CI check will run on all new PRs
- The CI check will run when labels are added/removed from existing PRs
- The merge queue will respect the new blocking labels

## ✨ Benefits

1. **Prevents Premature Merging**: PRs marked as "waiting on parent" cannot be accidentally merged
2. **Clear Communication**: Developers can clearly signal when a PR depends on another PR
3. **Automated Enforcement**: No manual intervention needed to prevent merging
4. **Consistency**: Both GitHub Actions and merge queue scripts respect the same labels
5. **Better Error Messages**: Shows which specific labels are blocking the merge

## 📊 Impact

- **Low Risk**: Additive change only, no existing functionality removed
- **High Value**: Prevents dependency issues and premature merges
- **No Breaking Changes**: Existing PRs without these labels are unaffected
- **Backward Compatible**: Works with both "waiting on parent" and "waiting-on-parent" label formats

## 🔗 Related Documentation

- GitHub Actions workflow: `.github/workflows/pr-checks.yml`
- Merge queue documentation: `documentation/MERGE_QUEUE.md`
- Merge queue configuration: `scripts/merge-queue/config.json`

---

**Implementation Date**: October 16, 2025
**Implemented By**: GitHub Copilot AI Assistant
**Status**: Ready for Review ✅
