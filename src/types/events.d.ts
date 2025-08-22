export interface Event {
  type?: string;
  _type?: string;
  eventType?: string;
  abilityGameID?: string | number;
  ability?:
    | {
        gameID?: string | number;
        id?: string | number;
        [key: string]: unknown;
      }
    | string
    | number;
  abilityId?: string | number;
  buffId?: string | number;
  id?: string | number;
  timestamp: number;
  [key: string]: unknown;
}

export type Events = Event[];
