# Pickr Dark/Light Theme Integration for Windsurf

This file provides comprehensive CSS and React code, fully commented for Claude Code. It ensures Pickr’s color picker matches both your site’s light and dark modes, with clear instructions on setup and usage.

---

## CSS: src/styles/pickr-theme.css

```css
/*
  pickr-theme.css

  Purpose:
  - Import Pickr's built-in light (classic) and dark (monolith) skins.
  - Apply custom dark-mode overrides scoped under the `.dark-mode` class on <body>.
  - Use CSS variables to align colors with your site design system.

  Usage:
  1. Place this file at `src/styles/pickr-theme.css`.
  2. Ensure your bundler resolves `~@simonwep/pickr` imports (e.g., Webpack alias).
  3. Include this CSS in your React entry/component:
     `import '../styles/pickr-theme.css';`
  4. Toggle dark mode by adding/removing `dark-mode` on <body>.

  Required CSS Variables (define in global or :root):
    --site-bg         (background color for dark mode)   default #121212
    --site-fg         (text color for dark mode)         default #e0e0e0
    --site-accent     (accent color for pointers/buttons) default #6200ee
    --site-border     (border color for inputs/swatches)  default #333333
    --site-shadow     (shadow color for popover)         default rgba(0,0,0,0.8)
*/

/* Import both built-in themes */
@import "~@simonwep/pickr/dist/themes/classic.min.css";
@import "~@simonwep/pickr/dist/themes/monolith.min.css";

/* Dark-mode overrides */
.dark-mode .pcr-app {
  background: var(--site-bg, #121212) !important;
  color: var(--site-fg, #e0e0e0) !important;
  box-shadow: 0 0 12px var(--site-shadow, rgba(0,0,0,0.8)) !important;
}

.dark-mode .pcr-widget .pcr-selection,
.dark-mode .pcr-widget .pcr-xy-indicator {
  border-color: var(--site-border, #333333) !important;
}

.dark-mode .pcr-widget .pcr-color {
  background: var(--site-bg, #121212) !important;
}

.dark-mode .pcr-widget .pcr-hue,
.dark-mode .pcr-widget .pcr-opacity {
  background: rgba(18,18,18,0.9) !important;
}

.dark-mode .pcr-widget .pcr-hue .pcr-pointer,
.dark-mode .pcr-widget .pcr-opacity .pcr-pointer {
  background: var(--site-accent, #6200ee) !important;
  box-shadow: 0 0 2px #000 !important;
}

.dark-mode .pcr-widget input,
.dark-mode .pcr-widget .pcr-btn {
  background: var(--site-bg, #121212) !important;
  color: var(--site-fg, #e0e0e0) !important;
  border: 1px solid var(--site-border, #333333) !important;
}

.dark-mode .pcr-widget .pcr-btn:hover {
  background: #1f1f1f !important;
}

.dark-mode .pcr-widget .pcr-swatches .pcr-swatch {
  border: 1px solid var(--site-border, #333333) !important;
}
```

---

## React Component: src/components/TextEditor.tsx

```tsx
/**
 * TextEditor.tsx
 *
 * Purpose:
 * - Initialize Pickr color picker with light (classic) and dark (monolith) themes.
 * - Reactively re-initialize when theme changes (light ↔ dark).
 *
 * Setup:
 * 1. Ensure `pickr-theme.css` is imported for both classic and monolith skins + overrides.
 * 2. Pass `isDarkMode` prop based on your app's dark-mode state.
 * 3. Toggle `dark-mode` class on the <body> element in your app root.
 *
 * Notes:
 * - `theme: 'classic'` uses Pickr’s default light skin.
 * - `theme: 'monolith'` uses Pickr’s default dark skin (plus our overrides).
 * - Ensure CSS variables are defined globally (e.g., :root or body).
 */

import React, { useEffect, useRef } from 'react';
import Pickr from '@simonwep/pickr';
import '../styles/pickr-theme.css'; // includes both themes + overrides

interface TextEditorProps {
  /** Initial hex or rgba color string */
  initialColor: string;
  /** Flag indicating if app is in dark mode */
  isDarkMode: boolean;
  /** Callback invoked when user saves a color */
  onColorChange: (color: string) => void;
}

export default function TextEditor({ initialColor, isDarkMode, onColorChange }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine Pickr skin based on light/dark mode
    const theme = isDarkMode ? 'monolith' : 'classic';

    // Ensure <body> has .dark-mode when isDarkMode is true
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Initialize Pickr
    const pickr = Pickr.create({
      el: editorRef.current!,
      theme,
      default: initialColor,
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: { hex: true, rgba: true, input: true, save: true },
      },
    });

    // Handle save event
    pickr.on('save', (color) => {
      onColorChange(color.toHEXA().toString());
      pickr.hide();
    });

    // Cleanup on unmount or theme change
    return () => pickr.destroy();
  }, [initialColor, onColorChange, isDarkMode]);

  return <div ref={editorRef} />;
}
```

---

### Additional Tips

- **Bundler Config**: Ensure CSS imports using `~` work (Webpack `resolve.alias` or Vite config).
- **Variable Definitions**: Define your CSS variables in a global file, e.g.,
  ```css
  :root {
    --site-bg: #121212;
    --site-fg: #e0e0e0;
    --site-accent: #6200ee;
    --site-border: #333333;
    --site-shadow: rgba(0, 0, 0, 0.8);
  }
  ```
- **Reinitialization**: Pickr must be destroyed and recreated to apply a new theme.

This file is ready for Claude Code to parse, reference, and expand with confidence.