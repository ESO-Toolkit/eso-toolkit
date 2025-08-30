# Build and Deploy Composite Action

This composite action handles building and deploying the ESO Log Aggregator React app and Storybook to GitHub Pages.

## Inputs

| Input               | Description                                    | Required | Default |
| ------------------- | ---------------------------------------------- | -------- | ------- |
| `enable_sourcemaps` | Enable source map generation                   | No       | `false` |
| `fetch_depth`       | Number of commits to fetch (0 for all history) | No       | `1`     |
| `release_version`   | Release version to set in environment          | No       | `''`    |
| `github_token`      | GitHub token for deployment                    | Yes      | -       |

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
    fetch_depth: '0'
    release_version: ${{ github.sha }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

## What it does

1. Checks out the repository with specified fetch depth
2. Sets up Node.js 20 with npm caching
3. Installs npm dependencies
4. Sets release version environment variable (if provided)
5. Builds the React app with proper base path for GitHub Pages
6. Builds Storybook with proper base path
7. Moves Storybook to the build directory
8. Deploys to GitHub Pages using peaceiris/actions-gh-pages

## Migration from Reusable Workflow

This composite action replaces the previous reusable workflow approach (`common/build-and-deploy.yml`) because GitHub Actions doesn't support reusable workflows in nested directories.

### Key differences:

- All inputs are now strings (composite actions don't support boolean/number types)
- `github_token` is now an explicit input instead of using `secrets: inherit`
- Each step requires a `shell` specification for composite actions
