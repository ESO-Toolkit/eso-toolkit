import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useState } from "react";
import { spawnSync, spawn } from "node:child_process";
import type { RouterConfig } from "../config/schema.js";
import type { CredentialStore } from "../credentials/store.js";
import type { PreflightCache } from "../dispatch/preflight.js";
import { Dispatcher, type DispatcherEvent } from "../dispatch/dispatcher.js";
import type { JsonlLogger } from "../telemetry/jsonl-logger.js";
import type { ToolRegistry } from "../tools/index.js";
import { buildEnvelope } from "../triage/envelope.js";
import { triage } from "../triage/triage.js";
import type {
  BudgetState,
  Credential,
  Provider,
  TaskEnvelope,
} from "../types.js";
import {
  renderPreflightError,
  type ErrorAction,
  type ErrorPanelContent,
} from "../auth/preflight-error.js";
import { AuthFlow } from "./components/AuthFlow.js";
import { BudgetMeter } from "./components/BudgetMeter.js";
import { ErrorPanel } from "./components/ErrorPanel.js";
import { TriagePanel } from "./components/TriagePanel.js";
import { WorkerStream, type StreamLine } from "./components/WorkerStream.js";

interface Props {
  config: RouterConfig;
  providers: Map<string, Provider>;
  store: CredentialStore;
  cache: PreflightCache;
  logger: JsonlLogger;
  tools?: ToolRegistry;
  initialPrompt?: string;
  forcedTier?: string;
  requireTier?: string;
  downgradePolicy?: "auto" | "never" | "ask";
  ciMode?: boolean;
}

type Screen =
  | { kind: "prompt" }
  | { kind: "triaging" }
  | { kind: "running"; envelope: TaskEnvelope }
  | { kind: "auth"; providerId: string; resume: () => void }
  | { kind: "error"; content: ErrorPanelContent }
  | { kind: "done"; envelope: TaskEnvelope; status: string };

/**
 * Main Ink TUI. Wires together the dispatcher, triage, and auth flows into
 * a single screen-router. State transitions are explicit — every change to
 * the current screen goes through setScreen() so the render logic stays
 * flat and debuggable.
 */
export function App({
  config,
  providers,
  store,
  cache,
  logger,
  tools,
  initialPrompt,
  forcedTier,
  requireTier,
  downgradePolicy = "ask",
  ciMode = false,
}: Props): React.ReactElement {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>({ kind: "prompt" });
  const [promptText, setPromptText] = useState(initialPrompt ?? "");
  const [envelope, setEnvelope] = useState<TaskEnvelope | null>(null);
  const [streamLines, setStreamLines] = useState<StreamLine[]>([]);
  const [budget, setBudget] = useState<BudgetState>({
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    usd: 0,
    escalations: 0,
    startedAt: Date.now(),
  });
  const [dispatcher] = useState(
    () =>
      new Dispatcher({
        config,
        providers,
        store,
        cache,
        logger,
        tools,
        downgradePolicy,
      }),
  );

  // Global hotkeys
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
    // [e] from the prompt screen → spawn $EDITOR on the config file.
    if (input === "e" && screen.kind === "prompt") {
      openEditor();
    }
  });

  const openEditor = useCallback(() => {
    const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
    try {
      spawnSync(editor, ["router.config.ts"], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      appendLine({
        kind: "status",
        content: "Config reload: restart the TUI for changes to take effect.",
      });
    } catch (err) {
      appendLine({
        kind: "error",
        content: `Could not launch ${editor}: ${(err as Error).message}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendLine = useCallback((line: StreamLine) => {
    setStreamLines((prev) => [...prev, line]);
  }, []);

  const runPrompt = useCallback(
    async (text: string) => {
      setScreen({ kind: "triaging" });
      setStreamLines([]);
      setEnvelope(null);

      try {
        const triageCred = await store.get(config.triage.provider);
        const verdict = await triage({
          prompt: text,
          config,
          triageCredential: triageCred,
        });

        // Apply --tier override: replace the triaged tier.
        const effectiveVerdict = forcedTier
          ? {
              ...verdict,
              recommendedTier: forcedTier,
              source: "user-override" as const,
              rationale: `${verdict.rationale} [forced: ${forcedTier}]`,
            }
          : verdict;

        const env = buildEnvelope({
          prompt: text,
          config,
          verdict: effectiveVerdict,
        });

        // Apply --require-tier: fail loudly if the chosen tier isn't the
        // required one (e.g. heuristic picked "default" but CI demanded "deep").
        if (requireTier && env.triage.tier !== requireTier) {
          appendLine({
            kind: "error",
            content: `--require-tier ${requireTier} but triage chose ${env.triage.tier}.`,
          });
          setScreen({
            kind: "done",
            envelope: env,
            status: "failure",
          });
          if (ciMode) {
            process.exitCode = 4;
            exit();
          }
          return;
        }

        setEnvelope(env);
        setScreen({ kind: "running", envelope: env });

        const abort = new AbortController();
        await dispatcher.run({
          envelope: env,
          signal: abort.signal,
          onEvent: (event) => handleDispatcherEvent(event),
        });
      } catch (err) {
        if (isAuthLikeError(err)) {
          const { providerId, model, reason, message } = extractErrorDetails(err);
          const content = renderPreflightError(
            reason,
            providerId ?? "unknown",
            model ?? "unknown",
            message,
          );
          setScreen({ kind: "error", content });
          return;
        }
        appendLine({
          kind: "error",
          content: err instanceof Error ? err.message : String(err),
        });
        setScreen({
          kind: "done",
          envelope: envelope ?? ({} as TaskEnvelope),
          status: "failure",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, store, dispatcher],
  );

  const handleDispatcherEvent = useCallback(
    (event: DispatcherEvent) => {
      switch (event.type) {
        case "envelope":
          setEnvelope(event.envelope);
          break;
        case "dispatch_event": {
          const e = event.event;
          if (e.type === "worker_start") {
            appendLine({ kind: "status", content: `worker started (${e.model})` });
          } else if (e.type === "tool_call") {
            appendLine({
              kind: "tool",
              content: `${e.name}(${previewInput(e.input)})`,
            });
          } else if (e.type === "assistant_text") {
            // Append to last text line if present, else start a new one.
            setStreamLines((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.kind === "text") {
                const next = [...prev];
                next[next.length - 1] = { ...last, content: last.content + e.text };
                return next;
              }
              return [...prev, { kind: "text", content: e.text }];
            });
          } else if (e.type === "worker_done") {
            appendLine({
              kind: "status",
              content: `worker done (${e.status})`,
            });
          }
          break;
        }
        case "budget_update":
          setBudget({ ...event.tracker.state });
          break;
        case "escalating":
          appendLine({
            kind: "status",
            content: `escalating: ${event.reason}`,
          });
          setStreamLines((prev) => [
            ...prev,
            { kind: "status", content: "— new envelope at higher tier —" },
          ]);
          break;
        case "done":
          setScreen({
            kind: "done",
            envelope: event.envelope,
            status: event.status,
          });
          break;
        case "preflight_failed":
          // Handled via thrown AuthError in runPrompt; no-op here.
          break;
      }
    },
    [appendLine],
  );

  // Handle error panel actions
  const handleErrorAction = useCallback(
    (action: ErrorAction) => {
      switch (action.type) {
        case "cancel":
          setScreen({ kind: "prompt" });
          break;
        case "auth_login":
        case "auth_refresh":
          setScreen({
            kind: "auth",
            providerId: action.providerId,
            resume: () => runPrompt(promptText),
          });
          break;
        case "downgrade":
          appendLine({ kind: "status", content: "Downgrading to default tier..." });
          setScreen({ kind: "prompt" });
          // User can re-submit; we could also auto-rerun with forced tier here.
          break;
        case "retry":
          runPrompt(promptText);
          break;
        case "open_url":
          try {
            openUrl(action.url);
          } catch {
            // non-fatal
          }
          break;
      }
    },
    [runPrompt, promptText, appendLine],
  );

  // Initial prompt on startup
  useEffect(() => {
    if (initialPrompt) {
      runPrompt(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render -------------------------------------------------------------
  const budgetCap = config.budgets.perSession?.usd;
  const toolCap = config.budgets.perTask?.toolCalls;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="round" borderColor="blue" paddingX={1}>
        <Text bold color="blue">
          router{" "}
        </Text>
        <Text color="gray">· </Text>
        <BudgetMeter budget={budget} capUsd={budgetCap} capToolCalls={toolCap} />
      </Box>

      {/* Screen body */}
      {screen.kind === "prompt" && (
        <Box borderStyle="round" borderColor="gray" paddingX={1}>
          <Text>{">"} </Text>
          <TextInput
            value={promptText}
            onChange={setPromptText}
            onSubmit={(v) => v.trim() && runPrompt(v)}
            placeholder="describe a task and press enter..."
          />
        </Box>
      )}

      {screen.kind === "triaging" && (
        <Box paddingX={1}>
          <Text color="gray">triaging...</Text>
        </Box>
      )}

      {(screen.kind === "running" || screen.kind === "done") && (
        <>
          <TriagePanel envelope={envelope} />
          <WorkerStream
            lines={streamLines}
            active={screen.kind === "running"}
            model={envelope?.triage.model ?? ""}
          />
        </>
      )}

      {screen.kind === "done" && (
        <Box paddingX={1}>
          <Text color={screen.status === "success" ? "green" : "red"}>
            ● {screen.status}
          </Text>
          <Text color="gray"> — press enter for new prompt</Text>
          <TextInput
            value=""
            onChange={() => undefined}
            onSubmit={() => {
              setPromptText("");
              setScreen({ kind: "prompt" });
            }}
          />
        </Box>
      )}

      {screen.kind === "error" && (
        <ErrorPanel content={screen.content} onAction={handleErrorAction} />
      )}

      {screen.kind === "auth" && (
        <AuthFlow
          provider={providers.get(screen.providerId)!}
          onComplete={async (event) => {
            await store.set(screen.providerId, (event as any).credential as Credential);
            cache.invalidate(screen.providerId);
            screen.resume();
          }}
          onCancel={() => setScreen({ kind: "prompt" })}
          onError={(message) => {
            setScreen({
              kind: "error",
              content: {
                title: "Authentication failed",
                body: [message],
                actions: [
                  { key: "r", label: "Retry", action: { type: "retry" } },
                  { key: "esc", label: "Cancel", action: { type: "cancel" } },
                ],
              },
            });
          }}
        />
      )}
    </Box>
  );
}

function previewInput(input: unknown): string {
  const s = JSON.stringify(input);
  if (!s) return "";
  return s.length > 60 ? s.slice(0, 57) + "..." : s;
}

function isAuthLikeError(err: unknown): err is {
  name: string;
  reason: string;
  details?: Record<string, unknown>;
  message: string;
} {
  return (
    !!err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name: string }).name === "AuthError"
  );
}

function extractErrorDetails(err: unknown): {
  providerId?: string;
  model?: string;
  reason: import("../types.js").ProbeFailureReason;
  message: string;
} {
  const e = err as {
    reason?: import("../types.js").ProbeFailureReason;
    details?: { provider?: string; model?: string };
    message?: string;
  };
  return {
    providerId: e.details?.provider,
    model: e.details?.model,
    reason: e.reason ?? "unknown",
    message: e.message ?? "Unknown error",
  };
}

function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
}
