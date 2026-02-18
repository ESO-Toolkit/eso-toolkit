# Screen Size Tests

This directory contains comprehensive end-to-end tests for validating responsive design and screen size compatibility of the ESO Log Aggregator application.

## Overview

The screen size testing suite validates:
- **Panel Responsiveness**: Players and insights panels adapt properly to different screen sizes
- **Data Loading**: Real ESO Logs API data loads correctly across all viewport sizes
- **Visual Consistency**: Panel layouts appear consistently across device types
- **OAuth Authentication**: Real authentication works across all screen sizes

## Test Files

### Core Test Suites
- **`comprehensive-visual-regression.spec.ts`** - Complete visual regression testing with 150+ screenshots across 4 device categories (Mobile, Tablet, Desktop, Breakpoint)
- **`single-page-validation.spec.ts`** - Fast single-page validation optimized for CI environments with basic functionality checks
- **`basic-loading-detection.spec.ts`** - Fundamental loading detection tests for players and insights panels

### Utilities
- **`utils.ts`** - Helper functions and OAuth authentication for screen size testing
- **`test-constants.ts`** - Shared constants and configuration

## Quick Start

```bash
# Run all screen size tests (core panels and insights panel)
npx playwright test --config playwright.screen-sizes.config.ts

# Run comprehensive visual regression suite
npx playwright test tests/screen-sizes/comprehensive-visual-regression.spec.ts --config playwright.screen-sizes.config.ts

# Run fast single-page validation
npx playwright test tests/screen-sizes/single-page-validation.spec.ts --config playwright.screen-sizes.config.ts

# Run basic loading detection tests
npx playwright test tests/screen-sizes/basic-loading-detection.spec.ts --config playwright.screen-sizes.config.ts

# Run tests for specific screen size
npx playwright test --config playwright.screen-sizes.config.ts --project="Desktop Standard"

# Update visual regression baselines (after UI changes)
npx playwright test --config playwright.screen-sizes.config.ts --update-snapshots

# View the generated report
npx playwright show-report screen-size-report
```

## Running via Make

```bash
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