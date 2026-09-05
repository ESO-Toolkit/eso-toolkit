import { Box, Text, useInput } from "ink";
import React from "react";
import type {
  ErrorAction,
  ErrorPanelContent,
} from "../../auth/preflight-error.js";

interface Props {
  content: ErrorPanelContent;
  onAction: (action: ErrorAction) => void;
}

/**
 * Full-width error panel with keyboard-driven action list. Every error has
 * at least one forward action, so the user never gets stuck.
 */
export function ErrorPanel({ content, onAction }: Props): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) {
      const cancel = content.actions.find((a) => a.action.type === "cancel");
      if (cancel) onAction(cancel.action);
      return;
    }
    const match = content.actions.find((a) => a.key.toLowerCase() === input.toLowerCase());
    if (match) onAction(match.action);
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="red" paddingX={1}>
      <Text bold color="red">
        {content.title}
      </Text>
      <Box flexDirection="column" marginY={1}>
        {content.body.map((line, i) => (
          <Text key={i} wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column">
        {content.actions.map((a) => (
          <Text key={a.key}>
            <Text color="cyan">[{a.key}]</Text> <Text>{a.label}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}
