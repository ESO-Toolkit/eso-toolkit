# Replay System Improvements - Implementation Plan
## Jira Epic and Story Structure

**Date**: October 14, 2025  
**Project**: ESO Log Aggregator  
**Based on**: REPLAY_SYSTEM_ARCHITECTURE_EVALUATION.md

---

## Epic

**Epic Name**: Replay System Architecture Improvements  
**Epic Description**: 
Implement architectural improvements to the Fight Replay system based on comprehensive architecture evaluation. Focus on reducing complexity, improving maintainability, adding integration tests, and enhancing documentation.

**Epic Goals**:
- Reduce Arena3D component complexity by 40%
- Add integration test coverage for critical data flows
- Complete architecture documentation with diagrams
- Add performance monitoring capabilities
- Improve error handling and user experience

**Priority**: High  
**Target Sprint**: Q4 2025  
**Estimated Story Points**: 55

---

## Stories and Tasks

### Story 1: Documentation and Architecture Diagrams
**Story Points**: 8  
**Priority**: P1 (High Impact, Low Effort)  
**Type**: Documentation  
**Assignee**: TBD

**Description**:
Create comprehensive architecture documentation including visual diagrams for data flow, component hierarchy, and worker task dependencies. This will improve onboarding and make the system easier to understand and maintain.

**Acceptance Criteria**:
- [ ] Architecture diagram showing all system layers created
- [ ] Data flow diagram from Events → Worker → Redux → 3D created
- [ ] Worker task dependency graph documented
- [ ] Component hierarchy visualization created
- [ ] Performance optimization patterns documented
- [ ] README updated with links to new documentation

#### Tasks:

**Task 1.1**: Create System Architecture Diagram
- Create visual diagram of 6-layer architecture
- Show: Presentation → Orchestration → 3D Rendering → Data → Workers → State
- Export as SVG and PNG
- Add to `documentation/architecture/` folder
- **Estimate**: 2 hours

**Task 1.2**: Create Data Flow Diagram
- Document flow: useCastEvents → useActorPositionsTask → Worker → Redux → Arena3D
- Include all event types (damage, healing, death, resource, cast)
- Show TimeRef propagation through system
- **Estimate**: 2 hours

**Task 1.3**: Document Worker Task Dependencies
- Create dependency graph for all worker tasks
- Show: debuffLookup → actorPositions dependencies
- Document execution order and data requirements
- **Estimate**: 1.5 hours

**Task 1.4**: Create Component Hierarchy Documentation
- Visualize React component tree for replay system
- Show Arena3D → Scene → Actors hierarchy
- Include useFrame priorities
- **Estimate**: 1.5 hours

**Task 1.5**: Document Performance Patterns
- Create guide explaining dual timeRef system
- Document O(1) lookup strategy
- Explain shared geometry pattern
- Add code examples
- **Estimate**: 2 hours

**Task 1.6**: Update Project README
- Add "Architecture" section
- Link to all new documentation
- Add quick start for developers
- **Estimate**: 1 hour

---

### Story 2: Refactor Arena3D Scene Component
**Story Points**: 13  
**Priority**: P1 (High Impact, Low Effort)  
**Type**: Technical Debt  
**Assignee**: TBD

**Description**:
Extract the Scene component logic from Arena3D.tsx (currently 633 lines) into a separate file. This reduces complexity and improves testability while maintaining all existing functionality.

**Acceptance Criteria**:
- [ ] New `Arena3DScene.tsx` file created
- [ ] Scene logic extracted from Arena3D.tsx
- [ ] Arena3D.tsx reduced to <400 lines
- [ ] All existing functionality preserved
- [ ] All tests passing
- [ ] No performance regression

#### Tasks:

**Task 2.1**: Analyze Scene Component Boundaries
- Identify all Scene-specific logic in Arena3D.tsx
- List props needed for Scene component
- Document state dependencies
- **Estimate**: 2 hours

**Task 2.2**: Create Arena3DScene.tsx
- Create new file `src/features/fight_replay/components/Arena3DScene.tsx`
- Define TypeScript interface for props
- Set up component skeleton
- **Estimate**: 1 hour

**Task 2.3**: Extract Scene Logic
- Move RenderLoop component
- Move CameraFollower
- Move lighting setup
- Move DynamicMapTexture
- Move AnimationFrameSceneActors
- Move BossHealthHUD
- Move MorMarkers
- Move OrbitControls
- **Estimate**: 4 hours

**Task 2.4**: Update Arena3D.tsx
- Import new Arena3DScene component
- Pass required props
- Remove extracted code
- Clean up imports
- **Estimate**: 2 hours

**Task 2.5**: Update Tests
- Create tests for Arena3DScene
- Update existing Arena3D tests
- Verify all test coverage maintained
- **Estimate**: 3 hours

**Task 2.6**: Performance Testing
- Run performance benchmarks
- Compare before/after metrics
- Verify 60fps maintained
- Document any changes
- **Estimate**: 1 hour

---

### Story 3: Add Error Boundaries and Graceful Degradation
**Story Points**: 8  
**Priority**: P1 (High Impact, Low Effort)  
**Type**: Feature  
**Assignee**: TBD

**Description**:
Implement error boundaries around 3D components to provide graceful degradation when WebGL fails or errors occur. Improve user experience with clear error messages and recovery options.

**Acceptance Criteria**:
- [ ] ErrorBoundary component created for 3D components
- [ ] WebGL detection implemented
- [ ] Fallback UI designed and implemented
- [ ] User-friendly error messages
- [ ] Retry mechanism for transient errors
- [ ] Error telemetry sent to Sentry

#### Tasks:

**Task 3.1**: Create ReplayErrorBoundary Component
- Create `src/features/fight_replay/components/ReplayErrorBoundary.tsx`
- Implement React Error Boundary pattern
- Add error state management
- Include retry logic
- **Estimate**: 2 hours

**Task 3.2**: Add WebGL Detection
- Create `src/utils/webglDetection.ts`
- Detect WebGL support
- Detect WebGL2 support
- Check for required extensions
- Return capability object
- **Estimate**: 1.5 hours

**Task 3.3**: Design Fallback UI
- Create fallback component for no WebGL
- Show system requirements
- Provide link to help documentation
- Match existing UI design system
- **Estimate**: 2 hours

**Task 3.4**: Implement Error Telemetry
- Integrate with existing Sentry setup
- Send error details on catch
- Include WebGL capabilities in context
- Add breadcrumbs for debugging
- **Estimate**: 1.5 hours

**Task 3.5**: Add to Arena3D
- Wrap Canvas in ReplayErrorBoundary
- Handle WebGL detection before render
- Show appropriate fallback
- **Estimate**: 1 hour

---

### Story 4: Integration Tests for Data Flow
**Story Points**: 13  
**Priority**: P2 (High Impact, Medium Effort)  
**Type**: Testing  
**Assignee**: TBD

**Description**:
Create integration tests for critical data flows through the replay system. Test the full pipeline from events to 3D rendering, ensuring data integrity and proper state management.

**Acceptance Criteria**:
- [ ] Integration test suite created
- [ ] Tests for Events → Worker → Redux flow
- [ ] Tests for timeline scrubbing flow
- [ ] Tests for camera following flow
- [ ] Tests for map timeline switching
- [ ] 80%+ integration test coverage for replay system

#### Tasks:

**Task 4.1**: Set Up Integration Test Infrastructure
- Create `tests/integration/replay/` directory
- Configure Jest for integration tests
- Set up test fixtures (sample fight data)
- Create test utilities for replay testing
- **Estimate**: 3 hours

**Task 4.2**: Test Events → Worker → Redux Flow
- Test: Load fight → process events → populate Redux
- Verify: TimestampPositionLookup structure
- Verify: All actors present in lookup
- Verify: Timestamps sorted correctly
- **Estimate**: 4 hours

**Task 4.3**: Test Timeline Scrubbing Flow
- Test: User drags timeline slider
- Verify: timeRef updated immediately
- Verify: 3D positions update correctly
- Verify: React state syncs after debounce
- Test: Playback pauses during scrubbing
- **Estimate**: 3 hours

**Task 4.4**: Test Camera Following Flow
- Test: Click actor → camera follows
- Verify: Camera position updates each frame
- Verify: Camera maintains offset
- Test: Unlock camera → OrbitControls enabled
- **Estimate**: 2 hours

**Task 4.5**: Test Map Timeline Flow
- Test: Multi-phase fight loads
- Verify: Map timeline created correctly
- Verify: Map switches at phase transitions
- Verify: Texture loading and caching
- **Estimate**: 2 hours

---

### Story 5: Performance Monitoring and Debugging Tools
**Story Points**: 8  
**Priority**: P2 (High Impact, Medium Effort)  
**Type**: Feature  
**Assignee**: TBD

**Description**:
Add performance monitoring tools for developers including FPS counter, memory usage tracking, and slow frame logging. Enable performance debugging and optimization work.

**Acceptance Criteria**:
- [ ] FPS counter component (dev mode only)
- [ ] Memory usage tracker
- [ ] Slow frame logger
- [ ] Performance overlay UI
- [ ] Performance data export capability
- [ ] Zero performance impact in production

#### Tasks:

**Task 5.1**: Create PerformanceMonitor Component
- Create `src/features/fight_replay/components/debug/PerformanceMonitor.tsx`
- Track FPS using requestAnimationFrame
- Calculate average, min, max FPS
- Display in overlay UI
- **Estimate**: 2 hours

**Task 5.2**: Add Memory Tracking
- Use performance.memory API
- Track heap size over time
- Detect memory leaks (continuous growth)
- Add to performance overlay
- **Estimate**: 2 hours

**Task 5.3**: Implement Slow Frame Logger
- Detect frames >16.67ms (below 60fps)
- Log frame time, timestamp, actor count
- Store in circular buffer (last 100 slow frames)
- Export as JSON for analysis
- **Estimate**: 2 hours

**Task 5.4**: Create Performance Overlay UI
- Toggle overlay with keyboard shortcut (Ctrl+Shift+P)
- Show FPS graph
- Show memory usage graph
- Show slow frame count
- Export button
- **Estimate**: 2 hours

**Task 5.5**: Ensure Production Safety
- Wrap all perf code in `process.env.NODE_ENV === 'development'`
- Tree-shake in production builds
- Verify zero bundle size impact
- **Estimate**: 1 hour

---

### Story 6: Extract PlaybackControls Sub-Components
**Story Points**: 5  
**Priority**: P3 (Medium Impact, Low Effort)  
**Type**: Technical Debt  
**Assignee**: TBD

**Description**:
Split PlaybackControls.tsx (350 lines) into smaller, focused sub-components. Improve readability and maintainability of the playback control system.

**Acceptance Criteria**:
- [ ] Timeline slider extracted to TimelineSlider component
- [ ] Control buttons extracted to PlaybackButtons component
- [ ] Speed selector extracted to SpeedSelector component
- [ ] Share button extracted to ShareButton component
- [ ] PlaybackControls.tsx reduced to <150 lines
- [ ] All functionality preserved

#### Tasks:

**Task 6.1**: Create TimelineSlider Component
- Create `src/features/fight_replay/components/playback/TimelineSlider.tsx`
- Extract slider and time display logic
- Include scrubbing optimization hooks
- **Estimate**: 2 hours

**Task 6.2**: Create PlaybackButtons Component
- Create `src/features/fight_replay/components/playback/PlaybackButtons.tsx`
- Extract play/pause, skip buttons
- Include keyboard shortcuts
- **Estimate**: 1.5 hours

**Task 6.3**: Create SpeedSelector Component
- Create `src/features/fight_replay/components/playback/SpeedSelector.tsx`
- Extract speed selection dropdown
- **Estimate**: 1 hour

**Task 6.4**: Create ShareButton Component
- Create `src/features/fight_replay/components/playback/ShareButton.tsx`
- Extract share URL logic
- Include snackbar for feedback
- **Estimate**: 1.5 hours

**Task 6.5**: Refactor PlaybackControls
- Import and compose sub-components
- Remove extracted code
- Clean up and simplify
- **Estimate**: 1 hour

---

### Story 7: Worker Pool Implementation
**Story Points**: 13  
**Priority**: P2 (High Impact, Medium Effort)  
**Type**: Performance  
**Assignee**: TBD

**Description**:
Implement a worker pool to reuse worker instances across multiple tasks. Reduce worker startup overhead and improve processing efficiency for sequential tasks.

**Acceptance Criteria**:
- [ ] WorkerPool class implemented
- [ ] Pool size configurable (default: 4 workers)
- [ ] Worker reuse for multiple tasks
- [ ] Task queue when all workers busy
- [ ] Proper worker cleanup on unmount
- [ ] 30%+ reduction in worker startup time

#### Tasks:

**Task 7.1**: Design WorkerPool Architecture
- Design class structure
- Define task queue system
- Plan worker lifecycle management
- Document API
- **Estimate**: 2 hours

**Task 7.2**: Implement WorkerPool Class
- Create `src/workers/WorkerPool.ts`
- Implement worker creation and pooling
- Add task queue with priority
- Add worker health checking
- **Estimate**: 4 hours

**Task 7.3**: Update Worker Task Factory
- Modify `workerTaskSliceFactory.ts`
- Use WorkerPool instead of direct worker creation
- Handle worker pool initialization
- **Estimate**: 3 hours

**Task 7.4**: Add Configuration
- Add worker pool config to app settings
- Allow pool size adjustment
- Add dev mode pool monitoring
- **Estimate**: 2 hours

**Task 7.5**: Performance Testing
- Benchmark: Without pool vs with pool
- Measure: Task startup time
- Measure: Sequential task performance
- Document improvements
- **Estimate**: 2 hours

---

### Story 8: Enhanced Timeline Features
**Story Points**: 8  
**Priority**: P3 (Nice to Have)  
**Type**: Feature  
**Assignee**: TBD

**Description**:
Add timeline annotations, phase indicators, and event highlights to improve user experience and situational awareness during replay.

**Acceptance Criteria**:
- [ ] Phase transitions shown on timeline
- [ ] Death events marked on timeline
- [ ] Custom marker support
- [ ] Hover tooltips on timeline events
- [ ] Click event to jump to time
- [ ] Visual design matches existing UI

#### Tasks:

**Task 8.1**: Design Timeline Annotations UI
- Create mockups for annotations
- Design marker types (phase, death, custom)
- Define color coding
- Get UX approval
- **Estimate**: 2 hours

**Task 8.2**: Create TimelineAnnotation Component
- Create `src/features/fight_replay/components/TimelineAnnotation.tsx`
- Render markers on timeline
- Position based on timestamp
- **Estimate**: 2 hours

**Task 8.3**: Implement Phase Indicators
- Extract phase transitions from MapTimeline
- Create markers for phase changes
- Show phase names on hover
- **Estimate**: 2 hours

**Task 8.4**: Implement Death Event Markers
- Extract death events for all actors
- Create skull markers
- Show actor name on hover
- Click to view details
- **Estimate**: 2 hours

**Task 8.5**: Add Custom Marker Support
- Allow users to add custom markers
- Store in localStorage
- Export/import marker sets
- **Estimate**: 3 hours

---

## Jira CLI Commands (for reference when acli is available)

### Create Epic
```bash
acli epic create \
  --project "ESOLOG" \
  --summary "Replay System Architecture Improvements" \
  --description "$(cat epic-description.txt)" \
  --priority "High"
```

### Create Stories (examples)
```bash
# Story 1
acli issue create \
  --project "ESOLOG" \
  --type "Story" \
  --summary "Documentation and Architecture Diagrams" \
  --description "$(cat story1-description.txt)" \
  --priority "High" \
  --epic "ESOLOG-XXX" \
  --story-points 8

# Story 2
acli issue create \
  --project "ESOLOG" \
  --type "Story" \
  --summary "Refactor Arena3D Scene Component" \
  --description "$(cat story2-description.txt)" \
  --priority "High" \
  --epic "ESOLOG-XXX" \
  --story-points 13

# Continue for all stories...
```

### Create Tasks (example)
```bash
acli issue create \
  --project "ESOLOG" \
  --type "Task" \
  --summary "Create System Architecture Diagram" \
  --description "Create visual diagram of 6-layer architecture..." \
  --priority "High" \
  --parent "ESOLOG-YYY" \
  --estimate "2h"
```

---

## Implementation Priority Matrix

| Priority | Stories | Total SP | Sprint |
|----------|---------|----------|--------|
| P1 (High Impact, Low Effort) | 1, 2, 3 | 29 | Sprint 1-2 |
| P2 (High Impact, Medium Effort) | 4, 5, 7 | 34 | Sprint 2-3 |
| P3 (Nice to Have) | 6, 8 | 13 | Sprint 3-4 |
| **Total** | **8 stories** | **76 SP** | **4 sprints** |

---

## Resource Requirements

### Developer Roles Needed
- **Senior Frontend Developer**: Stories 2, 4, 7 (architecture and complex logic)
- **Frontend Developer**: Stories 3, 5, 6, 8 (components and features)
- **Technical Writer**: Story 1 (documentation)
- **QA Engineer**: Story 4 (test creation and execution)

### Sprint Breakdown

#### Sprint 1 (13 SP)
- Story 1: Documentation (8 SP) - Technical Writer
- Story 6: PlaybackControls Refactor (5 SP) - Frontend Dev

#### Sprint 2 (21 SP)
- Story 2: Arena3D Refactor (13 SP) - Senior Frontend Dev
- Story 3: Error Boundaries (8 SP) - Frontend Dev

#### Sprint 3 (21 SP)
- Story 4: Integration Tests (13 SP) - QA Engineer + Senior Frontend Dev
- Story 5: Performance Monitoring (8 SP) - Frontend Dev

#### Sprint 4 (21 SP)
- Story 7: Worker Pool (13 SP) - Senior Frontend Dev
- Story 8: Timeline Features (8 SP) - Frontend Dev

---

## Success Metrics

### Technical Metrics
- Arena3D component: 633 lines → <400 lines (**37% reduction**)
- Integration test coverage: 0% → 80%+ for replay system
- Worker startup time: Baseline → 30% reduction
- Performance monitoring: Available in dev mode
- Documentation: 0 diagrams → 4+ diagrams

### Quality Metrics
- Bug count: Track regression bugs
- Code review time: Should decrease with better structure
- Onboarding time: Measure with new developers
- Performance: Maintain 60fps in all scenarios

### User Experience Metrics
- Error recovery: <1% crashes → graceful degradation
- Timeline usability: Measure with user testing
- Load time perception: Track user feedback

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance regression during refactoring | Medium | High | Benchmark before/after, automated perf tests |
| Breaking existing functionality | Low | High | Comprehensive test coverage, staged rollout |
| Worker pool complexity | Medium | Medium | Thorough design review, prototype first |
| Timeline feature scope creep | Medium | Low | Strict acceptance criteria, MVP approach |
| Documentation takes longer than estimated | High | Low | Start early, involve team for review |

---

## Dependencies

### External Dependencies
- None (all internal improvements)

### Internal Dependencies
- Story 1 should start early (parallel with development)
- Story 2 should complete before Story 4 (testing refactored code)
- Story 5 can run in parallel with others
- Story 7 requires understanding of current worker system

### Technical Dependencies
- Maintain React 19+ compatibility
- Maintain Three.js compatibility
- Maintain existing Redux structure
- No breaking changes to public APIs

---

## Rollback Plan

Each story should be implemented behind feature flags where possible:
- Performance monitoring: Dev mode only
- Timeline features: Feature flag `ENABLE_TIMELINE_ANNOTATIONS`
- Worker pool: Feature flag `ENABLE_WORKER_POOL`

If issues arise:
1. Disable feature flag
2. Revert to previous version
3. Fix issues in separate branch
4. Re-enable after testing

---

## Post-Implementation Review

After completion, conduct review covering:
1. Were success metrics achieved?
2. What unexpected challenges arose?
3. What would we do differently?
4. Update architectural documentation with lessons learned
5. Plan next phase of improvements

---

**End of Implementation Plan**

*This plan is based on the architectural evaluation in REPLAY_SYSTEM_ARCHITECTURE_EVALUATION.md and represents a balanced approach to improving the replay system while maintaining stability and performance.*
