# GitHub Actions Sharding for Nightly Tests

This document explains the updated GitHub Actions workflow that supports parallel test execution using sharding.

## Overview

The nightly regression tests now run across multiple GitHub Actions runners simultaneously, providing:

- **~60% faster execution** with default 3-shard configuration
- **Flexible shard counts** (1-6 shards supported)
- **Automatic result consolidation** from all shards
- **Same reliability** with improved performance

## Workflow Structure

### 1. Setup Job (`setup`)

- Determines the matrix configuration based on trigger type and inputs
- **Scheduled runs**: Always use 3 shards
- **Manual runs**: Use the specified shard count (1-6)
- **Debug/Headed modes**: Automatically disable sharding (use 1 shard)

### 2. Test Execution Job (`nightly-tests`)

- Runs in parallel across multiple runners using GitHub Actions matrix strategy
- Each shard receives environment variables:
  - `SHARD_INDEX`: Current shard number (1, 2, 3, etc.)
  - `SHARD_TOTAL`: Total number of shards
- Tests are automatically distributed by Playwright based on these variables

### 3. Consolidation Job (`consolidate-results`)

- Downloads artifacts from all shards
- Merges test results and reports
- Creates a unified summary report
- Uploads consolidated artifacts

## Usage

### Scheduled Runs (Automatic)

```yaml
# Runs daily at 5 AM EST with 3 shards automatically
schedule:
  - cron: '0 10 * * *'
```

### Manual Runs (workflow_dispatch)

The workflow now includes a `shard_count` input:

1. **Navigate to Actions tab** in GitHub
2. **Select "Nightly Regression Tests"**
3. **Click "Run workflow"**
4. **Configure options:**
   - **Test Suite**: Choose specific browser or 'all'
   - **Shard Count**: Choose 1-6 parallel runners
   - **Headed Mode**: For debugging (disables sharding)
   - **Debug Mode**: For debugging (disables sharding)

### Shard Count Recommendations

| Shard Count | Use Case                   | Execution Time\* |
| ----------- | -------------------------- | ---------------- |
| 1           | Debugging, small test sets | ~40 minutes      |
| 2           | Quick validation           | ~25 minutes      |
| 3           | **Default/Recommended**    | ~16 minutes      |
| 4           | Large test suites          | ~12 minutes      |
| 5-6         | Maximum parallelization    | ~10 minutes      |

\*Approximate times based on current test suite size

## Environment Variables

The workflow automatically sets these environment variables for each shard:

```bash
SHARD_INDEX=1    # Current shard (1, 2, 3, etc.)
SHARD_TOTAL=3    # Total shards (matches shard_count input)
```

These are consumed by the Playwright configuration in `playwright.nightly.config.ts`:

```typescript
shard: process.env.SHARD_INDEX && process.env.SHARD_TOTAL
  ? {
      current: parseInt(process.env.SHARD_INDEX),
      total: parseInt(process.env.SHARD_TOTAL),
    }
  : undefined;
```

## Artifacts

Each shard produces individual artifacts, plus a consolidated result:

### Individual Shard Artifacts

- `nightly-test-results-shard-1-{run_id}`
- `nightly-test-results-shard-2-{run_id}`
- `nightly-test-results-shard-3-{run_id}`
- `nightly-playwright-report-shard-1-{run_id}`
- `nightly-playwright-report-shard-2-{run_id}`
- `nightly-playwright-report-shard-3-{run_id}`

### Consolidated Artifacts

- `nightly-consolidated-results-{run_id}` - Merged results from all shards

## Benefits

### Performance

- **Parallel Execution**: Tests run simultaneously across multiple runners
- **Faster Feedback**: Significantly reduced total execution time
- **Resource Efficiency**: Distributed load across GitHub Actions infrastructure

### Reliability

- **Fault Tolerance**: `fail-fast: false` ensures other shards continue if one fails
- **Same Test Coverage**: All tests still run, just distributed
- **Automatic Retry**: GitHub Actions' built-in retry mechanisms apply to each shard

### Flexibility

- **Configurable Sharding**: Choose optimal shard count for your needs
- **Debug Support**: Debugging modes automatically disable sharding
- **Backward Compatibility**: Single shard mode (shard_count=1) works like before

## Monitoring and Debugging

### Viewing Results

1. **Go to Actions tab** → Select the workflow run
2. **View job matrix**: See all parallel shard executions
3. **Individual shard logs**: Click specific shard jobs for detailed logs
4. **Consolidated results**: Download the consolidated artifact for merged results

### Common Issues

#### Individual Shard Failures

- **Symptom**: One shard fails while others pass
- **Solution**: Check the specific shard's logs, may be test flakiness or resource contention
- **Action**: Re-run failed shard or investigate specific test failures

#### All Shards Failing

- **Symptom**: All parallel jobs fail
- **Solution**: Likely an infrastructure or application issue
- **Action**: Check setup job, build step, or application deployment

#### Missing Artifacts

- **Symptom**: Some shard artifacts are missing
- **Solution**: Check if shard completed successfully
- **Action**: Individual shard artifacts are still available even if consolidation fails

## Comparison with Local Sharding

| Feature                | GitHub Actions Sharding    | Local Sharding                     |
| ---------------------- | -------------------------- | ---------------------------------- |
| **Execution**          | Multiple GitHub runners    | Single machine, multiple processes |
| **Resource Isolation** | Complete isolation         | Shared system resources            |
| **Scalability**        | Up to 20 concurrent jobs\* | Limited by local machine           |
| **Cost**               | GitHub Actions minutes     | Local compute only                 |
| **Artifacts**          | Automatic upload/storage   | Manual management                  |
| **CI Integration**     | Native GitHub integration  | Requires custom scripts            |

\*GitHub Actions concurrent job limits depend on plan

## Future Enhancements

### Potential Improvements

- **Dynamic Shard Calculation**: Auto-determine optimal shard count based on test changes
- **Shard-Specific Test Selection**: Route specific test types to appropriate shards
- **Performance Metrics**: Track and report sharding efficiency over time
- **Cost Optimization**: Balance execution time vs. GitHub Actions minute consumption

### Monitoring Opportunities

- **Shard Load Distribution**: Ensure tests are evenly distributed
- **Execution Time Tracking**: Monitor individual shard performance
- **Failure Rate Analysis**: Identify if certain shards are more prone to failures

## Getting Started

The sharding is now active and requires no additional setup. To use it:

1. **For scheduled runs**: Automatically uses 3 shards
2. **For manual runs**: Choose your preferred shard count in the workflow dispatch
3. **For debugging**: Use headed or debug mode (automatically uses 1 shard)

The existing npm scripts (`npm run test:nightly:sharded`, etc.) continue to work for local development, while GitHub Actions now provides the same sharding benefits in CI.
