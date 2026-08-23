# Setup Node.js with NPM Cache

A reusable GitHub Action that sets up Node.js with npm caching configured for both `package.json` and `package-lock.json` files, and installs dependencies using `npm ci`.

## Inputs

| Input          | Description            | Required | Default |
| -------------- | ---------------------- | -------- | ------- |
| `node-version` | Node.js version to use | No       | `'24'`  |

## Example Usage

```yaml
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
  - uses: ./.github/actions/setup-node-with-cache
    # Optional: specify a different Node.js version
    # with:
    #   node-version: '24'
  - name: Run tests
    run: npm test
```

## What This Action Does

1. Sets up Node.js using the immutable `actions/setup-node` v7 commit
2. Configures npm caching with cache invalidation based on both `package.json` and `package-lock.json`
3. Uses the npm version bundled with the selected Node.js LTS release
4. Installs dependencies using `npm ci --no-audit --no-fund` for reproducible, quiet CI jobs

## Benefits

- **DRY Principle**: Eliminates code duplication across workflow files
- **Consistent Setup**: Ensures all workflows use the same Node.js setup
- **Optimized Caching**: Properly caches npm dependencies with correct cache invalidation
- **Easy Maintenance**: Changes to Node.js setup only need to be made in one place
