# Setup Node.js with NPM Cache

A reusable GitHub Action that sets up Node.js with npm caching configured for both `package.json` and `package-lock.json` files, and installs dependencies using `npm ci`.

## Inputs

| Input          | Description            | Required | Default |
| -------------- | ---------------------- | -------- | ------- |
| `node-version` | Node.js version to use | No       | `'20'`  |

## Example Usage

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-node-with-cache
    # Optional: specify a different Node.js version
    # with:
    #   node-version: '18'
  - name: Run tests
    run: npm test
```

## What This Action Does

1. Sets up Node.js using `actions/setup-node@v4`
2. Configures npm caching with cache invalidation based on both `package.json` and `package-lock.json`
3. Updates npm to the latest version to avoid known issues with optional dependencies
4. Installs dependencies using `npm ci` with optimized flags to avoid common CI issues

## Benefits

- **DRY Principle**: Eliminates code duplication across workflow files
- **Consistent Setup**: Ensures all workflows use the same Node.js setup
- **Optimized Caching**: Properly caches npm dependencies with correct cache invalidation
- **Easy Maintenance**: Changes to Node.js setup only need to be made in one place
