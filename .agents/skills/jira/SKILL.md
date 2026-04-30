---
name: jira
description: Manage Jira work items for the ESO project. View, create, transition, comment on, link, assign, and search tickets using MCP Atlassian tools or the Atlassian CLI (acli) fallback. Use this for any Jira-related task.
---

You are a Jira integration assistant for the ESO Log Aggregator project.

## Project Details

- **Project Key**: `ESO`
- **Board**: https://bkrupa.atlassian.net

## Tool Selection

**Prefer MCP Atlassian tools** when available — they provide structured responses, handle authentication automatically, and work across all agent clients:

| Operation | MCP Tool (preferred) | CLI Fallback (`acli`) |
|-----------|---------------------|----------------------|
| View ticket | `getJiraIssue` | `acli jira workitem view ESO-XXX` |
| Create ticket | `createJiraIssue` | `acli jira workitem create ...` |
| Edit ticket | `editJiraIssue` | `acli jira workitem edit ...` |
| Transition | `transitionJiraIssue` (use `getTransitionsForJiraIssue` first) | `acli jira workitem transition ...` |
| Comment | `addCommentToJiraIssue` | `acli jira workitem comment create ...` |
| Search | `searchJiraIssuesUsingJql` | `acli jira workitem search --jql "..."` |
| Link issues | `createIssueLink` (use `getIssueLinkTypes` first) | `acli jira workitem link ...` |
| Look up user | `lookupJiraAccountId` | N/A |

**Fall back to `acli`** only when MCP Atlassian tools are not available in the current session.

## Prerequisites Check (CLI fallback only)

If using `acli`, verify it is available:
```powershell
acli --version
acli jira auth status
```

If not authenticated: `acli jira auth login`

## Viewing a Work Item

```powershell
acli jira workitem view ESO-XXX
```

Returns: key, type, summary, status, description, assignee, story points, timestamps.

## Creating a Work Item

```powershell
# Task (default type)
acli jira workitem create --project ESO --summary "Your summary here" --type Task

# With description
acli jira workitem create --project ESO --summary "Summary" --type Task --description "Details..."

# Assign to self
acli jira workitem create --project ESO --summary "Summary" --type Task --assignee "@me"

# Bug
acli jira workitem create --project ESO --summary "Bug description" --type Bug
```

## Transitioning Status

Common transition names:
- `"To Do"` → `"In Progress"` → `"In Review"` → `"Done"`

```powershell
acli jira workitem transition --key ESO-XXX --status "In Progress"
acli jira workitem transition --key ESO-XXX --status "In Review"
acli jira workitem transition --key ESO-XXX --status "Done"
```

## Adding a Comment

```powershell
acli jira workitem comment create --key ESO-XXX --body "Your comment here"
```

For multi-line comments, use a here-string:
```powershell
$comment = @'
Implementation complete.

- Updated Redux state structure
- Added unit tests
- PR: https://github.com/...
'@
acli jira workitem comment create --key ESO-XXX --body $comment
```

## Searching (JQL)

```powershell
# All open ESO tasks
acli jira workitem search --jql "project = ESO AND status != Done ORDER BY created DESC"

# Issues in an epic
acli jira workitem search --jql "\"Epic Link\" = ESO-368 AND status != Done"

# Unassigned issues
acli jira workitem search --jql "project = ESO AND assignee IS EMPTY AND status != Done"

# My open issues
acli jira workitem search --jql "project = ESO AND assignee = currentUser() AND status != Done"
```

## Linking Work Items

```powershell
acli jira workitem link ESO-XXX ESO-YYY --type "depends on"
acli jira workitem link ESO-XXX ESO-YYY --type "blocks"
acli jira workitem link ESO-XXX ESO-YYY --type "relates to"
```

## Epic Status

```powershell
acli jira workitem search --jql "\"Epic Link\" = ESO-368" --fields summary,status,assignee
```

## Assigning a Work Item

```powershell
# Assign to self
acli jira workitem assign ESO-XXX --assignee "@me"

# Unassign
acli jira workitem assign ESO-XXX --assignee ""
```

## Updating Story Points

```powershell
acli jira workitem edit ESO-XXX --custom-field story_points=3
```

## Typical Workflow for a Jira Ticket

1. View the ticket: `acli jira workitem view ESO-XXX`
2. Transition to In Progress: `acli jira workitem transition --key ESO-XXX --status "In Progress"`
3. [Do the work]
4. Transition to In Review: `acli jira workitem transition --key ESO-XXX --status "In Review"`
5. Add PR comment with link
6. After merge, transition to Done: `acli jira workitem transition --key ESO-XXX --status "Done"`

## Troubleshooting

- `acli jira auth login` — re-authenticate if commands fail with 401
- Jira keys must be `PROJECT-NUMBER` format (e.g., `ESO-372`)
- Work item type names: Task, Bug, Story (case-sensitive)
