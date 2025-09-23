import { useEffect } from 'react';

export function usePageBackground(pageClass: string, isDarkMode = false): void {
  useEffect(() => {
    // Add page class
    document.body.classList.add(pageClass);

    // Add/remove dark mode class
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Apply background image to body based on theme
    const backgroundImage = isDarkMode
      ? 'url("/text-editor/text-editor-bg-dark.jpg")'
      : 'url("/text-editor/text-editor-bg-light.jpg")';

    document.body.style.backgroundImage = backgroundImage;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';

    return () => {
      document.body.classList.remove(pageClass);
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    };
  }, [pageClass, isDarkMode]);
}
