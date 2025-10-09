# Screen Size Tests

This directory contains comprehensive end-to-end tests for validating responsive design and screen size compatibility of the ESO Log Aggregator application.

## Overview

The screen size testing suite validates:
- **Responsive Layout**: Components adapt properly to different screen sizes
- **Visual Regression**: UI appears consistently across device types
- **User Experience**: Interactive elements work well on all screen sizes
- **Performance**: Load times and rendering performance across viewports
- **Accessibility**: Touch targets and readability standards

## Test Files

### Core Test Suites
- **`home-page.spec.ts`** - Home page layout validation across all screen sizes
- **`log-analysis.spec.ts`** - Log analysis interface responsive behavior  
- **`cross-device.spec.ts`** - Device-specific functionality and interactions
- **`visual-regression.spec.ts`** - Screenshot comparison and visual consistency
- **`comprehensive-report.spec.ts`** - Detailed reporting and performance metrics

### Utilities
- **`utils.ts`** - Helper functions and utilities for screen size testing

## Quick Start

```bash
# Run all screen size tests
npm run test:screen-sizes

# Run tests for specific device categories
npm run test:screen-sizes:mobile
npm run test:screen-sizes:tablet  
npm run test:screen-sizes:desktop

# View the generated report
npm run test:screen-sizes:report

# Update visual regression baselines (after UI changes)
npm run test:screen-sizes:update-snapshots
```

## Cross-Platform Commands

```bash
# PowerShell (Windows)
.\make.ps1 test-screen-sizes

# Unix/Linux/macOS
make test-screen-sizes
```

## Configuration

Tests use the dedicated configuration file: `playwright.screen-sizes.config.ts`

This configuration includes:
- 22+ different viewport configurations covering mobile, tablet, desktop, and ultrawide displays
- Visual regression settings with appropriate thresholds
- Performance monitoring and reporting
- HTML report generation optimized for screen size validation

## Report Output

Test reports are generated in `screen-size-report/` and include:
- **HTML Report**: Interactive visual report with screenshot comparisons
- **JSON Results**: Machine-readable test results for CI/CD integration
- **Performance Metrics**: Load times and rendering performance data
- **Accessibility Analysis**: Touch target sizes and layout validation

## Key Features

### Device Coverage
- **Mobile**: iPhone SE, iPhone 12/Pro/Max, Android Pixel 5
- **Tablet**: iPad, iPad Pro (both orientations)
- **Desktop**: 1280px to 4K resolution support
- **Ultrawide**: 3440px+ display support
- **Breakpoints**: All major responsive breakpoints (XS through 2XL)

### Visual Testing
- Full-page screenshots for layout validation
- Component-level screenshots for detailed analysis  
- Interactive element state testing (hover, focus, active)
- Animation and loading state capture
- Consistent screenshot settings to prevent flaky tests

### Performance Monitoring
- Page load time measurement across screen sizes
- First paint and content paint timing
- Layout stability metrics
- Memory usage tracking

### Accessibility Validation
- Minimum touch target size verification (32px WCAG recommendation)
- Text readability and font size validation
- Color contrast assessment
- Keyboard navigation testing
- Screen reader compatibility checks

## Best Practices

### Running Tests
1. **Always update snapshots** after intentional UI changes
2. **Run on clean environment** to avoid cache-related issues  
3. **Check CI integration** before merging visual changes
4. **Review failure reports** before updating baselines

### Writing New Tests
1. **Use semantic selectors** (main, nav, [role="button"]) over CSS classes
2. **Wait for stability** using provided utility functions
3. **Hide dynamic content** (timestamps, loading states) for consistency
4. **Test critical user paths** rather than just component rendering
5. **Validate accessibility** requirements in addition to visual appearance

## Troubleshooting

### Common Issues
- **Visual differences**: Run `npm run test:screen-sizes:update-snapshots` after UI changes
- **Flaky tests**: Check for dynamic content, animations, or timing issues
- **Performance failures**: Review network conditions and server response times
- **Memory issues**: Tests include memory limits for CI environments

### Debug Mode
Use debug mode for step-by-step test execution:
```bash
npm run test:screen-sizes:debug
```

For detailed documentation, see: [SCREEN_SIZE_TESTING.md](../documentation/SCREEN_SIZE_TESTING.md)