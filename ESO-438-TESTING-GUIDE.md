# ESO-438: Testing Guide

## 🧪 How to Test the Implementation

### Automated Testing (Recommended)

The CI check will automatically run on all PRs. To test:

1. **Create a test PR** or use an existing one
2. **Add the "waiting on parent" label** to the PR
3. **Observe the CI check** - should fail with the message:
   ```
   ❌ This PR has blocking label(s): waiting on parent. The PR cannot be merged until these labels are removed.
   ```
4. **Remove the label** - CI check should pass:
   ```
   ✅ No blocking labels found. PR can proceed.
   ```

### Test Cases

#### ✅ Test Case 1: No Blocking Labels
- **Setup**: PR without any blocking labels
- **Expected**: `check-do-not-merge-label` job passes
- **Message**: "✅ No blocking labels found. PR can proceed."

#### ❌ Test Case 2: "waiting on parent" Label
- **Setup**: PR with "waiting on parent" label
- **Expected**: `check-do-not-merge-label` job fails
- **Message**: "❌ This PR has blocking label(s): waiting on parent. The PR cannot be merged until these labels are removed."

#### ❌ Test Case 3: "waiting-on-parent" Label (Alternative Format)
- **Setup**: PR with "waiting-on-parent" label
- **Expected**: `check-do-not-merge-label` job fails
- **Message**: "❌ This PR has blocking label(s): waiting-on-parent. The PR cannot be merged until these labels are removed."

#### ❌ Test Case 4: "do not merge" Label (Existing)
- **Setup**: PR with "do not merge" label
- **Expected**: `check-do-not-merge-label` job fails
- **Message**: "❌ This PR has blocking label(s): do not merge. The PR cannot be merged until these labels are removed."

#### ❌ Test Case 5: Multiple Blocking Labels
- **Setup**: PR with "waiting on parent" and "wip" labels
- **Expected**: `check-do-not-merge-label` job fails
- **Message**: "❌ This PR has blocking label(s): waiting on parent, wip. The PR cannot be merged until these labels are removed."

#### ✅ Test Case 6: Label Removed
- **Setup**: PR initially with blocking label, then label removed
- **Expected**: CI re-runs and `check-do-not-merge-label` job passes
- **Message**: "✅ No blocking labels found. PR can proceed."

### Workflow Triggers

The check runs automatically when:
- ✅ PR is opened
- ✅ PR is synchronized (new commits pushed)
- ✅ PR is reopened
- ✅ Label is added to PR
- ✅ Label is removed from PR

### Manual Testing Commands

```powershell
# View the workflow file
cat .github/workflows/pr-checks.yml

# View the merge queue config
cat scripts/merge-queue/config.json

# Check git status
git status

# View the commit
git log --oneline -1
git show HEAD
```

## 🔍 Verification Checklist

- [x] Workflow file updated with new blocking labels
- [x] Merge queue config updated with new blocking labels
- [x] Documentation updated
- [x] Implementation summary created
- [x] Changes committed to branch
- [ ] PR created (next step)
- [ ] CI checks pass on PR
- [ ] Manual testing with "waiting on parent" label
- [ ] Peer review completed
- [ ] Merged to master

## 📋 All Blocking Labels

The following labels will block a PR from being merged:

1. `do not merge`
2. `do-not-merge`
3. `wip`
4. `work in progress`
5. `needs review`
6. `waiting on parent` ⭐ NEW
7. `waiting-on-parent` ⭐ NEW

## 🎯 Expected Behavior

### Before This Change
- PRs with "waiting on parent" label could be merged (potentially causing issues)

### After This Change
- PRs with "waiting on parent" label are blocked from merging
- Clear error message shows which labels are blocking
- Labels can be in any format (spaces or hyphens)

## 🚀 Next Steps

1. **Push the branch**: `git push origin HEAD`
2. **Create a PR**: Through GitHub UI or CLI
3. **Test the CI check**: Add/remove labels to verify behavior
4. **Request review**: Tag appropriate reviewers
5. **Monitor CI**: Ensure all checks pass
6. **Merge**: Once approved and all checks pass

---

**Ready for PR Creation**: ✅
**Branch**: ESO-438/add-a-ci-check-to-make-sure-the-pr-doesn-t-have-the-waiting-on-parent-or-do-not-merge-labels
**Commit**: 45c7f39
