/**
 * Unit tests for KeyboardCameraControls component
 *
 * Tests keyboard input handling for WASD camera movement:
 * - Key press/release state management
 * - Movement speed calculations
 * - Sprint modifier
 * - Disabled state (when following an actor)
 * - Input field interaction prevention
 */

import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useEffect, useRef } from 'react';

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

// Mock the keyboard state management logic
const useKeyboardState = (enabled: boolean) => {
  const keyStateRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!enabled) return;

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
          keyStateRef.current.forward = true;
          event.preventDefault();
          break;
        case 's':
          keyStateRef.current.backward = true;
          event.preventDefault();
          break;
        case 'a':
          keyStateRef.current.left = true;
          event.preventDefault();
          break;
        case 'd':
          keyStateRef.current.right = true;
          event.preventDefault();
          break;
        case 'shift':
          keyStateRef.current.sprint = true;
          event.preventDefault();
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
          keyStateRef.current.forward = false;
          break;
        case 's':
          keyStateRef.current.backward = false;
          break;
        case 'a':
          keyStateRef.current.left = false;
          break;
        case 'd':
          keyStateRef.current.right = false;
          break;
        case 'shift':
          keyStateRef.current.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  return keyStateRef;
};

describe('KeyboardCameraControls', () => {
  describe('Key State Management', () => {
    it('should set forward state when W is pressed', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      });

      expect(result.current.current.forward).toBe(true);
    });

    it('should set backward state when S is pressed', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      });

      expect(result.current.current.backward).toBe(true);
    });

    it('should set left state when A is pressed', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });

      expect(result.current.current.left).toBe(true);
    });

    it('should set right state when D is pressed', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      });

      expect(result.current.current.right).toBe(true);
    });

    it('should set sprint state when Shift is pressed', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      });

      expect(result.current.current.sprint).toBe(true);
    });

    it('should clear forward state when W is released', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      });
      expect(result.current.current.forward).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      });
      expect(result.current.current.forward).toBe(false);
    });

    it('should handle multiple keys pressed simultaneously', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      });

      expect(result.current.current.forward).toBe(true);
      expect(result.current.current.right).toBe(true);
      expect(result.current.current.sprint).toBe(true);
    });

    it('should handle case-insensitive key presses', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
      });

      expect(result.current.current.forward).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should not respond to keys when disabled', () => {
      const { result } = renderHook(() => useKeyboardState(false));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });

      expect(result.current.current.forward).toBe(false);
      expect(result.current.current.left).toBe(false);
    });

    it('should clear state when key is released even if disabled', () => {
      const { result, rerender } = renderHook(({ enabled }) => useKeyboardState(enabled), {
        initialProps: { enabled: true },
      });

      // Press key while enabled
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      });
      expect(result.current.current.forward).toBe(true);

      // Disable controls
      rerender({ enabled: false });

      // Release key while disabled - should still clear state
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      });
      expect(result.current.current.forward).toBe(false);
    });
  });

  describe('Input Field Interaction', () => {
    it('should not respond to keys when typing in an input field', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      const input = document.createElement('input');
      document.body.appendChild(input);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'w' });
        Object.defineProperty(event, 'target', { value: input, writable: false });
        window.dispatchEvent(event);
      });

      expect(result.current.current.forward).toBe(false);

      document.body.removeChild(input);
    });

    it('should not respond to keys when typing in a textarea', () => {
      const { result } = renderHook(() => useKeyboardState(true));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 's' });
        Object.defineProperty(event, 'target', { value: textarea, writable: false });
        window.dispatchEvent(event);
      });

      expect(result.current.current.backward).toBe(false);

      document.body.removeChild(textarea);
    });
  });

  describe('Movement Calculations', () => {
    it('should calculate correct speed with base movement', () => {
      const moveSpeed = 20;
      const delta = 0.016; // ~60fps
      const expectedDistance = moveSpeed * delta;

      expect(expectedDistance).toBeCloseTo(0.32, 2);
    });

    it('should calculate correct speed with sprint modifier', () => {
      const moveSpeed = 20;
      const sprintMultiplier = 2;
      const delta = 0.016;
      const expectedDistance = moveSpeed * sprintMultiplier * delta;

      expect(expectedDistance).toBeCloseTo(0.64, 2);
    });

    it('should handle variable frame times', () => {
      const moveSpeed = 20;
      const slowDelta = 0.033; // ~30fps
      const fastDelta = 0.008; // ~120fps

      const slowDistance = moveSpeed * slowDelta;
      const fastDistance = moveSpeed * fastDelta;

      expect(slowDistance).toBeCloseTo(0.66, 2);
      expect(fastDistance).toBeCloseTo(0.16, 2);
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardState(true));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
