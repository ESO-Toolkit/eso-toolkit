# Script Runner Guide

This project now uses a shared TypeScript runner powered by [`tsx`](https://github.com/esbuild-kit/tsx) to execute automation scripts. The goal is to make it easy to add new scripts without repeating boilerplate or wrestling with module loaders.

## Running scripts

```
npm run script -- scripts/print-leaderboard.ts
```

The `script` npm command forwards the rest of the arguments to `tsx` with `tsconfig.scripts.json`. Any TypeScript file inside `scripts/` (and subfolders) can be executed this way.

## Shared bootstrap helpers

Use `scripts/_runner/bootstrap.ts` to get common features:

```ts
import { runScript } from './_runner/bootstrap';

runScript(async ({ resolveAccessToken, getGraphqlHarness, logger }) => {
  const harness = await getGraphqlHarness();
  const data = await harness.execute(/* ... */);
  logger.info('Done', { rows: data });
}, { name: 'example-script' });
```

The bootstrap module handles:

- Loading environment variables via `dotenv`.
- Resolving ESO Logs access tokens (reusing `ESOLOGS_TOKEN` when present).
- Creating and disposing a `GraphqlTestHarness` with sane logging defaults.
- Consistent logging with a script-specific prefix.

## Authoring new scripts

1. Place your file in `scripts/` and import `runScript` as shown above.
2. Prefer repo path aliases (e.g. `@graphql/...`, `@/utils/...`) for module imports.
3. Let `runScript` manage access tokens instead of duplicating OAuth fetch logic.
4. Test locally with `npm run script -- scripts/your-script.ts`.

For longer runners, consider adding reusable helpers to `scripts/_runner/` so future scripts can share the same patterns.
