import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `router init` — copy the example config to the current working directory.
 * Refuses to overwrite an existing router.config.ts unless --force is given.
 */
export function runInit(opts: { force?: boolean; cwd?: string }): void {
  const cwd = opts.cwd ?? process.cwd();
  const target = join(cwd, "router.config.ts");

  if (existsSync(target) && !opts.force) {
    console.error(
      `router.config.ts already exists at ${target}. Use --force to overwrite.`,
    );
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  // src/commands/init.ts → tools/router/router.config.example.ts
  const source = resolve(here, "..", "..", "router.config.example.ts");

  if (!existsSync(source)) {
    console.error(`Could not find example config at ${source}`);
    process.exit(1);
  }

  copyFileSync(source, target);
  console.log(`✓ Wrote ${target}`);
  console.log("Next steps:");
  console.log("  1. Edit router.config.ts to match your project");
  console.log("  2. Run `router auth login --provider anthropic`");
  console.log("  3. Run `router auth doctor` to verify authorization");
}
