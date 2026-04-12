/**
 * Baja Directions GPS Waypoints
 *
 * Comprehensive fishing waypoints extracted from Baja Directions charts:
 * - San Diego Offshore Banks
 * - San Diego Bay
 * - Channel Islands
 * - LA/Orange County Offshore Banks
 *
 * Source: Baja Directions, Inc. (www.bajadirections.com)
 * Reference Datum: WGS84
 */

export interface Waypoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  chart: 'sd-offshore' | 'sd-bay' | 'channel-islands' | 'la-offshore';
  type: 'bank' | 'reef' | 'canyon' | 'knoll' | 'spot' | 'island' | 'kelp' | 'wreck' | 'structure';
  depth?: string;
}

// ── San Diego Offshore Banks ───────────────────────────────────────────
// From the GPS COORDINATES table in the top-right of the SD Offshore Banks chart
const SD_OFFSHORE: Waypoint[] = [
  // Left column of GPS table
  { id: 1, name: '289', lat: 32 + 56/60, lng: -(118 + 5.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 2, name: 'San Clemente Island', lat: 32 + 54/60, lng: -(117 + 53/60), chart: 'sd-offshore', type: 'island' },
  { id: 3, name: '181 / China Point', lat: 32 + 49/60, lng: -(118 + 21/60), chart: 'sd-offshore', type: 'spot' },
  { id: 4, name: 'Pyramid Head', lat: 32 + 47.75/60, lng: -(118 + 25.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 5, name: '43 Fathom Spot', lat: 32 + 41/60, lng: -(117 + 56.25/60), chart: 'sd-offshore', type: 'spot' },
  { id: 6, name: '182 / Upper 9 Mile Bank', lat: 32 + 39/60, lng: -(117 + 26.50/60), chart: 'sd-offshore', type: 'bank' },
  { id: 7, name: '9 Mile Bank', lat: 32 + 32/60, lng: -(117 + 21/60), chart: 'sd-offshore', type: 'bank' },
  { id: 8, name: 'Lower 9 Mile Bank', lat: 32 + 29.50/60, lng: -(117 + 36/60), chart: 'sd-offshore', type: 'bank' },
  { id: 9, name: '226', lat: 32 + 28.50/60, lng: -(117 + 35/60), chart: 'sd-offshore', type: 'spot' },
  { id: 10, name: '430', lat: 32 + 25/60, lng: -(117 + 7.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 11, name: '302 / Kidney Bank', lat: 32 + 22.50/60, lng: -(117 + 28/60), chart: 'sd-offshore', type: 'bank' },
  { id: 12, name: '230', lat: 32 + 22/60, lng: -(117 + 17.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 13, name: 'Islas Los Coronados', lat: 32 + 25/60, lng: -(117 + 15/60), chart: 'sd-offshore', type: 'island' },
  { id: 14, name: '267 / Santa Tomas Knoll', lat: 32 + 17.50/60, lng: -(117 + 10.50/60), chart: 'sd-offshore', type: 'knoll' },
  { id: 15, name: 'East Butterfly (267)', lat: 32 + 10/60, lng: -(117 + 54/60), chart: 'sd-offshore', type: 'spot' },
  { id: 16, name: 'West Butterfly (162)', lat: 32 + 17/60, lng: -(118 + 33.30/60), chart: 'sd-offshore', type: 'spot' },
  { id: 17, name: 'San Salvador Knoll', lat: 32 + 7/60, lng: -(117 + 51.50/60), chart: 'sd-offshore', type: 'knoll' },
  { id: 18, name: '371', lat: 32 + 15/60, lng: -(117 + 15/60), chart: 'sd-offshore', type: 'spot' },
  { id: 19, name: '425', lat: 32 + 7/60, lng: -(117 + 37.38/60), chart: 'sd-offshore', type: 'spot' },
  { id: 20, name: '101 / The Rockpile', lat: 32 + 4/60, lng: -(117 + 48.92/60), chart: 'sd-offshore', type: 'reef' },
  { id: 21, name: 'Cortes Bank', lat: 32 + 28/60, lng: -(119 + 7.50/60), chart: 'sd-offshore', type: 'bank' },
  { id: 22, name: 'Tanner Bank', lat: 32 + 42/60, lng: -(119 + 7.50/60), chart: 'sd-offshore', type: 'bank' },
  { id: 23, name: '157', lat: 32 + 22/60, lng: -(118 + 28/60), chart: 'sd-offshore', type: 'spot' },
  { id: 24, name: 'The Mushrooms (169)', lat: 32 + 0/60, lng: -(118 + 6.50/60), chart: 'sd-offshore', type: 'structure' },
  { id: 25, name: 'Sixty Mile Bank (53)', lat: 31 + 58/60, lng: -(118 + 6/60), chart: 'sd-offshore', type: 'bank' },
  { id: 26, name: '390', lat: 31 + 56/60, lng: -(117 + 33.30/60), chart: 'sd-offshore', type: 'spot' },
  { id: 27, name: '450', lat: 31 + 50/60, lng: -(118 + 12/60), chart: 'sd-offshore', type: 'spot' },
  { id: 28, name: '378', lat: 31 + 50/60, lng: -(117 + 45/60), chart: 'sd-offshore', type: 'spot' },
  { id: 29, name: 'Hidden Bank', lat: 31 + 52/60, lng: -(117 + 26/60), chart: 'sd-offshore', type: 'bank' },
  { id: 30, name: 'The Airplane', lat: 31 + 48/60, lng: -(117 + 48.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 31, name: '213', lat: 31 + 45/60, lng: -(117 + 50/60), chart: 'sd-offshore', type: 'spot' },

  // Right column of GPS table
  { id: 32, name: '131', lat: 32 + 4/60, lng: -(118 + 14.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 33, name: 'La Jolla', lat: 32 + 54/60, lng: -(117 + 3/60), chart: 'sd-offshore', type: 'kelp' },
  { id: 34, name: 'Mission Bay', lat: 32 + 49/60, lng: -(117 + 21/60), chart: 'sd-offshore', type: 'spot' },
  { id: 35, name: 'San Diego Bay', lat: 32 + 42/60, lng: -(117 + 8/60), chart: 'sd-offshore', type: 'spot' },
  { id: 36, name: 'Imperial Beach', lat: 32 + 34/60, lng: -(117 + 7.50/60), chart: 'sd-offshore', type: 'spot' },
  { id: 37, name: 'Tijuana', lat: 32 + 32/60, lng: -(117 + 1/60), chart: 'sd-offshore', type: 'spot' },
  { id: 38, name: '1010 Trench', lat: 31 + 38/60, lng: -(117 + 39/60), chart: 'sd-offshore', type: 'canyon' },
  { id: 39, name: 'Upper 500', lat: 31 + 39/60, lng: -(117 + 15/60), chart: 'sd-offshore', type: 'bank' },
  { id: 40, name: '1067', lat: 31 + 34/60, lng: -(117 + 52/60), chart: 'sd-offshore', type: 'spot' },
  { id: 41, name: 'Knuckle', lat: 31 + 35/60, lng: -(117 + 35/60), chart: 'sd-offshore', type: 'spot' },
  { id: 42, name: '483/500', lat: 31 + 28/60, lng: -(117 + 53/60), chart: 'sd-offshore', type: 'spot' },
  { id: 43, name: 'Double 220', lat: 31 + 30/60, lng: -(117 + 28/60), chart: 'sd-offshore', type: 'spot' },
  { id: 44, name: 'Dumping Grounds', lat: 31 + 40/60, lng: -(118 + 20/60), chart: 'sd-offshore', type: 'spot' },
  { id: 45, name: 'Banda Bank', lat: 31 + 47/60, lng: -(116 + 55/60), chart: 'sd-offshore', type: 'bank' },
  { id: 46, name: 'Banda Canyon', lat: 31 + 47/60, lng: -(116 + 52/60), chart: 'sd-offshore', type: 'canyon' },
  { id: 47, name: 'Lower 500', lat: 31 + 44/60, lng: -(116 + 52/60), chart: 'sd-offshore', type: 'bank' },
  { id: 48, name: 'Upper Finger Bank', lat: 31 + 55/60, lng: -(117 + 5/60), chart: 'sd-offshore', type: 'bank' },
  { id: 49, name: 'Todos Santos', lat: 31 + 48/60, lng: -(116 + 47/60), chart: 'sd-offshore', type: 'island' },
  { id: 50, name: 'Ensenada', lat: 31 + 52/60, lng: -(116 + 38/60), chart: 'sd-offshore', type: 'spot' },
  { id: 51, name: 'Punta Descanso', lat: 32 + 10/60, lng: -(117 + 2/60), chart: 'sd-offshore', type: 'spot' },
  { id: 52, name: 'El Rosarito', lat: 32 + 21/60, lng: -(117 + 4/60), chart: 'sd-offshore', type: 'spot' },
];

// ── LA/Orange County Offshore Banks ────────────────────────────────────
const LA_OFFSHORE: Waypoint[] = [
  { id: 101, name: 'The Boot/Shoe', lat: 33 + 41/60, lng: -(118 + 34.50/60), chart: 'la-offshore', type: 'structure' },
  { id: 102, name: '270', lat: 33 + 36/60, lng: -(118 + 29/60), chart: 'la-offshore', type: 'spot' },
  { id: 103, name: 'Redondo Canyon', lat: 33 + 49/60, lng: -(118 + 27/60), chart: 'la-offshore', type: 'canyon' },
  { id: 104, name: 'Dume Canyon', lat: 34 + 0/60, lng: -(118 + 51/60), chart: 'la-offshore', type: 'canyon' },
  { id: 105, name: '175 / Kidney Bank', lat: 33 + 32/60, lng: -(118 + 55/60), chart: 'la-offshore', type: 'bank' },
  { id: 106, name: '286', lat: 33 + 34/60, lng: -(118 + 44.30/60), chart: 'la-offshore', type: 'spot' },
  { id: 107, name: '172 / Santa Barbara Island', lat: 33 + 29/60, lng: -(118 + 42.50/60), chart: 'la-offshore', type: 'island' },
  { id: 108, name: '125', lat: 33 + 27/60, lng: -(118 + 38/60), chart: 'la-offshore', type: 'spot' },
  { id: 109, name: 'Osborn Bank', lat: 33 + 23/60, lng: -(118 + 52/60), chart: 'la-offshore', type: 'bank' },
  { id: 110, name: 'Farnsworth Bank', lat: 33 + 21/60, lng: -(118 + 35/60), chart: 'la-offshore', type: 'bank' },
  { id: 111, name: '199 / The Snail (267)', lat: 33 + 17.50/60, lng: -(118 + 42.50/60), chart: 'la-offshore', type: 'spot' },
  { id: 112, name: 'Avalon Bank', lat: 33 + 25/60, lng: -(118 + 21/60), chart: 'la-offshore', type: 'bank' },
  { id: 113, name: '14 Mile Bank', lat: 33 + 23/60, lng: -(118 + 13/60), chart: 'la-offshore', type: 'bank' },
  { id: 114, name: 'The Slide', lat: 33 + 17/60, lng: -(118 + 10/60), chart: 'la-offshore', type: 'structure' },
  { id: 115, name: '277', lat: 33 + 13/60, lng: -(118 + 15/60), chart: 'la-offshore', type: 'spot' },
  { id: 116, name: '209', lat: 33 + 5/60, lng: -(118 + 10/60), chart: 'la-offshore', type: 'spot' },
  { id: 117, name: '474', lat: 33 + 9/60, lng: -(118 + 50/60), chart: 'la-offshore', type: 'spot' },
  { id: 118, name: '711', lat: 33 + 7/60, lng: -(118 + 55/60), chart: 'la-offshore', type: 'spot' },
  { id: 119, name: '9 Fathom Spot', lat: 33 + 2/60, lng: -(118 + 40/60), chart: 'la-offshore', type: 'spot' },
  { id: 120, name: 'Mackerel Bank', lat: 33 + 2/60, lng: -(118 + 25/60), chart: 'la-offshore', type: 'bank' },
  { id: 121, name: '279', lat: 33 + 15/60, lng: -(118 + 0/60), chart: 'la-offshore', type: 'spot' },
  { id: 122, name: 'Dana Point', lat: 33 + 27/60, lng: -(117 + 43/60), chart: 'la-offshore', type: 'spot' },
  { id: 123, name: 'San Pedro', lat: 33 + 43/60, lng: -(118 + 18/60), chart: 'la-offshore', type: 'spot' },
  { id: 124, name: 'Rancho Palos Verdes', lat: 33 + 44.50/60, lng: -(118 + 24/60), chart: 'la-offshore', type: 'spot' },
  { id: 125, name: 'SCI Pyramid Head', lat: 32 + 52/60, lng: -(118 + 32/60), chart: 'la-offshore', type: 'spot' },
  { id: 126, name: 'SCI China Point', lat: 32 + 49/60, lng: -(118 + 36/60), chart: 'la-offshore', type: 'spot' },
  { id: 127, name: '289', lat: 32 + 55/60, lng: -(118 + 6/60), chart: 'la-offshore', type: 'spot' },
  { id: 128, name: '182', lat: 32 + 38/60, lng: -(117 + 52/60), chart: 'la-offshore', type: 'spot' },
  { id: 129, name: '43 Fathom Spot', lat: 32 + 41/60, lng: -(117 + 56/60), chart: 'la-offshore', type: 'spot' },
  { id: 130, name: 'Malibu', lat: 34 + 2/60, lng: -(118 + 41/60), chart: 'la-offshore', type: 'spot' },
];

// ── Channel Islands ────────────────────────────────────────────────────
const CHANNEL_ISLANDS: Waypoint[] = [
  { id: 201, name: 'Pt Conception', lat: 34 + 26.50/60, lng: -(120 + 25.70/60), chart: 'channel-islands', type: 'spot' },
  { id: 202, name: 'Boathouse Kelp', lat: 34 + 26.50/60, lng: -(120 + 25.70/60), chart: 'channel-islands', type: 'kelp' },
  { id: 203, name: 'Naples Reef', lat: 34 + 25/60, lng: -(119 + 57/60), chart: 'channel-islands', type: 'reef' },
  { id: 204, name: 'Ellwood Kelp', lat: 34 + 25/60, lng: -(119 + 54/60), chart: 'channel-islands', type: 'kelp' },
  { id: 205, name: 'Santa Barbara', lat: 34 + 24/60, lng: -(119 + 42/60), chart: 'channel-islands', type: 'spot' },
  { id: 206, name: 'Summerland', lat: 34 + 24.50/60, lng: -(119 + 35/60), chart: 'channel-islands', type: 'spot' },
  { id: 207, name: 'Ventura', lat: 34 + 16.50/60, lng: -(119 + 18/60), chart: 'channel-islands', type: 'spot' },
  { id: 208, name: 'Ventura Flats', lat: 34 + 13/60, lng: -(119 + 21/60), chart: 'channel-islands', type: 'spot' },
  { id: 209, name: '12 Mile Reef', lat: 34 + 10/60, lng: -(119 + 25/60), chart: 'channel-islands', type: 'reef' },
  { id: 210, name: 'Anacapa Island', lat: 34 + 1/60, lng: -(119 + 22/60), chart: 'channel-islands', type: 'island' },
  { id: 211, name: 'San Miguel Island', lat: 34 + 2/60, lng: -(120 + 22/60), chart: 'channel-islands', type: 'island' },
  { id: 212, name: 'Santa Rosa Island', lat: 33 + 57/60, lng: -(120 + 6/60), chart: 'channel-islands', type: 'island' },
  { id: 213, name: 'Santa Cruz Island', lat: 34 + 1/60, lng: -(119 + 45/60), chart: 'channel-islands', type: 'island' },
  { id: 214, name: 'Painted Cave', lat: 34 + 4/60, lng: -(119 + 51/60), chart: 'channel-islands', type: 'spot' },
  { id: 215, name: 'Scorpion Anchorage', lat: 34 + 3/60, lng: -(119 + 33/60), chart: 'channel-islands', type: 'spot' },
  { id: 216, name: 'Chinese Harbor', lat: 34 + 0/60, lng: -(119 + 44/60), chart: 'channel-islands', type: 'spot' },
  { id: 217, name: 'Gull Island', lat: 34 + 1/60, lng: -(119 + 49.74/60), chart: 'channel-islands', type: 'island' },
  { id: 218, name: 'Frasier Point', lat: 34 + 3/60, lng: -(119 + 55/60), chart: 'channel-islands', type: 'spot' },
  { id: 219, name: 'Carrington Point', lat: 34 + 3/60, lng: -(120 + 7/60), chart: 'channel-islands', type: 'spot' },
  { id: 220, name: 'Wilson Rock', lat: 34 + 7/60, lng: -(120 + 22/60), chart: 'channel-islands', type: 'reef' },
  { id: 221, name: 'Richardson Rock', lat: 34 + 10/60, lng: -(120 + 27/60), chart: 'channel-islands', type: 'reef' },
  { id: 222, name: 'Talcott Shoal', lat: 34 + 2/60, lng: -(120 + 12/60), chart: 'channel-islands', type: 'reef' },
  { id: 223, name: 'Santa Cruz Canyon', lat: 33 + 50/60, lng: -(119 + 45/60), chart: 'channel-islands', type: 'canyon' },
  { id: 224, name: 'Hueneme Canyon', lat: 34 + 5/60, lng: -(119 + 14/60), chart: 'channel-islands', type: 'canyon' },
  { id: 225, name: 'Hidden Reef', lat: 33 + 45/60, lng: -(118 + 55/60), chart: 'channel-islands', type: 'reef' },
];

// ── All waypoints combined ─────────────────────────────────────────────
export const ALL_WAYPOINTS: Waypoint[] = [
  ...SD_OFFSHORE,
  ...LA_OFFSHORE,
  ...CHANNEL_ISLANDS,
];

export function getWaypointsByChart(chart: Waypoint['chart']): Waypoint[] {
  return ALL_WAYPOINTS.filter(w => w.chart === chart);
}

export function getWaypointsNear(lat: number, lng: number, radiusKm: number = 5): Waypoint[] {
  return ALL_WAYPOINTS.filter(w => {
    const R = 6371;
    const dLat = ((w.lat - lat) * Math.PI) / 180;
    const dLng = ((w.lng - lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) * Math.cos((w.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= radiusKm;
  });
}

export function getWaypointCount(): { total: number; sdOffshore: number; laOffshore: number; channelIslands: number } {
  return {
    total: ALL_WAYPOINTS.length,
    sdOffshore: SD_OFFSHORE.length,
    laOffshore: LA_OFFSHORE.length,
    channelIslands: CHANNEL_ISLANDS.length,
  };
}
