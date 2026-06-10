import { lockDocumentSelection } from './documentSelectionLock';

const LOCK_CLASS = 'replay-touch-selection-lock';

function fireSelectStart(target: EventTarget): Event {
  const event = new Event('selectstart', { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('lockDocumentSelection', () => {
  afterEach(() => {
    // Reset any leaked lock state between tests.
    document.documentElement.classList.remove(LOCK_CLASS);
  });

  it('adds the lock class and stylesheet while held, removes the class on release', () => {
    const release = lockDocumentSelection();

    expect(document.documentElement.classList.contains(LOCK_CLASS)).toBe(true);
    const style = document.getElementById('replay-touch-selection-lock-style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('-webkit-touch-callout: none');
    expect(style?.textContent).toContain('user-select: text'); // inputs stay editable

    release();
    expect(document.documentElement.classList.contains(LOCK_CLASS)).toBe(false);
  });

  it('prevents selectstart on regular elements while locked', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const release = lockDocumentSelection();
    const blocked = fireSelectStart(div);
    expect(blocked.defaultPrevented).toBe(true);

    release();
    const allowed = fireSelectStart(div);
    expect(allowed.defaultPrevented).toBe(false);

    div.remove();
  });

  it('allows selectstart inside text inputs (typing/caret must keep working)', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const release = lockDocumentSelection();
    const event = fireSelectStart(input);
    expect(event.defaultPrevented).toBe(false);

    release();
    input.remove();
  });

  it('is re-entrant: the lock lifts only when every holder releases', () => {
    const releaseA = lockDocumentSelection();
    const releaseB = lockDocumentSelection();

    releaseA();
    expect(document.documentElement.classList.contains(LOCK_CLASS)).toBe(true);

    releaseB();
    expect(document.documentElement.classList.contains(LOCK_CLASS)).toBe(false);
  });

  it('release is idempotent (double-release cannot unlock another holder)', () => {
    const releaseA = lockDocumentSelection();
    const releaseB = lockDocumentSelection();

    releaseA();
    releaseA(); // double release of the same holder
    expect(document.documentElement.classList.contains(LOCK_CLASS)).toBe(true);

    releaseB();
    expect(document.documentElement.classList.contains(LOCK_CLASS)).toBe(false);
  });
});
