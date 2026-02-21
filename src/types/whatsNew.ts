/**
 * Types for the "What's New" feature
 */

export interface WhatsNewEntry {
  /** PR number */
  id: number;
  /** PR title */
  title: string;
  /** Cleaned PR description (markdown) */
  description: string;
  /** ISO 8601 date when the PR was merged */
  mergedAt: string;
  /** GitHub username of the PR author */
  author: string;
  /** URL to the PR on GitHub */
  url: string;
  /** Labels attached to the PR */
  labels: string[];
}

export interface WhatsNewData {
  /** ISO 8601 timestamp when the file was generated */
  generatedAt: string;
  /** Array of recent merged PR entries */
  entries: WhatsNewEntry[];
}
