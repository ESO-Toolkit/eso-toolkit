# Pickr Theme Integration

This file includes both the CSS theme overrides and the React initialization code for Pickr, suitable for reading by Claude Code in Windsurf.

---

## CSS: src/styles/pickr-theme.css

```css
/* Import both Pickr built-in themes */
@import '~@simonwep/pickr/dist/themes/classic.min.css';
@import '~@simonwep/pickr/dist/themes/monolith.min.css';

/* Dark-mode overrides scoped under .dark-mode on <body> */
.dark-mode .pcr-app {
  background: var(--site-bg, #121212) !important;
  color: var(--site-fg, #e0e0e0) !important;
  box-shadow: 0 0 12px var(--site-shadow, rgba(0, 0, 0, 0.8)) !important;
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
  background: rgba(18, 18, 18, 0.9) !important;
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

## React Usage: src/components/TextEditor.tsx

```tsx
import React, { useEffect, useRef } from 'react';
import Pickr from '@simonwep/pickr';
import '../styles/pickr-theme.css'; // contains both classic & monolith imports + overrides

interface TextEditorProps {
  initialColor: string;
  isDarkMode: boolean;
  onColorChange: (color: string) => void;
}

export default function TextEditor({ initialColor, isDarkMode, onColorChange }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Choose built-in theme
    const theme = isDarkMode ? 'monolith' : 'classic';

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

    pickr.on('save', (color) => {
      onColorChange(color.toHEXA().toString());
      pickr.hide();
    });

    return () => pickr.destroy();
  }, [initialColor, onColorChange, isDarkMode]);

  return <div ref={editorRef} />;
}
```
