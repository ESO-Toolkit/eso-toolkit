/**
 * Player information types and interfaces
 * Handles player-related data structures across the application
 */

import { PlayerGear, PlayerTalent } from './playerDetails';

/**
 * Base interface for player information
 * Consolidates similar player info types from across the application
 */
export interface BasePlayerInfo {
  id: string | number;
  name: string;
  displayName: string;
  combatantInfo: {
    talents?: PlayerTalent[];
    gear?: PlayerGear[];
  };
}

/**
 * Extended player info with additional properties
 * Used for cases where extra dynamic properties are needed
 */
export interface ExtendedPlayerInfo extends BasePlayerInfo {
  [key: string]: string | number | boolean | null | undefined | object;
}
