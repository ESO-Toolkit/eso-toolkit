/**
 * Neutral, feature-agnostic stat-display primitives.
 *
 * These consume only the pure `@/engine` StatResult type (plus MUI / framer-motion)
 * so both the Build Editor and the Loadout Manager can render stats without a
 * cross-feature dependency. Relocated here from build-editor/components/primitives
 * (Section B4b) to keep the one-way build-editor → loadout-manager rule intact.
 */
export { StatGauge } from './StatGauge';
export { StatBreakdown } from './StatBreakdown';
export { StatHealthBadge } from './StatHealthBadge';
export type { StatHealthBadgeProps } from './StatHealthBadge';
export { BuildComparator } from './BuildComparator';
export type { BuildComparatorProps } from './BuildComparator';
export { makeBuildColumn, makeLoadoutColumn } from './comparatorColumns';
export type { ComparatorColumn } from './comparatorColumns';
