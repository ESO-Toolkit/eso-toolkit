/**
 * Verifies that a preview readiness message came from the expected iframe.
 * Both checks are required because an origin alone does not identify a sender.
 */
export const isTrustedBuildPreviewReadyMessage = (
  event: MessageEvent,
  expectedOrigin: string,
  expectedSource: MessageEventSource | null,
): boolean => {
  if (
    expectedSource === null ||
    event.origin !== expectedOrigin ||
    event.source !== expectedSource
  ) {
    return false;
  }

  const { data } = event;
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    'type' in data &&
    data.type === 'build-preview-ready'
  );
};
