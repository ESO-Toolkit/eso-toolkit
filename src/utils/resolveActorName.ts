import { ReportActor, ReportActorFragment } from '../graphql/generated';

export function resolveActorName(
  actor: ReportActor | ReportActorFragment | undefined,
  fallbackId?: string | number | null,
  fallbackName?: string | null,
): string {
  if (!actor) return fallbackName || String(fallbackId) || 'Unknown';
  return (
    (actor.displayName !== 'nil' ? actor.displayName : undefined) ??
    actor.name ??
    fallbackName ??
    String(fallbackId) ??
    'Unknown'
  );
}
