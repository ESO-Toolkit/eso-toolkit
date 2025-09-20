/**
 * Custom hook to manage page-specific body classes and background
 */

import { useEffect } from 'react';

export function usePageBackground(pageClass: string, isDarkMode = false): void {
  useEffect(() => {
    // Apply theme class to body
    document.body.classList.add(pageClass);
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Apply background image to body based on theme
    const backgroundImage = isDarkMode
      ? 'url("/eso-log-aggregator/text-editor/text-editor-bg-dark.jpg")'
      : 'url("/eso-log-aggregator/text-editor/text-editor-bg-light.jpg")';

    document.body.style.backgroundImage = backgroundImage;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';

    // Make the main covering container transparent
    setTimeout(() => {
      const mainCover = document.querySelector('.css-1u9mni1');
      if (mainCover) {
        (mainCover as HTMLElement).style.backgroundColor = 'transparent';
      }
    }, 100);

    // Cleanup when component unmounts or page changes
    return () => {
      document.body.classList.remove(pageClass, 'dark-mode');
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    };
  }, [pageClass, isDarkMode]);
}
