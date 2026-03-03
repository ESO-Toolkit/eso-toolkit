import { ManualBugReport } from '../config/errorTrackingConfig';

import { Logger, LogLevel } from './logger';

// Create a logger instance
const logger = new Logger({
  level: LogLevel.INFO,
  contextPrefix: 'JiraReport',
});

// Jira credentials — supplied via VITE_ env vars at build time.
// The base64 auth string is "email:apiToken" encoded in base64.
const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL as string | undefined;
const JIRA_BASIC_AUTH = import.meta.env.VITE_JIRA_BASIC_AUTH as string | undefined;
const JIRA_PROJECT_KEY = (import.meta.env.VITE_JIRA_PROJECT_KEY as string | undefined) ?? 'ESO';

// Jira priority names mapped from our severity scale
const severityToPriority = (severity: ManualBugReport['severity']): string => {
  switch (severity) {
    case 'critical':
      return 'Highest';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    default:
      return 'Low';
  }
};

// Build an Atlassian Document Format (ADF) description body
const buildAdfDescription = (report: ManualBugReport): Record<string, unknown> => {
  const content: Record<string, unknown>[] = [];

  // Main description paragraph
  content.push({
    type: 'paragraph',
    content: [{ type: 'text', text: report.description }],
  });

  // Steps to reproduce (if any non-empty step exists)
  const nonEmptySteps = (report.steps ?? []).filter((s) => s.trim().length > 0);
  if (nonEmptySteps.length > 0) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Steps to Reproduce:', marks: [{ type: 'strong' }] }],
    });
    content.push({
      type: 'orderedList',
      content: nonEmptySteps.map((step) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: step }] }],
      })),
    });
  }

  // Expected behavior
  if (report.expectedBehavior?.trim()) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Expected Behavior: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: report.expectedBehavior },
      ],
    });
  }

  // Actual behavior
  if (report.actualBehavior?.trim()) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Actual Behavior: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: report.actualBehavior },
      ],
    });
  }

  // Context details
  content.push({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Context:', marks: [{ type: 'strong' }] }],
  });
  content.push({
    type: 'bulletList',
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: `URL: ${report.url ?? window.location.href}` },
            ],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `Category: ${report.category}` }],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `Severity: ${report.severity}` }],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `User Agent: ${report.userAgent ?? navigator.userAgent}`,
              },
            ],
          },
        ],
      },
    ],
  });

  return { version: 1, type: 'doc', content };
};

/**
 * Creates a Jira bug report ticket via the Atlassian REST API.
 *
 * Returns the created issue key (e.g. "ESO-123") on success, or null if Jira
 * is not configured or the request fails gracefully.
 *
 * Requires the following VITE_ env vars:
 *   VITE_JIRA_BASE_URL       — e.g. https://yourorg.atlassian.net
 *   VITE_JIRA_BASIC_AUTH     — base64("email:apiToken")
 *   VITE_JIRA_PROJECT_KEY    — defaults to "ESO"
 */
export const createJiraTicket = async (report: ManualBugReport): Promise<{ key: string } | null> => {
  if (!JIRA_BASE_URL || !JIRA_BASIC_AUTH) {
    logger.info('Jira integration not configured — skipping ticket creation');
    return null;
  }

  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: `[User Bug Report] ${report.title}`,
      description: buildAdfDescription(report),
      issuetype: { name: 'Bug' },
      priority: { name: severityToPriority(report.severity) },
      labels: ['user-reported', report.category],
    },
  };

  try {
    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${JIRA_BASIC_AUTH}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Failed to create Jira ticket', { status: response.status, error: errorText });
      return null;
    }

    const data = (await response.json()) as { key: string; id: string };
    logger.info('Jira ticket created', { key: data.key });
    return { key: data.key };
  } catch (error) {
    if (error instanceof Error) {
      logger.warn('Error creating Jira ticket', error);
    }
    return null;
  }
};
