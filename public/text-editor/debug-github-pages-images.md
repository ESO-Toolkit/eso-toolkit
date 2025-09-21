# Debug GitHub Pages Background Image Issue

## Test Background Image URLs Directly

First, test if the background images are actually deployed by visiting these URLs directly in your browser:

1. **Light mode image**: `https://bkrupa.github.io/text-editor/text-editor-bg-light.jpg`
2. **Dark mode image**: `https://bkrupa.github.io/text-editor/text-editor-bg-dark.jpg`

If these return **404 errors**, the images aren't deployed correctly.

## Most Likely Issues & Solutions

### Issue 1: Images Not in Public Folder
**Check**: Are the images in `public/text-editor/` folder in your repo?

**Fix**: Move images from `src/assets/text-editor/` to `public/text-editor/`:
```
public/
├── text-editor/
│   ├── text-editor-bg-light.jpg
│   └── text-editor-bg-dark.jpg
```

### Issue 2: GitHub Actions Not Deploying Public Folder
**Check**: Your GitHub Actions workflow might not be copying the `public/` folder.

**Fix**: Ensure your `.github/workflows/deploy.yml` (or similar) includes:
```yaml
- name: Build
  run: npm run build

- name: Deploy
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist  # Make sure this includes your public assets
```

### Issue 3: Vite Build Not Including Images
**Check locally**: After running `npm run build`, do you see the images in `dist/text-editor/`?

**Fix**: Ensure images are in `public/text-editor/` not `src/assets/text-editor/`

### Issue 4: Alternative Import Method
If the above doesn't work, try importing the images directly:

```typescript
// At the top of TextEditor.tsx
import bgLight from '/text-editor/text-editor-bg-light.jpg';
import bgDark from '/text-editor/text-editor-bg-dark.jpg';

// In PreviewArea
const PreviewArea = styled(Box)(({ theme }) => ({
  // ... other styles ...
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${theme.palette.mode === 'dark' ? bgDark : bgLight})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    opacity: 0.3,
    zIndex: -1,
    pointerEvents: 'none',
  },
  
  // ... rest of styles ...
}));
```

## Debug Steps

### Step 1: Check Image URLs
Visit these URLs to see if images are deployed:
- `https://bkrupa.github.io/text-editor/text-editor-bg-light.jpg`
- `https://bkrupa.github.io/text-editor/text-editor-bg-dark.jpg`

### Step 2: Check Browser Console
1. Go to `https://bkrupa.github.io/#/text-editor`
2. Open Developer Tools (F12)
3. Look for 404 errors for image files
4. Check the Network tab for failed requests

### Step 3: Check Repository File Structure
Verify in your GitHub repo that these files exist:
- `public/text-editor/text-editor-bg-light.jpg`
- `public/text-editor/text-editor-bg-dark.jpg`

### Step 4: Force Hard Refresh
Sometimes caching causes issues:
- Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Or open in private/incognito window

## Temporary Debug Code
Add this to your TextEditor component to debug what's happening:

```typescript
useEffect(() => {
  const testImage = new Image();
  testImage.onload = () => console.log('✅ Background image loaded successfully');
  testImage.onerror = () => console.log('❌ Background image failed to load');
  testImage.src = '/text-editor/text-editor-bg-light.jpg';
}, []);
```

Let me know what you find when you test the direct image URLs!