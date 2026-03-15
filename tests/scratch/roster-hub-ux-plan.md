# Roster Hub UI/UX Overhaul Plan

> Comprehensive audit + improvement plan. Based on visual comparison with Roster Builder,
> code review of all 10 Hub files, and research on 2025-2026 marketplace UI patterns.
> Screenshots saved in `tests/scratch/`.

---

## Current State Summary

### What works well
- Card grid with trial badge, tags, author, and date — good information density
- Vote button with optimistic UI and server reconciliation
- Preview dialog with iframe approach (avoids rewriting the 780-line RosterViewPage)
- Filter bar with trial dropdown, sort toggle, and preset tag chips
- Dark theme with space background matches the rest of the app

### Critical gaps (visual comparison: Hub vs Builder)
| Roster Builder | Roster Hub |
|---|---|
| Gradient "Roster Builder" heading with Space Grotesk font | Plain `Typography h4` — no gradient, no custom font |
| `Paper elevation={2}` wrapper with glass styling | No Paper wrapper — cards float on raw background |
| Role-colored sections (Tank=blue, Healer=pink, Flex=purple) | No role-aware colors |
| Snackbar for all user feedback (copy, import, publish) | `window.alert()` and `window.confirm()` — breaks immersion |
| `Container maxWidth="lg"` | `Container maxWidth="xl"` — wider, inconsistent |
| Theme-aware (`useTheme` + `isDarkMode`) | No theme awareness at all |

---

## Plan Overview

### Phase 1 — Design System Alignment (visual consistency with Builder)
### Phase 2 — Interaction & Feedback Overhaul (snackbars, confirmations, loading states)
### Phase 3 — Filter & Search Upgrades (search bar, URL sync, clear-all, result count)
### Phase 4 — Preview Dialog Upgrade (slide-over panel, deep linking, mobile fullscreen)
### Phase 5 — Comments Polish (character counter, reactions, reply UX, optimistic)
### Phase 6 — Accessibility & Performance (memo, focus, touch targets, skeletons)

---

## Phase 1 — Design System Alignment

**Goal**: Make the Hub visually feel like it belongs with the Roster Builder.

### 1.1 Page header redesign
- [ ] Switch to gradient heading matching Builder's `Space Grotesk` + `WebkitBackgroundClip: 'text'` pattern
- [ ] Add a small icon or illustration next to the title (like Builder's roster icon)
- [ ] Change `Container maxWidth="xl"` → `"lg"` to match Builder
- [ ] Wrap main content area in `Paper elevation={2}` with the glass styling (`backdrop-filter: blur`, alpha background)

### 1.2 Card visual upgrade
- [ ] Add subtle glass/frosted effect to cards (match Builder's alpha-background style)
- [ ] Add `:focus-visible` outline for keyboard navigation (currently hover-only)
- [ ] Increase tag chip font size from `0.65rem` → `0.75rem` (WCAG minimum)
- [ ] Add comment count indicator on the card (speech bubble icon + count next to vote count)
- [ ] Consider adding a small thumbnail/visual indicator for trial type (icon or colored left border per trial)

### 1.3 Theme awareness
- [ ] Import `useTheme()` and check `palette.mode` for dark/light-aware styling
- [ ] Use role-aware color palette from Builder (`DARK_ROLE_COLORS` / `LIGHT_ROLE_COLORS_SOLID`) if applicable

**Files**: `RosterHubPage.tsx`, `RosterCard.tsx`

---

## Phase 2 — Interaction & Feedback Overhaul

**Goal**: Replace all native browser dialogs with themed MUI components and add toast feedback everywhere.

### 2.1 Add global Snackbar/toast system
- [ ] Add `notistack` `SnackbarProvider` (or use MUI Snackbar + Alert) — wrap in roster-hub feature or at app level
- [ ] Position: bottom-center for consumer UX
- [ ] Auto-dismiss: 4s for success, 8s for errors, 10s for actions with undo
- [ ] Severity-colored: success (green), error (red), info (blue), warning (orange)

### 2.2 Replace all `window.alert` / `window.confirm`
- [ ] **Delete roster**: Replace `window.confirm` in `RosterHubPage` with MUI `Dialog` (title: "Delete Roster?", body: "This cannot be undone.", actions: Cancel + Delete)
- [ ] **Delete comment**: Replace `window.confirm` in `CommentSection` with same pattern
- [ ] **Delete errors**: Replace `alert(err.message)` with error snackbar

### 2.3 Add feedback for silent actions
- [ ] **Copy link** (2 locations: `RosterCard` + `RosterPreviewDialog`): Show "Link copied!" success snackbar
- [ ] **Vote toggle**: Show brief snackbar "Vote added" / "Vote removed" (or skip if optimistic UI is obvious enough — your call)
- [ ] **Comment posted**: Show "Comment posted!" success snackbar after successful submit
- [ ] **Comment deleted**: Show "Comment deleted" snackbar
- [ ] **Vote when logged out**: Instead of silent `return`, show info snackbar "Log in to vote"

### 2.4 Vote debounce
- [ ] Add debounce/throttle to vote clicks (prevent rapid double-taps sending multiple API calls)

**Files**: `RosterHubPage.tsx`, `RosterCard.tsx`, `RosterPreviewDialog.tsx`, `CommentSection.tsx`, `VoteButton.tsx`

---

## Phase 3 — Filter & Search Upgrades

**Goal**: Modern filtering with search, URL sync, and better discoverability.

### 3.1 Add search bar
- [ ] Add a `TextField` with search icon above or inline with the filter row
- [ ] Debounced input (300ms) that filters by roster title and description
- [ ] Placeholder: "Search by name, author, or trial..."
- [ ] Backend: Add `?q=` query parameter to the list endpoint (SQL `LIKE` or full-text search)

### 3.2 URL-synced filters
- [ ] Sync all filter state to URL query params using React Router's `useSearchParams`
- [ ] Example: `/roster-hub?trial=SS&tag=score-push&sort=votes&q=sunspire`
- [ ] Benefits: shareable filtered views, browser back/forward works, survives refresh
- [ ] Update `use-roster-hub.ts` to initialize from URL params instead of hardcoded defaults

### 3.3 Active filter indicators
- [ ] Add result count: "Showing 8 rosters" (updates live as filters change)
- [ ] Add "Clear all filters" button/chip that appears when any filter is active
- [ ] Individual filter chips with "x" dismiss (for trial and tag selections)

### 3.4 Filter bar improvements
- [ ] Make filter bar sticky on scroll (so users can change filters without scrolling to top)
- [ ] Add `aria-pressed` to tag chips for accessibility
- [ ] Add `aria-label` to sort ButtonGroup
- [ ] On mobile: consider collapsing into a "Filter" button → bottom sheet drawer

### 3.5 Sort options
- [ ] Add "Most Commented" sort option (requires backend change to track comment_count)
- [ ] Show active sort as readable label (e.g., "Sort: Most Popular" not just "Top" toggle)

**Files**: `FilterBar.tsx`, `use-roster-hub.ts`, `roster-hub-api.ts` (frontend), `queries.ts` + `index.ts` (backend)

---

## Phase 4 — Preview Dialog Upgrade

**Goal**: Modern preview experience with deep linking and responsive behavior.

### 4.1 Responsive dialog
- [ ] Add `fullScreen` on mobile breakpoints (`useMediaQuery(theme.breakpoints.down('md'))`)
- [ ] Desktop: keep current centered dialog OR switch to right slide-over panel (480-600px wide) — **decision needed**
- [ ] Animate entry: `Slide` transition from right, 250ms ease-out
- [ ] Comments section: change `maxHeight: 300` (fixed px) to responsive `maxHeight: '30vh'`

### 4.2 Deep linking
- [ ] When dialog opens, update URL to `/roster-hub/:id` using `history.pushState` or React Router
- [ ] Browser back closes the dialog (not full page navigation)
- [ ] Direct URL access: if someone visits `/roster-hub/seed-ss-01`, open the grid behind + dialog immediately
- [ ] This makes previews shareable and bookmarkable

### 4.3 Iframe improvements
- [ ] Add timeout for iframe load (10s). If not loaded, show "Preview unavailable" error state instead of infinite spinner
- [ ] Add error boundary around iframe section

### 4.4 "Load into Builder" safety
- [ ] Add confirmation dialog before navigating away: "This will leave the Hub and open the Roster Builder. Continue?"
- [ ] Or better: open in a new tab (`window.open` instead of `window.location.href`)

### 4.5 Keyboard & navigation
- [ ] Left/Right arrow keys to navigate to prev/next roster in the grid (power user feature)
- [ ] Ensure focus is restored to the triggering card when dialog closes

### 4.6 Share improvements
- [ ] Use `navigator.share()` API on mobile (native OS share sheet) with `navigator.clipboard` fallback
- [ ] Always show success snackbar on copy

**Files**: `RosterPreviewDialog.tsx`, `RosterHubPage.tsx`, app router config

---

## Phase 5 — Comments Polish

**Goal**: Make comments feel complete and engaging.

### 5.1 Comment form improvements
- [ ] Add character counter below input: "0 / 1000" that updates as user types
- [ ] Add proper `aria-label` to the TextField (not just placeholder)
- [ ] Show which comment is being replied to: "Replying to @VelvetStrike" with a snippet, not just "Replying to comment"
- [ ] Add submit on Ctrl+Enter / Cmd+Enter keyboard shortcut

### 5.2 Reply UX
- [ ] Reduce reply indentation on mobile (`pl: 4` → `pl: 2` on xs breakpoints)
- [ ] Add visual connector (thin left border line on replies, like GitHub/Reddit)
- [ ] If > 3 replies on a comment, collapse with "View N more replies" expander

### 5.3 Optimistic comment posting
- [ ] Immediately render the new comment in the list (grayed out / with "Posting..." indicator)
- [ ] On success: update to final version; on failure: remove and show error toast
- [ ] This is much better than the current "clear form → refetch all" pattern

### 5.4 Empty state
- [ ] Better empty state: "No comments yet — start the discussion!" with a visual hint pointing to the input

### 5.5 Optional: Emoji reactions on comments (future enhancement)
- [ ] Curated set of 5-6 reactions (thumbs up, heart, fire, thinking, rocket, laugh)
- [ ] Click to toggle your reaction; show reaction counts grouped by emoji
- [ ] **Note**: This requires a new `comment_reactions` table — could be Phase 7

**Files**: `CommentSection.tsx`, backend `queries.ts` + `index.ts` if adding reactions

---

## Phase 6 — Accessibility & Performance

**Goal**: WCAG compliance, smooth performance at scale, and polished loading states.

### 6.1 Loading skeletons
- [ ] Replace `CircularProgress` spinner with skeleton card grid (MUI `<Skeleton variant="rectangular">`)
- [ ] Match skeleton layout to actual card structure (rectangle for badge, lines for title/description/author)
- [ ] Use `wave` animation variant for shimmer effect

### 6.2 React.memo for performance
- [ ] Wrap `RosterCard` in `React.memo` (prevents re-render of 80 cards when one vote changes)
- [ ] Wrap `VoteButton` in `React.memo` (primitive props make this straightforward)
- [ ] Wrap `SingleComment` in `React.memo` inside `CommentSection`
- [ ] Consider memoizing the `rosters.map()` render in `RosterHubPage` with `useMemo`

### 6.3 Touch targets
- [ ] Increase vote button touch target to 44x44px minimum (WCAG 2.5.5)
- [ ] Increase reply/delete icon buttons in comments to 44x44px minimum
- [ ] Add adequate spacing between adjacent touch targets on mobile

### 6.4 Accessibility fixes
- [ ] Add `aria-hidden="true"` to all decorative icons: `Person`, `Sort`, `FilterList`, `Visibility`
- [ ] Add `role="checkbox"` and `aria-pressed` to tag chips in FilterBar and PublishRosterDialog
- [ ] Add `aria-label` to: comment TextField, Refresh button, Load More button, sort ButtonGroup
- [ ] Add `role="region"` and `aria-label="Comments"` to the scrollable comments container
- [ ] Add `aria-live="polite"` region for dynamic content updates (new comments, vote count changes)

### 6.5 Error boundary
- [ ] Wrap `RosterHubPage` in the existing `ErrorBoundary` component from `src/components/ErrorBoundary.tsx`
- [ ] This prevents a rendering error in any card from crashing the entire page

### 6.6 API resilience
- [ ] Add `AbortController` to API requests in `use-roster-hub.ts` (cancel stale requests properly)
- [ ] Add request timeout (10s) to the `request()` function in `roster-hub-api.ts`
- [ ] Add debounce to filter changes in `use-roster-hub.ts` (avoid double-fetch on rapid filter switches)

### 6.7 Code cleanup
- [ ] Move `loadRosterIntoBuilder` out of the API client into a UI utility
- [ ] Move `PRESET_TAGS` from `types/roster-hub.types.ts` to a separate constants file
- [ ] Replace deprecated `inputProps` with `slotProps.htmlInput` in `PublishRosterDialog`
- [ ] Remove duplicate `TRIAL_SHORT` map in `RosterCard` — use shared trial config from FilterBar
- [ ] Fix `HubComment.replies` type to clarify flat-only (no nested replies on replies)

---

## Things to REMOVE

| Item | Reason |
|---|---|
| `window.alert()` calls | Replace with Snackbar toasts |
| `window.confirm()` calls | Replace with MUI Dialog confirmations |
| `ESOLOGS_JWKS_URL` env var reference | Already removed (dead code from auth rewrite) |
| `[env.production]` block in `wrangler.toml` | Already merged into default vars |
| `loadRosterIntoBuilder` from API client | Side-effect function doesn't belong in API layer |
| Duplicate `TRIAL_SHORT` map in RosterCard | Use shared config |
| `inputProps` usage in PublishRosterDialog | Deprecated MUI API |

---

## Implementation Priority

| Priority | Phase | Effort | Impact |
|---|---|---|---|
| **P0 — Do first** | Phase 2 (Snackbar + feedback) | Medium | Highest — fixes broken UX patterns |
| **P0 — Do first** | Phase 1 (Design alignment) | Medium | Highest — visual consistency |
| **P1 — High** | Phase 6.1-6.2 (Skeletons + memo) | Low | High — perceived performance |
| **P1 — High** | Phase 6.3-6.4 (A11y + touch) | Low | High — accessibility compliance |
| **P1 — High** | Phase 4.1 (Responsive dialog) | Low | High — mobile is currently cramped |
| **P2 — Medium** | Phase 3.1-3.2 (Search + URL sync) | Medium | Medium — discoverability |
| **P2 — Medium** | Phase 5.1-5.3 (Comments polish) | Medium | Medium — engagement |
| **P2 — Medium** | Phase 4.2 (Deep linking) | Medium | Medium — shareability |
| **P3 — Nice to have** | Phase 3.3-3.5 (Filter indicators) | Low | Low-Medium |
| **P3 — Nice to have** | Phase 4.5 (Keyboard nav) | Low | Low — power users only |
| **P3 — Nice to have** | Phase 5.5 (Emoji reactions) | High | Low — requires new DB table |
| **P3 — Nice to have** | Phase 6.6 (API resilience) | Low | Low — edge cases |

---

## Decision Points (Need Your Input)

1. **Preview panel style**: Keep centered dialog, or switch to right slide-over panel? (Slide-over is trendier and keeps grid visible, but is more work)
2. **Search**: Text search across title+description+author, or just title? (Impacts backend query complexity)
3. **Emoji reactions**: Worth adding now, or save for a future iteration?
4. **notistack**: Install as a dependency, or roll a simpler Snackbar context ourselves?
5. **Infinite scroll**: Replace "Load more" button with IntersectionObserver-based infinite scroll, or keep the button?
6. **Comment count on cards**: Add a backend field `comment_count` on rosters table (like `vote_count`), or compute client-side?
