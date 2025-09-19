# Pickr Border-Radius Customization for Windsurf

This markdown file provides CSS and usage instructions for customizing border radii on all Pickr elements. It's formatted for Claude Code ingestion.

---

## CSS: src/styles/pickr-radius.css

````css
/*
  pickr-radius.css

  Purpose:
  - Override default border-radius for Pickr UI components to match site design tokens.
  - Applies globally in both light and dark modes.

  Usage:
  1. Place this file at `src/styles/pickr-radius.css`.
  2. Import after `pickr-theme.css` in your components or global entry:
     ```ts
     import '../styles/pickr-theme.css';
     import '../styles/pickr-radius.css';
     ```
  3. Define `--site-radius` CSS variable in your global styles (e.g., :root).
     - Example: `--site-radius: 8px;`
*/

:root {
  /* Default border radius if not defined elsewhere */
  --site-radius: 8px;
}

/* Override container and widget */
.pcr-app,
.pcr-widget {
  border-radius: var(--site-radius) !important;
}

/* Round color preview & selection circles */
.pcr-widget .pcr-color,
.pcr-widget .pcr-selection {
  border-radius: 50% !important;
}

/* Sliders and interaction elements */
.pcr-widget .pcr-hue,
.pcr-widget .pcr-opacity,
.pcr-widget .pcr-xy {
  border-radius: var(--site-radius) !important;
}
.pcr-widget .pcr-pointer {
  border-radius: 50% !important;
}

/* Inputs and buttons */
.pcr-widget input,
.pcr-widget .pcr-btn {
  border-radius: calc(var(--site-radius) / 2) !important;
}

/* Swatch previews */
.pcr-widget .pcr-swatches .pcr-swatch {
  border-radius: calc(var(--site-radius) / 2) !important;
}
````

---

## Integration in React: src/components/TextEditor.tsx

```tsx
import React from 'react';
import '../styles/pickr-theme.css'; // Ensure theme CSS is loaded first
import '../styles/pickr-radius.css'; // Then load radius overrides

function TextEditorWrapper() {
  // This component already sets up Pickr as shown previously
  return <TextEditor initialColor="#ff0000" isDarkMode={false} onColorChange={() => {}} />;
}

export default TextEditorWrapper;
```

---

### Notes for Claude Code

- Ensure the import order: theme CSS first, then radius CSS.
- Define `--site-radius` variable in your global stylesheet or :root.
- Adjust `--site-radius` value to control rounding across all Pickr elements.
- No additional JS changes are required; CSS overrides apply automatically.
