# Build and Deploy Composite Action

This composite action handles building and deploying the ESO Log Aggregator React app and Storybook to GitHub Pages.

## Inputs

| Input               | Description                                    | Required | Default |
| ------------------- | ---------------------------------------------- | -------- | ------- |
| `enable_sourcemaps` | Enable source map generation                   | No       | `false` |
| `release_version`   | Release version to set in environment          | No       | `''`    |
| `vite_ga_measurement_id` | Google Analytics measurement identifier injected into the build | No | `''` |

## Outputs

| Output           | Description                     |
| ---------------- | ------------------------------- |
| `deployment-url` | URL where the site was deployed |

## Usage

```yaml
- name: Build and Deploy
  uses: ./.github/actions/build-and-deploy
  with:
    enable_sourcemaps: 'true'
    release_version: ${{ github.sha }}
  vite_ga_measurement_id: ${{ secrets.VITE_GA_MEASUREMENT_ID }}
```

## What it does

1. Sets up Node.js 20 with npm caching
2. Installs npm dependencies
3. Sets release version environment variable (if provided)
4. Configures the GitHub Pages build environment
5. Builds the React app with the proper base path and optional analytics id
6. Builds Storybook with the correct base path
7. Moves Storybook to the build directory
8. Uploads the build as a Pages artifact and deploys it with `actions/deploy-pages`

## Migration from Reusable Workflow

This composite action replaces the previous reusable workflow approach (`common/build-and-deploy.yml`) because GitHub Actions doesn't support reusable workflows in nested directories.

### Key differences:

- All inputs are now strings (composite actions don't support boolean/number types)
- Analytics configuration is passed explicitly instead of referencing secrets inside the action
- Each step requires a `shell` specification for composite actions
