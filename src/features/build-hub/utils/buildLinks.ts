interface HubBuildViewUrlOptions {
  baseUrl: string;
  buildId: string;
  embed?: boolean;
  origin: string;
}

export function getHubBuildViewUrl({
  baseUrl,
  buildId,
  embed = false,
  origin,
}: HubBuildViewUrlOptions): string {
  const query = `id=${encodeURIComponent(buildId)}${embed ? '&embed=1' : ''}`;
  return `${origin}${baseUrl}bv?${query}`;
}
