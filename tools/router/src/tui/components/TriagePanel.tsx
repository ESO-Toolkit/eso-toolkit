import { Box, Text } from "ink";
import React from "react";
import type { TaskEnvelope } from "../../types.js";

interface Props {
  envelope: TaskEnvelope | null;
}

/**
 * Shows the current triage verdict: complexity, confidence, chosen tier,
 * and a one-line rationale. Updates in place when escalation mints a new
 * envelope.
 */
export function TriagePanel({ envelope }: Props): React.ReactElement {
  if (!envelope) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">Triage: waiting for prompt…</Text>
      </Box>
    );
  }

  const { triage } = envelope;
  const tierColor =
    triage.tier === "fast" ? "green" : triage.tier === "deep" ? "magenta" : "cyan";

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Box>
        <Text bold>Triage </Text>
        <Text color="gray">({triage.source})</Text>
      </Box>
      <Box>
        <Text>  complexity: </Text>
        <Text bold>{triage.complexity}</Text>
        <Text>   confidence: </Text>
        <Text>{triage.confidence.toFixed(2)}</Text>
      </Box>
      <Box>
        <Text>  tier:       </Text>
        <Text color={tierColor} bold>
          {triage.tier}
        </Text>
        <Text>   model: </Text>
        <Text>{triage.model}</Text>
      </Box>
      <Box>
        <Text>  provider:   </Text>
        <Text>{triage.provider}</Text>
      </Box>
      {envelope.escalation && (
        <Box>
          <Text color="yellow">
            ⚠ escalated from {envelope.escalation.fromTier} ({envelope.escalation.reason})
          </Text>
        </Box>
      )}
      <Box>
        <Text color="gray" wrap="wrap">
          {triage.rationale}
        </Text>
      </Box>
    </Box>
  );
}
