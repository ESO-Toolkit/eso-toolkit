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
  friendlyPlayers
  enemyPlayers
  bossPercentage
  friendlyNPCs {
    gameID
    groupCount
    instanceCount
    id
  }
  enemyNPCs {
    gameID
    id
    groupCount
    instanceCount
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
  displayName
  gameID
  icon
  id
  name
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
${ReportActorFragmentDoc}`;
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
${OptimizedReportActorFragmentDoc}`;