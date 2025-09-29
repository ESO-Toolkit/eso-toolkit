# Sticky Footer with Intersection Observer - Implementation Guide

## Overview

Create a lightweight, modern sticky footer for your React calculator using the Intersection Observer API. This solution uses zero dependencies and leverages native browser APIs for optimal performance.

## Implementation Steps

### 1. Create the Custom Hook

Create a new file: `hooks/useSticky.ts`

```typescript
import { useEffect, useState, useRef } from 'react';

interface UseStickyReturn {
  isSticky: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export const useSticky = (options?: {
  rootMargin?: string;
  threshold?: number;
}): UseStickyReturn => {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is NOT intersecting (out of view), make footer sticky
        setIsSticky(!entry.isIntersecting);
      },
      {
        rootMargin: options?.rootMargin || '-100px 0px 0px 0px',
        threshold: options?.threshold || 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [options?.rootMargin, options?.threshold]);

  return { isSticky, sentinelRef };
};
```

### 2. Create the Footer Component

Create a new file: `components/StickyCalculatorFooter.tsx`

```typescript
import React from 'react';

interface StickyCalculatorFooterProps {
  totalPenetration: number;
  criticalDamage: number;
  isSticky: boolean;
  className?: string;
}

export const StickyCalculatorFooter: React.FC<StickyCalculatorFooterProps> = ({
  totalPenetration,
  criticalDamage,
  isSticky,
  className = ''
}) => {
  return (
    <div
      className={`calculator-footer ${isSticky ? 'sticky' : 'static'} ${className}`}
      style={{
        position: isSticky ? 'fixed' : 'static',
        bottom: isSticky ? '0' : 'auto',
        left: isSticky ? '0' : 'auto',
        right: isSticky ? '0' : 'auto',
        zIndex: isSticky ? 1000 : 'auto',
        backgroundColor: 'white',
        borderTop: isSticky ? '1px solid #e5e5e5' : 'none',
        padding: '16px 20px',
        boxShadow: isSticky ? '0 -2px 8px rgba(0, 0, 0, 0.1)' : 'none',
        transition: 'all 0.2s ease-in-out',
        width: '100%',
      }}
    >
      <div className="footer-content">
        <div className="stat-group">
          <div className="stat-item">
            <span className="stat-label">Total Penetration</span>
            <span className="stat-value penetration">{totalPenetration}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Critical Damage</span>
            <span className="stat-value critical">{criticalDamage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3. Add CSS Styles

Add this to your CSS file or create `styles/calculator-footer.css`:

```css
.calculator-footer {
  --footer-bg: #ffffff;
  --footer-border: #e5e5e5;
  --footer-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --accent-blue: #3b82f6;
  --accent-red: #ef4444;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.stat-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-value.penetration {
  color: var(--accent-blue);
}

.stat-value.critical {
  color: var(--accent-red);
}

/* Responsive Design */
@media (max-width: 768px) {
  .calculator-footer {
    padding: 12px 16px;
  }

  .stat-group {
    gap: 1rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .stat-value {
    font-size: 1.125rem;
  }
}

@media (max-width: 480px) {
  .stat-group {
    flex-direction: column;
    gap: 0.75rem;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    align-items: center;
  }

  .stat-label {
    margin-bottom: 0;
    text-align: left;
  }
}

/* Animation for smooth transitions */
.calculator-footer.sticky {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### 4. Update Your Calculator Component

Update your `calculator.tsx`:

```typescript
import React, { useState } from 'react';
import { useSticky } from './hooks/useSticky';
import { StickyCalculatorFooter } from './components/StickyCalculatorFooter';

const Calculator: React.FC = () => {
  // Your existing state
  const [totalPenetration, setTotalPenetration] = useState(0);
  const [criticalDamage, setCriticalDamage] = useState(0);

  // Sticky hook
  const { isSticky, sentinelRef } = useSticky({
    rootMargin: '-50px 0px 0px 0px' // Adjust this value as needed
  });

  return (
    <div className="calculator-wrapper">
      <div className="calculator-content" style={{
        paddingBottom: isSticky ? '100px' : '0', // Space for sticky footer
        transition: 'padding-bottom 0.2s ease'
      }}>
        {/* Your existing calculator form content */}
        <div className="form-section">
          {/* All your calculator inputs here */}
        </div>

        {/* Sentinel element - this triggers the sticky behavior */}
        <div
          ref={sentinelRef}
          style={{
            height: '1px',
            width: '100%',
            visibility: 'hidden',
            position: 'absolute',
            bottom: '100px' // Distance from bottom when footer should become sticky
          }}
        />
      </div>

      {/* Sticky Footer */}
      <StickyCalculatorFooter
        totalPenetration={totalPenetration}
        criticalDamage={criticalDamage}
        isSticky={isSticky}
      />
    </div>
  );
};

export default Calculator;
```

### 5. Optional: Tailwind CSS Version

If you're using Tailwind CSS, replace the CSS styles with these classes:

```typescript
// StickyCalculatorFooter with Tailwind
export const StickyCalculatorFooter: React.FC<StickyCalculatorFooterProps> = ({
  totalPenetration,
  criticalDamage,
  isSticky,
}) => {
  return (
    <div
      className={`
        ${isSticky ? 'fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg' : 'static'}
        bg-white p-4 transition-all duration-200 ease-in-out w-full
      `}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center gap-8 sm:gap-4">
          <div className="flex flex-col items-center text-center flex-1">
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">
              Total Penetration
            </span>
            <span className="text-xl font-bold text-blue-600">
              {totalPenetration}
            </span>
          </div>
          <div className="flex flex-col items-center text-center flex-1">
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">
              Critical Damage
            </span>
            <span className="text-xl font-bold text-red-600">
              {criticalDamage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Configuration Options

### Adjust Sensitivity

Modify the `rootMargin` in the `useSticky` hook:

```typescript
// More sensitive (triggers earlier)
const { isSticky, sentinelRef } = useSticky({
  rootMargin: '-150px 0px 0px 0px',
});

// Less sensitive (triggers later)
const { isSticky, sentinelRef } = useSticky({
  rootMargin: '-25px 0px 0px 0px',
});
```

### Custom Trigger Point

Position the sentinel element where you want the footer to become sticky:

```typescript
// Becomes sticky when user scrolls past this point
<div
  ref={sentinelRef}
  style={{
    position: 'absolute',
    bottom: '200px', // Footer becomes sticky 200px from bottom
    height: '1px',
    visibility: 'hidden'
  }}
/>
```

## Browser Support

- Chrome 58+
- Firefox 55+
- Safari 12.1+
- Edge 16+

All modern browsers support Intersection Observer natively.

## Performance Benefits

- Zero JavaScript bundle size increase
- Uses native browser APIs optimized for scroll performance
- No event listeners on scroll (which can be expensive)
- Automatically handles cleanup and memory management

## Testing

To test the implementation:

1. Load your calculator page
2. Scroll down until the footer should become sticky
3. Verify the footer sticks to the bottom of the viewport
4. Scroll back up to ensure it returns to static positioning
5. Test on different screen sizes for responsive behavior

## Troubleshooting

**Footer not becoming sticky:**

- Check that the sentinel element is positioned correctly
- Verify `rootMargin` value allows for proper trigger distance
- Ensure there's enough content to scroll

**Footer jumping or flickering:**

- Add `transition` CSS for smooth animations
- Check that `padding-bottom` on content matches footer height

**Performance issues:**

- Intersection Observer is already optimized, but ensure you're not creating multiple instances
- Use `useCallback` for expensive operations in the observer callback if needed
