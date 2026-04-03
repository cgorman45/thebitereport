import type { FleetBoat } from './types';

export const FLEET_ROSTER: FleetBoat[] = [
  // Seaforth Landing
  { name: 'New Seaforth', mmsi: 367703230, landing: 'seaforth', vesselType: '1/2 Day' },
  { name: 'Apollo', mmsi: 367478120, landing: 'seaforth', vesselType: '3/4 Day' },
  { name: 'Aztec', mmsi: 338409157, landing: 'seaforth', vesselType: '3/4 Day' },
  { name: 'Cortez', mmsi: 367547700, landing: 'seaforth', vesselType: 'Full Day' },
  { name: 'Highliner', mmsi: 367004700, landing: 'seaforth', vesselType: 'Full Day' },
  { name: 'Legacy', mmsi: 367739800, landing: 'seaforth', vesselType: 'Overnight' },
  { name: 'San Diego', mmsi: 366918840, landing: 'seaforth', vesselType: 'Full Day' },
  { name: 'Sea Watch', mmsi: 367710460, landing: 'seaforth', vesselType: 'Full Day' },
  { name: 'El Gato Dos', mmsi: 367523170, landing: 'seaforth', vesselType: '1/2 Day' },

  // Fisherman's Landing
  { name: 'Polaris Supreme', mmsi: 367469470, landing: 'fishermans', vesselType: 'Multi-Day' },
  { name: 'Dolphin', mmsi: 367453390, landing: 'fishermans', vesselType: '3/4 Day' },
  { name: 'Liberty', mmsi: 367678200, landing: 'fishermans', vesselType: 'Full Day' },
  { name: 'Fortune', mmsi: 367672130, landing: 'fishermans', vesselType: 'Full Day' },
  { name: 'Islander', mmsi: 338312000, landing: 'fishermans', vesselType: 'Multi-Day' },
  { name: 'Pacific Queen', mmsi: 367438790, landing: 'fishermans', vesselType: 'Overnight' },
  { name: 'Excel', mmsi: 367469480, landing: 'fishermans', vesselType: 'Multi-Day' },
  { name: 'Constitution', mmsi: 367516650, landing: 'fishermans', vesselType: 'Full Day' },
  { name: 'Pegasus', mmsi: 367612350, landing: 'fishermans', vesselType: '3/4 Day' },

  // H&M Landing (Point Loma)
  { name: 'Mission Belle', mmsi: 367438800, landing: 'hm_landing', vesselType: 'Full Day' },
  { name: 'Patriot', mmsi: 367516700, landing: 'hm_landing', vesselType: '3/4 Day' },
  { name: 'Daily Double', mmsi: 367547800, landing: 'hm_landing', vesselType: '1/2 Day' },
  { name: 'Shogun', mmsi: 367469500, landing: 'hm_landing', vesselType: 'Multi-Day' },
  { name: 'Spirit of Adventure', mmsi: 367703300, landing: 'hm_landing', vesselType: 'Full Day' },

  // Point Loma Sportfishing
  { name: 'Point Loma', mmsi: 367710500, landing: 'point_loma', vesselType: 'Full Day' },
  { name: 'New Lo-An', mmsi: 367523200, landing: 'point_loma', vesselType: '3/4 Day' },
  { name: 'Chubasco II', mmsi: 367478200, landing: 'point_loma', vesselType: '1/2 Day' },
  { name: 'Premier', mmsi: 367612400, landing: 'point_loma', vesselType: 'Multi-Day' },

  // Helgren's Sportfishing (Oceanside)
  { name: 'Helgren\'s Oceanside 95', mmsi: 367672200, landing: 'helgrens', vesselType: 'Full Day' },
  { name: 'Sea Star', mmsi: 367739900, landing: 'helgrens', vesselType: '1/2 Day' },
  { name: 'Oceanside 95', mmsi: 367004800, landing: 'helgrens', vesselType: 'Overnight' },
];

// Set of known MMSIs for O(1) lookup
export const KNOWN_MMSIS = new Set(FLEET_ROSTER.map(b => b.mmsi));

// Lookup boat by MMSI
export function getFleetBoat(mmsi: number): FleetBoat | undefined {
  return FLEET_ROSTER.find(b => b.mmsi === mmsi);
}

// Port locations for "in port" detection
export const PORTS = {
  seaforth: { lat: 32.7137, lng: -117.2275 },
  fishermans: { lat: 32.7131, lng: -117.2315 },
  hm_landing: { lat: 32.7145, lng: -117.2250 },
  point_loma: { lat: 32.7200, lng: -117.2230 },
  helgrens: { lat: 33.1595, lng: -117.3795 },
} as const;
