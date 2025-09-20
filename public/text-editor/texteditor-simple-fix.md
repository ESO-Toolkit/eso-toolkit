# Simple TextEditor Color Fix - Preserve Background Image

## Problem
The React TextEditor.tsx has color issues compared to the standalone version, and the previous fix broke the background image.

## Root Cause
The issue is likely that Material UI's theme colors don't match the standalone's CSS variables, and the complex styled components are overriding the working transparency.

## Simple Solution
Keep your existing background image logic intact and just fix the color mapping between Material UI theme and the standalone CSS variables.

## Step 1: Create Theme Bridge CSS (NEW FILE)
Create `src/styles/texteditor-theme-bridge.css`:

```css
/* Bridge Material UI theme to standalone CSS variables */
.text-editor-page {
  /* Map MUI theme colors to standalone variables */
  --bg: var(--mui-palette-background-default, #000);
  --text: var(--mui-palette-text-primary, #fff);
  --panel: var(--mui-palette-background-paper, rgba(0, 0, 0, 0.8));
  --panel2: var(--mui-palette-background-default, rgba(0, 0, 0, 0.9));
  --border: var(--mui-palette-divider, rgba(255, 255, 255, 0.12));
  --accent: var(--mui-palette-primary-main, #38bdf8);
  --accent2: var(--mui-palette-primary-dark, #0284c7);
  --muted: var(--mui-palette-text-secondary, rgba(255, 255, 255, 0.7));
}

/* Light mode specific overrides */
.text-editor-page:not(.dark-mode) {
  --panel: rgba(255, 255, 255, 0.92);
  --panel2: rgba(255, 255, 255, 0.96);
  --border: rgba(0, 0, 0, 0.12);
  --muted: rgba(0, 0, 0, 0.6);
}

/* Dark mode specific overrides */  
.text-editor-page.dark-mode {
  --panel: rgba(0, 0, 0, 0.4);
  --panel2: rgba(0, 0, 0, 0.6);
  --border: rgba(255, 255, 255, 0.2);
  --muted: rgba(255, 255, 255, 0.7);
}
```

## Step 2: Update TextEditor.tsx - MINIMAL CHANGES

Only modify the styled components to use CSS variables instead of theme object:

```tsx
// KEEP all your existing imports and logic
// JUST CHANGE the styled components:

const EditorTool = styled(Box)({
  maxWidth: 900,
  margin: '2rem auto 2rem auto',
  background: 'var(--panel)', // Instead of theme-based background
  padding: '24px',
  borderRadius: '14px',
  border: '1px solid var(--border)', // Instead of theme-based border
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--text)', // Instead of theme-based color
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  position: 'relative',
  zIndex: 1,
});

const Toolbar = styled(Box)({
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  padding: '16px',
  background: 'var(--panel2)', // Instead of theme-based background
  borderRadius: '12px',
  border: '1px solid var(--border)', // Instead of theme-based border
  alignItems: 'center',
  transition: 'all 0.15s ease-in-out',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  overflowX: 'auto',
  backdropFilter: 'blur(8px) saturate(150%)',
  WebkitBackdropFilter: 'blur(8px) saturate(150%)',
});

const ToolbarButton = styled('button')({
  background: 'var(--panel)', // Instead of theme.palette.background.paper
  color: 'var(--text)', // Instead of theme.palette.text.primary
  border: '1px solid var(--border)', // Instead of theme.palette.divider
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'all 0.15s ease-in-out',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    background: 'var(--accent)', // Instead of theme.palette.primary.main
    borderColor: 'var(--accent)',
    color: 'var(--bg)', // Text color for contrast
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  '&:active': {
    background: 'var(--accent2)', // Instead of theme.palette.primary.dark
    borderColor: 'var(--accent2)',
    color: 'var(--bg)',
    transform: 'translateY(0px)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  '&:disabled': {
    background: 'transparent',
    color: 'var(--muted)', // Instead of theme.palette.text.disabled
    borderColor: 'var(--border)',
    opacity: 1,
    cursor: 'not-allowed',
  },
});

const TextInput = styled('textarea')({
  width: '100%',
  height: '280px',
  padding: '20px',
  background: 'var(--panel)', // Instead of theme-based background
  color: 'var(--text)', // Instead of theme-based color
  border: '1px solid var(--border)', // Instead of theme-based border
  borderRadius: '12px 12px 0 0',
  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
  resize: 'vertical',
  fontSize: '15px',
  fontWeight: 400,
  lineHeight: '1.5',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease-in-out',
  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(6px) saturate(140%)',
  WebkitBackdropFilter: 'blur(6px) saturate(140%)',
  '&:focus': {
    outline: 'none',
    borderColor: 'var(--accent)', // Instead of theme.palette.primary.main
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(56, 189, 248, 0.2)',
  },
});

// Do the same for other styled components: StatusBar, PreviewArea, etc.
```

## Step 3: Add CSS Variable Mapping

Add this useEffect to your TextEditor component to map Material UI theme to CSS variables:

```tsx
// Add this useEffect AFTER your existing theme/background useEffects
useEffect(() => {
  const root = document.documentElement;
  
  // Map Material UI theme values to CSS variables
  root.style.setProperty('--mui-palette-background-default', theme.palette.background.default);
  root.style.setProperty('--mui-palette-background-paper', theme.palette.background.paper);
  root.style.setProperty('--mui-palette-text-primary', theme.palette.text.primary);
  root.style.setProperty('--mui-palette-text-secondary', theme.palette.text.secondary);
  root.style.setProperty('--mui-palette-primary-main', theme.palette.primary.main);
  root.style.setProperty('--mui-palette-primary-dark', theme.palette.primary.dark);
  root.style.setProperty('--mui-palette-divider', theme.palette.divider);
}, [theme]);
```

## Step 4: Add Import

Add this import to TextEditor.tsx:

```tsx
import '../styles/texteditor-theme-bridge.css';
```

## What This Does

1. **Preserves your background image logic** - doesn't touch TextEditorContainer or background setup
2. **Maps MUI theme colors to CSS variables** - bridges the gap between your React theme and standalone CSS
3. **Uses the proven color values** from your working standalone version
4. **Minimal changes** - only updates styled components to use CSS variables instead of theme object

## What This Doesn't Do

- Doesn't touch your background image setup
- Doesn't change your usePageBackground hook
- Doesn't modify your transparency layers significantly
- Doesn't break existing functionality

This should fix the color issues while keeping your background image intact.