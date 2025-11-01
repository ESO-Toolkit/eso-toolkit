# ESO Log Aggregator - Agent Documentation (CSV Format)

## Overview
Project: ESO Log Aggregator - React-based web application for analyzing Elder Scrolls Online (ESO) combat logs
Features: data visualization, real-time analytics, comprehensive testing infrastructure

## 📚 Documentation Navigation

**NEW STRUCTURE**: Documentation has been reorganized! See [documentation/INDEX.md](documentation/INDEX.md) for complete navigation.

**Quick Access**:
- **AI Agent Guidelines**: [documentation/ai-agents/AI_AGENT_GUIDELINES.md](documentation/ai-agents/AI_AGENT_GUIDELINES.md) - **START HERE**
- **AI Agent Guides**: [documentation/ai-agents/](documentation/ai-agents/)
- **Feature Docs**: [documentation/features/](documentation/features/)
- **Architecture**: [documentation/architecture/](documentation/architecture/)
- **Complete Guide**: [documentation/AGENTS.md](documentation/AGENTS.md)

---

## ⚠️ AI Agent Guidelines

**READ THIS FIRST**: [AI_AGENT_GUIDELINES.md](documentation/ai-agents/AI_AGENT_GUIDELINES.md)

**Key Points**:
- ❌ Don't create summary docs for minor changes
- ✅ Only document significant features/architecture changes
- 💬 Be concise - ask before extensive work
- 📝 Use code comments and clear commit messages for simple changes

---

## � Jira Work Item Management (acli)

**REQUIRED**: All AI agents must use `acli` (Atlassian CLI) for Jira work item management.

📖 **Full Documentation**:
- **[documentation/ai-agents/jira/AI_JIRA_ACLI_INSTRUCTIONS.md](documentation/ai-agents/jira/AI_JIRA_ACLI_INSTRUCTIONS.md)** - Comprehensive guide
- **[documentation/ai-agents/jira/AI_JIRA_QUICK_REFERENCE.md](documentation/ai-agents/jira/AI_JIRA_QUICK_REFERENCE.md)** - Quick reference

**Quick Start**:
```powershell
# View current story
acli jira workitem view ESO-372

# Find next task
acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary,type

# Start work
acli jira workitem transition ESO-394 --to "In Progress"

# Complete work
acli jira workitem transition ESO-394 --to "Done"
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
tech_stack,testing_framework_2,dependency,Playwright,playwright.nightly.config.ts,,tests,"End-to-end testing"
tech_stack,testing_framework_3,dependency,Testing Library,package.json,,,"Component testing utilities"
tech_stack,code_quality_1,dependency,ESLint 9,eslint.config.js,,,"Code linting"
tech_stack,code_quality_2,dependency,Prettier,package.json,,,"Code formatting"
tech_stack,code_quality_3,dependency,TypeScript,tsconfig.json,,,"Static type checking"
tech_stack,documentation,dependency,Storybook,.storybook,,,"Component documentation"
tech_stack,monitoring,dependency,Sentry,package.json,,,"Error tracking and monitoring"
tech_stack,deployment,platform,GitHub Pages,package.json,,,"Production deployment platform"
directory_structure,src,directory,Main application source code,,,,
directory_structure,tests,directory,End-to-end tests (Playwright),,,,
directory_structure,public,directory,Static assets and HTML template,,,,
directory_structure,scripts,directory,Build and utility scripts,,,,
directory_structure,documentation,directory,Technical documentation,,,,
directory_structure,data,directory,Static data files (abilities.json),,,,
directory_structure,.storybook,directory,Storybook configuration,,,,
directory_structure,coverage,directory,Test coverage reports (generated),,,,
directory_structure,build,directory,Production build output (generated),,,,
directory_structure,playwright-report,directory,Playwright test reports (generated),,,,
config_file,package.json,json,Dependencies and scripts,package.json,,,"Project configuration and dependencies"
config_file,vite.config.mjs,javascript,Vite build configuration,vite.config.mjs,,,"Build tool configuration"
config_file,jest.config.cjs,javascript,Jest testing configuration,jest.config.cjs,,,"Unit test configuration"
config_file,playwright.nightly.config.ts,typescript,Playwright E2E test configurations,playwright.nightly.config.ts,,,"End-to-end test configuration"
config_file,eslint.config.js,javascript,ESLint linting rules,eslint.config.js,,,"Code linting configuration"
config_file,tsconfig.json,json,TypeScript configuration,tsconfig.json,,,"TypeScript compiler configuration"
config_file,codegen.yml,yaml,GraphQL code generation,codegen.yml,,,"GraphQL type generation configuration"
config_file,Makefile,makefile,Cross-platform build commands,Makefile,,,"Cross-platform build automation"
tool,vite,build_tool,Modern build tool with HMR,vite.config.mjs,,,"React SWC, SVGR plugins, path aliases"
tool,typescript,compiler,Static typing,tsconfig.json,,,"Main config and type checking"
tool,eslint,linter,Code linting (Flat config format),eslint.config.js,,,"React, TypeScript, Import resolution plugins"
tool,jest,test_framework,Unit & Integration Testing,jest.config.cjs,,,"Main, Coverage, Smoke, CRA compatibility configs"
tool,playwright,test_framework,End-to-End Testing,playwright.nightly.config.ts,,,"Nightly, Smoke, Screen Size configs with sharding support"
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

command,test_nightly_all,testing,Nightly tests (all browsers),,npm run test:nightly:all,,"Comprehensive cross-browser testing"
command,test_nightly_chromium,testing,Nightly tests (Chromium),,npm run test:nightly:chromium,,"Nightly tests in Chromium"
command,test_nightly_firefox,testing,Nightly tests (Firefox),,npm run test:nightly:firefox,,"Nightly tests in Firefox"
command,test_nightly_webkit,testing,Nightly tests (WebKit),,npm run test:nightly:webkit,,"Nightly tests in WebKit"
command,test_smoke,testing,Smoke tests (unit and E2E),,npm run test:smoke,,"Quick validation tests"
command,test_smoke_unit,testing,Smoke tests (unit only),,npm run test:smoke:unit,,"Quick unit test validation"
command,test_smoke_e2e,testing,Smoke tests (E2E only),,npm run test:smoke:e2e,,"Quick E2E test validation"
command,test_full,testing,Full E2E test suite (all non-nightly tests),,npm run test:full,,"Comprehensive E2E testing for releases"
command,test_full_headed,testing,Full E2E test suite (headed mode),,npm run test:full:headed,,"Run full suite with visible browser"
command,test_full_report,testing,View full test suite report,,npm run test:full:report,,"Open HTML report for full suite"
command,test_performance,testing,Performance benchmarking tests,,npm run test:performance,,"Core Web Vitals and performance metrics"
command,test_performance_report,testing,View performance test report,,npm run test:performance:report,,"Open performance test HTML report"
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
command,test_nightly_shard1,sharding,Manual sharding (shard 1),,npm run test:nightly:shard1,,"Parallel execution shard 1"
command,test_nightly_shard2,sharding,Manual sharding (shard 2),,npm run test:nightly:shard2,,"Parallel execution shard 2"
command,test_nightly_shard3,sharding,Manual sharding (shard 3),,npm run test:nightly:shard3,,"Parallel execution shard 3"
command,test_nightly_sharded,sharding,Automated sharding,,npm run test:nightly:sharded,,"Automated parallel execution"
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
testing_strategy,e2e_tests,strategy,Playwright for full user workflows,playwright.nightly.config.ts,,,"End-to-end user workflow testing"
testing_strategy,smoke_tests,strategy,Quick validation of critical paths,playwright.smoke.config.ts,,,"Quick critical path validation"
testing_strategy,nightly_tests,strategy,Comprehensive cross-browser testing,playwright.nightly.config.ts,,,"Comprehensive cross-browser validation"
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