import { BUILTIN_TOOLS } from "./builtin.js";
import { ToolRegistry } from "./types.js";

/**
 * Construct a default tool registry with all built-in tools registered.
 * Consumers can clone via `.snapshot()` and add their own tools on top
 * without mutating the default.
 */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of BUILTIN_TOOLS) registry.register(tool);
  return registry;
}

export { ToolRegistry } from "./types.js";
export type { Tool, ToolContext, ToolResult, JsonSchema } from "./types.js";
export { BUILTIN_TOOLS } from "./builtin.js";
