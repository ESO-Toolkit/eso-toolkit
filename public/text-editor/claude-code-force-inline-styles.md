The debug showed the exact issue but the fixes didn't work. Let's try the most direct approach.

**Problem**: CSS is looking for `/images/eso-ss-1.jpg` but can't find it, even though we can see it's trying to load from that path.

**Direct Solution - Force the Background with Inline Styles**:

Replace the existing `usePageBackground` call and add this useEffect in TextEditor.tsx:

```typescript
// Remove or comment out this line:
// usePageBackground('text-editor-page', theme.palette.mode === 'dark');

// Replace with this useEffect:
useEffect(() => {
  const body = document.body;
  
  // Clear any existing background styles
  body.style.removeProperty('background-image');
  body.style.removeProperty('background-size');
  body.style.removeProperty('background-position');
  body.style.removeProperty('background-repeat');
  body.style.removeProperty('background-attachment');
  
  // Force the exact background image that works in dark mode
  body.style.setProperty('background-image', `url(${backgroundImage})`, 'important');
  body.style.setProperty('background-size', 'cover', 'important');
  body.style.setProperty('background-position', 'center', 'important');
  body.style.setProperty('background-repeat', 'no-repeat', 'important');
  body.style.setProperty('background-attachment', 'fixed', 'important');
  body.style.setProperty('background-color', 'transparent', 'important');
  
  // Ensure the class is present
  body.classList.add('text-editor-page');
  
  console.log('FORCED background image:', backgroundImage);
  console.log('Body style after force:', window.getComputedStyle(body).backgroundImage);
  
  return () => {
    // Cleanup when component unmounts
    body.style.removeProperty('background-image');
    body.style.removeProperty('background-size');
    body.style.removeProperty('background-position');
    body.style.removeProperty('background-repeat');
    body.style.removeProperty('background-attachment');
    body.style.removeProperty('background-color');
    body.classList.remove('text-editor-page');
  };
}, []); // Empty deps - run once on mount
```

**Alternative - If Background Import is Wrong**:

If the above still doesn't work, try hardcoding the path that the CSS was trying to use:

```typescript
useEffect(() => {
  const body = document.body;
  
  // Try the path that CSS was expecting
  const imagePath = '/images/eso-ss-1.jpg';
  
  body.style.setProperty('background-image', `url(${imagePath})`, 'important');
  body.style.setProperty('background-size', 'cover', 'important');
  body.style.setProperty('background-position', 'center', 'important');
  body.style.setProperty('background-repeat', 'no-repeat', 'important');
  body.style.setProperty('background-attachment', 'fixed', 'important');
  
  body.classList.add('text-editor-page');
  
  console.log('Trying hardcoded path:', imagePath);
  
  return () => {
    body.style.removeProperty('background-image');
    body.style.removeProperty('background-size');
    body.style.removeProperty('background-position');
    body.style.removeProperty('background-repeat');
    body.style.removeProperty('background-attachment');
    body.classList.remove('text-editor-page');
  };
}, []);
```

**Copy the Image File First**:

Before trying the code above, manually copy the image file:
1. Copy `src/assets/text-editor/eso-ss-1.jpg` 
2. Paste it to `public/images/eso-ss-1.jpg`
3. Create the `images` folder in `public/` if it doesn't exist

**Test the Image Path**:

You can also test if the image is accessible by going to `http://localhost:3000/images/eso-ss-1.jpg` in your browser. If you get a 404, the file isn't in the right place.

**What This Should Do**:
- ✅ Completely bypass the CSS system
- ✅ Use inline styles with highest specificity
- ✅ Force the background regardless of theme mode
- ✅ Work immediately on page load

Try the image copy + first code approach. If that doesn't work, the issue might be that the image file doesn't exist at any of these paths.