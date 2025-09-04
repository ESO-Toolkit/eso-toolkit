import { ReportActor } from '../graphql/generated';
import { DamageEvent } from '../types/combatlogEvents';

export const CHARGED_ATRONACH_GAME_ID = 32829;

/**
 * Identifies all Charged Atronach actors in the report and their owners.
 *
 * @param actorsById - Record mapping actor IDs to actor data from report master data
 * @returns Record mapping charged atronach actor IDs to their owner player IDs
 *
 * @example
 * ```typescript
 * const chargedAtronachOwners = getChargedAtronachOwners(actorsById);
 * // Result: { "89": 123, "156": 456 } where keys are atronach IDs, values are owner player IDs
 * ```
 */
export function getChargedReportActors(
  actorsById: Record<number, ReportActor>,
): Record<number, number> {
  const chargedAtronachs: Record<number, number> = {};

  Object.values(actorsById).forEach((actor) => {
    // Look for actors with gameID 32829 (Charged Atronach)
    if (
      actor.id !== undefined &&
      actor.id !== null &&
      actor?.gameID === CHARGED_ATRONACH_GAME_ID &&
      actor?.type === 'Pet' &&
      actor.petOwner !== undefined &&
      actor.petOwner !== null
    ) {
      chargedAtronachs[actor.id] = actor.petOwner;
    }
  });

  return chargedAtronachs;
}

/**
 * Groups damage events by player ID, creating a record where keys are player IDs
 * and values are arrays of damage events associated with that player.
 * For charged atronach damage, attributes the damage to the player who cast the summoning spell.
 *
 * @param damageEvents - Array of damage events to group
 * @param actorsById - Record mapping actor IDs to actor data (optional, for charged atronach handling)
 * @param castEvents - Array of cast events (optional, for charged atronach attribution)
 * @returns Record mapping player IDs to their associated damage events
 *
 * @example
 * ```typescript
 * const damageEvents = [
 *   { sourceID: 123, targetID: 456, amount: 1000, ... },
 *   { sourceID: 89, targetID: 456, amount: 500, castTrackID: 8513498, ... }, // Charged atronach damage
 * ];
 *
 * const result = getDamageEventsByPlayer(damageEvents, actorsById, castEvents);
 * // Result: {
 * //   "123": [damageEvent1, attributedAtronachEvent],
 * // }
 * ```
 */
export function getDamageEventsByPlayer(
  damageEvents: DamageEvent[],
  actorsById: Record<string | number, ReportActor>,
): Record<string, DamageEvent[]> {
  const damageEventsByPlayer: Record<string, DamageEvent[]> = {};

  // Create lookup for charged atronach IDs if we have actor data
  const chargedAtronachIds = getChargedReportActors(actorsById);

  for (const event of damageEvents) {
    // Only process events that have a valid sourceID
    if (event.sourceID == null) continue;

    let attributedPlayerId = event.sourceID;

    // Check if this damage is from a charged atronach
    if (event.sourceID in chargedAtronachIds) {
      attributedPlayerId = chargedAtronachIds[event.sourceID];
    }

    const playerId = String(attributedPlayerId);

    // Initialize array for this player if it doesn't exist
    if (!damageEventsByPlayer[playerId]) {
      damageEventsByPlayer[playerId] = [];
    }

    // Add the event to this player's array
    damageEventsByPlayer[playerId].push(event);
  }

  return damageEventsByPlayer;
}
