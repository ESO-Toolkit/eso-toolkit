# Debug Test Suite - Real Data (No Mocking)

A reusable Playwright test suite for debugging ESO Log Aggregator features using real API data from esologs.com **with no mocking**.

## Purpose

This debug suite was created during ESO-473 investigation to validate scribing affix detection with real combat data. It's designed to be reusable for future debugging needs, especially for complex features that require real API data validation.

## Features

- ✅ **No API Mocking** - Uses real production data from esologs.com API
- ✅ **Tests Your Local App** - Runs against `localhost:5173` (your dev server)
- ✅ **Visual Browser** - Runs in headed mode for manual inspection
- ✅ **Console Logging** - Captures all browser console output
- ✅ **Flexible Configuration** - Easy to customize for different reports/fights/players
- ✅ **Screenshot Capture** - Saves full-page screenshots for reference
- ✅ **Network Monitoring** - Logs failed requests for debugging

## Quick Start

### 1. Setup Authentication (Optional but Recommended)

For best results, set up ESO Logs API authentication:

**Option A: Use OAuth Credentials (Recommended)**
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Get OAuth credentials from https://www.esologs.com/profile
# 3. Add them to your .env file:
#    OAUTH_CLIENT_ID=your_client_id_here
#    OAUTH_CLIENT_SECRET=your_client_secret_here

# 4. Run global setup to create auth-state.json
npx playwright test --global-setup=tests/global-setup.ts
```

**Option B: Set Token Directly**
Edit `tests/debug-real-data.spec.ts` and set:
```typescript
const ACCESS_TOKEN = 'your_token_here';
```

**Option C: Run Without Authentication**
Public reports work without authentication, but you'll see API rate limits.

### 2. Start Your Dev Server

```bash
npm run dev
```

Make sure your app is running on `http://localhost:3000`

### 3. Configure Your Debug Session

Edit `tests/debug-real-data.spec.ts` and update the configuration:

```typescript
const REPORT_CODE = '3gjVGWB2dxCL8XAw'; // ESO Logs report code
const FIGHT_ID = 32;                    // Fight number
const PLAYER_NAME = 'Mael';             // Player to debug
```

### 4. Run the Debug Test

```bash
# Opens browser automatically and runs test
npm run test:debug
```

### 5. Review Output

The test will:
1. Open a visible browser window
2. Navigate to your local app at the specified fight
3. Find and highlight the target player (red border)
4. Capture all console logs (check terminal output)
5. Take a screenshot (saved to `test-results/`)

**Note**: The browser makes REAL API calls to esologs.com - no mocking!

## Configuration Options

### Report and Fight Selection

```typescript
const REPORT_CODE = 'YOUR_REPORT_CODE'; // From esologs.com URL
const FIGHT_ID = 32;                     // Specific fight number
```

### Player Targeting

```typescript
const PLAYER_NAME = 'PlayerName';  // Partial or full player name
```

The test will:
- Search for the player on the page
- Highlight them with a red border
- List all available players if not found

### View Selection

```typescript
const VIEW = 'players';  // Options: 'players', 'damage-done', 'healing', 'summary'
```

### Private Reports (Authentication)

For private reports, add your ESO Logs access token:

```typescript
const ACCESS_TOKEN: string | null = 'your_access_token_here';
```

To get your access token:
1. Log into esologs.com
2. Open browser DevTools (F12)
3. Go to Application → Local Storage → https://www.esologs.com
4. Copy the `access_token` value

## Use Cases

### Debugging Scribing Detection

```typescript
const REPORT_CODE = '3gjVGWB2dxCL8XAw';
const FIGHT_ID = 32;
const PLAYER_NAME = 'Mael';
const VIEW = 'players';
```

Run the test and check console output for:
- `[Scribing Detection]` logs
- Redux state changes
- GraphQL queries/responses

### Investigating Damage Calculations

```typescript
const VIEW = 'damage-done';
const PLAYER_NAME = 'YourDPS';
```

### Checking Healing Issues

```typescript
const VIEW = 'healing';
const PLAYER_NAME = 'YourHealer';
```

## Advanced Usage

### Increase Wait Time for Manual Inspection

Edit `tests/debug-real-data.spec.ts`:

```typescript
// Keep browser open for 10 minutes instead of 5
await page.waitForTimeout(600000); // 600 seconds
```

### Enable DevTools Automatically

Edit `playwright.debug.config.ts`:

```typescript
launchOptions: {
  devtools: true,  // Opens Chrome DevTools automatically
},
```

### Capture More Data

Add custom data extraction to the test:

```typescript
const customData = await page.evaluate(() => {
  // Access any browser globals
  const state = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.getState?.();
  return {
    players: state?.players,
    fights: state?.fights,
    // Add whatever you need
  };
});

console.log('Custom data:', JSON.stringify(customData, null, 2));
```

## Troubleshooting

### Test Times Out

- Increase timeout in `playwright.debug.config.ts`: `timeout: 900000` (15 min)
- Check that the report/fight exists on esologs.com
- Verify network connectivity

### Player Not Found

The test will:
1. List all available players on the page
2. Show a warning message
3. Continue execution for manual inspection

Check the terminal output for the list of available players.

### Private Report Access Denied

- Verify your `ACCESS_TOKEN` is valid and not expired
- Log out and back into esologs.com to refresh the token
- Check that you have permission to view the report

### Console Logs Not Showing

The test captures all console output automatically. Check:
- Terminal output during test execution
- Look for `[browser:LOG]`, `[browser:DEBUG]`, `[browser:ERROR]` prefixes

## File Structure

```
tests/
├── debug-real-data.spec.ts          # Main debug test suite
playwright.debug.config.ts            # Playwright config for debug tests
test-results/
└── debug-<player>-<timestamp>.png   # Screenshot outputs
```

## Example Output

```bash
$ npm run test:debug

================================================================================
Navigating to: https://www.esologs.com/reports/3gjVGWB2dxCL8XAw#fight=32&view=players
================================================================================

Waiting for view to load...
✓ View loaded successfully

Searching for player: "Mael"...
✓ Found player: "Mael"
✓ Player element highlighted in browser

================================================================================
Checking browser console for scribing detection logs...
================================================================================

[browser:LOG] [Scribing Detection] Analyzing player: Mael
[browser:LOG] [Scribing Detection] Found signature script: Anchorite's Potency
[browser:DEBUG] Script detection context: { ... }

✓ Screenshot saved to test-results/
```

## Tips

1. **Keep Browser Open** - Run with `HEADED=true` environment variable to pause for manual inspection
2. **Use Playwright UI** - Run `npm run test:debug:ui` for interactive debugging
3. **Check Network Tab** - Enable DevTools to see GraphQL requests/responses
4. **Redux DevTools** - Install Redux DevTools extension for state inspection
5. **Take Notes** - The screenshot and console logs are saved for later reference

## Creating New Debug Tests

Copy `tests/debug-real-data.spec.ts` and customize for your needs:

```bash
cp tests/debug-real-data.spec.ts tests/debug-my-feature.spec.ts
```

Edit the configuration constants and add feature-specific data extraction.

## Related Documentation

- [Playwright Debug Guide](https://playwright.dev/docs/debug)
- [ESO Logs API Documentation](https://www.esologs.com/api/docs)
- [Scribing Detection System](../documentation/features/scribing/)
