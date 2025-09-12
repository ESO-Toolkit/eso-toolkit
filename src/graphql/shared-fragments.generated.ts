/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
export const FightFragmentDoc = gql`
  fragment Fight on ReportFight {
    id
    name
    difficulty
    startTime
    endTime
    kill
    encounterID
    originalEncounterID
    lastPhase
    lastPhaseAsAbsoluteIndex
    lastPhaseIsIntermission
    friendlyPlayers
    enemyPlayers
    bossPercentage
    boundingBox {
      minX
      maxX
      minY
      maxY
    }
    friendlyNPCs {
      gameID
      groupCount
      instanceCount
      petOwner
      id
    }
    enemyNPCs {
      gameID
      id
      groupCount
      instanceCount
    }
    maps {
      file
      id
      name
    }
    phaseTransitions {
      id
      startTime
    }
    gameZone {
      id
      name
    }
    dungeonPulls {
      id
      name
      x
      y
      startTime
      endTime
      encounterID
      kill
      boundingBox {
        minX
        maxX
        minY
        maxY
      }
      maps {
        file
        id
        name
      }
    }
  }
`;
export const ReportInfoFragmentDoc = gql`
  fragment ReportInfo on Report {
    code
    title
    startTime
    endTime
    zone {
      id
      name
      frozen
      expansion {
        id
        name
      }
      encounters {
        id
        name
      }
      difficulties {
        id
        name
        sizes
      }
    }
  }
`;
export const CharacterFragmentDoc = gql`
  fragment Character on Character {
    id
    name
    displayName
    classID
  }
`;
export const EventFragmentDoc = gql`
  fragment Event on ReportEventPaginator {
    data
    nextPageTimestamp
  }
`;
export const ReportAbilityFragmentDoc = gql`
  fragment ReportAbility on ReportAbility {
    gameID
    icon
    name
    type
  }
`;
export const ReportActorFragmentDoc = gql`
  fragment ReportActor on ReportActor {
    anonymous
    displayName
    gameID
    icon
    id
    name
    petOwner
    server
    subType
    type
  }
`;
export const MasterDataFragmentDoc = gql`
  fragment MasterData on ReportMasterData {
    abilities {
      ...ReportAbility
    }
    actors {
      ...ReportActor
    }
  }
  ${ReportAbilityFragmentDoc}
  ${ReportActorFragmentDoc}
`;
export const OptimizedReportActorFragmentDoc = gql`
  fragment OptimizedReportActor on ReportActor {
    displayName
    gameID
    id
    name
    server
    subType
    type
  }
`;
export const OptimizedMasterDataFragmentDoc = gql`
  fragment OptimizedMasterData on ReportMasterData {
    abilities {
      ...ReportAbility
    }
    actors(type: "Player") {
      ...OptimizedReportActor
    }
  }
  ${ReportAbilityFragmentDoc}
  ${OptimizedReportActorFragmentDoc}
`;
