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
  radiusKm: number;  // Geofence radius in km
  description: string;
  species: string[];
  depth: string;
  type: 'reef' | 'bank' | 'island' | 'canyon' | 'kelp' | 'open';
  color: string;
}

export const FISHING_SPOTS: FishingSpot[] = [
  // ── San Diego Offshore Banks (from contour lines on Baja Directions chart) ──
  {
    id: 'nine-mile-bank',
    name: 'Nine Mile Bank',
    // Contour shows long NW-SE ridge from ~32°38'N to ~32°28'N, centered around 117°25'W
    lat: 32.533, lng: -117.417,
    zoom: 50000, radiusKm: 12,
    description: 'Long underwater ridge ~14mi from Mission Bay. Premier kelp paddy zone. Yellowtail, dorado, and tuna.',
    species: ['Yellowtail', 'Dorado', 'Yellowfin Tuna', 'Bluefin Tuna'],
    depth: '300-600ft',
    type: 'bank',
    color: '#ef4444',
  },
  {
    id: 'coronado-islands',
    name: 'Coronado Islands',
    // Contour wraps around island chain at ~32°25'N, 117°15'W
    lat: 32.417, lng: -117.250,
    zoom: 40000, radiusKm: 6,
    description: 'Mexican islands south of the border. World-class yellowtail fishing on the weather side.',
    species: ['Yellowtail', 'Bonito', 'Barracuda', 'White Seabass'],
    depth: '60-300ft',
    type: 'island',
    color: '#f97316',
  },
  {
    id: 'la-jolla-kelp',
    name: 'La Jolla Kelp Beds',
    // Kelp line visible along coast from 32°52'N to 32°50'N
    lat: 32.855, lng: -117.280,
    zoom: 20000, radiusKm: 2,
    description: 'Thick kelp forests along La Jolla coast. Calico bass, sheephead, and yellowtail along the edges.',
    species: ['Calico Bass', 'Sheephead', 'Yellowtail', 'White Seabass'],
    depth: '30-90ft',
    type: 'kelp',
    color: '#22c55e',
  },
  {
    id: 'point-loma-kelp',
    name: 'Point Loma Kelp',
    // Kelp beds off the west side of Point Loma peninsula
    lat: 32.690, lng: -117.265,
    zoom: 20000, radiusKm: 2.5,
    description: 'Extensive kelp beds off Point Loma. Prime calico bass territory with occasional yellowtail.',
    species: ['Calico Bass', 'Sand Bass', 'Sheephead', 'Lobster'],
    depth: '30-120ft',
    type: 'kelp',
    color: '#22c55e',
  },
  // ── Channel Islands ──
  {
    id: 'catalina-island',
    name: 'Catalina Island',
    // Contour shows broad shelf, especially east end
    lat: 33.387, lng: -118.416,
    zoom: 80000, radiusKm: 15,
    description: 'Iconic SoCal island. Yellowtail at the east end, calico bass all around, white seabass in spring.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass', 'Barracuda'],
    depth: '30-400ft',
    type: 'island',
    color: '#f97316',
  },
  {
    id: 'san-clemente-island',
    name: 'San Clemente Island',
    // Contour shows large shelf, especially China Point area (south end)
    lat: 32.900, lng: -118.490,
    zoom: 80000, radiusKm: 15,
    description: 'Navy-controlled island with incredible fishing. Yellowtail schools on the lee side.',
    species: ['Yellowtail', 'Bluefin Tuna', 'White Seabass', 'Calico Bass'],
    depth: '60-600ft',
    type: 'island',
    color: '#f97316',
  },
  {
    id: 'tanner-bank',
    name: 'Tanner Bank',
    // Tight contour circle at ~32°42'N, 119°08'W
    lat: 32.700, lng: -119.133,
    zoom: 60000, radiusKm: 8,
    description: 'Deep offshore seamount ~60mi out. Giant bluefin tuna, yellowtail.',
    species: ['Bluefin Tuna', 'Yellowfin Tuna', 'Yellowtail'],
    depth: '600-3000ft',
    type: 'bank',
    color: '#ef4444',
  },
  {
    id: 'cortes-bank',
    name: 'Cortes Bank',
    // Separate seamount at ~32°28'N, 119°08'W, tight contour
    lat: 32.467, lng: -119.133,
    zoom: 60000, radiusKm: 6,
    description: 'Remote seamount that nearly breaks the surface. Huge yellowtail and tuna.',
    species: ['Bluefin Tuna', 'Yellowfin Tuna', 'Yellowtail'],
    depth: '50-3000ft',
    type: 'bank',
    color: '#ef4444',
  },
  {
    id: 'sixty-mile-bank',
    name: 'Sixty Mile Bank',
    // Contour at ~31°58'N, 118°06'W
    lat: 31.967, lng: -118.100,
    zoom: 60000, radiusKm: 8,
    description: 'Deep offshore bank ~60mi south. Excellent tuna grounds.',
    species: ['Yellowfin Tuna', 'Bluefin Tuna', 'Dorado'],
    depth: '300-1500ft',
    type: 'bank',
    color: '#ef4444',
  },
  // ── Baja ──
  {
    id: 'ensenada-corridor',
    name: 'Ensenada Corridor',
    lat: 31.830, lng: -116.800,
    zoom: 60000, radiusKm: 10,
    description: 'Rich waters off Ensenada. Yellowtail and bonito near the coast, tuna further out.',
    species: ['Yellowtail', 'Bonito', 'Dorado', 'Yellowfin Tuna'],
    depth: '100-500ft',
    type: 'open',
    color: '#38bdf8',
  },
  {
    id: 'san-quintin',
    name: 'San Quintin',
    lat: 30.560, lng: -116.000,
    zoom: 60000, radiusKm: 10,
    description: 'Remote Baja fishing. Albacore and yellowfin tuna, plus lingcod near shore.',
    species: ['Albacore', 'Yellowfin Tuna', 'Lingcod', 'Yellowtail'],
    depth: '200-1000ft',
    type: 'open',
    color: '#38bdf8',
  },
  {
    id: 'isla-guadalupe',
    name: 'Isla Guadalupe',
    lat: 29.050, lng: -118.278,
    zoom: 100000, radiusKm: 15,
    description: 'Remote volcanic island ~150mi offshore. Famous for great white shark diving.',
    species: ['Yellowfin Tuna', 'Wahoo', 'Dorado'],
    depth: '600-3000ft',
    type: 'island',
    color: '#a855f7',
  },
  {
    id: 'isla-cedros',
    name: 'Isla Cedros',
    lat: 28.115, lng: -115.175,
    zoom: 80000, radiusKm: 12,
    description: 'Baja island with rich upwelling. Yellowtail, calico bass, and white seabass.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass'],
    depth: '60-400ft',
    type: 'island',
    color: '#a855f7',
  },
  // ── Offshore banks / numbered spots (from chart contours) ──
  {
    id: '209-spot',
    name: '209 / 277 Spot',
    // Contour shows this in the outer Santa Barbara passage
    lat: 33.083, lng: -118.167,
    zoom: 50000, radiusKm: 6,
    description: 'Traditional offshore numbers in the outer passage. Kelp paddies concentrate bait and gamefish.',
    species: ['Yellowfin Tuna', 'Dorado', 'Yellowtail'],
    depth: '400-800ft',
    type: 'open',
    color: '#eab308',
  },
  {
    id: 'hidden-bank',
    name: 'Hidden Bank',
    // Chart shows this at ~31°52'N, 117°26'W
    lat: 31.867, lng: -117.433,
    zoom: 50000, radiusKm: 5,
    description: 'Subsurface structure that holds bait. Good kelp paddy zone for yellowtail and dorado.',
    species: ['Yellowtail', 'Dorado', 'Skipjack'],
    depth: '500-900ft',
    type: 'bank',
    color: '#eab308',
  },
  {
    id: '43-fathom-spot',
    name: '43 Fathom Spot',
    // Chart shows at ~32°41'N, 117°56'W — between SCI and Nine Mile
    lat: 32.683, lng: -117.933,
    zoom: 40000, radiusKm: 4,
    description: 'Shallow underwater pinnacle between San Clemente and Nine Mile Bank.',
    species: ['Yellowtail', 'White Seabass', 'Calico Bass'],
    depth: '258ft (43 fathoms)',
    type: 'reef',
    color: '#eab308',
  },
];

export function getSpotById(id: string): FishingSpot | undefined {
  return FISHING_SPOTS.find(s => s.id === id);
}
