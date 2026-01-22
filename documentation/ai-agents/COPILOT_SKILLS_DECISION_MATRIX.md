# Agent Documentation to Copilot Skills - Decision Matrix

**Date**: January 22, 2026  
**Purpose**: Quick reference for determining skill conversion suitability

---

## 📋 Evaluation Criteria

Each document is evaluated on 5 criteria:

1. **Operational** - Contains repeatable, executable operations (not just knowledge)
2. **Automatable** - Operations can be automated via CLI/API calls
3. **Frequent** - Operations performed regularly (not one-time setup)
4. **Structured Output** - Can provide consistent, parseable results
5. **AI-Friendly** - Results beneficial for AI decision-making

**Scoring**: ✅ Yes (1 point) | ⚠️ Partial (0.5 points) | ❌ No (0 points)

**Threshold**: 4+ points = Good candidate | 3-3.5 = Maybe | <3 = Not suitable

---

## 📊 Evaluation Matrix

| Document | Operational | Automatable | Frequent | Structured Output | AI-Friendly | Score | Recommendation |
|----------|-------------|-------------|----------|-------------------|-------------|-------|----------------|
| **Jira (acli) Instructions** | ✅ | ✅ | ✅ | ✅ | ✅ | **5.0** | ⭐⭐⭐ **Priority 1** |
| **Report Data Debugging** | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4.5** | ⭐⭐ **Priority 2** |
| **Playwright Instructions** | ✅ | ✅ | ✅ | ✅ | ✅ | **5.0** | ✅ **Already Done** |
| **Git Workflow (Extended)** | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4.5** | ⭐ **Priority 3** |
| **Scribing Detection** | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | **1.5** | ❌ **Not Suitable** |
| **Preloading System** | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | **1.0** | ❌ **Not Suitable** |
| **Agent Guidelines** | ❌ | ❌ | ❌ | ❌ | ⚠️ | **0.5** | ❌ **Not Suitable** |
| **Agent Setup Summary** | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | **1.0** | ❌ **Not Suitable** |
| **Logger Mock** | ❌ | ❌ | ❌ | ❌ | ⚠️ | **0.5** | ❌ **Not Suitable** |

---

## 🎯 Priority 1: Jira (acli) Integration

**Score**: 5.0 / 5.0 ⭐⭐⭐

### Why It Scores High
- ✅ **Operational**: View tickets, search, transition, comment, link
- ✅ **Automatable**: `acli` CLI provides consistent interface
- ✅ **Frequent**: Used in every feature development cycle
- ✅ **Structured Output**: JSON/text output easily parseable
- ✅ **AI-Friendly**: Enables AI to understand requirements and track progress

### Example Use Cases
```
✅ Get ticket requirements before coding
✅ Search for related work items
✅ Update ticket status after commit
✅ Add implementation notes as comments
✅ Track epic progress
✅ Link related tickets
```

### Tools to Implement (8)
1. `jira_view_workitem` - Get ticket details
2. `jira_search_workitems` - JQL search
3. `jira_transition_workitem` - Change status
4. `jira_comment_workitem` - Add comments
5. `jira_link_workitems` - Link tickets
6. `jira_get_epic_status` - Epic progress
7. `jira_assign_workitem` - Assign tickets
8. `jira_update_story_points` - Update estimates

### Implementation Complexity
- **Backend**: Wrapper functions for `acli` commands
- **Parsing**: JSON/text parsing of acli output
- **Error Handling**: Network issues, invalid tickets, transitions
- **Estimated Effort**: 2-3 days

### Impact
- **High**: Enables complete Jira → Git → PR → Jira workflow automation
- **ROI**: High - used constantly by AI agents

---

## 🎯 Priority 2: Report Data Debugging

**Score**: 4.5 / 5.0 ⭐⭐

### Why It Scores High
- ✅ **Operational**: Download, analyze, search events
- ✅ **Automatable**: `npm run script` interface available
- ✅ **Frequent**: Every production bug investigation
- ✅ **Structured Output**: JSON files with consistent schema
- ⚠️ **AI-Friendly**: Good for debugging, less for decision-making

### Example Use Cases
```
✅ Download production report for local analysis
✅ Search for specific abilities/events
✅ Compare two reports to find differences
✅ Analyze event sequences for bugs
✅ Validate scribing detection issues
```

### Tools to Implement (5)
1. `download_report_data` - Download full report
2. `download_fight_data` - Download single fight
3. `analyze_report_structure` - Report summary
4. `search_events` - Find specific events
5. `compare_reports` - Diff two reports

### Implementation Complexity
- **Backend**: Wrapper for existing download script
- **Analysis**: Event parsing and searching algorithms
- **Comparison**: Diff logic for reports/fights
- **Estimated Effort**: 3-4 days

### Impact
- **Medium-High**: Speeds up production debugging significantly
- **ROI**: Medium - used for bug fixes, not feature work

---

## 🎯 Priority 3: Extended Git Workflow

**Score**: 4.5 / 5.0 ⭐

### Why It Scores High
- ✅ **Operational**: Branch management, rebasing, PR status
- ✅ **Automatable**: Git/twig CLI, GitHub API
- ✅ **Frequent**: Every feature branch and PR
- ✅ **Structured Output**: Git porcelain output, GitHub JSON
- ⚠️ **AI-Friendly**: Good for automation, less for understanding

### Example Use Cases
```
✅ View branch dependency tree (twig)
✅ Set parent branch for feature branches
✅ Interactive rebase on master
✅ Check PR status, reviews, CI checks
```

### Tools to Implement (4)
1. `git_twig_tree` - Branch tree visualization
2. `git_twig_depend` - Set branch dependencies
3. `git_rebase_interactive` - Rebase workflow
4. `git_check_pr_status` - PR status/checks

### Implementation Complexity
- **Backend**: Git/twig CLI wrappers
- **Parsing**: Git porcelain output, GitHub API
- **Error Handling**: Merge conflicts, rebase issues
- **Estimated Effort**: 1-2 days

### Impact
- **Medium**: Completes git workflow, especially for branch stacking
- **ROI**: Medium - frequently used but lower complexity

---

## ❌ Not Suitable: Scribing Detection System

**Score**: 1.5 / 5.0

### Why It Scores Low
- ❌ **Operational**: Mostly knowledge documentation
- ❌ **Automatable**: No direct operations to automate
- ⚠️ **Frequent**: Only when working on scribing features
- ⚠️ **Structured Output**: Documentation, not data
- ⚠️ **AI-Friendly**: Good for learning, not execution

### Better Use
- **Reference Material**: AI agents read this to understand system
- **Code Generation Context**: Helps write scribing detection code
- **Testing Guidance**: Informs what to test

### Why Not a Skill?
- Scribing testing already covered by existing test execution tools
- Knowledge docs don't translate to executable operations
- Better as context for code generation than as tools

---

## ❌ Not Suitable: Preloading System

**Score**: 1.0 / 5.0

### Why It Scores Low
- ❌ **Operational**: Architecture documentation
- ❌ **Automatable**: Design patterns, not operations
- ⚠️ **Frequent**: Only during preloading feature work
- ❌ **Structured Output**: Documentation, not data
- ⚠️ **AI-Friendly**: Good for architecture understanding

### Better Use
- **Architecture Reference**: Understand preloading design
- **Implementation Guide**: How to implement preloading
- **Design Patterns**: Patterns for data loading

### Why Not a Skill?
- No executable operations to automate
- Architecture knowledge, not workflow automation
- Better as reference for feature development

---

## ❌ Not Suitable: Agent Guidelines

**Score**: 0.5 / 5.0

### Why It Scores Low
- ❌ **Operational**: Policy and best practices
- ❌ **Automatable**: Human judgment required
- ❌ **Frequent**: Read once, applied always
- ❌ **Structured Output**: Policy text
- ⚠️ **AI-Friendly**: Important context, not executable

### Better Use
- **Onboarding**: New AI agents read this first
- **Policy Reference**: What to do and not do
- **Best Practices**: Documentation standards

### Why Not a Skill?
- Policy enforcement requires human judgment
- No operations to automate
- Better as context for AI agent behavior

---

## ❌ Not Suitable: Agent Setup Summary

**Score**: 1.0 / 5.0

### Why It Scores Low
- ⚠️ **Operational**: One-time setup steps
- ⚠️ **Automatable**: Some CLI commands, but one-time
- ❌ **Frequent**: Only during initial setup
- ❌ **Structured Output**: Setup instructions
- ❌ **AI-Friendly**: Not useful after setup complete

### Better Use
- **Initial Setup**: New developer/agent onboarding
- **Environment Configuration**: Tool installation
- **Validation**: Ensure environment is ready

### Why Not a Skill?
- One-time setup, not recurring workflow
- Most setup is manual (install Node, configure editor)
- No ongoing operational value

---

## 📊 Summary Recommendations

### ✅ Convert to Skills (Score 4.0+)

| Priority | Document | Score | Effort | Impact | ROI |
|----------|----------|-------|--------|--------|-----|
| **P1** | Jira (acli) | 5.0 | Medium | High | ⭐⭐⭐ |
| **P2** | Report Debugging | 4.5 | Medium-High | Medium-High | ⭐⭐ |
| **P3** | Git Workflow | 4.5 | Low-Medium | Medium | ⭐ |

### ✅ Already Converted

| Document | Score | Status |
|----------|-------|--------|
| Playwright | 5.0 | ✅ `.copilot/` & `.claude/` |

### ❌ Keep as Reference (Score <3.0)

| Document | Score | Reason |
|----------|-------|--------|
| Scribing Detection | 1.5 | Domain knowledge |
| Preloading System | 1.0 | Architecture docs |
| Agent Guidelines | 0.5 | Policy/best practices |
| Agent Setup | 1.0 | One-time setup |
| Logger Mock | 0.5 | Technical implementation |

---

## 🎯 Decision Framework

Use this flowchart to evaluate future documentation:

```
                          Start
                            |
                            v
                  [Is it operational?]
                   /            \
                 No              Yes
                 |                |
                 v                v
          Keep as     [Can it be automated?]
          Reference      /            \
                       No              Yes
                       |                |
                       v                v
                 Keep as       [Used frequently?]
                 Reference       /            \
                               No              Yes
                               |                |
                               v                v
                         Maybe - Low    [Structured output?]
                         Priority          /            \
                                         No              Yes
                                         |                |
                                         v                v
                                   Maybe -        [AI-friendly?]
                                   Medium            /      \
                                   Priority        No       Yes
                                                   |         |
                                                   v         v
                                             Medium    HIGH PRIORITY
                                             Priority  Convert to Skill!
```

---

## 📋 Next Steps

1. ✅ Review this decision matrix
2. ⬜ Approve Priority 1 (Jira) for implementation
3. ⬜ Create implementation ticket in Jira
4. ⬜ Design Jira skill architecture
5. ⬜ Implement and test
6. ⬜ Evaluate success before Priority 2

---

**Last Updated**: January 22, 2026  
**Related Docs**:
- [COPILOT_SKILLS_ANALYSIS.md](COPILOT_SKILLS_ANALYSIS.md) - Full analysis
- [COPILOT_SKILLS_QUICK_SUMMARY.md](COPILOT_SKILLS_QUICK_SUMMARY.md) - Quick summary
- [COPILOT_SKILLS_ECOSYSTEM.md](COPILOT_SKILLS_ECOSYSTEM.md) - Ecosystem diagram
