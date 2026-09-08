import { useEffect } from 'react';

/** Register the editor-wide Ctrl/Cmd+S command without intercepting plain typing. */
export const useSaveShortcut = (save: () => void | Promise<unknown>): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.repeat && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);
};
