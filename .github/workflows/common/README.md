# Common Workflows

This directory contains reusable GitHub Actions workflows that can be called by other workflows in this repository.

## Available Workflows

### `build-and-deploy.yml`

A reusable workflow that builds both the main React application and Storybook, then deploys them to GitHub Pages.

#### Inputs

| Input               | Description                                  | Required | Default | Type    |
| ------------------- | -------------------------------------------- | -------- | ------- | ------- |
| `enable_sourcemaps` | Enable source map generation for debugging   | No       | `false` | boolean |
| `fetch_depth`       | Number of commits to fetch (0 = all history) | No       | `1`     | number  |
| `release_version`   | Release version to set in REACT_APP_VERSION  | No       | `''`    | string  |

#### Outputs

| Output           | Description                     |
| ---------------- | ------------------------------- |
| `deployment-url` | URL where the site was deployed |

#### Usage Example

```yaml
jobs:
  deploy:
    uses: ./.github/workflows/common/build-and-deploy.yml
    with:
      enable_sourcemaps: true
      fetch_depth: 0
      release_version: ${{ github.sha }}
    secrets: inherit
```

#### What it does

1. **Setup**: Checks out code, sets up Node.js, installs dependencies
2. **Build**: Builds React app with proper base path for GitHub Pages
3. **Storybook**: Builds Storybook with correct subdirectory base path
4. **Deploy**: Deploys both to GitHub Pages with proper directory structure

The deployed structure will be:

- Main app: `https://username.github.io/repo-name/`
- Storybook: `https://username.github.io/repo-name/storybook/`
