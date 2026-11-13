import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";
import type { AuthEvent, Provider } from "../../types.js";

interface Props {
  provider: Provider;
  onComplete: (credential: AuthEvent & { type: "success" }) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

type FlowState =
  | { kind: "idle" }
  | { kind: "instruction"; message: string }
  | { kind: "prompt_secret"; label: string; mask: boolean; value: string }
  | {
      kind: "device_code";
      userCode: string;
      verificationUri: string;
      verificationUriComplete?: string;
      expiresAt: number;
    }
  | { kind: "polling"; message: string }
  | { kind: "done" };

/**
 * Renders a provider's login() event stream. This component is strategy-
 * agnostic: API-key paste flows and OAuth device flows both produce the same
 * AuthEvent stream, so the UI adapts automatically to whichever the provider
 * happens to emit.
 */
export function AuthFlow({ provider, onComplete, onCancel, onError }: Props): React.ReactElement {
  const [state, setState] = useState<FlowState>({ kind: "idle" });
  const [secretResolver, setSecretResolver] = useState<
    ((value: string) => void) | null
  >(null);
  const [abortController] = useState(() => new AbortController());

  useInput((_input, key) => {
    if (key.escape) {
      abortController.abort();
      onCancel();
    }
  });

  useEffect(() => {
    const ctx = {
      requestInput: (opts: { label: string; mask: boolean }) =>
        new Promise<string>((resolve) => {
          setState({
            kind: "prompt_secret",
            label: opts.label,
            mask: opts.mask,
            value: "",
          });
          setSecretResolver(() => resolve);
        }),
      signal: abortController.signal,
    };

    (async () => {
      try {
        for await (const event of provider.login(ctx)) {
          if (abortController.signal.aborted) return;
          switch (event.type) {
            case "instruction":
              setState({ kind: "instruction", message: event.message });
              break;
            case "device_code":
              setState({
                kind: "device_code",
                userCode: event.userCode,
                verificationUri: event.verificationUri,
                verificationUriComplete: event.verificationUriComplete,
                expiresAt: event.expiresAt,
              });
              break;
            case "polling":
              setState({
                kind: "polling",
                message: `Waiting for approval (polling every ${Math.round(
                  event.waitMs / 1000,
                )}s)...`,
              });
              break;
            case "success":
              setState({ kind: "done" });
              onComplete(event);
              return;
            case "error":
              onError(event.message);
              return;
          }
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        Authenticating with {provider.displayName}
      </Text>
      <Box marginY={1}>
        <FlowBody
          state={state}
          onSecretSubmit={(value) => {
            if (secretResolver) {
              secretResolver(value);
              setSecretResolver(null);
            }
          }}
          onSecretChange={(value) => {
            setState((prev) =>
              prev.kind === "prompt_secret" ? { ...prev, value } : prev,
            );
          }}
        />
      </Box>
      <Text color="gray">[esc] cancel</Text>
    </Box>
  );
}

function FlowBody({
  state,
  onSecretSubmit,
  onSecretChange,
}: {
  state: FlowState;
  onSecretSubmit: (value: string) => void;
  onSecretChange: (value: string) => void;
}): React.ReactElement {
  switch (state.kind) {
    case "idle":
      return (
        <Text color="gray">
          <Spinner type="dots" /> Starting...
        </Text>
      );
    case "instruction":
      return <Text wrap="wrap">{state.message}</Text>;
    case "prompt_secret":
      return (
        <Box flexDirection="column">
          <Text>{state.label}:</Text>
          <TextInput
            value={state.value}
            onChange={onSecretChange}
            onSubmit={onSecretSubmit}
            mask={state.mask ? "*" : undefined}
          />
        </Box>
      );
    case "device_code": {
      const remaining = Math.max(0, state.expiresAt - Date.now());
      const mins = Math.floor(remaining / 60_000);
      const secs = Math.floor((remaining % 60_000) / 1000);
      return (
        <Box flexDirection="column">
          <Text>1. Open in your browser:</Text>
          <Text color="cyan">   {state.verificationUri}</Text>
          <Box marginTop={1}>
            <Text>2. Enter this code: </Text>
            <Text bold color="yellow">
              {state.userCode}
            </Text>
          </Box>
          {state.verificationUriComplete && (
            <Text color="gray">
              Or open direct: {state.verificationUriComplete}
            </Text>
          )}
          <Box marginTop={1}>
            <Text color="gray">
              <Spinner type="dots" /> Waiting for approval... (expires in{" "}
              {mins}:{String(secs).padStart(2, "0")})
            </Text>
          </Box>
        </Box>
      );
    }
    case "polling":
      return (
        <Text color="gray">
          <Spinner type="dots" /> {state.message}
        </Text>
      );
    case "done":
      return <Text color="green">✓ Authenticated successfully.</Text>;
  }
}
