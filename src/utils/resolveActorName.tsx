import { ReportActor } from '../graphql/generated';

export function resolveActorName(
  actor: ReportActor | undefined,
  fallbackId?: string | number,
  fallbackName?: string | number
) {
  if (!actor) return fallbackName || fallbackId || 'Unknown';
  return (
    (actor.displayName !== 'nil' ? actor.displayName : undefined) ??
    actor.name ??
    fallbackName ??
    fallbackId ??
    'Unknown'
  );
}
