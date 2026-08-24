# Offline Testing System Documentation

## Overview

ESO Toolkit now supports offline testing using pre-downloaded data, significantly improving test performance and reliability. This system automatically downloads test data during GitHub Actions runs and caches it for subsequent use.

## 🚀 Key Benefits

- **3x Faster Tests**: Offline mode eliminates API call latency during test execution
- **Reliable CI/CD**: No dependency on external API availability during tests
- **Smart Caching**: GitHub Actions cache persists for ~7 days, reducing download frequency
- **Graceful Fallback**: Tests automatically fall back to online mode if offline data unavailable
- **Repository Efficiency**: No large data files committed to git (3.87 GB excluded)

## 📋 How It Works

### Local Development

1. **Download Test Data**: Run `npm run download-test-data` to download test data locally
2. **Automatic Detection**: Tests automatically detect and use offline data when available
3. **Fallback Mode**: If no offline data exists, tests continue with live API calls

### GitHub Actions

1. **Smart Caching**: Workflow caches test data using intelligent cache keys
2. **Conditional Download**: Only downloads data on cache miss (~weekly)
3. **Verification**: Validates download success before proceeding with tests
4. **Performance Boost**: Tests run ~3x faster with offline data

## 🛠 Commands

```bash
# Download test data for offline testing
npm run download-test-data

# Download custom report data (for development)
npm run download-report-data <report-code> [fight-id]

# Run screen size tests (automatically uses offline data if available)
npm run test:screen-sizes:fast
```

## 📊 Performance Comparison

| Mode        | Data Source          | Typical Duration | Network Calls         |
| ----------- | -------------------- | ---------------- | --------------------- |
| **Offline** | Pre-downloaded files | ~2-3 minutes     | None during tests     |
| **Online**  | Live API calls       | ~6-10 minutes    | ~100+ GraphQL queries |

## 🔧 Technical Details

### Data Structure

```
data-downloads/
└── F4f2bMwWtgVKxjB9/          # Bundled public sample report code
    ├── player-data.json       # Player details and stats
    ├── master-data.json       # Actors and abilities
    └── fight-117/             # Fight-specific data
        ├── fight-info.json    # Fight metadata
        ├── encounter-info.json # Encounter information
        └── events/            # Event data
            ├── damage-events.json
            ├── buff-events.json
            ├── all-events.json
            └── ...
```

### Automatic Mode Detection

The test system automatically detects offline data availability by checking for required files:

- `fight-info.json`
- `encounter-info.json`
- `../player-data.json`
- `events/damage-events.json`
- `events/buff-events.json`
- `events/all-events.json`

### Route Interception

When offline data is available, Playwright intercepts GraphQL requests and serves responses from local JSON files:

- `getReportByCode` → `fight-info.json`
- `getReportMasterData` → `encounter-info.json`
- `getPlayersForReport` → `player-data.json`
- `getDamageEvents` → `events/damage-events.json`
- And more...

## 🎯 GitHub Actions Configuration

### Required Secrets

The repository needs these secrets configured:

```
OAUTH_CLIENT_ID=your_eso_logs_client_id
OAUTH_CLIENT_SECRET=your_eso_logs_client_secret
```

### Cache Strategy

- **Cache Key**: Based on download script file hashes
- **Cache Duration**: ~7 days with regular access
- **Cache Size**: ~3.87 GB (within GitHub limits)
- **Invalidation**: Auto-refreshes when scripts change

### Workflow Behavior

1. **Cache Hit**: Tests start immediately with offline data (~30 seconds restore)
2. **Cache Miss**: Downloads fresh data (~10 minutes), then fast tests
3. **Download Failure**: Tests continue with online mode (graceful degradation)

## 🔍 Troubleshooting

### Local Development

```bash
# Check if offline data is available
ls -la data-downloads/F4f2bMwWtgVKxjB9/fight-5/

# Force re-download of test data
rm -rf data-downloads/ && npm run download-test-data

# Run tests with verbose logging to see mode detection
npm run test:screen-sizes:fast -- --workers=1
```

### Common Issues

1. **Download Fails**: Check OAuth credentials in `.env`
2. **Offline Mode Not Detected**: Verify file structure matches expected layout
3. **Tests Still Slow**: Check console for "🔌 Using offline mode" or "🌐 Using online mode"

## 📈 Monitoring

### Test Logs

Look for these indicators in test output:

- `🔌 Using offline mode with pre-downloaded data` - Offline mode active
- `🌐 Using online mode with API caching` - Online fallback mode
- `📂 Loaded offline data for [operation] from [file]` - Successful offline data load

### GitHub Actions

Monitor these metrics in workflow logs:

- Cache hit/miss rates
- Download duration and success
- Test execution time improvements
- Data verification results

## 🔄 Maintenance

### Refreshing Test Data

- **Automatic**: Cache expires weekly and refreshes automatically
- **Manual**: Clear GitHub Actions cache to force refresh
- **Development**: Delete `data-downloads/` folder and re-run download script

### Updates Required When

- ESO Logs API schema changes
- New GraphQL operations added
- Different test report needed
- Download script modifications

This offline testing system provides significant performance improvements while maintaining the reliability and functionality of the original online testing approach.
