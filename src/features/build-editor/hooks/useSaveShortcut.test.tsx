import { fireEvent, renderHook } from '@testing-library/react';

import { useSaveShortcut } from './useSaveShortcut';

describe('useSaveShortcut', () => {
  it.each([
    ['Control', { ctrlKey: true }],
    ['Command', { metaKey: true }],
  ])('invokes one save for %s+S and prevents the browser command', (_name, modifier) => {
    const save = jest.fn();
    const { unmount } = renderHook(() => useSaveShortcut(save));
    const event = new KeyboardEvent('keydown', {
      key: 'S',
      bubbles: true,
      cancelable: true,
      ...modifier,
    });

    window.dispatchEvent(event);
    fireEvent.keyDown(window, { key: 's' });
    fireEvent.keyDown(window, { key: 's', ...modifier, repeat: true });

    expect(save).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);

    unmount();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true, ...modifier }),
    );
    expect(save).toHaveBeenCalledTimes(1);
  });
});
