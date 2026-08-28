import type { SupportTicketPayload } from './support-draft';

export function supportDraftFixture(): SupportTicketPayload {
  return {
    version: 1,
    issueId: 'install-update',
    description: 'The update failed for @everyone in C:\\Users\\Alice\\Documents.',
    appVersion: '2.0.0',
    platform: 'windows',
    generatedAt: '2026-08-28T12:00:00.000Z',
    connection: 'online',
    updateState: 'complete',
    instanceLabel: 'Live',
    diagnostics: {
      addons: 8,
      libraries: 3,
      disabled: 1,
      checked: 8,
      updates: 1,
      dependencyWarnings: 1,
      modified: 0,
      lastError: 'Authorization: secret-token from /home/alice/AddOns',
      attention: [
        {
          name: '<@123456789012345678>',
          folder: 'ExampleAddon',
          currentVersion: '1.0.0',
          availableVersion: '1.1.0',
          missingDependencies: 0,
          outdatedDependencies: 1,
          modifiedFiles: 0,
        },
      ],
    },
  };
}
