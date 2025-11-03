# Analytics Path Normalization

## Overview

To prevent infinite unique page paths in Google Analytics while still tracking specific report and fight data, the application normalizes paths by replacing dynamic segments with placeholders and sends the actual values as custom dimensions.

## How It Works

### Path Normalization

Dynamic segments in URLs are replaced with placeholders:

```
Original Path                      → Normalized Path
/report/abc123/insights           → /report/[code]/insights
/report/xyz789/fight/5/damage     → /report/[code]/fight/[fightId]/damage
/report/test123                   → /report/[code]
```

### Custom Dimensions

The actual values are sent as custom dimensions alongside the pageview:

- `report_code` - The actual report code (e.g., "abc123")
- `fight_id` - The fight ID if present (e.g., "5")

## Benefits

1. **Finite page paths** - Instead of thousands of unique `/report/xxx/insights` pages, you get one aggregated page
2. **Specific report analysis** - You can still filter by `report_code` to see traffic for a specific report
3. **Aggregated reporting** - See total traffic to all report insights pages
4. **Fight-level tracking** - Track which fights are viewed most often

## Google Analytics Setup

To use the custom dimensions in GA4:

1. **Create custom dimensions** (Admin → Data display → Custom definitions):
   - Name: "Report Code", Event parameter: `report_code`, Scope: Event
   - Name: "Fight ID", Event parameter: `fight_id`, Scope: Event

2. **Analysis examples**:
   - **Most popular report pages**: Filter by Page path = `/report/[code]/insights`, group by Page path
   - **Top reports**: Group by `report_code` dimension
   - **Report traffic**: Filter by `report_code` = "abc123"
   - **Fight views**: Filter by Page path = `/report/[code]/fight/[fightId]/*`, group by `fight_id`

## Implementation

The normalization happens automatically in `src/utils/analytics.ts`:

```typescript
// Before sending to GA:
trackPageView('/report/abc123/insights');

// Sent to GA:
{
  hitType: 'pageview',
  page: '/report/[code]/insights',     // Normalized path
  report_code: 'abc123',                // Custom dimension
  location: '...'
}
```

## Testing

Tests verify the normalization works correctly:

```bash
npm test -- analytics.test.ts
```

Key test cases:
- Report paths are normalized
- Fight paths are normalized
- Report codes are extracted
- Fight IDs are extracted
- Non-report paths pass through unchanged
