/**
 * @deprecated Import `GearPickerDialog` from `@/components/gear` instead.
 *
 * The set-aware GearPicker core was extracted to a neutral location
 * (`src/components/gear`) so non-build-editor surfaces (e.g. the Loadout
 * Manager) can reuse it without creating a `loadout-manager → build-editor`
 * component cycle. This re-export shim keeps existing build-editor import sites
 * (EquipmentPicker, the picker tests, AllSetsBrowser) working unchanged.
 */
export { GearPickerDialog } from '@/components/gear/GearPickerDialog';
export type { GearPickerDialogProps } from '@/components/gear/GearPickerDialog';
