# ESO Log Aggregator - Agent Documentation (CSV Format)

## Overview
Project: ESO Log Aggregator - React-based web application for analyzing Elder Scrolls Online (ESO) combat logs
Features: data visualization, real-time analytics, comprehensive testing infrastructure, AI-assisted development

## 📚 Documentation Navigation

**NEW STRUCTURE**: Documentation has been reorganized! See [documentation/INDEX.md](documentation/INDEX.md) for complete navigation.

**Quick Access**:
- **AI Agent Guidelines**: [documentation/ai-agents/AI_AGENT_GUIDELINES.md](documentation/ai-agents/AI_AGENT_GUIDELINES.md) - **START HERE**
- **AI Agent Guides**: [documentation/ai-agents/](documentation/ai-agents/)
- **Jira Integration Skill**: [.copilot-jira/README.md](.copilot-jira/README.md) - **NEW!** Automated Jira workflows
- **Report Debugging Skill**: [.copilot-reports/README.md](.copilot-reports/README.md) - **NEW!** Production data debugging
- **Git Workflow Skill**: [.copilot-git/README.md](.copilot-git/README.md) - **NEW!** Branch management and PR status
- **Testing & Dev Skill**: [.copilot/README.md](.copilot/README.md) - Testing, formatting, git automation
- **Feature Docs**: [documentation/features/](documentation/features/)
- **Architecture**: [documentation/architecture/](documentation/architecture/)
- **Complete Guide**: [documentation/AGENTS.md](documentation/AGENTS.md)
- **VS Code MCP Playwright Tool**: For structured test execution - use this tool for running existing Playwright test suites, discovering test files, and viewing test results within VS Code.
- **GitHub Copilot Agent Skills**:
  - **Testing & Dev** (.copilot/): Playwright testing, dev workflow automation, interactive debugging. See [.copilot/README.md](.copilot/README.md)
  - **Jira Integration** (.copilot-jira/): Automated work item management. See [.copilot-jira/README.md](.copilot-jira/README.md)
  - **Report Debugging** (.copilot-reports/): Download and analyze production report data. See [.copilot-reports/README.md](.copilot-reports/README.md)
  - **Git Workflow** (.copilot-git/): **NEW!** Branch management with twig and PR status. See [.copilot-git/README.md](.copilot-git/README.md)
- **Claude Agent Skills**:
  - **Testing & Dev** (.claude/): For Claude Desktop users - equivalent MCP server for interactive testing sessions. See [.claude/README.md](.claude/README.md)
  - **Jira Integration** (.claude-jira/): Automated work item management for Claude. See [.claude-jira/README.md](.claude-jira/README.md)
  - **Report Debugging** (.claude-reports/): Production data debugging for Claude. See [.claude-reports/README.md](.claude-reports/README.md)
  - **Git Workflow** (.claude-git/): **NEW!** Branch management with twig and PR status for Claude. See [.claude-git/README.md](.claude-git/README.md)

---

## ⚠️ AI Agent Guidelines

**READ THIS FIRST**: [AI_AGENT_GUIDELINES.md](documentation/ai-agents/AI_AGENT_GUIDELINES.md)

**Key Points**:
- ❌ Don't create summary docs for minor changes
- ✅ Only document significant features/architecture changes
- 💬 Be concise - ask before extensive work
- 📝 Use code comments and clear commit messages for simple changes
- 🧪 **Testing Strategy**:
  - **Structured Testing**: Use VS Code MCP Playwright tool for running test suites and managing test files
  - **Exploratory Testing**: Use GitHub Copilot Agent Skills (.copilot/) or Claude Agent Skills (.claude/) for ad-hoc testing, quick verification, and interactive debugging
  - **Avoid**: Ad-hoc CLI commands for one-off testing scenarios
- 🎫 **Jira Management**: Use Jira Agent Skill (.copilot-jira/ or .claude-jira/) for work item operations
  - Natural language: `@workspace View ESO-372`
  - Automated workflows: View ticket → Create branch → Implement → Test → Commit → Push → Update Jira
  - **Avoid**: Manual `acli` commands (deprecated for AI agents)
- � **Report Debugging**: Use Report Debugging Skill (.copilot-reports/ or .claude-reports/) for production issues
  - Natural language: `@workspace Download report 3gjVGWB2dxCL8XAw`
  - Workflows: Download → Analyze → Search → Debug
  - **Avoid**: Manual `npm run script` commands- 🌿 **Git Workflow**: Use Git Workflow Skill (.copilot-git/ or .claude-git/) for branch management
  - Natural language: `@workspace Show branch tree`
  - Workflows: Visualize branches → Set dependencies → Cascade changes → Rebase → Check PR status
  - **Key Feature**: Non-interactive cascade for safe AI automation
  - **Requires**: twig (`npm install -g @gittwig/twig`) and GitHub CLI (for PR operations)- �🔧 When interacting with GitHub, Sentry, or GitKraken workflows, prefer the corresponding MCP servers and tools instead of manual web or CLI steps

---

## 🤖 Agent Skills for Local Testing (January 2026)

**NEW**: Agent Skills (MCP Servers) for interactive Playwright testing with local authentication!

**Two Implementations**:
- **[.copilot/](.copilot/)** - GitHub Copilot (VS Code) implementation
- **[.claude/](.claude/)** - Claude Desktop implementation

Both provide the same 16 tools for comprehensive testing and development workflow automation.

📖 **Full Documentation**:
- **[.copilot/README.md](.copilot/README.md)** - GitHub Copilot setup and usage
- **[.claude/README.md](.claude/README.md)** - Claude Desktop setup and usage

**Quick Start (GitHub Copilot)**:
```powershell
# Install dependencies
cd .copilot
npm install

# Configuration is already set in .vscode/settings.json
# Reload VS Code window to activate the skill
```

**Quick Start (Claude Desktop)**:
```powershell
# Install dependencies
cd .claude
npm install

# Configure Claude Desktop (see .claude/README.md for full instructions)
# Restart Claude Desktop to load the skill
```

**Key Features**:
- **Authenticated Testing**: Use local OAuth tokens from `tests/auth-state.json`
- **Playwright Integration**: Full browser automation with AI assistance
- **Interactive Exploration**: Ad-hoc testing with Claude's guidance
- **Screenshot Capture**: Visual verification of UI states
- **Element Inspection**: Verify elements exist and are visible
- **Dev Server Management**: Start/stop dev server as background process

**Available Tools** (16 total):
- **Dev Server**: `start_dev_server`, `stop_dev_server`, `dev_server_status`
- **E2E Testing**: `run_smoke_tests`, `run_full_tests`, `run_nightly_tests`, `run_authenticated_test`
- **Unit Testing**: `run_unit_tests` (with optional coverage)
- ***For Copilot**: VS Code with GitHub Copilot extension + `.vscode/settings.json` configured (already set up)
4. **For Claude**: Claude Desktop with MCP server configured in `claude_desktop_config.json`
- **Navigation**: `navigate_and_verify`, `take_screenshot`, `check_element`
- **Auth**: `get_auth_status`

**Use Cases**:
- Quick feature verification without writing full test files
- Exploratory testing with AI-guided scenarios
- Visual inspection and screenshot comparison
- Debugging authentication and UI issues
- Rapid prototyping of test scenarios
- Background dev server management (start/stop without blocking terminal)

**Prerequisites**:
1. Valid `tests/auth-state.json` with OAuth token (run `npm run test:nightly:all` to generate)
2. Development server (can be started via `start_dev_server` tool)
3. Claude Desktop with MCP server configured OR GitHub Copilot (VS Code) with Agent Skill configured

---

## 🎫 Jira Integration Skill (January 2026)

**NEW**: Automated Jira work item management through AI Agent Skills!

**Two Implementations**:
- **[.copilot-jira/](.copilot-jira/)** - GitHub Copilot (VS Code) implementation
- **[.claude-jira/](.claude-jira/)** - Claude Desktop implementation

Both provide 8 tools for comprehensive Jira automation.

📖 **Full Documentation**:
- **[.copilot-jira/README.md](.copilot-jira/README.md)** - GitHub Copilot Jira skill
- **[documentation/ai-agents/jira/AI_JIRA_INTEGRATION_GUIDE.md](documentation/ai-agents/jira/AI_JIRA_INTEGRATION_GUIDE.md)** - Complete guide

**Quick Start**:
```powershell
# Install dependencies
cd .copilot-jira
npm install

# Configuration is added to .vscode/settings.json
# Reload VS Code window to activate
```

**Available Tools** (8 total):
- **jira_view_workitem** - Get ticket details
- **jira_search_workitems** - Find tickets with JQL queries
- **jira_transition_workitem** - Change status (To Do → In Progress → Done)
- **jira_comment_workitem** - Add comments (markdown supported)
- **jira_link_workitems** - Create relationships between tickets
- **jira_get_epic_status** - Track epic progress and completion
- **jira_assign_workitem** - Assign work to team members
- **jira_update_story_points** - Update estimates

**Natural Language Usage**:
```
@workspace View ESO-372
@workspace Find all To Do tasks in ESO
@workspace Move ESO-569 to "In Progress"
@workspace Add comment to ESO-569: Implementation complete
```

**Complete Workflow Example**:
```
@workspace Implement ESO-569

Automated steps:
1. View ticket (get requirements)
2. Create git branch
3. [Make code changes]
4. Run tests + quality checks
5. Commit and push
6. Transition to "In Review"
7. Add PR link comment
```

**Prerequisites**:
1. Atlassian CLI (acli) installed and authenticated
2. Access to ESO Jira project (https://bkrupa.atlassian.net)
3. GitHub Copilot or Claude Desktop configured

**Previous Method**: Manual `acli` commands are **deprecated for AI agents** (see `.deprecated` files in `documentation/ai-agents/jira/`)

---

## 📊 Project Information

**REQUIRED**: All AI agents must use the Jira Agent Skill for work item management (see above).

📖 **Full Documentation**:
- **[.copilot-jira/README.md](.copilot-jira/README.md)** - Jira Agent Skill for GitHub Copilot
- **[.claude-jira/README.md](.claude-jira/README.md)** - Jira Agent Skill for Claude Desktop
- **[documentation/ai-agents/jira/AI_JIRA_INTEGRATION_GUIDE.md](documentation/ai-agents/jira/AI_JIRA_INTEGRATION_GUIDE.md)** - Complete integration guide

**Quick Start** (using Agent Skill):
```
@workspace View ESO-372
@workspace Find all To Do tasks in ESO
@workspace Move ESO-394 to "In Progress"
@workspace Move ESO-394 to "Done"
```

**Alternative (Manual acli)** - Deprecated for AI agents:
```powershell
# Use Agent Skill instead (see above)
# Manual commands kept for reference only
acli jira workitem view ESO-372
acli jira workitem transition --key ESO-394 --status "In Progress"
```

**Epic**: ESO-368 - Replay System Architecture Improvements  
**Project Board**: https://bkrupa.atlassian.net

---

## �🆕 Scribing Detection System (October 2025)

**CRITICAL DISCOVERY**: Signature scripts appear in different event types!

📖 **Full Documentation**:
- **[documentation/ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md](documentation/ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)** - Complete guide
- **[documentation/ai-agents/scribing/AI_SCRIBING_QUICK_REFERENCE.md](documentation/ai-agents/scribing/AI_SCRIBING_QUICK_REFERENCE.md)** - Quick reference
- **[documentation/features/scribing/](documentation/features/scribing/)** - Feature documentation

**Key Insight**: Always check **ALL event types** (cast, damage, healing, buff, debuff, **resource**) when searching for signature scripts. Example: Anchorite's Potency appears as resource events, not combat events!

**Test Coverage**: 38 tests passing, fully validated against Fight 11 combat logs.

---

## 🐛 Report Data Debugging (January 2026)

**NEW**: Debug production issues by downloading and analyzing live report data with Agent Skills!

**Agent Skill Available**: Use `.copilot-reports/` or `.claude-reports/` for automated report debugging

📖 **Full Documentation**:
- **[.copilot-reports/README.md](.copilot-reports/README.md)** - GitHub Copilot skill documentation
- **[.claude-reports/README.md](.claude-reports/README.md)** - Claude Desktop skill documentation
- **[documentation/ai-agents/AI_REPORT_DATA_DEBUGGING.md](documentation/ai-agents/AI_REPORT_DATA_DEBUGGING.md)** - Complete guide
- **[documentation/ai-agents/AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md](documentation/ai-agents/AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md)** - Quick reference

**Quick Start (Agent Skill)**:
```
@workspace Download report data for 3gjVGWB2dxCL8XAw
@workspace Analyze structure of report 3gjVGWB2dxCL8XAw
@workspace Search for "Anchorite's Potency" in resource events of fight 32
@workspace Compare fight 32 and fight 35 in report 3gjVGWB2dxCL8XAw
```

**Alternative (Manual Script)**:
```powershell
# Download full report (all fights)
npm run script -- scripts/download-report-data.ts <report-code>

# Download single fight
npm run script -- scripts/download-report-data.ts <report-code> <fight-id>
```

**Output Location**: `data-downloads/<report-code>/`

**Available Tools** (5 total):
- **download_report_data**: Download complete report (all fights)
- **download_fight_data**: Download specific fight only (faster)
- **analyze_report_structure**: Get summary of downloaded data
- **search_events**: Search for specific events by ability/actor
- **compare_fights**: Compare two fights for differences

**Key Features**:
- Download all event types (damage, healing, buffs, debuffs, casts, resources, deaths)
- Separate friendly/hostile buff/debuff files for detailed analysis
- Chronologically ordered events (all-events.json)
- Master data with actors and abilities for cross-referencing
- Metadata tracking for pagination and download verification
- Event searching with filtering and limits
- Fight comparison for debugging inconsistencies

**Common Use Cases**:
- Debug missing damage/healing calculations
- Analyze buff/debuff uptime issues
- Investigate scribing detection problems (check ALL event types!)
- Review death causes and combat flow
- Validate event timing and sequencing

---

## 🌿 Git Workflow Management (January 2026)

**NEW**: Advanced branch management with twig and GitHub PR status checking with Agent Skills!

**Agent Skill Available**: Use `.copilot-git/` or `.claude-git/` for Git workflow automation

📖 **Full Documentation**:
- **[.copilot-git/README.md](.copilot-git/README.md)** - GitHub Copilot skill documentation
- **[.claude-git/README.md](.claude-git/README.md)** - Claude Desktop skill documentation

**Quick Start (Agent Skill)**:
```
@workspace Show branch tree
@workspace Set ESO-488 to depend on ESO-449
@workspace Cascade branch changes with force push
@workspace Cascade branch changes (dry run)
@workspace Start interactive rebase on master
@workspace Check PR status for current branch
```

**Prerequisites**:
```powershell
# Install twig globally
npm install -g @gittwig/twig

# Install and authenticate GitHub CLI (for PR status)
winget install GitHub.cli
gh auth login
```

**Available Tools** (5 total):
- **git_twig_tree**: Show branch dependency tree with stacking relationships
- **git_twig_depend**: Set parent-child branch dependencies
- **git_twig_cascade**: Non-interactive cascade changes through dependent branches
- **git_rebase_interactive**: Get interactive rebase instructions and guidance
- **git_check_pr_status**: Check PR review status, CI checks, and mergability

**Key Features**:
- Branch stacking visualization with twig
- Dependency management for feature branches
- Non-interactive cascade for safe AI automation (avoids terminal prompts)
- Interactive rebase guidance with conflict resolution
- PR status monitoring (reviews, CI, mergability)
- Input validation for branch names and repos
- Error recovery with step-by-step suggestions
- GitHub CLI integration for PR operations

**Common Use Cases**:
- Set up feature branch stacking (ESO-449 → ESO-488 → ESO-463)
- Cascade changes through stacked branches automatically
- Fix orphaned branches
- Clean up commit history before PR
- Monitor PR readiness and CI status
- Understand complex branch hierarchies

---

Category,Item,Type,Description,Configuration_File,Command,Directory,Notes
repository_info,project_name,string,ESO Log Aggregator,,,,"React-based web application for ESO combat log analysis"
repository_info,primary_features,list,"data visualization, real-time analytics, testing infrastructure",,,,"Core application capabilities"
tech_stack,frontend_framework,dependency,React 19+ with TypeScript,package.json,,,"Main UI framework"
tech_stack,build_tool,dependency,Vite 6.3+ with SWC,vite.config.mjs,,,"Modern build tool with HMR"
tech_stack,state_management,dependency,Redux Toolkit with Redux Persist,package.json,,src/store,"State management solution"
tech_stack,routing,dependency,React Router DOM v7,package.json,,,"Client-side routing"
tech_stack,graphql,dependency,Apollo Client with Code Generation,codegen.yml,,src/graphql,"GraphQL client and type generation"
tech_stack,ui_library_1,dependency,Material-UI (MUI) v7,package.json,,,"Primary UI component library"
tech_stack,ui_library_2,dependency,Emotion for styling,package.json,,,"CSS-in-JS styling solution"
tech_stack,ui_library_3,dependency,React Three Fiber for 3D visualization,package.json,,,"3D graphics rendering"
tech_stack,ui_library_4,dependency,Chart.js for data visualization,package.json,,,"Data visualization charts"
tech_stack,testing_framework_1,dependency,Jest,jest.config.cjs,,tests,"Unit and integration testing"
tech_stack,testing_framework_2,dependency,Playwright,playwright.nightly.config.ts,,tests,"End-to-end testing; integrate with VS Code MCP Playwright tool"
tech_stack,testing_framework_3,dependency,Testing Library,package.json,,,"Component testing utilities"
tech_stack,code_quality_1,dependency,ESLint 9,eslint.config.js,,,"Code linting"
tech_stack,code_quality_2,dependency,Prettier,package.json,,,"Code formatting"
tech_stack,code_quality_3,dependency,TypeScript,tsconfig.json,,,"Static type checking"
tech_stack,documentation,dependency,Storybook,.storybook,,,"Component documentation"
tech_stack,monitoring,dependency,Sentry,package.json,,,"Error tracking and monitoring"
tech_stack,deployment,platform,GitHub Pages,package.json,,,"Production deployment platform"
directory_structure,src,directory,Main application source code,,,,
directory_structure,tests,directory,End-to-end tests (Playwright),,,,"Manage and launch via VS Code MCP Playwright tool"
directory_structure,public,directory,Static assets and HTML template,,,,
directory_structure,scripts,directory,Build and utility scripts,,,,
directory_structure,documentation,directory,Technical documentation,,,,
directory_structure,data,directory,Static data files (abilities.json),,,,
directory_structure,.storybook,directory,Storybook configuration,,,,
directory_structure,coverage,directory,Test coverage reports (generated),,,,
directory_structure,build,directory,Production build output (generated),,,,
directory_structure,playwright-report,directory,Playwright test reports (generated),,,,"Review outputs from VS Code MCP Playwright tool runs"
config_file,package.json,json,Dependencies and scripts,package.json,,,"Project configuration and dependencies"
config_file,vite.config.mjs,javascript,Vite build configuration,vite.config.mjs,,,"Build tool configuration"
config_file,jest.config.cjs,javascript,Jest testing configuration,jest.config.cjs,,,"Unit test configuration"
config_file,playwright.nightly.config.ts,typescript,Playwright E2E test configurations,playwright.nightly.config.ts,,,"End-to-end test configuration; consumed by VS Code MCP Playwright tool and CLI"
config_file,eslint.config.js,javascript,ESLint linting rules,eslint.config.js,,,"Code linting configuration"
config_file,tsconfig.json,json,TypeScript configuration,tsconfig.json,,,"TypeScript compiler configuration"
config_file,codegen.yml,yaml,GraphQL code generation,codegen.yml,,,"GraphQL type generation configuration"
config_file,Makefile,makefile,Cross-platform build commands,Makefile,,,"Cross-platform build automation"
tool,vite,build_tool,Modern build tool with HMR,vite.config.mjs,,,"React SWC, SVGR plugins, path aliases"
tool,typescript,compiler,Static typing,tsconfig.json,,,"Main config and type checking"
tool,eslint,linter,Code linting (Flat config format),eslint.config.js,,,"React, TypeScript, Import resolution plugins"
tool,jest,test_framework,Unit & Integration Testing,jest.config.cjs,,,"Main, Coverage, Smoke, CRA compatibility configs"
tool,playwright,test_framework,End-to-End Testing,playwright.nightly.config.ts,,,"Launch via VS Code MCP Playwright tool; Nightly, Smoke, Screen Size configs with sharding support"
tool,testing_library,test_utility,Component testing utilities,package.json,,,"React component testing helpers"
tool,prettier,formatter,Code formatting,package.json,,,"Automatic code formatting"
tool,apollo_client,graphql_client,GraphQL client,package.json,,,"GraphQL queries and mutations"
tool,graphql_codegen,generator,Auto-generates TypeScript types,codegen.yml,,,"Generates hooks and typed document nodes"
command,install_deps,development,Install dependencies,,npm ci,,"Install project dependencies"
command,start_dev,development,Start development server,,npm run dev,,"Start local development server"
command,start_dev_alt,development,Start development server (alternative),,npm start,,"Alternative command to start dev server"
command,generate_types,development,Generate GraphQL types,,npm run codegen,,"Required after schema changes"
command,type_check,development,Type checking,,npm run typecheck,,"TypeScript compilation check"
command,lint,development,Linting,,npm run lint,,"ESLint code analysis"
command,lint_fix,development,Linting with auto-fix,,npm run lint:fix,,"ESLint with automatic fixes"
command,format,development,Code formatting,,npm run format,,"Format code with Prettier"
command,format_check,development,Check code formatting,,npm run format:check,,"Check if code is properly formatted"
command,test_unit,testing,Unit tests (changed files only),,npm test,,"Run tests on changed files"
command,test_all,testing,All tests,,npm run test:all,,"Run all unit tests"
command,test_watch,testing,Watch mode,,npm run test:watch,,"Run tests in watch mode"
command,test_changed,testing,Only changed files,,npm run test:changed,,"Run tests on changed files only"
command,test_coverage,testing,Generate coverage report,,npm run test:coverage,,"Generate test coverage report"
command,coverage_open,testing,Open coverage report,,npm run coverage:open,,"Open coverage report in browser"
command,coverage_full,testing,Complete coverage workflow,,npm run coverage:full,,"Complete coverage workflow"

command,test_nightly_all,testing,Nightly tests (all browsers),,npm run test:nightly:all,,"Comprehensive cross-browser testing; prefer launching via VS Code MCP Playwright tool"
command,test_nightly_chromium,testing,Nightly tests (Chromium),,npm run test:nightly:chromium,,"Nightly tests in Chromium; prefer launching via VS Code MCP Playwright tool"
command,test_nightly_firefox,testing,Nightly tests (Firefox),,npm run test:nightly:firefox,,"Nightly tests in Firefox; prefer launching via VS Code MCP Playwright tool"
command,test_nightly_webkit,testing,Nightly tests (WebKit),,npm run test:nightly:webkit,,"Nightly tests in WebKit; prefer launching via VS Code MCP Playwright tool"
command,test_smoke,testing,Smoke tests (unit and E2E),,npm run test:smoke,,"Quick validation tests; use VS Code MCP Playwright tool for E2E coverage"
command,test_smoke_unit,testing,Smoke tests (unit only),,npm run test:smoke:unit,,"Quick unit test validation"
command,test_smoke_e2e,testing,Smoke tests (E2E only),,npm run test:smoke:e2e,,"Quick E2E test validation; launch via VS Code MCP Playwright tool"
command,test_full,testing,Full E2E test suite (all non-nightly tests),,npm run test:full,,"Comprehensive E2E testing for releases; launch via VS Code MCP Playwright tool"
command,test_full_headed,testing,Full E2E test suite (headed mode),,npm run test:full:headed,,"Run full suite with visible browser; launch via VS Code MCP Playwright tool"
command,test_full_report,testing,View full test suite report,,npm run test:full:report,,"Open HTML report for full suite; generated by VS Code MCP Playwright tool runs or CLI"
command,test_performance,testing,Performance benchmarking tests,,npm run test:performance,,"Core Web Vitals and performance metrics; launch via VS Code MCP Playwright tool"
command,test_performance_report,testing,View performance test report,,npm run test:performance:report,,"Open performance test HTML report; pair with VS Code MCP Playwright tool runs"
command,build,build,Production build,,npm run build,,"Create production build"
command,preview,build,Preview production build,,npm run preview,,"Preview production build locally"
command,analyze,build,Bundle analysis,,npm run analyze,,"Analyze bundle size"
command,analyze_bundle,build,Bundle analysis (detailed),,npm run analyze-bundle,,"Detailed bundle analysis"
command,make_help_ps,cross_platform,Show all available commands,,.\make.ps1 help,,"PowerShell make commands help"
command,make_dev_ps,cross_platform,Start development server,,.\make.ps1 dev,,"PowerShell start dev server"
command,make_test_ps,cross_platform,Run tests,,.\make.ps1 test,,"PowerShell run tests"
command,make_build_ps,cross_platform,Production build,,.\make.ps1 build,,"PowerShell production build"
command,make_clean_ps,cross_platform,Clean build artifacts,,.\make.ps1 clean,,"PowerShell clean artifacts"
command,make_help,cross_platform,Show all available commands,,make help,,"Unix/Linux make commands help"
command,make_dev,cross_platform,Start development server,,make dev,,"Unix/Linux start dev server"
command,make_test,cross_platform,Run tests,,make test,,"Unix/Linux run tests"
command,make_build,cross_platform,Production build,,make build,,"Unix/Linux production build"
command,make_clean,cross_platform,Clean build artifacts,,make clean,,"Unix/Linux clean artifacts"
command,coverage_analyze,utility,Coverage analysis,,npm run coverage:analyze,scripts,"Analyze test coverage"
command,coverage_badges,utility,Coverage badges,,npm run coverage:badges,scripts,"Generate coverage badges"
command,analyze_bundle_util,utility,Bundle analysis,,npm run analyze-bundle,scripts,"Bundle size analysis"
command,fetch_abilities,utility,Data fetching,,npm run fetch-abilities,scripts,"Fetch ESO abilities data"
command,download_report_data,utility,Download report data,,npm run download-report-data,scripts,"Download report data files"
command,health_check,utility,Health checks,,npm run health-check,scripts,"System health validation"
command,generate_version,utility,Version management,,node scripts/generate-version.cjs,scripts,"Generate version information"
command,clean_version,utility,Version cleanup,,node scripts/clean-version.cjs,scripts,"Clean version files"
command,test_nightly_shard1,sharding,Manual sharding (shard 1),,npm run test:nightly:shard1,,"Parallel execution shard 1; trigger via VS Code MCP Playwright tool when coordinating runs"
command,test_nightly_shard2,sharding,Manual sharding (shard 2),,npm run test:nightly:shard2,,"Parallel execution shard 2; trigger via VS Code MCP Playwright tool when coordinating runs"
command,test_nightly_shard3,sharding,Manual sharding (shard 3),,npm run test:nightly:shard3,,"Parallel execution shard 3; trigger via VS Code MCP Playwright tool when coordinating runs"
command,test_nightly_sharded,sharding,Automated sharding,,npm run test:nightly:sharded,,"Automated parallel execution; manage via VS Code MCP Playwright tool where possible"
file_organization,components,directory,UI components,,,src/components,"React UI components"
file_organization,features,directory,Feature-specific code,,,src/features,"Feature modules"
file_organization,store,directory,Redux state management,,,src/store,"Redux store and slices"
file_organization,types,directory,TypeScript type definitions,,,src/types,"TypeScript type definitions"
file_organization,utils,directory,Utility functions,,,src/utils,"Utility and helper functions"
file_organization,graphql,directory,GraphQL queries and mutations,,,src/graphql,"GraphQL queries, mutations, generated types"
path_alias,@/,alias,Root source directory,tsconfig.json,,,"Maps to src/ directory"
path_alias,@components/,alias,Components directory,tsconfig.json,,,"Maps to src/components/ directory"
path_alias,@utils/,alias,Utils directory,tsconfig.json,,,"Maps to src/utils/ directory"
path_alias,@store/,alias,Store directory,tsconfig.json,,,"Maps to src/store/ directory"
testing_strategy,unit_tests,strategy,Jest for component and utility testing,jest.config.cjs,,,"Component and utility testing"
testing_strategy,integration_tests,strategy,Testing Library for component integration,package.json,,,"Component integration testing"
testing_strategy,e2e_tests,strategy,Playwright for full user workflows,playwright.nightly.config.ts,,,"End-to-end user workflow testing; prefer VS Code MCP Playwright tool for execution"
testing_strategy,smoke_tests,strategy,Quick validation of critical paths,playwright.smoke.config.ts,,,"Quick critical path validation; start runs from VS Code MCP Playwright tool when possible"
testing_strategy,nightly_tests,strategy,Comprehensive cross-browser testing,playwright.nightly.config.ts,,,"Comprehensive cross-browser validation; initiate via VS Code MCP Playwright tool for guided sharding"
code_quality_workflow,validate,workflow,TypeScript + ESLint + Prettier,,npm run validate,,"Complete validation workflow"
code_quality_workflow,typecheck,workflow,TypeScript compilation check,,npm run typecheck,,"TypeScript compilation validation"
code_quality_workflow,lint_check,workflow,ESLint analysis,,npm run lint,,"Code quality analysis"
code_quality_workflow,format_validation,workflow,Prettier formatting check,,npm run format:check,,"Code formatting validation"
ci_cd,pr_checks,workflow,Automated testing and validation,.github/workflows,,,"GitHub Actions PR validation"
ci_cd,deploy,workflow,Production deployment to GitHub Pages,.github/workflows,,,"Automated deployment"
ci_cd,coverage_reporting,workflow,Automated coverage reporting with badges,.github/workflows,,,"Coverage tracking and badges"
ci_cd,nightly_testing,workflow,Comprehensive cross-browser testing,.github/workflows,,,"Nightly cross-browser validation"
environment,nodejs_version,requirement,≥20.0.0 required,package.json,,,"Minimum Node.js version"
environment,package_manager,requirement,npm (with package-lock.json),package-lock.json,,,"Package management"
environment,browser_support,requirement,"Modern browsers (Chrome, Firefox, Safari, Edge)",,,,"Supported browsers"
environment,memory_allocation,configuration,--max-old-space-size=8192,package.json,,,"Increased memory for large builds"
environment,cross_platform,compatibility,"Windows, macOS, Linux",Makefile,,,"Cross-platform script support"
quick_start,step_1,checklist,Install Node.js 20+,,,,"Environment setup"
quick_start,step_2,checklist,Run npm ci to install dependencies,,npm ci,,"Dependency installation"
quick_start,step_3,checklist,Run npm run codegen to generate GraphQL types,,npm run codegen,,"GraphQL type generation"
quick_start,step_4,checklist,Run npm run dev to start development server,,npm run dev,,"Development server startup"
quick_start,step_5,checklist,Run npm test to verify setup,,npm test,,"Setup verification"
quick_start,step_6,checklist,Run npm run validate before committing changes,,npm run validate,,"Pre-commit validation"
troubleshooting,graphql_errors,issue,Run npm run codegen after schema changes,,npm run codegen,,"GraphQL schema synchronization"
troubleshooting,type_errors,issue,Run npm run typecheck to identify issues,,npm run typecheck,,"TypeScript error identification"
troubleshooting,test_failures,issue,Check npm run test:coverage for detailed reports,,npm run test:coverage,,"Test failure analysis"
troubleshooting,build_issues,issue,Clear cache with make clean or manual cleanup,,make clean,,"Build artifact cleanup"
troubleshooting,memory_issues,issue,Increase NODE_OPTIONS memory limit,package.json,,,"Memory allocation adjustment"
performance,bundle_analysis,optimization,Bundle analysis tools,package.json,,,"Bundle size monitoring"
performance,code_splitting,optimization,Code splitting with Vite,vite.config.mjs,,,"Efficient code loading"
performance,react_optimization,optimization,Optimized React components,src/components,,,"Component performance optimization"
performance,redux_optimization,optimization,Efficient Redux state management,src/store,,,"State management efficiency"
performance,coverage_monitoring,optimization,Coverage thresholds and monitoring,jest.config.cjs,,,"Test coverage tracking"
documentation,technical_docs,reference,See documentation/ directory,,,documentation,"Detailed technical documentation"