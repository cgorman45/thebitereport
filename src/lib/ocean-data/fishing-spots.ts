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
  type: 'reef' | 'bank' | 'island' | 'canyon' | 'kelp' | 'open' | 'knoll';
  color: string;
  /** Custom geofence polygon following bathymetric contours [lng, lat][] */
  polygon?: [number, number][];
}

export const FISHING_SPOTS: FishingSpot[] = [
  // ── San Diego Offshore Banks (from contour lines on Baja Directions chart) ──
  {
    id: 'nine-mile-bank',
    name: 'Nine Mile Bank',
    lat: 32.608, lng: -117.390,
    zoom: 50000, radiusKm: 12,
    description: 'Long underwater ridge ~14mi from Mission Bay. Premier kelp paddy zone. Yellowtail, dorado, and tuna.',
    species: ['Yellowtail', 'Dorado', 'Yellowfin Tuna', 'Bluefin Tuna'],
    depth: '300-600ft',
    type: 'bank',
    color: '#ef4444',
    // From Google Earth KML trace
    polygon: [
      [-117.5172, 32.7190], [-117.5238, 32.6834], [-117.4942, 32.6399],
      [-117.4812, 32.6237], [-117.4565, 32.5822], [-117.4379, 32.5566],
      [-117.4107, 32.5309], [-117.3805, 32.5123], [-117.3547, 32.5084],
      [-117.3351, 32.5228], [-117.3233, 32.5197], [-117.3092, 32.5269],
      [-117.3198, 32.5542], [-117.3411, 32.5756], [-117.3719, 32.5934],
      [-117.3894, 32.6046], [-117.4042, 32.6327], [-117.4161, 32.6451],
      [-117.4248, 32.6729], [-117.4490, 32.6878], [-117.4556, 32.6693],
      [-117.4718, 32.7163], [-117.4837, 32.7335], [-117.5172, 32.7190],
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
    id: 'east-west-butterfly',
    name: 'East & West Butterfly',
    // Combined butterfly complex — from Google Earth KML trace
    lat: 32.307, lng: -118.199,
    zoom: 80000, radiusKm: 20,
    description: 'Combined butterfly bank complex south of San Clemente Island. East (267) and West (162) butterfly structures with Blake Knolls between them.',
    species: ['Yellowfin Tuna', 'Yellowtail', 'Dorado', 'Wahoo'],
    depth: '300-1200ft',
    type: 'bank',
    color: '#22c55e',
    // From Google Earth KML trace — 39-point polygon
    polygon: [
      [-118.1784, 32.3456], [-118.1771, 32.3750], [-118.2131, 32.3998],
      [-118.2527, 32.4105], [-118.3103, 32.3925], [-118.3775, 32.3704],
      [-118.4050, 32.3815], [-118.4807, 32.3946], [-118.5650, 32.3724],
      [-118.5862, 32.3447], [-118.5662, 32.3214], [-118.4869, 32.3065],
      [-118.4123, 32.3079], [-118.3650, 32.3155], [-118.3396, 32.2968],
      [-118.2982, 32.2531], [-118.2792, 32.2239], [-118.2625, 32.1680],
      [-118.2358, 32.1459], [-118.1990, 32.1350], [-118.1721, 32.1652],
      [-118.1593, 32.1927], [-118.1417, 32.2141], [-118.1050, 32.1834],
      [-118.0706, 32.1701], [-118.0310, 32.1653], [-117.9876, 32.1812],
      [-117.9550, 32.1967], [-117.9573, 32.2268], [-117.9782, 32.2450],
      [-117.9740, 32.2792], [-117.9380, 32.3255], [-117.9870, 32.3791],
      [-117.9927, 32.4481], [-118.0271, 32.4474], [-118.0601, 32.4078],
      [-118.0851, 32.3691], [-118.1574, 32.3413], [-118.1784, 32.3456],
    ],
  },
  {
    id: 'the-ridge',
    name: 'The Ridge',
    // From Google Earth KML trace — line feature running NW-SE
    lat: 32.720, lng: -117.723,
    zoom: 60000, radiusKm: 6,
    description: 'Underwater ridge running NW-SE from near La Jolla canyon toward Nine Mile Bank. Holds yellowtail and calico bass.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass', 'Bonito'],
    depth: '200-800ft',
    type: 'reef',
    color: '#00d4ff',
    // Line feature — create a narrow polygon by buffering the polyline
    polygon: [
      // East side of ridge (offset ~1km east)
      [-117.8187, 32.8637], [-117.7343, 32.7783], [-117.7002, 32.7255],
      [-117.6628, 32.6593], [-117.6477, 32.5975],
      // West side of ridge (offset ~1km west)
      [-117.6677, 32.5876], [-117.6828, 32.6493], [-117.7202, 32.7155],
      [-117.7543, 32.7683], [-117.8387, 32.8537], [-117.8187, 32.8637],
    ],
  },
  {
    id: 'san-salvador-knoll',
    name: 'San Salvador Knoll',
    // Exact: 32°18'03.1"N 117°53'27.5"W
    lat: 32.300861, lng: -117.890972,
    zoom: 35000, radiusKm: 5,
    description: 'Underwater knoll between East Butterfly and the coast. Holds yellowtail and white seabass.',
    species: ['Yellowtail', 'White Seabass', 'Calico Bass', 'Bonito'],
    depth: '200-600ft',
    type: 'knoll',
    color: '#eab308',
    polygon: [
      [-117.93, 32.330], [-117.89, 32.340], [-117.85, 32.330],
      [-117.83, 32.310], [-117.83, 32.290], [-117.85, 32.270],
      [-117.89, 32.265], [-117.93, 32.270], [-117.94, 32.290],
      [-117.94, 32.315], [-117.93, 32.330],
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
