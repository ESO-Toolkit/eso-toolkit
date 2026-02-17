# 🚀 Merge Queue Setup Guide

Quick guide to set up and start using the merge queue system.

## ⚡ Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```
   The `@octokit/rest` dependency is already added to `package.json`.

2. **Verify Workflow**
   The merge queue workflow is already configured in `.github/workflows/merge-queue.yml`.

## 🎯 First Use

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

### 3. Test the Queue

```bash
# Check queue status (should be empty initially)
npm run queue:status

# Show help
npm run queue:help
```

## 🧪 Testing

### Test with a Sample PR

1. **Create a test PR** or use an existing one
2. **Add to queue**:
   ```bash
   npm run queue:add <pr_number>
   ```
3. **Check status**:
   ```bash
   npm run queue:status
   ```
4. **Watch it work**: The PR will be automatically merged when all checks pass

### Verify Integration

1. **Check GitHub Actions**: Go to Actions tab in your repository
2. **Look for "Merge Queue" workflow**: Should trigger when you add labels
3. **Monitor PR comments**: Should see status updates on the PR

## ⚙️ Configuration

### Required Checks

Update the required checks in `.github/workflows/merge-queue.yml`:

```javascript
const REQUIRED_CHECKS = [
  'build',           // ← Your build check
  'lint',            // ← Your linting check  
  'test',            // ← Your test suite
  'typecheck',       // ← TypeScript checking
  // Add or remove checks as needed
];
```

### Repository Settings

Ensure your repository has:

- ✅ **Branch protection enabled** on main/master branch
- ✅ **Required status checks** configured
- ✅ **Merge methods enabled** (squash, merge, or rebase)
- ✅ **Actions permissions** set to allow workflows

## 🎮 Usage Examples

### Basic Usage
```bash
# Add PR to queue
npm run queue:add 123

# Check what's in the queue
npm run queue:status

# Remove PR from queue if needed
npm run queue:remove 123
```

### Priority Usage
```bash
# Add urgent PR with priority
npm run queue:add 456 --priority

# Or add priority label manually in GitHub UI
# The queue will automatically prioritize it
```

### Manual Processing
```bash
# Force process the queue (useful for debugging)
npm run queue:process
```

## 🔧 Troubleshooting Setup

### Common Setup Issues

**1. Workflow not triggering:**
- Check that workflow file exists: `.github/workflows/merge-queue.yml`
- Verify Actions are enabled in repository settings
- Ensure workflow has proper permissions

**2. CLI commands failing:**
- Set `GITHUB_TOKEN` environment variable
- Check token has repository access
- Verify you're in the correct directory

**3. PRs not merging:**
- Ensure all required status checks pass
- Check branch protection rules are satisfied
- Verify PR has no merge conflicts

### Permissions Needed

The `GITHUB_TOKEN` needs these permissions:
- ✅ **Read access** to repository
- ✅ **Write access** to pull requests
- ✅ **Write access** to issues (for comments)
- ✅ **Write access** to contents (for merging)

## 📚 Next Steps

1. **Read the full documentation**: `documentation/MERGE_QUEUE.md`
2. **Customize the configuration**: Update required checks and settings
3. **Train your team**: Share the usage guide with developers
4. **Monitor and iterate**: Watch how it works and adjust as needed

## 🆘 Need Help?

- **Check logs**: GitHub Actions logs show detailed processing info
- **Review documentation**: Full docs in `documentation/MERGE_QUEUE.md`
- **Test with CLI**: Use `npm run queue:status` to debug
- **Create an issue**: For bugs or feature requests

---

✅ **You're all set!** The merge queue is ready to automatically merge your PRs when they're ready.