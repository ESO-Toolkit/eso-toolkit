# Nightly Test Sharding Guide

The nightly regression tests now support sharding for faster parallel execution. This allows you to split the test suite across multiple processes to reduce overall execution time.

## Quick Start

### Basic Sharding (3 shards)

```bash
# Run all tests across 3 parallel shards
npm run test:nightly:sharded

# Windows-specific (opens separate console windows)
npm run test:nightly:sharded:win
```

### Advanced Sharding

```bash
# Use the advanced sharding script for more control
npm run test:nightly:sharded:advanced

# Custom number of shards
node scripts/run-sharded-tests.js --shards=4

# Specific browser project
node scripts/run-sharded-tests.js --project=firefox-desktop

# Custom shards + specific project
node scripts/run-sharded-tests.js --shards=2 --project=chromium-desktop
```

## How Sharding Works

Playwright automatically divides your test files across the specified number of shards. Each shard runs independently and in parallel, which can significantly reduce the total test execution time.

For example, with 3 shards:

- **Shard 1**: Gets tests 1, 4, 7, 10, etc.
- **Shard 2**: Gets tests 2, 5, 8, 11, etc.
- **Shard 3**: Gets tests 3, 6, 9, 12, etc.

## Available Scripts

### Individual Shards

```bash
npm run test:nightly:shard1  # Run shard 1 of 3
npm run test:nightly:shard2  # Run shard 2 of 3
npm run test:nightly:shard3  # Run shard 3 of 3
```

### Project-Specific Sharding

```bash
npm run test:nightly:sharded:chromium  # All shards, Chromium only
npm run test:nightly:sharded:firefox   # All shards, Firefox only
```

### Manual Sharding

```bash
# Set environment variables manually
SHARD_INDEX=1 SHARD_TOTAL=4 npm run test:nightly:all
SHARD_INDEX=2 SHARD_TOTAL=4 npm run test:nightly:all
# ... etc
```

## Configuration

The sharding configuration is in `playwright.nightly.config.ts`:

```typescript
shard: process.env.SHARD_INDEX && process.env.SHARD_TOTAL
  ? { current: parseInt(process.env.SHARD_INDEX), total: parseInt(process.env.SHARD_TOTAL) }
  : undefined,
```

### Environment Variables

- `SHARD_INDEX`: Current shard number (1-based)
- `SHARD_TOTAL`: Total number of shards

## Performance Benefits

Typical performance improvements with sharding:

| Test Suite Size | Without Sharding | With 3 Shards | Time Savings |
| --------------- | ---------------- | ------------- | ------------ |
| 30 tests        | ~15 minutes      | ~6 minutes    | ~60%         |
| 60 tests        | ~30 minutes      | ~12 minutes   | ~60%         |
| 100 tests       | ~50 minutes      | ~20 minutes   | ~60%         |

_Actual results may vary based on test complexity and system resources._

## Best Practices

### Optimal Shard Count

- **Local Development**: 2-4 shards (based on CPU cores)
- **CI Environment**: 2-3 shards (to be respectful to external APIs)
- **Powerful Machines**: Up to 6-8 shards

### When to Use Sharding

- ✅ Full nightly regression runs
- ✅ Large test suites (>20 tests)
- ✅ CI/CD pipelines
- ❌ Individual test debugging
- ❌ Small test runs (<10 tests)

### Resource Considerations

- Each shard runs independently with its own browser instances
- Monitor CPU and memory usage when increasing shard count
- External API rate limits may affect higher shard counts

## Troubleshooting

### Common Issues

**1. Tests fail in sharded mode but pass individually**

- Check for test dependencies or shared state
- Ensure tests are properly isolated

**2. Uneven shard distribution**

- This is normal - Playwright distributes by test files, not test count
- Some shards may finish faster than others

**3. CI environment issues**

- Reduce shard count in CI (use 2-3 shards max)
- Check resource limits and API rate limiting

### Debugging Sharded Tests

```bash
# Run a specific shard in headed mode
SHARD_INDEX=1 SHARD_TOTAL=3 npm run test:nightly:headed

# Use the advanced script for better logging
node scripts/run-sharded-tests.js --shards=2 --headed

# Debug individual test files
npm run test:nightly:firefox -- tests/nightly-regression.spec.ts
```

## Reporting

All shards contribute to the same test report. After running sharded tests, view the combined results:

```bash
npm run test:nightly:report
```

The HTML report will show results from all shards combined, making it easy to see the overall test status and any failures across all parallel runs.
