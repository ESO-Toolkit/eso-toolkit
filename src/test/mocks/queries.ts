import { gql } from '@apollo/client';

// Mock GraphQL queries for OAuth functionality
export const EXCHANGE_OAUTH_TOKEN = gql`
  mutation ExchangeOAuthToken($code: String!, $state: String!) {
    exchangeToken(code: $code, state: $state) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        name
        email
        avatar
      }
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    user {
      id
      name
      email
      avatar
    }
  }
`;

// Mock queries for ESO Logs functionality
export const GET_REPORT_DATA = gql`
  query GetReportData($code: String!) {
    reportData(code: $code) {
      report {
        code
        title
        owner {
          name
        }
        fights {
          id
          name
          startTime
          endTime
          encounterID
          difficulty
          kill
        }
      }
    }
  }
`;

export const GET_FIGHT_DETAILS = gql`
  query GetFightDetails($startTime: Float!, $endTime: Float!) {
    reportData {
      report {
        events(startTime: $startTime, endTime: $endTime) {
          data {
            timestamp
            type
            sourceID
            targetID
            abilityGameID
            amount
          }
        }
      }
    }
  }
`;
