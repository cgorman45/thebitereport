/**
 * Popular fishing spots for the SoCal/Baja coverage area.
 * Used for clickable overlays on the 3D map.
 */

export interface FishingSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;       // Camera altitude in meters for close-up view
  radiusKm: number;   // Fallback radius if no polygon
  description: string;
  species: string[];
  depth: string;
  type: 'reef' | 'bank' | 'island' | 'canyon' | 'kelp' | 'open';
  color: string;
  /** Custom geofence polygon following bathymetric contours [lng, lat][] */
  polygon?: [number, number][];
}

export const FISHING_SPOTS: FishingSpot[] = [
  // ── San Diego Offshore Banks (from contour lines on Baja Directions chart) ──
  {
    id: 'nine-mile-bank',
    name: 'Nine Mile Bank',
    lat: 32.533, lng: -117.417,
    zoom: 50000, radiusKm: 12,
    description: 'Long underwater ridge ~14mi from Mission Bay. Premier kelp paddy zone. Yellowtail, dorado, and tuna.',
    species: ['Yellowtail', 'Dorado', 'Yellowfin Tuna', 'Bluefin Tuna'],
    depth: '300-600ft',
    type: 'bank',
    color: '#ef4444',
    // NW-SE elongated ridge, ~10 miles long, narrow
    polygon: [
      [-117.50, 32.650], [-117.47, 32.660], [-117.42, 32.650],
      [-117.38, 32.620], [-117.35, 32.580], [-117.33, 32.540],
      [-117.32, 32.500], [-117.33, 32.470], [-117.35, 32.450],
      [-117.38, 32.440], [-117.41, 32.450], [-117.44, 32.470],
      [-117.46, 32.500], [-117.48, 32.540], [-117.50, 32.580],
      [-117.51, 32.620], [-117.50, 32.650],
    ],
  },
  {
    id: 'coronado-islands',
    name: 'Coronado Islands',
    lat: 32.417, lng: -117.250,
    zoom: 40000, radiusKm: 6,
    description: 'Mexican islands south of the border. World-class yellowtail fishing on the weather side.',
    species: ['Yellowtail', 'Bonito', 'Barracuda', 'White Seabass'],
    depth: '60-300ft',
    type: 'island',
    color: '#f97316',
    // Chain of 4 islands running N-S, contour wraps around all
    polygon: [
      [-117.29, 32.460], [-117.26, 32.455], [-117.24, 32.445],
      [-117.23, 32.430], [-117.22, 32.410], [-117.22, 32.390],
      [-117.23, 32.375], [-117.25, 32.370], [-117.27, 32.375],
      [-117.28, 32.390], [-117.29, 32.410], [-117.30, 32.430],
      [-117.30, 32.450], [-117.29, 32.460],
    ],
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
    lat: 33.387, lng: -118.416,
    zoom: 80000, radiusKm: 15,
    description: 'Iconic SoCal island. Yellowtail at the east end, calico bass all around, white seabass in spring.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass', 'Barracuda'],
    depth: '30-400ft',
    type: 'island',
    color: '#f97316',
    // Elongated NW-SE island with broader shelf on east end
    polygon: [
      [-118.60, 33.480], [-118.55, 33.490], [-118.48, 33.480],
      [-118.40, 33.460], [-118.33, 33.430], [-118.28, 33.400],
      [-118.25, 33.370], [-118.27, 33.340], [-118.30, 33.320],
      [-118.35, 33.310], [-118.40, 33.320], [-118.46, 33.340],
      [-118.52, 33.370], [-118.56, 33.400], [-118.59, 33.430],
      [-118.60, 33.460], [-118.60, 33.480],
    ],
  },
  {
    id: 'san-clemente-island',
    name: 'San Clemente Island',
    lat: 32.900, lng: -118.490,
    zoom: 80000, radiusKm: 15,
    description: 'Navy-controlled island with incredible fishing. Yellowtail schools on the lee side.',
    species: ['Yellowtail', 'Bluefin Tuna', 'White Seabass', 'Calico Bass'],
    depth: '60-600ft',
    type: 'island',
    color: '#f97316',
    // Long N-S island, wider shelf on east (lee) side
    polygon: [
      [-118.56, 33.020], [-118.52, 33.030], [-118.48, 33.010],
      [-118.44, 32.970], [-118.42, 32.920], [-118.41, 32.870],
      [-118.42, 32.820], [-118.44, 32.800], [-118.47, 32.790],
      [-118.50, 32.800], [-118.53, 32.820], [-118.55, 32.860],
      [-118.56, 32.910], [-118.57, 32.960], [-118.56, 33.020],
    ],
  },
  {
    id: 'tanner-bank',
    name: 'Tanner Bank',
    lat: 32.700, lng: -119.133,
    zoom: 60000, radiusKm: 8,
    description: 'Deep offshore seamount ~60mi out. Giant bluefin tuna, yellowtail.',
    species: ['Bluefin Tuna', 'Yellowfin Tuna', 'Yellowtail'],
    depth: '600-3000ft',
    type: 'bank',
    color: '#ef4444',
    // Irregular oval, slightly elongated E-W
    polygon: [
      [-119.20, 32.740], [-119.15, 32.750], [-119.08, 32.740],
      [-119.04, 32.720], [-119.03, 32.700], [-119.04, 32.680],
      [-119.08, 32.660], [-119.15, 32.660], [-119.20, 32.670],
      [-119.23, 32.690], [-119.23, 32.720], [-119.20, 32.740],
    ],
  },
  {
    id: 'cortes-bank',
    name: 'Cortes Bank',
    lat: 32.467, lng: -119.133,
    zoom: 60000, radiusKm: 6,
    description: 'Remote seamount that nearly breaks the surface. Huge yellowtail and tuna.',
    species: ['Bluefin Tuna', 'Yellowfin Tuna', 'Yellowtail'],
    depth: '50-3000ft',
    type: 'bank',
    color: '#ef4444',
    // Small tight contour — nearly circular but irregular
    polygon: [
      [-119.18, 32.500], [-119.13, 32.510], [-119.08, 32.500],
      [-119.06, 32.480], [-119.07, 32.450], [-119.10, 32.440],
      [-119.15, 32.440], [-119.18, 32.460], [-119.19, 32.480],
      [-119.18, 32.500],
    ],
  },
  {
    id: 'sixty-mile-bank',
    name: 'Sixty Mile Bank',
    lat: 31.967, lng: -118.100,
    zoom: 60000, radiusKm: 8,
    description: 'Deep offshore bank ~60mi south. Excellent tuna grounds.',
    species: ['Yellowfin Tuna', 'Bluefin Tuna', 'Dorado'],
    depth: '300-1500ft',
    type: 'bank',
    color: '#ef4444',
    // Oval shape, slightly elongated NE-SW per chart
    polygon: [
      [-118.15, 32.010], [-118.08, 32.000], [-118.04, 31.980],
      [-118.03, 31.960], [-118.04, 31.940], [-118.08, 31.920],
      [-118.14, 31.920], [-118.18, 31.940], [-118.20, 31.960],
      [-118.19, 31.990], [-118.15, 32.010],
    ],
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
    id: 'west-butterfly',
    name: 'West Butterfly (162)',
    // Chart: south of SCI, ~32°17'N, 118°28'W
    lat: 32.280, lng: -118.470,
    zoom: 45000, radiusKm: 8,
    description: 'Western butterfly bank south of San Clemente Island. Deep structure holding yellowtail and tuna.',
    species: ['Yellowtail', 'Yellowfin Tuna', 'Dorado'],
    depth: '400-1200ft',
    type: 'bank',
    color: '#22c55e',
    // Butterfly-wing contour — south of SCI
    polygon: [
      [-118.53, 32.320], [-118.49, 32.330], [-118.45, 32.320],
      [-118.42, 32.305], [-118.40, 32.285], [-118.39, 32.265],
      [-118.40, 32.245], [-118.42, 32.230], [-118.46, 32.225],
      [-118.50, 32.230], [-118.53, 32.245], [-118.55, 32.265],
      [-118.55, 32.290], [-118.53, 32.320],
    ],
  },
  {
    id: 'east-butterfly',
    name: 'East Butterfly (267)',
    // Exact: 32°18'23.9"N 118°04'04.7"W
    lat: 32.306639, lng: -118.067972,
    zoom: 45000, radiusKm: 10,
    description: 'Eastern butterfly bank. Larger structure near Blake Knolls and San Salvador Knoll.',
    species: ['Yellowfin Tuna', 'Yellowtail', 'Dorado', 'Wahoo'],
    depth: '300-1000ft',
    type: 'bank',
    color: '#22c55e',
    // Wider butterfly-wing contour — near San Salvador Knoll
    polygon: [
      [-118.08, 32.300], [-118.03, 32.310], [-117.97, 32.300],
      [-117.93, 32.280], [-117.90, 32.260], [-117.89, 32.235],
      [-117.90, 32.210], [-117.93, 32.190], [-117.97, 32.180],
      [-118.02, 32.180], [-118.06, 32.190], [-118.09, 32.210],
      [-118.10, 32.240], [-118.10, 32.270], [-118.08, 32.300],
    ],
  },
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
    lat: 31.867, lng: -117.433,
    zoom: 50000, radiusKm: 5,
    description: 'Subsurface structure that holds bait. Good kelp paddy zone for yellowtail and dorado.',
    species: ['Yellowtail', 'Dorado', 'Skipjack'],
    depth: '500-900ft',
    type: 'bank',
    color: '#eab308',
    // Small bump visible on chart contour
    polygon: [
      [-117.48, 31.900], [-117.43, 31.910], [-117.39, 31.895],
      [-117.37, 31.870], [-117.38, 31.845], [-117.42, 31.835],
      [-117.46, 31.845], [-117.48, 31.870], [-117.48, 31.900],
    ],
  },
  {
    id: '43-fathom-spot',
    name: '43 Fathom Spot',
    lat: 32.683, lng: -117.933,
    zoom: 40000, radiusKm: 4,
    description: 'Shallow underwater pinnacle between San Clemente and Nine Mile Bank.',
    species: ['Yellowtail', 'White Seabass', 'Calico Bass'],
    depth: '258ft (43 fathoms)',
    type: 'reef',
    color: '#eab308',
    // Small pinnacle — tight contour
    polygon: [
      [-117.97, 32.710], [-117.93, 32.715], [-117.90, 32.700],
      [-117.89, 32.680], [-117.90, 32.660], [-117.94, 32.655],
      [-117.97, 32.665], [-117.98, 32.685], [-117.97, 32.710],
    ],
  },
];

export function getSpotById(id: string): FishingSpot | undefined {
  return FISHING_SPOTS.find(s => s.id === id);
}
