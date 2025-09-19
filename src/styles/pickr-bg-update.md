# Pickr Background Image Update for a Specific Asset

This markdown file shows how to set a specific background image from `src/assets/text-editor/eso-ss-1.jpg` in Pickr, ensuring correct bundler resolution and opacity control.

---

## CSS: src/styles/pickr-background.css

```css
/*
  pickr-background.css

  Updated to use local asset `eso-ss-1.jpg` from `src/assets/text-editor`.
*/

:root {
  /* Use Webpack/Vite asset import syntax in CSS */
  --pickr-bg-image: url('../assets/text-editor/eso-ss-1.jpg');
  --pickr-bg-opacity: 0.15;
  --pickr-overlay-color: rgba(0, 0, 0, 0.3);
}

.pcr-app {
  position: relative !important;
  overflow: hidden !important;
}

.pcr-app::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--pickr-bg-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: var(--pickr-bg-opacity);
  z-index: -2;
  pointer-events: none;
}

.pcr-app::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--pickr-overlay-color);
  z-index: -1;
  pointer-events: none;
}

.pcr-widget {
  position: relative !important;
  z-index: 1 !important;
}

/* Ensure inputs/buttons maintain readability */
.pcr-widget input,
.pcr-widget .pcr-btn {
  backdrop-filter: blur(2px) !important;
  background: var(--site-bg, #fff) !important;
}

.dark-mode .pcr-widget input,
.dark-mode .pcr-widget .pcr-btn {
  background: var(--site-bg, #000) !important;
}
```

---

## React Usage: src/components/TextEditor.tsx

```tsx
import React, { useEffect, useRef } from 'react';
import Pickr from '@simonwep/pickr';
import '../styles/pickr-theme.css';
import '../styles/pickr-radius.css';
import '../styles/pickr-background.css';

export default function TextEditor({
  initialColor,
  isDarkMode,
  onColorChange,
}: {
  initialColor: string;
  isDarkMode: boolean;
  onColorChange: (color: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Toggle dark-mode class on body
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');

    // Initialize Pickr with imported CSS variables
    const pickr = Pickr.create({
      el: editorRef.current!,
      theme: isDarkMode ? 'monolith' : 'classic',
      default: initialColor,
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: { hex: true, rgba: true, input: true, save: true },
      },
    });

    pickr.on('save', (color) => {
      onColorChange(color.toHEXA().toString());
      pickr.hide();
    });

    return () => pickr.destroy();
  }, [initialColor, isDarkMode, onColorChange]);

  return <div ref={editorRef} />;
}
```

---

### Notes:

- Ensure `src/assets/text-editor/eso-ss-1.jpg` exists and is correctly referenced by your bundler.
- If using Create React App, the CSS URL path above should work out of the box.
- For Vite, you might need to use `url('/src/assets/text-editor/eso-ss-1.jpg')` or import the image in JS and set the CSS variable dynamically.
