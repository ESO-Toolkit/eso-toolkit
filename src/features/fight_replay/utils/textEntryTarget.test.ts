import { isTextEntryTarget } from './textEntryTarget';

describe('isTextEntryTarget', () => {
  it('matches inputs, textareas, and selects', () => {
    expect(isTextEntryTarget(document.createElement('input'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('textarea'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('select'))).toBe(true);
    // NOTE: contentEditable coverage is intentionally absent — jsdom does not implement
    // HTMLElement.isContentEditable (always false), so the branch is only exercisable in a
    // real browser. The implementation reads the standard property browsers provide.
  });

  it('ignores buttons, divs, links, and non-elements', () => {
    expect(isTextEntryTarget(document.createElement('button'))).toBe(false);
    expect(isTextEntryTarget(document.createElement('div'))).toBe(false);
    expect(isTextEntryTarget(document.createElement('a'))).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget(document.createTextNode('x'))).toBe(false);
  });

  it('catches checkbox inputs (speed/quality switches must not leak WASD)', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isTextEntryTarget(checkbox)).toBe(true);
  });
});
