/**
 * Core type definitions shared across the router.
 *
 * All cross-module contracts live here so that config, providers, triage,
 * dispatch, and the TUI can agree on a single vocabulary.
 */

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

export type TierName = "fast" | "default" | "deep" | (string & {});

export interface TierConfig {
  /** Provider id (must exist in config.providers). */
  provider: string;
  /** Model id to request from the provider. */
  model: string;
  /** Soft cap on response tokens for workers at this tier. */
  maxTokens?: number;
  /** Human-readable description, shown in the TUI. */
  description?: string;
}

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

export type ComplexityLabel =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "research";

export interface TriageSignals {
  promptTokens: number;
  fileGlobBreadth: number;
  verbClass: "read" | "write" | "design" | "unknown";
  keywords: string[];
  hasMultiStepMarkers: boolean;
}

export interface TriageVerdict {
  complexity: ComplexityLabel;
  confidence: number;
  reasoningDepth: 1 | 2 | 3 | 4 | 5;
  ambiguity: 1 | 2 | 3 | 4 | 5;
  requiresCodebaseExploration: boolean;
  requiresMultiFileEdits: boolean;
  rationale: string;
  recommendedTier: TierName;
  source: "heuristic" | "llm" | "user-override";
}

// ---------------------------------------------------------------------------
// Envelope (the handoff contract)
// ---------------------------------------------------------------------------

export interface TaskEnvelope {
  id: string;
  createdAt: string;
  parentSessionId?: string;
  goal: string;
  originalPrompt: string;
  triage: TriageVerdict & {
    tier: TierName;
    provider: string;
    model: string;
    rubricVersion: string;
  };
  context: {
    files: string[];
    constraints: string[];
    priorFindings?: string;
  };
  budget: {
    maxToolCalls?: number;
    maxTokens?: number;
    maxUsd?: number;
    escalationAllowed: boolean;
  };
  escalation?: {
    fromTier: TierName;
    fromModel: string;
    reason: EscalationReason;
    priorAttemptDigest: string;
    bumpCount: number;
  };
}

export type EscalationReason =
  | "self_doubt"
  | "loop_detected"
  | "validation_failed"
  | "ambiguity"
  | "budget_exceeded"
  | "user_requested";

// ---------------------------------------------------------------------------
// Credentials & Providers
// ---------------------------------------------------------------------------

export type AuthStrategy =
  | "api-key"
  | "oauth-device"
  | "oauth-browser"
  | "cloud-sdk"
  | "none";

export interface Credential {
  providerId: string;
  kind: AuthStrategy;
  /** Opaque secret material (token, api key, etc.). Never logged. */
  secret: string;
  /** Optional refresh token for OAuth strategies. */
  refreshToken?: string;
  /** Unix ms. Undefined for non-expiring credentials like API keys. */
  expiresAt?: number;
  /** Provider-specific metadata (e.g. scopes, account id). */
  metadata?: Record<string, unknown>;
}

export interface ProbeResult {
  ok: boolean;
  /** Machine-readable failure kind, if not ok. */
  reason?: ProbeFailureReason;
  /** Human-readable detail for TUI display. */
  message?: string;
  /** Unix ms when this probe was performed. */
  checkedAt: number;
}

export type ProbeFailureReason =
  | "missing_credential"
  | "expired_credential"
  | "invalid_credential"
  | "model_not_found"
  | "entitlement_denied"
  | "region_unavailable"
  | "rate_limited"
  | "network_error"
  | "unknown";

// Streaming auth events — providers emit these during login flows so the
// TUI can render device codes, polling spinners, etc.
export type AuthEvent =
  | { type: "instruction"; message: string }
  | {
      type: "device_code";
      userCode: string;
      verificationUri: string;
      verificationUriComplete?: string;
      expiresAt: number;
    }
  | { type: "polling"; waitMs: number }
  | { type: "prompt_secret"; label: string; mask: boolean }
  | { type: "success"; credential: Credential }
  | { type: "error"; message: string; recoverable: boolean };

export interface AuthContext {
  /**
   * Invoked by a provider when it needs a value from the user (API key paste,
   * passphrase, etc.). The TUI wires this up to an interactive prompt.
   */
  requestInput(opts: { label: string; mask: boolean }): Promise<string>;
  /** Abort signal — TUI cancels auth flows when user presses Esc. */
  signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// Provider plugin interface
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  displayName?: string;
  contextWindow?: number;
  tierHint?: TierName;
}

export interface DispatchRequest {
  envelope: TaskEnvelope;
  signal: AbortSignal;
  onEvent: (event: DispatchEvent) => void;
  /** Tools the worker can invoke. Passed in by the dispatcher. */
  tools?: ToolSpec[];
  /** Callback for executing a tool the provider surfaced from the model. */
  executeTool?: (
    name: string,
    input: unknown,
  ) => Promise<{ content: string; isError?: boolean }>;
}

/**
 * Provider-agnostic tool specification. The dispatcher converts its internal
 * ToolRegistry to this shape before handing off to a Provider, so providers
 * don't need to know about the ToolRegistry class.
 */
export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: unknown;
}

export type DispatchEvent =
  | { type: "worker_start"; model: string }
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; ok: boolean }
  | { type: "assistant_text"; text: string }
  | { type: "token_usage"; inputTokens: number; outputTokens: number }
  | {
      type: "escalation_requested";
      reason: EscalationReason;
      digest: string;
    }
  | { type: "worker_done"; digest: string; status: "success" | "failure" };

export interface Provider {
  /** Stable identifier used in config (e.g. "anthropic", "claude"). */
  readonly id: string;
  readonly displayName: string;
  readonly authStrategy: AuthStrategy;

  /**
   * Stream an auth flow. Yields AuthEvent until a credential is obtained
   * or an error is thrown. The final event must be `success` or `error`.
   */
  login(ctx: AuthContext): AsyncIterable<AuthEvent>;

  /** Refresh an expired credential, if the strategy supports it. */
  refresh?(credential: Credential): Promise<Credential>;

  /** Revoke server-side if applicable. */
  logout?(credential: Credential): Promise<void>;

  /** Cheap check: can this credential actually call this model? */
  probe(model: string, credential: Credential): Promise<ProbeResult>;

  /**
   * Run a task envelope against this provider. Yields DispatchEvent via
   * the onEvent callback and resolves when the worker is done.
   */
  dispatch(request: DispatchRequest, credential: Credential): Promise<void>;

  /** Optional: discover available models for an authenticated account. */
  listModels?(credential: Credential): Promise<ModelInfo[]>;
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface BudgetState {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  usd: number;
  escalations: number;
  startedAt: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RouterError";
  }
}

export class AuthError extends RouterError {
  constructor(
    message: string,
    public reason: ProbeFailureReason,
    details?: Record<string, unknown>,
  ) {
    super(message, "AUTH_ERROR", details);
    this.name = "AuthError";
  }
}

export class ConfigError extends RouterError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFIG_ERROR", details);
    this.name = "ConfigError";
  }
}
