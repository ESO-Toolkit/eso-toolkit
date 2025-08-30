# Storybook Configuration

This Storybook setup supports the `PUBLIC_URL` environment variable for proper static asset handling when deployed to subdirectories.

## Usage

### Development

To run Storybook with a custom PUBLIC_URL:

```bash
PUBLIC_URL="/my-app" npm run storybook
```

### Building

To build Storybook with a custom PUBLIC_URL:

```bash
PUBLIC_URL="/my-app" npm run build-storybook
```

## Features

- **PUBLIC_URL Support**: Automatically configures Vite's base URL when PUBLIC_URL is set
- **Asset Handling**: Imported assets (images, SVGs, etc.) are served with the correct path prefix
- **MSW Integration**: Mock Service Worker URL is adjusted based on PUBLIC_URL
- **Environment Variables**: PUBLIC_URL is available in stories via `process.env.PUBLIC_URL`

## Configuration Files

- `main.ts`: Main Storybook configuration with Vite customization
- `preview.ts`: Preview configuration with MSW setup
- `public/`: Static files served at the root of the Storybook app

## Path Aliases

The following path aliases are configured to match the main application:

- `@` → `src/`
- `@components` → `src/components/`
- `@features` → `src/features/`
- `@store` → `src/store/`
- `@types` → `src/types/`
- `@utils` → `src/utils/`
- `@graphql` → `src/graphql/`
