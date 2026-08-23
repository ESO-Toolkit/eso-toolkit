# Screen Size Testing GitHub Action Setup

This document explains how to set up and use the GitHub Action for screen size testing.

## 🚀 Quick Setup

### 1. Enable GitHub Pages

1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save the configuration

### 2. Run Your First Test

1. Go to **Actions** tab in your repository
2. Select **"Screen Size Testing"** workflow
3. Click **"Run workflow"**
4. Choose your branch and device categories
5. Click **"Run workflow"**

## 📋 Workflow Features

### On-Demand Testing

- **Branch Selection**: Test any branch in your repository
- **Device Categories**: Choose specific device types or test all
- **Privacy-safe artifacts**: No report screenshots or checked-in visual baselines

### Automatic Testing

- **Pull Request Testing**: Automatically runs on PRs affecting screen size tests
- **Smart Triggering**: Only runs when relevant files are changed

### Results Viewing

- **GitHub Pages**: View reports directly in your browser
- **PR Comments**: Get results summary directly in pull requests
- **Job Summaries**: See results in the GitHub Actions interface
- **Artifacts**: Download complete reports for offline viewing

## 🎯 Usage Examples

### Test All Device Sizes on Main Branch

```
Workflow: Screen Size Testing
Branch: main
Device Categories: all
Update Snapshots: false
```

### Test Only Mobile Devices on Feature Branch

```
Workflow: Screen Size Testing
Branch: feature/responsive-fixes
Device Categories: mobile
Update Snapshots: false
```

### Update Visual Regression Baselines

```
Workflow: Screen Size Testing
Branch: main
Device Categories: all
Update Snapshots: true
```

## 📊 Report Structure

After tests run, reports are available at:

```
https://eso-toolkit.github.io/eso-log-aggregator-reports/screen-size-tests/<branch>/<run-number>/
```

### Report Contents

- **Interactive HTML Report**: Visual diff comparisons, screenshot galleries
- **JSON Results**: Machine-readable test data
- **Summary Markdown**: Quick overview of results
- **Performance Metrics**: Load times and rendering data

### Report Retention

- **Interactive Reports**: 90 days (via GitHub Pages)
- **Artifacts**: 30 days (downloadable from Actions)
- **Generated test artifacts**: 7 days (review before sharing; never treat as release assets)

## 🔧 Configuration Options

### Device Categories

#### All (default)

Tests all 22+ device configurations including mobile, tablet, desktop, and responsive breakpoints.

#### Mobile

- iPhone SE (375×667)
- iPhone 12 (390×844)
- iPhone 12 Pro Max (428×926)
- Android Pixel 5 (393×851)
- Landscape orientations

#### Tablet

- iPad (768×1024)
- iPad Pro (1024×1366)
- Portrait and landscape orientations

#### Desktop

- Small Desktop (1280×720)
- Standard Desktop (1366×768)
- Large Desktop (1920×1080)
- 4K Desktop (3840×2160)
- Ultrawide (3440×1440)

#### Breakpoints

- XS: 480px
- SM: 640px
- MD: 768px
- LG: 1024px
- XL: 1280px
- 2XL: 1536px

## 📈 Performance Features

### Parallel Execution

- Tests run across 3 shards for faster completion
- Matrix strategy reduces total runtime
- Results are automatically merged

### CI Optimizations

- Memory limits configured for GitHub Actions
- External request blocking for reliability
- Timeout adjustments for CI environment

### Smart Caching

- Node.js dependencies cached
- Playwright browsers cached
- Build artifacts reused when possible

## 🛠️ Troubleshooting

### Tests Failing

1. **Visual Differences**: Check if UI changes were intentional
2. **Update Snapshots**: Run workflow with "Update Snapshots" enabled
3. **Device Specific**: Test individual device categories to isolate issues

### Reports Not Appearing

1. **GitHub Pages**: Ensure GitHub Pages is enabled in repository settings
2. **Permissions**: Workflow needs write access to deploy pages
3. **Branch Protection**: Check if branch protection rules affect deployment

### Performance Issues

1. **Selective Testing**: Use device category filters
2. **Parallel Execution**: Tests automatically shard across runners
3. **Timeout Adjustments**: CI timeouts are pre-configured

## 💡 Best Practices

### When to Run Tests

- **Before Major Releases**: Test all device categories
- **Responsive Changes**: Focus on affected device types
- **Regular Validation**: Weekly or bi-weekly full test runs

### Managing visual artifacts

- **Review Carefully**: Generated screenshots and traces can contain report data
- **Do Not Commit**: Keep generated artifacts in CI storage or local scratch space
- **Public Sharing**: Share only reviewed public-page captures with no participant data

### Interpreting Results

- **Success Rates**: Aim for >95% pass rate across devices
- **Performance Metrics**: Monitor load time trends across screen sizes
- **Visual Regressions**: Review failed tests for unintended UI changes

## 🔗 Integration with Development Workflow

### Pull Request Testing

- Automatically validates responsive design changes
- Provides immediate feedback on UI modifications
- Prevents responsive regressions from reaching main branch

### Continuous Monitoring

- Regular testing ensures responsive design quality
- Historical data tracks performance trends
- Early detection of cross-device compatibility issues

### Team Collaboration

- Shared reports improve design review process
- Standardized device testing across team
- Visual documentation of responsive behavior
