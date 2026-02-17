# Test Coverage Utilities

This directory contains comprehensive test coverage utilities and configuration for the ESO Log Aggregator project.

## 🎯 Coverage Overview

The project uses Jest for test coverage analysis with custom utilities for enhanced reporting and CI/CD integration.

### Coverage Targets

| Metric     | Global Target | Utils Target | Hooks Target | Store Target |
| ---------- | ------------- | ------------ | ------------ | ------------ |
| Lines      | 80%           | 90%          | 85%          | 85%          |
| Functions  | 75%           | 85%          | 80%          | 80%          |
| Branches   | 70%           | 80%          | 75%          | 75%          |
| Statements | 80%           | 90%          | 85%          | 85%          |

## 🚀 Quick Start

### Basic Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run coverage with enhanced analysis
npm run coverage:full

# Generate coverage badges
npm run coverage:badges

# Open coverage report in browser
npm run coverage:open
```

### Watch Mode Commands

```bash
# Watch mode with coverage
npm run test:coverage:watch

# Advanced coverage analysis in watch mode
npm run coverage:analyze:watch
```

## 📊 Coverage Scripts

### Core Scripts

- **`test:coverage`** - Run Jest tests with coverage collection
- **`test:coverage:watch`** - Run coverage in watch mode for development
- **`test:coverage:ci`** - Run coverage for CI/CD environments
- **`coverage:full`** - Complete coverage workflow (test + badges + analysis)

### Analysis Scripts

- **`coverage:analyze`** - Run enhanced coverage analysis with insights
- **`coverage:analyze:watch`** - Analysis in watch mode
- **`coverage:analyze:threshold`** - Analysis with threshold enforcement
- **`coverage:badges`** - Generate SVG coverage badges

### Utility Scripts

- **`coverage:open`** - Open HTML coverage report in browser

## 🔧 Configuration Files

### `jest.coverage.config.js`

Main Jest coverage configuration with environment-specific settings:

- **Development**: Lenient thresholds for faster iteration
- **Production/CI**: Standard thresholds for quality gates
- **Strict**: High thresholds for quality-critical code

### `craco.coverage.config.js`

CRACO integration for seamless Jest coverage with Create React App.

### Environment Variables

```bash
# Coverage configuration mode
COVERAGE_MODE=development|production|strict|ci

# Enable coverage in development
NODE_ENV=development COVERAGE_MODE=development npm run test:coverage
```

## 📈 Coverage Reports

### Generated Reports

1. **Console Output** - Real-time coverage summary in terminal
2. **HTML Report** - Interactive coverage report (`coverage/lcov-report/index.html`)
3. **LCOV Report** - For CI/CD integration (`coverage/lcov.info`)
4. **JSON Report** - Machine-readable coverage data
5. **Cobertura Report** - For Jenkins and other CI systems

### Coverage Badges

Generated SVG badges for documentation:

- `coverage/badges/coverage-overall.svg`
- `coverage/badges/coverage-lines.svg`
- `coverage/badges/coverage-functions.svg`
- `coverage/badges/coverage-branches.svg`
- `coverage/badges/coverage-statements.svg`

### Status Files

- `coverage/coverage-status.json` - Detailed coverage status
- `coverage/status.json` - Simple status for quick checks

## 🎨 Enhanced Analysis Features

### Coverage Analyzer (`scripts/coverage-analyzer.js`)

Provides enhanced coverage analysis with:

- **Overall Summary** - Comprehensive coverage metrics
- **Category Breakdown** - Coverage by directory/feature
- **Low Coverage Files** - Files needing attention (< 60%)
- **High Coverage Files** - Well-tested files (> 90%)
- **Actionable Recommendations** - Specific improvement suggestions

#### Usage Examples

```bash
# Basic analysis
npm run coverage:analyze

# Analysis with watch mode
npm run coverage:analyze:watch

# Analysis with threshold enforcement
npm run coverage:analyze:threshold

# Direct script usage
node scripts/coverage-analyzer.js --help
```

### Badge Generator (`scripts/coverage-badge-generator.js`)

Generates professional coverage badges and status files:

- **SVG Badges** - For README and documentation
- **Color-coded** - Green (90%+), Yellow (70-89%), Red (<70%)
- **Status Files** - JSON format for CI/CD integration

## 🔍 Coverage Collection Rules

### Included Files

```javascript
[
  'src/**/*.{ts,tsx}',
  // Specific includes for business logic
];
```

### Excluded Files

```javascript
[
  '!src/**/*.d.ts', // TypeScript declarations
  '!src/**/*.test.*', // Test files themselves
  '!src/test/**/*', // Test utilities
  '!src/graphql/generated.*', // Generated GraphQL code
  '!src/setupTests.ts', // Test setup
  '!src/index.tsx', // Entry point
];
```

## 📋 Coverage Best Practices

### Testing Strategy

1. **Unit Tests** - Focus on individual functions and components
2. **Integration Tests** - Test component interactions
3. **Edge Cases** - Cover error conditions and boundary cases
4. **Business Logic** - Prioritize utils, hooks, and store logic

### Coverage Guidelines

- **Utility Functions** - Aim for 90%+ coverage (business critical)
- **React Components** - Focus on logic, not just rendering
- **Hooks** - Test all state transitions and effects
- **Store Logic** - Comprehensive Redux action/reducer testing

### Common Patterns

```typescript
// Good: Test business logic thoroughly
describe('calculateDamage', () => {
  it('should handle critical hits', () => {
    // Test critical hit calculation
  });

  it('should handle edge case with zero damage', () => {
    // Test boundary conditions
  });

  it('should throw error with invalid input', () => {
    // Test error conditions
  });
});

// Good: Test React component behavior
describe('DamageDisplay', () => {
  it('should render damage value correctly', () => {
    // Test rendering logic
  });

  it('should handle loading state', () => {
    // Test different states
  });

  it('should call onUpdate when damage changes', () => {
    // Test interaction logic
  });
});
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Tests with Coverage
  run: npm run test:coverage:ci

- name: Generate Coverage Report
  run: npm run coverage:badges

- name: Upload Coverage Reports
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Coverage Status Checks

The coverage utilities generate status files that can be used for:

- Pull request status checks
- Coverage trending analysis
- Quality gates in deployment pipelines

## 🛠️ Troubleshooting

### Common Issues

1. **Low Coverage on Generated Files**
   - Ensure generated files are excluded in `collectCoverageFrom`

2. **Slow Coverage Runs**
   - Use `coverageProvider: 'v8'` for faster execution
   - Consider running coverage only on changed files in CI

3. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

4. **Coverage Threshold Failures**
   - Use development mode for local iteration
   - Focus on critical paths first

### Debug Coverage

```bash
# Run with verbose output
npm run coverage:analyze -- --verbose

# Check specific file coverage
npx jest --coverage --collectCoverageFrom="src/utils/specific-file.ts"

# Generate coverage without thresholds
COVERAGE_MODE=development npm run test:coverage
```

## 📚 Additional Resources

- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#collectcoveragefrom-array)
- [Istanbul Coverage Reports](https://istanbul.js.org/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

_This coverage system is designed to provide comprehensive insights into code quality while maintaining developer productivity. For questions or improvements, please contribute to the project documentation._
