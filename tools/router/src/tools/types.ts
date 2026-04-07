import type { RouterConfig } from "../config/schema.js";
import type { EscalationReason } from "../types.js";

/**
 * Tool system used by worker dispatchers. A Tool is a self-describing unit
 * of work the model can invoke mid-dispatch. The Provider is responsible for
 * converting between its wire format (Anthropic tool_use blocks, OpenAI
 * function calls, etc.) and this internal representation, so tools themselves
 * stay provider-agnostic.
 *
 * Every tool receives a ToolContext that carries the router config, the
 * current working directory, and an abort signal tied to the dispatcher's
 * lifetime. Tools must honor the signal for long-running operations.
 */

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  additionalProperties?: boolean;
  items?: unknown;
  enum?: unknown[];
}

export interface ToolContext {
  cwd: string;
  signal: AbortSignal;
  config: RouterConfig;
  /** Called by tools that want to signal escalation to the controller. */
  requestEscalation?: (reason: EscalationReason, digest: string) => void;
}

export interface ToolResult {
  /** Plain-text content fed back to the model. */
  content: string;
  /** Tag the result as an error so the model can react to failures. */
  isError?: boolean;
}

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}

/**
 * Registry of tools available to workers. Tools are registered once at
 * module load; the dispatcher pulls a snapshot of the registry at the start
 * of each worker so tools can be added or swapped per-invocation if needed.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  /**
   * Return a shallow copy. Used by the dispatcher to snapshot the tool set
   * for a single worker, so later mutations don't affect in-flight runs.
   */
  snapshot(): ToolRegistry {
    const copy = new ToolRegistry();
    for (const tool of this.tools.values()) copy.register(tool);
    return copy;
  }
}
