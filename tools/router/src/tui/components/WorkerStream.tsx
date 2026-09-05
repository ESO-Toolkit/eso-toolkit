import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import React from "react";

export interface StreamLine {
  kind: "text" | "tool" | "status" | "error";
  content: string;
}

interface Props {
  lines: StreamLine[];
  active: boolean;
  model: string;
  maxLines?: number;
}

/**
 * Streaming worker output. Keeps the last N lines (default 20) so the panel
 * never grows unbounded. Tool calls are rendered with an arrow marker; plain
 * assistant text is rendered as-is.
 */
export function WorkerStream({
  lines,
  active,
  model,
  maxLines = 20,
}: Props): React.ReactElement {
  const visible = lines.slice(-maxLines);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} flexGrow={1}>
      <Box>
        <Text bold>Worker </Text>
        <Text color="gray">({model})</Text>
        <Text> </Text>
        {active ? (
          <Text color="green">
            <Spinner type="dots" /> live
          </Text>
        ) : (
          <Text color="gray">idle</Text>
        )}
      </Box>
      {visible.length === 0 ? (
        <Text color="gray">  (no output yet)</Text>
      ) : (
        visible.map((line, i) => (
          <Box key={i}>
            <Text color={colorFor(line.kind)}>{prefixFor(line.kind)}</Text>
            <Text wrap="wrap">{line.content}</Text>
          </Box>
        ))
      )}
    </Box>
  );
}

function prefixFor(kind: StreamLine["kind"]): string {
  switch (kind) {
    case "tool":
      return "▸ ";
    case "status":
      return "· ";
    case "error":
      return "✗ ";
    default:
      return "  ";
  }
}

function colorFor(kind: StreamLine["kind"]): string {
  switch (kind) {
    case "tool":
      return "cyan";
    case "status":
      return "gray";
    case "error":
      return "red";
    default:
      return "white";
  }
}
