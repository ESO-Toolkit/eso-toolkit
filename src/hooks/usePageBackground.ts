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

    // Apply background image to body
    document.body.style.backgroundImage = 'url("/images/eso-ss-1.jpg")';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';

    // Make any covering elements transparent
    const coveringElements = document.querySelectorAll('.css-1bjd1tz, .css-1u9mni1');
    coveringElements.forEach(el => {
      (el as HTMLElement).style.backgroundColor = 'transparent';
      (el as HTMLElement).style.background = 'transparent';
    });

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
