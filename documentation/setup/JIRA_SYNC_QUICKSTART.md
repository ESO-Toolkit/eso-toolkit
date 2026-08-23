# Jira-Branch Status Sync - Quick Start

✅ **Script created**: [`scripts/sync-jira-status.ts`](../../scripts/sync-jira-status.ts)
✅ **Documentation**: [`scripts/README-sync-jira-status.md`](../../scripts/README-sync-jira-status.md)
✅ **Commands added** to [`package.json`](../../package.json)

## 🚀 Quick Commands

```powershell
# Dry run (safe - shows what would change)
npm run sync-jira

# Apply changes to Jira
npm run sync-jira:apply

# Verbose logging
npm run sync-jira:verbose
```

## ⚠️ Before First Use

### 1. Install Atlassian CLI

```powershell
npm install -g @atlassianlabs/jira-cli
```

### 2. Authenticate with Jira

```powershell
acli jira auth login
```

Or set environment variables:

```powershell
$env:JIRA_EMAIL="your-email@example.com"
$env:JIRA_API_TOKEN="your-api-token"
```

Get API token: https://id.atlassian.com/manage-profile/security/api-tokens

## 📊 What It Does

| Branch State             | Jira Status        | Action            |
| ------------------------ | ------------------ | ----------------- |
| Remote branch exists     | To Do/Backlog      | → **In Progress** |
| Branch merged to main    | In Progress/Review | → **Done**        |
| No activity for 30+ days | In Progress        | → **To Do**       |
| Branch deleted           | Any                | No change         |

## 📝 Example Usage

```powershell
PS> npm run sync-jira

╔═══════════════════════════════════════╗
║   Jira-Branch Status Sync             ║
╚═══════════════════════════════════════╝

🔍 DRY RUN MODE - No changes will be made

📂 Found 15 ESO-XXX branches

📋 Proposed Updates:
  ESO-569: To Do → In Progress
    Branch: origin/ESO-569/multiplayer-path
    Reason: Active branch on remote

Total updates: 1
```

## 🛡️ Safety Features

- ✅ Dry run by default (must use `:apply` to make changes)
- ✅ Validates transitions before applying
- ✅ Graceful error handling
- ✅ Detailed logging in verbose mode

## 📚 Full Documentation

See [README-sync-jira-status.md](../../scripts/README-sync-jira-status.md) for:

- Detailed configuration options
- Troubleshooting guide
- CI/CD integration examples
- Custom status transition rules

## 🔗 Related

- Jira Board: https://bkrupa.atlassian.net
- Project: ESO
- Branch pattern: `ESO-XXX/description`
