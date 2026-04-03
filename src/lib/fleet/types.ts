export type Landing = 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens';

export type BoatStatus =
  | 'catching_fish'
  | 'circling'
  | 'transit'
  | 'drifting'
  | 'in_port'
  | 'unknown';

export interface FleetBoat {
  name: string;
  mmsi: number;
  landing: Landing;
  vesselType?: string;
}

export interface PositionEntry {
  lat: number;
  lng: number;
  speed: number;    // knots (SOG)
  heading: number;  // degrees (COG or TrueHeading)
  timestamp: number; // Unix ms
}

export interface TrackedBoat {
  mmsi: number;
  name: string;
  landing: Landing | 'unknown';
  vesselType?: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  lastUpdate: number; // Unix ms
  status: BoatStatus;
  statusLabel: string;
  statusDetail: string;
  history: PositionEntry[];
}

export interface AISMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      UserID: number;
      Latitude: number;
      Longitude: number;
      Sog: number;
      Cog: number;
      TrueHeading: number;
      Timestamp: number;
    };
  };
}
