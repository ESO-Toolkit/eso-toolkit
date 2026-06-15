/**
 * Document-wide text-selection lock for the mobile immersive replay overlay.
 *
 * Why document-wide: iOS Safari's long-press selection hit-test is NOT confined to the touched
 * element — when that element is unselectable, WebKit searches for the nearest *selectable*
 * content, including text visually BEHIND a fixed overlay. So scoping `user-select: none` to
 * the overlay makes Safari select the page underneath instead (observed in the field). Since
 * iOS 15 the loupe/callout can also appear despite element-level `-webkit-user-select: none`
 * (WebKit bug 231161). The reliable pattern is the PWA-grade one: while the app surface is
 * active, EVERY element is unselectable, with text inputs explicitly re-enabled (under
 * `user-select: none` iOS makes fields uneditable — WebKit bug 82692).
 *
 * The lock also installs a `selectstart` preventer (programmatic backstop for the CSS) and
 * clears any selection that existed when the lock engaged.
 */

const LOCK_CLASS = 'replay-touch-selection-lock';
const STYLE_ID = 'replay-touch-selection-lock-style';

const LOCK_CSS = `
.${LOCK_CLASS}, .${LOCK_CLASS} * {
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
}
.${LOCK_CLASS} input, .${LOCK_CLASS} textarea, .${LOCK_CLASS} [contenteditable] {
  -webkit-user-select: text !important;
  user-select: text !important;
}
`;

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true
  );
}

function ensureStyleSheet(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = LOCK_CSS;
  document.head.appendChild(style);
}

const preventSelectStart = (event: Event): void => {
  if (!isTextEntryTarget(event.target)) {
    event.preventDefault();
  }
};

// Re-entrant: multiple concurrent lockers (e.g. fast unmount/remount) share one document state.
let lockCount = 0;

/**
 * Engage the document-wide selection lock. Returns a release function; the lock lifts when
 * every outstanding holder has released.
 */
export function lockDocumentSelection(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  lockCount += 1;
  if (lockCount === 1) {
    ensureStyleSheet();
    document.documentElement.classList.add(LOCK_CLASS);
    document.addEventListener('selectstart', preventSelectStart);
    // Drop any selection that existed before the lock — it would otherwise keep its
    // grab handles/callout alive on iOS.
    document.getSelection?.()?.removeAllRanges();
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    lockCount -= 1;
    if (lockCount === 0) {
      document.documentElement.classList.remove(LOCK_CLASS);
      document.removeEventListener('selectstart', preventSelectStart);
    }
  };
}
