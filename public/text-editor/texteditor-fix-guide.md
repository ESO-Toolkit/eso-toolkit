# Fix TextEditor.tsx Transparency and Color Issues

## Problem Analysis

The React `TextEditor.tsx` component has transparency and color issues compared to the working standalone reference in `public/text-editor/`. The standalone version uses a clean CSS variable system with proper theme-aware styling, while the React component has overly complex transparency layers causing visual problems.

## Root Issues Identified

1. **Complex Transparency Conflicts**: Multiple overlapping transparency layers in React component
2. **Inconsistent Color Variables**: React component doesn't use the same CSS variable system as standalone
3. **Theme Integration Problems**: Material UI theme integration conflicts with standalone's clean approach
4. **Background Image Handling**: Different approaches between standalone and React versions

## Solution Strategy

Replace the complex React styling approach with the proven standalone CSS variable system, properly integrated with Material UI themes.

## Implementation Plan

### Step 1: Update CSS Variable System

Create a unified CSS variable system that maps Material UI theme values to the standalone's proven variable names:

```css
/* Add to src/styles/text-editor-theme-variables.css */
:root {
  /* Base theme mapping from standalone reference */
  --bg: var(--mui-palette-background-default);
  --text: var(--mui-palette-text-primary);
  --panel: var(--mui-palette-background-paper);
  --panel2: var(--mui-palette-background-default);
  --border: var(--mui-palette-divider);
  --accent: var(--mui-palette-primary-main);
  --accent2: var(--mui-palette-primary-dark);
  --muted: var(--mui-palette-text-secondary);
}

/* Light mode overrides */
[data-theme="light"] {
  --panel: rgba(255, 255, 255, 0.9);
  --panel2: rgba(255, 255, 255, 0.95);
  --bg-overlay: rgba(255, 255, 255, 0.1);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --panel: rgba(0, 0, 0, 0.7);
  --panel2: rgba(0, 0, 0, 0.8);
  --bg-overlay: rgba(0, 0, 0, 0.3);
}
```

### Step 2: Simplify TextEditor Component Styling

Replace all the complex styled components with simple ones that use CSS variables:

```tsx
// Simplified styled components using CSS variables
const TextEditorContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: 'transparent',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'var(--page-bg-image)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    zIndex: -2,
  },
  '&::after': {
    content: '""',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-overlay)',
    zIndex: -1,
  },
});

const EditorTool = styled(Box)({
  maxWidth: 900,
  margin: '2rem auto',
  background: 'var(--panel)',
  padding: '24px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
  position: 'relative',
  zIndex: 1,
});
```

### Step 3: Fix Theme Integration

Update the component to properly set CSS variables based on Material UI theme:

```tsx
// Add to TextEditor component
useEffect(() => {
  const updateCSSVariables = () => {
    const root = document.documentElement;
    
    // Map Material UI theme to CSS variables
    root.style.setProperty('--mui-palette-background-default', theme.palette.background.default);
    root.style.setProperty('--mui-palette-background-paper', theme.palette.background.paper);
    root.style.setProperty('--mui-palette-text-primary', theme.palette.text.primary);
    root.style.setProperty('--mui-palette-text-secondary', theme.palette.text.secondary);
    root.style.setProperty('--mui-palette-primary-main', theme.palette.primary.main);
    root.style.setProperty('--mui-palette-primary-dark', theme.palette.primary.dark);
    root.style.setProperty('--mui-palette-divider', theme.palette.divider);
    
    // Set theme attribute for CSS selectors
    root.setAttribute('data-theme', theme.palette.mode);
  };
  
  updateCSSVariables();
}, [theme]);
```

### Step 4: Clean Up Background and Transparency

Remove all the complex backdrop-filter and multiple transparency layers. Use the simple, proven approach from the standalone:

```tsx
const Toolbar = styled(Box)({
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  padding: '16px',
  background: 'var(--panel2)',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  alignItems: 'center',
  // Remove all backdrop-filter complexity
});

const TextInput = styled('textarea')({
  width: '100%',
  height: '280px',
  padding: '20px',
  background: 'var(--panel)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '12px 12px 0 0',
  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
  // Remove backdrop-filter complexity
});
```

### Step 5: Import and Apply Standalone CSS

Import the proven CSS from the standalone version:

```tsx
// Add these imports to TextEditor.tsx
import '../styles/text-editor-theme-variables.css';
import '../../public/text-editor/text-editor.css'; // Import the working CSS
```

### Step 6: Update usePageBackground Hook

Simplify the page background logic to match the standalone approach:

```tsx
useEffect(() => {
  // Apply theme class to body
  document.body.classList.add('text-editor-page');
  if (theme.palette.mode === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  // Set background image
  document.documentElement.style.setProperty('--page-bg-image', `url(${backgroundImage})`);
  
  return () => {
    document.body.classList.remove('text-editor-page', 'dark-mode');
    document.documentElement.style.removeProperty('--page-bg-image');
  };
}, [theme.palette.mode, backgroundImage]);
```

## Files to Modify

1. **Create**: `src/styles/text-editor-theme-variables.css`
2. **Modify**: `src/components/TextEditor.tsx` 
3. **Update**: Remove `src/styles/text-editor-page-background.css` (replace with simpler approach)
4. **Ensure**: `public/text-editor/text-editor.css` is imported/accessible

## Key Changes Summary

- **Remove complex backdrop-filter chains**
- **Use proven CSS variable system from standalone**
- **Simplify styled components to use CSS variables**
- **Fix theme integration with proper CSS variable mapping**
- **Clean up background image handling**
- **Maintain responsive design from standalone**

## Expected Results

- Colors will match the standalone reference exactly
- Transparency will work consistently across light/dark modes
- Background image will show through properly
- Theme switching will work seamlessly
- Mobile responsiveness will be maintained

## Testing Checklist

- [ ] Light mode colors match standalone
- [ ] Dark mode colors match standalone  
- [ ] Background image visible through transparency
- [ ] Theme switching works without color artifacts
- [ ] Mobile layout matches standalone
- [ ] Color picker functionality preserved
- [ ] All interactive elements properly styled