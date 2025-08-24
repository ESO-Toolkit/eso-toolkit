# CRACO Configuration

This project uses [CRACO (Create React App Configuration Override)](https://craco.js.org/) to customize the webpack configuration without ejecting from Create React App.

## Features Enabled

### Path Aliases

The following path aliases are configured for cleaner imports:

- `@` → `src/`
- `@components` → `src/components/`
- `@features` → `src/features/`
- `@store` → `src/store/`
- `@types` → `src/types/`
- `@utils` → `src/utils/`
- `@graphql` → `src/graphql/`

### Bundle Optimization

Production builds include optimized bundle splitting for better caching:

- **React Bundle**: React and ReactDOM
- **MUI Bundle**: Material-UI components
- **Apollo Bundle**: Apollo GraphQL client
- **Redux Bundle**: Redux and RTK
- **Vendor Bundle**: Other third-party libraries

### Development Server

Enhanced development server configuration:

- Port: 3000
- Hot Module Replacement enabled
- History API fallback for SPA routing
- Gzip compression

### Build Optimizations

- Source maps enabled in production
- Performance budgets set to 1MB for assets and entrypoints
- Optimized cache groups for better long-term caching

## Usage

All npm scripts now use CRACO instead of react-scripts:

```bash
npm start    # Uses craco start
npm run build # Uses craco build
npm test     # Uses craco test
```

## Configuration File

The main configuration is in `craco.config.js` at the project root. This file can be extended to add additional webpack loaders, plugins, or other customizations as needed.

## Path Alias Usage Examples

```tsx
// Before (relative imports)
import { selectActorsById } from '../../../store/master_data/masterDataSelectors';
import ActorsPanelView from './ActorsPanelView';

// After (using aliases)
import { selectActorsById } from '@store/master_data/masterDataSelectors';
import ActorsPanelView from '@features/report_details/actors/ActorsPanelView';
```
