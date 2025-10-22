# Apollo Client v4 Migration Plan

## Current Status

✅ Apollo Client upgraded to v4.0.7
✅ GraphQL Code Generator `client-preset` installed
✅ New typed documents generated in `src/graphql/gql/`
❌ Old `.generated.ts` files removed
❌ Application code still uses old hook-based API

## Key Changes in Apollo Client v4

### API Changes

1. **Generic types removed**: `ApolloClient<NormalizedCacheObject>` → `ApolloClient`
2. **Provider imports changed**: 
   - `ApolloProvider` moved from `@apollo/client` to `@apollo/client/react`
   - `MockedProvider` moved from `@apollo/client/testing` to `@apollo/client/testing/react`
3. **Utility imports changed**:
   - `getOperationName` removed from `@apollo/client/utilities`
   - Use `getOperationAST` from `graphql` instead

### Code Generator Changes

The `client-preset` generates:
- Typed document nodes (not hooks)
- Use with `useQuery`, `useMutation`, etc. from `@apollo/client`
- Documents exported from `src/graphql/gql/`

**Old approach:**
```typescript
import { useGetCurrentUserQuery } from '../../graphql/reports.generated';

const { data, loading } = useGetCurrentUserQuery();
```

**New approach:**
```typescript
import { useQuery } from '@apollo/client';
import { GetCurrentUserDocument } from '../../graphql/gql/graphql';

const { data, loading } = useQuery(GetCurrentUserDocument);
```

## Files Requiring Updates

### 1. Core Apollo Files (4 files)

#### `src/esologsClient.ts`
- Remove generic type from `ApolloClient<NormalizedCacheObject>` → `ApolloClient`
- Replace `getOperationName` with `getOperationAST` from `graphql` package
- Update method signatures

#### `src/EsoLogsClientContext.tsx`
- Import `ApolloProvider` from `@apollo/client/react` instead of `@apollo/client`

#### `src/test/decorators/storybookDecorators.tsx`
- Import `ApolloProvider` from `@apollo/client/react`

#### `src/test/decorators/withApollo.tsx`
- Import `MockedProvider` from `@apollo/client/testing/react`

### 2. Feature Files (4 files)

These files import from `.generated` files and need to be updated to use the new approach:

#### `src/features/auth/AuthContext.tsx`
```diff
- import { GetCurrentUserDocument } from '../../graphql/reports.generated';
+ import { useQuery } from '@apollo/client';
+ import { GetCurrentUserDocument } from '../../graphql/gql/graphql';
```

#### `src/features/latest_reports/LatestReports.tsx`
```diff
- import { GetLatestReportsDocument } from '../../graphql/reports.generated';
+ import { useQuery } from '@apollo/client';
+ import { GetLatestReportsDocument } from '../../graphql/gql/graphql';
```

#### `src/features/user_reports/UserReports.tsx`
```diff
- import { GetUserReportsDocument } from '../../graphql/reports.generated';
+ import { useQuery } from '@apollo/client';
+ import { GetUserReportsDocument } from '../../graphql/gql/graphql';
```

#### `src/hooks/useLatestReport.ts`
```diff
- import { GetUserReportsDocument } from '../graphql/reports.generated';
+ import { GetUserReportsDocument } from '../graphql/gql/graphql';
```

### 3. Additional Files Using Generated Hooks

Search for all files importing from `*.generated` files:
```powershell
grep -r "from.*\.generated" src/
```

These will need similar updates to use `useQuery`/`useMutation` with typed documents.

## Migration Steps

### Step 1: Fix Apollo Client Core Issues
1. Update `esologsClient.ts` to remove generic types and fix `getOperationName`
2. Update provider imports in context files
3. Update test decorator imports

### Step 2: Update Feature Files
1. Replace generated hook imports with document imports
2. Add `useQuery`/`useMutation` imports from `@apollo/client`
3. Update component code to use hooks with documents

### Step 3: Test
1. Run `npm run typecheck` to verify no TypeScript errors
2. Run `npm run test` to verify tests pass
3. Run `npm run dev` to test application locally

### Step 4: Clean Up
1. Remove old codegen packages:
   ```powershell
   npm uninstall @graphql-codegen/typescript-react-apollo
   ```
2. Update documentation to reflect new approach

## Alternative: Rollback to v3

If the migration is too complex for now, you can rollback:

```powershell
# Downgrade Apollo Client
npm install @apollo/client@^3.13.9

# Revert codegen.yml to typescript-react-apollo
# Regenerate with npm run codegen

# Remove client-preset
npm uninstall @graphql-codegen/client-preset
```

## Recommendation

Given the scope of changes (8+ files minimum), I recommend:

**Option A (Recommended)**: Complete the migration now while everything is fresh
- Fixes Apollo Client v4 compatibility issues
- Modern, type-safe approach
- Better tree-shaking and bundle size

**Option B**: Rollback to v3 for now
- Minimal disruption
- Can migrate later when you have more time
- v3 is stable and well-supported

## Next Steps

Please decide which approach you'd like to take, and I can help implement it!
