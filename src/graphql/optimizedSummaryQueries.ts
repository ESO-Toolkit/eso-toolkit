import { gql } from '@apollo/client';

/**
 * OPTIMIZATION 2: Batch Event Fetching
 *
 * This GraphQL query fetches multiple event types in a single request
 * to reduce the total number of API calls for report summary data.
 *
 * Instead of 3 separate queries per fight (damage, death, healing),
 * this makes 1 query that gets all event types needed for summary analysis.
 */
export const GET_BATCH_EVENTS_FOR_SUMMARY = gql`
  query getBatchEventsForSummary(
    $code: String!
    $startTime: Float
    $endTime: Float
    $fightIds: [Int]!
    $hostilityType: HostilityType = Friendlies
    $damageLimit: Int = 500000
    $deathLimit: Int = 10000
    $healingLimit: Int = 100000
  ) {
    reportData {
      report(code: $code) {
        # Damage events
        damageEvents: events(
          startTime: $startTime
          endTime: $endTime
          fightIDs: $fightIds
          dataType: DamageDone
          useActorIDs: true
          includeResources: true
          hostilityType: $hostilityType
          limit: $damageLimit
        ) {
          data
          nextPageTimestamp
        }

        # Death events
        deathEvents: events(
          startTime: $startTime
          endTime: $endTime
          fightIDs: $fightIds
          dataType: Deaths
          useActorIDs: true
          includeResources: true
          hostilityType: $hostilityType
          limit: $deathLimit
        ) {
          data
          nextPageTimestamp
        }

        # Healing events
        healingEvents: events(
          startTime: $startTime
          endTime: $endTime
          fightIDs: $fightIds
          dataType: Healing
          useActorIDs: true
          includeResources: true
          hostilityType: $hostilityType
          limit: $healingLimit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

/**
 * OPTIMIZATION 3: All Events Query
 *
 * This query uses the "All" dataType to fetch all event types in a single request.
 * This is the most efficient approach but returns more data that needs to be filtered.
 */
export const GET_ALL_EVENTS_FOR_SUMMARY = gql`
  query getAllEventsForSummary(
    $code: String!
    $startTime: Float
    $endTime: Float
    $fightIds: [Int]
    $limit: Int = 1000000
  ) {
    reportData {
      report(code: $code) {
        events(
          startTime: $startTime
          endTime: $endTime
          fightIDs: $fightIds
          dataType: All
          useActorIDs: true
          includeResources: true
          limit: $limit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

/**
 * Time-based query without fightIds requirement - for debugging
 */
export const GET_ALL_EVENTS_TIME_BASED = gql`
  query getAllEventsTimeBased(
    $code: String!
    $startTime: Float
    $endTime: Float
    $limit: Int = 1000000
  ) {
    reportData {
      report(code: $code) {
        events(
          startTime: $startTime
          endTime: $endTime
          dataType: All
          useActorIDs: true
          includeResources: true
          limit: $limit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

/**
 * OPTIMIZATION 4: Multi-Fight Batch Query
 *
 * This query fetches data for multiple fights in a single request by
 * not specifying fightIds, then filtering client-side. This reduces
 * the total number of queries from N fights × 3 event types to just 3 queries.
 */
export const GET_REPORT_DAMAGE_EVENTS = gql`
  query getReportDamageEvents(
    $code: String!
    $startTime: Float
    $endTime: Float
    $hostilityType: HostilityType = Friendlies
    $limit: Int = 1000000
  ) {
    reportData {
      report(code: $code) {
        events(
          startTime: $startTime
          endTime: $endTime
          dataType: DamageDone
          useActorIDs: true
          includeResources: true
          hostilityType: $hostilityType
          limit: $limit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

export const GET_REPORT_DEATH_EVENTS = gql`
  query getReportDeathEvents(
    $code: String!
    $startTime: Float
    $endTime: Float
    $hostilityType: HostilityType
    $limit: Int = 50000
  ) {
    reportData {
      report(code: $code) {
        events(
          startTime: $startTime
          endTime: $endTime
          dataType: Deaths
          useActorIDs: true
          includeResources: true
          hostilityType: $hostilityType
          limit: $limit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

export const GET_REPORT_HEALING_EVENTS = gql`
  query getReportHealingEvents(
    $code: String!
    $startTime: Float
    $endTime: Float
    $hostilityType: HostilityType = Friendlies
    $limit: Int = 200000
  ) {
    reportData {
      report(code: $code) {
        events(
          startTime: $startTime
          endTime: $endTime
          dataType: Healing
          useActorIDs: true
          includeResources: true
          hostilityType: $hostilityType
          limit: $limit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;
