// ---------------------------------------------------------------------------
// Trip types — all shared interfaces live here so both schedule.ts and
// chatbot.ts can import from a single source of truth, and consuming
// components only need one import path.
// ---------------------------------------------------------------------------

export type TripLanding = 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens' | 'private_charter';

export type CharterType = 'party_boat' | 'private_charter';

export type TripDuration =
  | '1/2 Day AM'
  | '1/2 Day PM'
  | '3/4 Day'
  | 'Full Day'
  | 'Overnight'
  | '1.5 Day'
  | '2 Day'
  | '3 Day'
  | 'Long Range';

export interface ScheduledTrip {
  id: string;
  boatName: string;
  landing: TripLanding;
  departureDate: string;   // ISO date — '2026-04-03'
  departureTime: string;   // human-readable — '6:00 AM'
  duration: TripDuration;
  durationHours: number;   // numeric for filtering / sorting
  pricePerPerson: number;
  maxAnglers: number;
  spotsLeft: number;
  description: string;
  targetSpecies: string[];
  mmsi?: number;           // links to the fleet tracker
  bookingUrl?: string;     // direct deep-link to book this specific trip
  charterType?: CharterType; // 'party_boat' (default) or 'private_charter'
  operator?: string;       // for private charters: operator name
  maxPassengers?: number;  // for private charters: boat capacity (e.g. 6)
  privateBoatRate?: number; // for private charters: flat rate for the whole boat
}

export interface TripFilters {
  date?: string;        // ISO date string
  duration?: string;    // matches TripDuration or a loose keyword
  anglers?: number;     // minimum spots required
  species?: string;     // keyword — matched against targetSpecies
}

// ---------------------------------------------------------------------------
// Chatbot types
// ---------------------------------------------------------------------------

export type ConversationStep =
  | 'greeting'
  | 'ask_date'
  | 'ask_duration'
  | 'ask_anglers'
  | 'ask_species'
  | 'recommend'
  | 'followup';

export interface ChatMessage {
  role: 'bot' | 'user';
  content: string;
  timestamp: number;
  tripResults?: ScheduledTrip[]; // bot can attach matched trips
}

export interface ConversationState {
  step: ConversationStep;
  date: string | null;        // ISO date
  duration: string | null;    // TripDuration keyword
  anglers: number | null;
  species: string | null;
  messages: ChatMessage[];
}
