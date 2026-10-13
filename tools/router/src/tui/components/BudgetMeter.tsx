import { Box, Text } from "ink";
import React from "react";
import type { BudgetState } from "../../types.js";

interface Props {
  budget: BudgetState;
  capUsd?: number;
  capToolCalls?: number;
}

/**
 * Compact single-line budget meter for the header bar. Displays running
 * totals and warning colors as caps are approached.
 */
export function BudgetMeter({ budget, capUsd, capToolCalls }: Props): React.ReactElement {
  const usdColor = capUsd && budget.usd > capUsd * 0.8 ? "yellow" : "gray";
  const toolColor =
    capToolCalls && budget.toolCalls > capToolCalls * 0.8 ? "yellow" : "gray";
  const totalTokens = budget.inputTokens + budget.outputTokens;

  return (
    <Box>
      <Text color={usdColor}>
        ${budget.usd.toFixed(4)}
        {capUsd ? ` / $${capUsd.toFixed(2)}` : ""}
      </Text>
      <Text color="gray"> · </Text>
      <Text color={toolColor}>
        {budget.toolCalls}
        {capToolCalls ? `/${capToolCalls}` : ""} tool calls
      </Text>
      <Text color="gray"> · </Text>
      <Text color="gray">{formatTokens(totalTokens)} tokens</Text>
      {budget.escalations > 0 && (
        <>
          <Text color="gray"> · </Text>
          <Text color="yellow">↑{budget.escalations} escalations</Text>
        </>
      )}
    </Box>
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
