/**
 * Custom hook to manage page-specific body classes and background
 */

import { useEffect } from 'react';

export function usePageBackground(pageClass: string, isDarkMode: boolean = false) {
  useEffect(() => {
    // Add page-specific class
    document.body.classList.add(pageClass);

    // Force remove any conflicting styles
    const root = document.getElementById('root');
    if (root) {
      root.style.background = 'transparent';
      root.style.backgroundColor = 'transparent';
    }

    // Force body background transparency
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';

    // Add/remove dark mode class
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Cleanup when component unmounts or page changes
    return () => {
      document.body.classList.remove(pageClass);
      document.body.classList.remove('dark-mode');
      // Restore default background if needed
      if (root) {
        root.style.background = '';
        root.style.backgroundColor = '';
      }
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
    };
  }, [pageClass, isDarkMode]);

  // Update dark mode class when it changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);
}