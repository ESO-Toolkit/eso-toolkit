/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted duration string (e.g., "2m 30s", "45s", "1h 23m")
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formats a timestamp relative to fight start as a duration
 * @param timestamp Absolute timestamp
 * @param fightStartTime Fight start timestamp
 * @returns Formatted duration from fight start
 */
export function formatTimestamp(timestamp: number, fightStartTime: number): string {
  return formatDuration(timestamp - fightStartTime);
}
