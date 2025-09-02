# Social Media Card Implementation

## Overview

Enhanced the ESO Log Insights application to display beautifully formatted cards when shared on Discord, Twitter, Facebook, and other social media platforms.

## Implementation Details

### 1. Enhanced Meta Tags (`public/index.html`)

**Added comprehensive meta tags for:**

- **Open Graph (Facebook/Discord)**: Title, description, image, URL, type, site name, locale
- **Twitter Cards**: Large image cards with proper descriptions
- **Discord Integration**: Optimized theme color for Discord embeds
- **SEO Improvements**: Additional meta tags for search engines

**Key Features:**

- Professional branding: "ESO Log Insights by NotaGuild"
- Detailed descriptions for different contexts
- Proper image specifications (512x512 fallback)
- ESO-themed content highlighting combat log analytics

### 2. Dynamic Meta Tags Component (`src/components/DynamicMetaTags.tsx`)

**Created a React component that dynamically updates meta tags for specific content:**

```tsx
<DynamicMetaTags
  title="Cloudrest +3 - ABC123 Analysis"
  description="Detailed analysis showing 95K DPS performance..."
  image="https://example.com/report-preview.png"
  url="https://example.com/report/ABC123/fight/1"
  type="article"
/>
```

**Features:**

- Updates document title and meta tags in real-time
- Supports both website and article types
- Helper functions for generating report and player-specific meta tags
- SEO-optimized descriptions with fight details, DPS numbers, duration

### 3. Integrated Dynamic Meta Tags

**Applied to key components:**

- **ReportFightDetails**: Fight-specific sharing with boss names, duration, performance metrics
- **ReportFights**: Report overview with fight count, total duration, summary stats

### 4. Updated Manifest (`public/manifest.json`)

**Enhanced web app manifest with:**

- Proper app name and description
- ESO-themed colors (Discord blue theme)
- Dark theme background matching app design
- Progressive Web App optimization

## Social Media Results

### Discord

- Rich embeds with proper title and description
- Clean thumbnail using the 512x512 icon
- Discord-blue theme color for integration
- Professional "ESO Log Insights by NotaGuild" branding

### Twitter

- Large image cards (`summary_large_image`)
- Compelling descriptions highlighting key features
- Proper image alt text for accessibility
- Direct links to specific analysis

### Facebook/LinkedIn

- Open Graph optimization for professional sharing
- Detailed descriptions for business/gaming communities
- Proper site name and locale settings
- Article-type cards for specific reports

## Usage Examples

### Sharing a Specific Fight

When users share a link like `/report/ABC123/fight/5`, the dynamic meta tags will show:

- **Title**: "Cloudrest +3 - ABC123 Analysis"
- **Description**: "Player achieved 95,000 DPS on Cloudrest +3. Fight duration: 8:45. View detailed damage breakdowns, buff uptimes, and performance insights."

### Sharing a Report Overview

When sharing `/report/ABC123`, it shows:

- **Title**: "Weekly Raid - ABC123 - Report Analysis"
- **Description**: "ESO combat log analysis for 12 encounters. Total duration: 2:15:30. View detailed damage, healing, and performance metrics."

## Future Enhancements

### Custom Preview Images

- Generate dynamic preview images for specific reports
- Include boss thumbnails, DPS charts, player performance graphs
- Automated image generation with Canvas API or server-side rendering

### Player-Specific Sharing

- Individual player performance cards
- Class-specific branding and colors
- Achievement highlights and build optimization tips

### Advanced Analytics Cards

- Top DPS/Healing leaderboards
- Guild performance comparisons
- Historical performance trends

## Technical Notes

### Performance

- Dynamic meta tags update only when content changes (memoized)
- No impact on initial load time
- SEO-friendly with server-side rendering compatibility

### Browser Support

- Works with all modern browsers
- Graceful fallback to default meta tags
- No JavaScript required for basic social sharing

### Maintenance

- Centralized meta tag management
- Easy to update descriptions and branding
- Helper functions for consistent formatting

## Testing

To test the social media cards:

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **Discord**: Share links directly in Discord to see live previews
4. **LinkedIn Inspector**: https://www.linkedin.com/post-inspector/

## Files Modified

- `public/index.html` - Enhanced base meta tags
- `public/manifest.json` - Updated PWA manifest
- `src/components/DynamicMetaTags.tsx` - New dynamic meta tags component
- `src/features/report_details/ReportFightDetails.tsx` - Fight-specific meta tags
- `src/features/report_details/ReportFights.tsx` - Report overview meta tags
