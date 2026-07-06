/**
 * @deprecated Import `SkillBarPicker` from `@/components/skills/SkillBarPicker`
 * (or `@/components/skills`) instead.
 *
 * The presentational SkillBarPicker (front/back bar editor + skill picker
 * dialog) was relocated to a neutral location (`src/components/skills`) so
 * non-build-editor surfaces — the Loadout Manager (B3 adoption) and the roster
 * panels — can reuse it without a `loadout-manager → build-editor` component
 * cycle. This re-export shim keeps existing build-editor/roster import sites
 * working unchanged.
 */
export { SkillBarPicker } from '@/components/skills/SkillBarPicker';
export type { SkillBarPickerProps } from '@/components/skills/SkillBarPicker';
