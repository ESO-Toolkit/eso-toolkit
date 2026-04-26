# Uncovered E2E Test Functionality Analysis

**Date**: October 31, 2025  
**Analysis**: Identifying application features without E2E test coverage

---

## 🎯 Application Route Map

Based on `src/App.tsx`, here are **all 23 routes** in the application:

| # | Route | Component | Auth Required | E2E Coverage |
|---|-------|-----------|---------------|--------------|
| 1 | `/` | LandingPage | ❌ | ✅ `home.spec.ts` |
| 2 | `/login` | Login | ❌ | ⚠️ `auth.spec.ts` (mocked only) |
| 3 | `/oauth-redirect` | OAuthRedirect | ❌ | ⚠️ `auth.spec.ts` (mocked only) |
| 4 | `/banned` | Banned | ❌ | ❌ **NO COVERAGE** |
| 5 | `/report/:reportId` | ReportFights | ✅ | ⚠️ Partial (nightly only) |
| 6 | `/report/:reportId/fight/:fightId` | ReportFightDetails | ✅ | ✅ Nightly tests |
| 7 | `/report/:reportId/fight/:fightId/:tabId` | ReportFightDetails | ✅ | ✅ Nightly tests (13 tabs) |
| 8 | `/report/:reportId/fight/:fightId/replay` | FightReplay | ✅ | ❌ **NO COVERAGE** |
| 9 | `/report/:reportId/live` | LiveLog | ✅ | ❌ **NO COVERAGE** |
| 10 | `/calculator` | Calculator | ❌ | ⚠️ Skeleton detection only |
| 11 | `/text-editor` | TextEditor | ❌ | ❌ **NO COVERAGE** |
| 12 | `/logs` | Logs | ❌ | ❌ **NO COVERAGE** |
| 13 | `/leaderboards` | LeaderboardLogsPage | ❌ | ❌ **NO COVERAGE** |
| 14 | `/sample-report` | SampleReportPage | ❌ | ❌ **NO COVERAGE** |
| 15 | `/latest-reports` | LatestReports | ✅ | ⚠️ Nightly auth tests |
| 16 | `/whoami` | WhoAmIPage | ✅ | ❌ **NO COVERAGE** |
| 17 | `/my-reports` | UserReports | ✅ | ⚠️ Nightly auth tests |
| 18 | `/scribing-simulator` | ScribingSimulatorPage | ❌ | ❌ **NO COVERAGE** |
| 19 | `/parse-analysis/:reportId?/:fightId?` | ParseAnalysisPage | ✅ | ❌ **NO COVERAGE** |
| 20 | `/docs/calculations` | CalculationKnowledgeBasePage | ❌ | ❌ **NO COVERAGE** |
| 21 | `*` (404) | NotFound | ❌ | ✅ `404-page.spec.ts` |

---

## ❌ Major Gaps - No E2E Coverage

### 1. **3D Replay System** 🎮 HIGH PRIORITY
- **Route**: `/report/:reportId/fight/:fightId/replay`
- **Component**: `FightReplay`
- **Features**:
  - 3D visualization of combat
  - Timeline scrubbing
  - Camera controls
  - Player position tracking
  - Animation playback
- **Risk**: HIGH - Complex feature with many moving parts
- **Test Files**: None
- **Notes**: Heavily unit tested (integration tests exist) but no e2e validation

### 2. **Live Logging** 📡 HIGH PRIORITY
- **Route**: `/report/:reportId/live`
- **Component**: `LiveLog`
- **Features**:
  - Real-time log updates
  - WebSocket/polling connection
  - Live data streaming
- **Risk**: HIGH - Critical for live raid tracking
- **Test Files**: None
- **Notes**: Could fail silently in production

### 3. **Text Editor** 📝 MEDIUM PRIORITY
- **Route**: `/text-editor`
- **Component**: `TextEditor`
- **Features**:
  - M0RMarkers paste/decode
  - Raid composition planning
  - Note-taking functionality
- **Risk**: MEDIUM - Used for raid prep
- **Test Files**: None
- **Smoke Tests**: Has skeleton detection only

### 4. **Parse Analysis Page** 📊 HIGH PRIORITY
- **Route**: `/parse-analysis/:reportId?/:fightId?`
- **Component**: `ParseAnalysisPage`
- **Features**:
  - Food/drink usage analysis
  - Casts per minute (CPM)
  - Weave accuracy
  - Buff source analysis
  - Trial dummy detection
- **Risk**: HIGH - Complex analysis tool
- **Test Files**: None
- **Notes**: Mentioned in semantic search results but untested

### 5. **Scribing Simulator** ⚗️ MEDIUM PRIORITY
- **Route**: `/scribing-simulator`
- **Component**: `ScribingSimulatorPage`
- **Features**:
  - Ability scribing simulation
  - Recipe combinations
  - Skill tooltips
- **Risk**: MEDIUM - Important for build planning
- **Test Files**: None
- **Notes**: Detection tested but not full functionality

### 6. **Calculator** 🧮 MEDIUM PRIORITY
- **Route**: `/calculator`
- **Component**: `Calculator`
- **Features**:
  - Damage calculations
  - Build optimization
  - Stat calculators
- **Risk**: MEDIUM - Essential utility
- **Test Files**: None (only skeleton detection)
- **Smoke Tests**: `skeleton-detection.smoke.spec.ts` checks loading only

### 7. **Logs Browser** 📋 LOW PRIORITY
- **Route**: `/logs`
- **Component**: `Logs`
- **Features**:
  - Browse uploaded logs
  - Log management
- **Risk**: LOW - Simple listing page
- **Test Files**: None

### 8. **Leaderboards** 🏆 LOW PRIORITY
- **Route**: `/leaderboards`
- **Component**: `LeaderboardLogsPage`
- **Features**:
  - Leaderboard rankings
  - Top parses
  - Competitive tracking
- **Risk**: LOW-MEDIUM - Public-facing feature
- **Test Files**: None

### 9. **Sample Report** 📄 LOW PRIORITY
- **Route**: `/sample-report`
- **Component**: `SampleReportPage`
- **Features**:
  - Demo report for new users
  - Tutorial/example data
- **Risk**: LOW - Informational page
- **Test Files**: None

### 10. **WhoAmI Page** 👤 LOW PRIORITY
- **Route**: `/whoami`
- **Component**: `WhoAmIPage`
- **Features**:
  - User profile information
  - Account details
- **Risk**: LOW - Simple info page
- **Test Files**: None

### 11. **Calculation Docs** 📚 LOW PRIORITY
- **Route**: `/docs/calculations`
- **Component**: `CalculationKnowledgeBasePage`
- **Features**:
  - Documentation
  - Calculation formulas
  - Knowledge base
- **Risk**: LOW - Static documentation
- **Test Files**: None

### 12. **Banned Page** 🚫 LOW PRIORITY
- **Route**: `/banned`
- **Component**: `Banned`
- **Features**:
  - Display ban status
  - Ban reason
  - Logout option
- **Risk**: LOW - Edge case
- **Test Files**: None
- **Notes**: `BanRedirect` component exists but page untested

---

## ⚠️ Partial Coverage - Needs Enhancement

### 1. **Report Fights List** 📑
- **Route**: `/report/:reportId`
- **Component**: `ReportFights`
- **Current Coverage**: Nightly tests only (real data)
- **Missing**: Mocked data tests for faster feedback
- **Test Files**: `report.spec.ts` exists but doesn't test this route specifically

### 2. **Latest Reports** 📰
- **Route**: `/latest-reports`
- **Component**: `LatestReports`
- **Current Coverage**: Nightly auth tests (partial)
- **Missing**: 
  - Pagination testing
  - Search functionality
  - Filtering
  - Loading states

### 3. **My Reports (User Reports)** 👥
- **Route**: `/my-reports`
- **Component**: `UserReports`
- **Current Coverage**: Nightly auth tests (partial)
- **Missing**:
  - Pagination testing
  - Empty states
  - Error handling
  - Filtering

### 4. **Login/OAuth** 🔐
- **Routes**: `/login`, `/oauth-redirect`
- **Current Coverage**: `auth.spec.ts` with mocked OAuth
- **Missing**:
  - Error states
  - Timeout handling
  - Token refresh
  - Logout flow

---

## 📊 Coverage Summary by Priority

### HIGH PRIORITY (5 gaps)
1. ❌ 3D Replay System (`/report/:reportId/fight/:fightId/replay`)
2. ❌ Live Logging (`/report/:reportId/live`)
3. ❌ Parse Analysis (`/parse-analysis/:reportId?/:fightId?`)
4. ⚠️ Report Fights List (`/report/:reportId`) - Needs mocked tests
5. ⚠️ Login/OAuth - Needs error state testing

### MEDIUM PRIORITY (4 gaps)
6. ❌ Text Editor (`/text-editor`)
7. ❌ Scribing Simulator (`/scribing-simulator`)
8. ❌ Calculator (`/calculator`)
9. ❌ Leaderboards (`/leaderboards`)

### LOW PRIORITY (6 gaps)
10. ❌ Logs Browser (`/logs`)
11. ❌ Sample Report (`/sample-report`)
12. ❌ WhoAmI Page (`/whoami`)
13. ❌ Calculation Docs (`/docs/calculations`)
14. ❌ Banned Page (`/banned`)
15. ⚠️ Latest Reports - Needs pagination tests
16. ⚠️ My Reports - Needs pagination tests

---

## 📝 Recommended Test Files to Create

### High Priority

#### 1. `tests/replay.spec.ts` (3D Replay System)
```typescript
describe('3D Fight Replay', () => {
  test('should load replay page and render 3D scene');
  test('should play/pause animation');
  test('should scrub timeline');
  test('should follow player camera');
  test('should handle camera controls');
  test('should display timeline markers');
});
```

#### 2. `tests/live-logging.spec.ts` (Live Logging)
```typescript
describe('Live Logging', () => {
  test('should connect to live log stream');
  test('should display real-time updates');
  test('should handle connection errors');
  test('should reconnect on disconnect');
});
```

#### 3. `tests/parse-analysis.spec.ts` (Parse Analysis)
```typescript
describe('Parse Analysis', () => {
  test('should load parse analysis page');
  test('should analyze food/drink usage');
  test('should calculate CPM');
  test('should analyze weave accuracy');
  test('should detect trial dummy buffs');
  test('should handle invalid report IDs');
});
```

### Medium Priority

#### 4. `tests/text-editor.spec.ts` (Text Editor)
```typescript
describe('Text Editor', () => {
  test('should load text editor page');
  test('should paste and decode M0RMarkers');
  test('should display raid composition');
  test('should save notes');
});
```

#### 5. `tests/scribing-simulator.spec.ts` (Scribing Simulator)
```typescript
describe('Scribing Simulator', () => {
  test('should load scribing simulator');
  test('should select base skill');
  test('should select scripts');
  test('should generate tooltip');
});
```

#### 6. `tests/calculator.spec.ts` (Calculator)
```typescript
describe('Calculator', () => {
  test('should load calculator page');
  test('should perform damage calculations');
  test('should handle stat inputs');
  test('should display results');
});
```

### Low Priority

#### 7. `tests/utility-pages.spec.ts` (All utility pages)
```typescript
describe('Utility Pages', () => {
  describe('Logs Browser', () => {
    test('should display logs list');
  });
  
  describe('Leaderboards', () => {
    test('should display leaderboard rankings');
  });
  
  describe('Sample Report', () => {
    test('should load sample report');
  });
  
  describe('WhoAmI', () => {
    test('should display user info when authenticated');
  });
  
  describe('Calculation Docs', () => {
    test('should display documentation');
  });
  
  describe('Banned Page', () => {
    test('should display ban message');
  });
});
```

---

## 🎯 Quick Wins (Easy to Test)

These features would be quick to add tests for:

1. **Banned Page** - Simple page, just verify rendering
2. **WhoAmI Page** - Simple user info display
3. **Calculation Docs** - Static documentation page
4. **Sample Report** - Demo page, should just load
5. **Logs Browser** - Basic listing page

**Estimated time**: 1-2 hours to add coverage for all 5

---

## 🔥 Critical Gaps (High Risk)

These features are complex and mission-critical but untested:

1. **3D Replay System** - Complex 3D visualization
2. **Live Logging** - Real-time data streaming
3. **Parse Analysis** - Complex analysis algorithms

**Risk**: These could break silently and users wouldn't know until they try to use them

**Recommendation**: Create basic "smoke test" coverage ASAP, then comprehensive tests later

---

## 📋 Proposed Test Coverage Plan

### Phase 1: Quick Wins (1-2 hours)
- Add `tests/utility-pages.spec.ts` for 5 simple pages
- Verify pages load without errors

### Phase 2: Critical Features (1 week)
- `tests/replay.spec.ts` - Basic replay functionality
- `tests/live-logging.spec.ts` - Connection and updates
- `tests/parse-analysis.spec.ts` - Core analysis features

### Phase 3: Important Tools (1 week)
- `tests/text-editor.spec.ts` - M0RMarkers and notes
- `tests/scribing-simulator.spec.ts` - Scribing UI
- `tests/calculator.spec.ts` - Calculations

### Phase 4: Enhancement (Ongoing)
- Expand coverage on partial tests
- Add edge cases
- Performance testing

---

## 💡 Recommendations

### Immediate Actions
1. ✅ **Add utility pages test** - Quick win, covers 5 gaps
2. ✅ **Create replay smoke test** - Verify 3D scene loads
3. ✅ **Create live logging test** - Verify connection works
4. ✅ **Enhance report tests** - Add mocked versions

### Strategic
5. **Document coverage goals** - Set target % for each feature
6. **Add CI checks** - Fail if critical routes aren't tested
7. **Create test templates** - Speed up future test creation
8. **Monitor usage** - Prioritize tests for most-used features

---

## 📊 Current vs Target Coverage

### Current State
- **Routes covered**: 8/21 (38%)
- **Fully tested**: 3/21 (14%)
- **Partially tested**: 5/21 (24%)
- **No coverage**: 13/21 (62%)

### Target State (Recommended)
- **Routes covered**: 21/21 (100%)
- **Fully tested**: 15/21 (71%)
- **Partially tested**: 6/21 (29%)
- **No coverage**: 0/21 (0%)

---

## 🚀 Action Items

### This Week
- [ ] Create `tests/utility-pages.spec.ts` (covers 5 routes)
- [ ] Create `tests/replay-smoke.spec.ts` (basic 3D replay)
- [ ] Create `tests/live-logging-smoke.spec.ts` (basic connection)

### This Sprint
- [ ] Create comprehensive `tests/replay.spec.ts`
- [ ] Create comprehensive `tests/parse-analysis.spec.ts`
- [ ] Enhance `tests/report.spec.ts` with mocked data

### Next Sprint
- [ ] Create `tests/text-editor.spec.ts`
- [ ] Create `tests/scribing-simulator.spec.ts`
- [ ] Create `tests/calculator.spec.ts`
- [ ] Add pagination tests for report lists

---

## 📚 Related Documentation

- [E2E Test Coverage Analysis](./E2E_TEST_COVERAGE_ANALYSIS.md)
- [E2E Test Suite Reference](./E2E_TEST_SUITE_REFERENCE.md)
- [tests/README.md](../../tests/README.md)

---

**Status**: 📊 Analysis Complete  
**Total Routes**: 21  
**Critical Gaps**: 3 (Replay, Live Logging, Parse Analysis)  
**Quick Wins**: 5 (Utility pages)  
**Coverage**: 38% (8/21 routes have some testing)
