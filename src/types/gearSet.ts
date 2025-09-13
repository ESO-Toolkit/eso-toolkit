export interface GearSetData {
  /** Name of the gear set */
  name: string;
  /** Icon filename (without .png extension) for the gear set */
  icon: string;
  /** Type/category of the gear set (Overland, Dungeon, Arena, Mythic, etc.) */
  setType: string;
  /** Array of set bonuses in string format */
  bonuses: string[];
}