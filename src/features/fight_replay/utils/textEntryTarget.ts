/**
 * Shared text-entry guard for keyboard shortcuts.
 *
 * Transport/camera/marker shortcuts must yield when focus is inside editable content — otherwise
 * typing a label (or toggling a checkbox) also scrubs playback, resets the camera, or arms tools.
 * Covers INPUT (all types, incl. checkbox/range), TEXTAREA, SELECT, and contentEditable. One
 * definition so CameraResetControls / KeyboardCameraControls / ShapeDrawLayer / page shells can't
 * drift apart again.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable === true
  );
}
