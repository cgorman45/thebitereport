/**
 * Popular fishing spots for the SoCal/Baja coverage area.
 * Used for clickable overlays on the 3D map.
 */

export interface FishingSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;      // Camera altitude in meters for close-up view
  description: string;
  species: string[];
  depth: string;
  type: 'reef' | 'bank' | 'island' | 'canyon' | 'kelp' | 'open';
  color: string;
}

export const FISHING_SPOTS: FishingSpot[] = [
  // San Diego / Point Loma area
  {
    id: 'nine-mile-bank',
    name: 'Nine Mile Bank',
    lat: 32.52, lng: -117.38,
    zoom: 50000,
    description: 'Premier offshore kelp paddy zone. Yellowtail, dorado, and tuna congregate around floating kelp.',
    species: ['Yellowtail', 'Dorado', 'Yellowfin Tuna', 'Bluefin Tuna'],
    depth: '300-600ft',
    type: 'bank',
    color: '#ef4444',
  },
  {
    id: 'coronado-islands',
    name: 'Coronado Islands',
    lat: 32.42, lng: -117.25,
    zoom: 40000,
    description: 'Mexican islands just south of the border. World-class yellowtail fishing on the weather side.',
    species: ['Yellowtail', 'Bonito', 'Barracuda', 'White Seabass'],
    depth: '60-300ft',
    type: 'island',
    color: '#f97316',
  },
  {
    id: 'la-jolla-kelp',
    name: 'La Jolla Kelp Beds',
    lat: 32.87, lng: -117.30,
    zoom: 30000,
    description: 'Thick kelp forests close to shore. Calico bass, sheephead, and yellowtail along the edges.',
    species: ['Calico Bass', 'Sheephead', 'Yellowtail', 'White Seabass'],
    depth: '30-90ft',
    type: 'kelp',
    color: '#22c55e',
  },
  {
    id: 'point-loma-kelp',
    name: 'Point Loma Kelp',
    lat: 32.70, lng: -117.26,
    zoom: 30000,
    description: 'Extensive kelp beds off Point Loma. Prime calico bass territory with occasional yellowtail.',
    species: ['Calico Bass', 'Sand Bass', 'Sheephead', 'Lobster'],
    depth: '30-120ft',
    type: 'kelp',
    color: '#22c55e',
  },
  // Channel Islands
  {
    id: 'catalina-island',
    name: 'Catalina Island',
    lat: 33.38, lng: -118.42,
    zoom: 80000,
    description: 'Iconic SoCal island. Yellowtail at the east end, calico bass all around, white seabass in spring.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass', 'Barracuda'],
    depth: '30-400ft',
    type: 'island',
    color: '#f97316',
  },
  {
    id: 'san-clemente-island',
    name: 'San Clemente Island',
    lat: 32.90, lng: -118.50,
    zoom: 80000,
    description: 'Navy-controlled island with incredible fishing. Yellowtail schools on the lee side.',
    species: ['Yellowtail', 'Bluefin Tuna', 'White Seabass', 'Calico Bass'],
    depth: '60-600ft',
    type: 'island',
    color: '#f97316',
  },
  {
    id: 'tanner-bank',
    name: 'Tanner/Cortes Bank',
    lat: 32.47, lng: -119.17,
    zoom: 80000,
    description: 'Deep offshore seamount. Giant bluefin tuna, yellowtail, and sometimes marlin.',
    species: ['Bluefin Tuna', 'Yellowfin Tuna', 'Yellowtail'],
    depth: '600-3000ft',
    type: 'bank',
    color: '#ef4444',
  },
  // Baja
  {
    id: 'ensenada-corridor',
    name: 'Ensenada Corridor',
    lat: 31.85, lng: -117.00,
    zoom: 60000,
    description: 'Rich waters off Ensenada. Yellowtail and bonito near the coast, tuna further out.',
    species: ['Yellowtail', 'Bonito', 'Dorado', 'Yellowfin Tuna'],
    depth: '100-500ft',
    type: 'open',
    color: '#38bdf8',
  },
  {
    id: 'san-quintin',
    name: 'San Quintin',
    lat: 30.48, lng: -115.95,
    zoom: 60000,
    description: 'Remote Baja fishing. Albacore and yellowfin tuna, plus lingcod near shore.',
    species: ['Albacore', 'Yellowfin Tuna', 'Lingcod', 'Yellowtail'],
    depth: '200-1000ft',
    type: 'open',
    color: '#38bdf8',
  },
  {
    id: 'isla-guadalupe',
    name: 'Isla Guadalupe',
    lat: 29.03, lng: -118.27,
    zoom: 100000,
    description: 'Remote volcanic island. Famous for great white shark diving. Yellowfin tuna and wahoo.',
    species: ['Yellowfin Tuna', 'Wahoo', 'Dorado'],
    depth: '600-3000ft',
    type: 'island',
    color: '#a855f7',
  },
  {
    id: 'isla-cedros',
    name: 'Isla Cedros',
    lat: 28.17, lng: -115.20,
    zoom: 80000,
    description: 'Baja island with rich upwelling. Yellowtail, calico bass, and white seabass.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass'],
    depth: '60-400ft',
    type: 'island',
    color: '#a855f7',
  },
  // Offshore banks
  {
    id: '209-spot',
    name: '209 / 277 Spot',
    lat: 32.60, lng: -117.50,
    zoom: 50000,
    description: 'Traditional offshore numbers. Kelp paddies concentrate bait and gamefish.',
    species: ['Yellowfin Tuna', 'Dorado', 'Yellowtail'],
    depth: '400-800ft',
    type: 'open',
    color: '#eab308',
  },
  {
    id: 'hidden-bank',
    name: 'Hidden Bank',
    lat: 32.30, lng: -117.70,
    zoom: 50000,
    description: 'Subsurface structure that holds bait. Good kelp paddy zone for yellowtail and dorado.',
    species: ['Yellowtail', 'Dorado', 'Skipjack'],
    depth: '500-900ft',
    type: 'bank',
    color: '#eab308',
  },
];

export function getSpotById(id: string): FishingSpot | undefined {
  return FISHING_SPOTS.find(s => s.id === id);
}
