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
    lat: 32.463, lng: -117.296,
    zoom: 40000, radiusKm: 6,
    description: 'Mexican islands south of the border. World-class yellowtail fishing on the weather side.',
    species: ['Yellowtail', 'Bonito', 'Barracuda', 'White Seabass'],
    depth: '60-300ft',
    type: 'island',
    color: '#f97316',
    // From Google Earth KML trace
    polygon: [
      [-117.3051, 32.4554], [-117.3127, 32.4398], [-117.3050, 32.4183],
      [-117.2869, 32.4176], [-117.2813, 32.4237], [-117.2759, 32.4208],
      [-117.2721, 32.4075], [-117.2575, 32.4005], [-117.2566, 32.3893],
      [-117.2458, 32.3769], [-117.2341, 32.3780], [-117.2295, 32.3871],
      [-117.2294, 32.3997], [-117.2340, 32.4183], [-117.2424, 32.4291],
      [-117.2505, 32.4322], [-117.2633, 32.4377], [-117.2729, 32.4332],
      [-117.2770, 32.4294], [-117.2824, 32.4375], [-117.2905, 32.4543],
      [-117.3051, 32.4554],
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
    lat: 32.073, lng: -118.325,
    zoom: 60000, radiusKm: 8,
    description: 'Deep offshore bank ~60mi south. Excellent tuna grounds.',
    species: ['Yellowfin Tuna', 'Bluefin Tuna', 'Dorado'],
    depth: '300-1500ft',
    type: 'bank',
    color: '#ef4444',
    // From Google Earth KML trace
    polygon: [
      [-118.2330, 32.1152], [-118.2829, 32.0734], [-118.2715, 32.0538],
      [-118.2729, 32.0420], [-118.2954, 32.0377], [-118.2981, 31.9913],
      [-118.2522, 31.9796], [-118.2100, 31.9704], [-118.1661, 31.9424],
      [-118.1362, 31.9382], [-118.0803, 31.9695], [-118.0597, 32.0099],
      [-118.0955, 32.0097], [-118.1192, 31.9991], [-118.1462, 32.0003],
      [-118.1846, 32.0308], [-118.2031, 32.0522], [-118.2330, 32.1152],
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
    id: 'east-butterfly',
    name: 'East Butterfly',
    lat: 32.312, lng: -118.136,
    zoom: 60000, radiusKm: 12,
    description: 'Eastern butterfly bank (267) south of San Clemente Island. Deep structure holding tuna and yellowtail.',
    species: ['Yellowfin Tuna', 'Yellowtail', 'Dorado', 'Wahoo'],
    depth: '300-1200ft',
    type: 'bank',
    color: '#22c55e',
    // From Google Earth KML trace
    polygon: [
      [-118.1418, 32.2143], [-118.1027, 32.1821], [-118.0745, 32.1713],
      [-118.0309, 32.1666], [-117.9542, 32.1974], [-117.9571, 32.2270],
      [-117.9787, 32.2449], [-117.9745, 32.2794], [-117.9394, 32.3260],
      [-117.9862, 32.3783], [-117.9943, 32.4471], [-118.0260, 32.4471],
      [-118.0865, 32.3687], [-118.1585, 32.3415], [-118.1418, 32.2143],
    ],
  },
  {
    id: 'west-butterfly',
    name: 'West Butterfly',
    lat: 32.279, lng: -118.321,
    zoom: 60000, radiusKm: 12,
    description: 'Western butterfly bank (162) south of San Clemente Island. Blake Knolls area with excellent tuna grounds.',
    species: ['Yellowfin Tuna', 'Yellowtail', 'Dorado', 'Wahoo'],
    depth: '300-1200ft',
    type: 'bank',
    color: '#22c55e',
    // From Google Earth KML trace
    polygon: [
      [-118.1590, 32.3406], [-118.1778, 32.3456], [-118.1775, 32.3762],
      [-118.2123, 32.3987], [-118.2513, 32.4120], [-118.3767, 32.3703],
      [-118.4040, 32.3806], [-118.4805, 32.3950], [-118.5656, 32.3729],
      [-118.5855, 32.3487], [-118.5672, 32.3213], [-118.4873, 32.3067],
      [-118.4096, 32.3082], [-118.3657, 32.3161], [-118.3374, 32.2962],
      [-118.2977, 32.2538], [-118.2799, 32.2239], [-118.2628, 32.1684],
      [-118.2343, 32.1461], [-118.1989, 32.1365], [-118.1709, 32.1671],
      [-118.1600, 32.1941], [-118.1415, 32.2136], [-118.1590, 32.3406],
    ],
  },
  {
    id: 'the-ridge',
    name: 'The Ridge',
    lat: 32.810, lng: -117.766,
    zoom: 60000, radiusKm: 6,
    description: 'Underwater ridge running NW-SE from near La Jolla canyon toward Nine Mile Bank. Holds yellowtail and calico bass.',
    species: ['Yellowtail', 'Calico Bass', 'White Seabass', 'Bonito'],
    depth: '200-800ft',
    type: 'reef',
    color: '#00d4ff',
    // From Google Earth KML trace
    polygon: [
      [-117.8709, 32.9233], [-117.9019, 32.9104], [-117.8591, 32.8466],
      [-117.8140, 32.7925], [-117.7638, 32.7652], [-117.7398, 32.7240],
      [-117.7128, 32.6766], [-117.7115, 32.6280], [-117.7185, 32.5984],
      [-117.6622, 32.5553], [-117.6633, 32.6074], [-117.6639, 32.6440],
      [-117.6853, 32.6861], [-117.7074, 32.7281], [-117.7403, 32.7762],
      [-117.7679, 32.8073], [-117.8081, 32.8426], [-117.8507, 32.8844],
      [-117.8709, 32.9233],
    ],
  },
  {
    id: 'san-salvador-knoll',
    name: 'San Salvador Knoll',
    lat: 32.300, lng: -117.871,
    zoom: 35000, radiusKm: 5,
    description: 'Underwater knoll between East Butterfly and the coast. Holds yellowtail and white seabass.',
    species: ['Yellowtail', 'White Seabass', 'Calico Bass', 'Bonito'],
    depth: '200-600ft',
    type: 'knoll',
    color: '#eab308',
    // From Google Earth KML trace
    polygon: [
      [-117.8949, 32.3274], [-117.9082, 32.2944], [-117.9252, 32.2739],
      [-117.9136, 32.2550], [-117.8905, 32.2406], [-117.8698, 32.2529],
      [-117.8597, 32.2700], [-117.8549, 32.2897], [-117.8612, 32.3213],
      [-117.8761, 32.3387], [-117.8949, 32.3274],
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
    lat: 32.616, lng: -118.023,
    zoom: 40000, radiusKm: 4,
    description: 'Shallow underwater pinnacle between San Clemente and Nine Mile Bank.',
    species: ['Yellowtail', 'White Seabass', 'Calico Bass'],
    depth: '258ft (43 fathoms)',
    type: 'reef',
    color: '#eab308',
    // From Google Earth KML trace
    polygon: [
      [-117.9638, 32.6719], [-117.9912, 32.6713], [-118.0114, 32.6774],
      [-118.0129, 32.6614], [-117.9708, 32.6290], [-117.9575, 32.6089],
      [-117.9346, 32.6219], [-117.9638, 32.6719],
    ],
  },
  // ── New spots from KML traces ──
  {
    id: 'the-mushroom',
    name: 'The Mushroom',
    lat: 32.031, lng: -118.523,
    zoom: 60000, radiusKm: 10,
    description: 'Deep offshore bank west of Sixty Mile Bank. Remote structure holding tuna and dorado.',
    species: ['Yellowfin Tuna', 'Bluefin Tuna', 'Dorado', 'Wahoo'],
    depth: '500-2000ft',
    type: 'bank',
    color: '#ef4444',
    // From Google Earth KML trace
    polygon: [
      [-118.3581, 32.1392], [-118.4578, 32.1445], [-118.5457, 32.1532],
      [-118.6148, 32.1614], [-118.6504, 32.1005], [-118.6114, 32.0401],
      [-118.5913, 31.9899], [-118.5673, 31.9325], [-118.5168, 31.9932],
      [-118.4354, 32.0065], [-118.3807, 32.0091], [-118.3376, 32.0698],
      [-118.3581, 32.1392],
    ],
  },
  {
    id: 'kidney-bank',
    name: 'Kidney Bank',
    lat: 32.463, lng: -117.610,
    zoom: 50000, radiusKm: 8,
    description: 'Kidney-shaped bank between Nine Mile Bank and the coast. Good kelp paddy zone.',
    species: ['Yellowtail', 'Dorado', 'Bluefin Tuna', 'Calico Bass'],
    depth: '300-800ft',
    type: 'bank',
    color: '#eab308',
    // From Google Earth KML trace
    polygon: [
      [-117.6201, 32.5034], [-117.6643, 32.5394], [-117.7325, 32.5318],
      [-117.7647, 32.4948], [-117.7307, 32.4533], [-117.6783, 32.4286],
      [-117.6442, 32.3793], [-117.6101, 32.3538], [-117.5560, 32.3572],
      [-117.5430, 32.4024], [-117.5585, 32.4595], [-117.6201, 32.5034],
    ],
  },
  {
    id: '30-mile-bank',
    name: '30 Mile Bank',
    lat: 32.656, lng: -117.837,
    zoom: 50000, radiusKm: 6,
    description: 'Underwater bank ~30mi offshore. Holds yellowtail and tuna along the contour edges.',
    species: ['Yellowtail', 'Yellowfin Tuna', 'Calico Bass', 'Bonito'],
    depth: '300-900ft',
    type: 'bank',
    color: '#eab308',
    // From Google Earth KML trace
    polygon: [
      [-117.7930, 32.7765], [-117.8419, 32.7162], [-117.8205, 32.6703],
      [-117.7941, 32.6268], [-117.7643, 32.6030], [-117.7347, 32.5946],
      [-117.7189, 32.5984], [-117.7113, 32.6289], [-117.7121, 32.6774],
      [-117.7630, 32.7653], [-117.7930, 32.7765],
    ],
  },
  {
    id: 'la-victoria-knoll',
    name: 'La Victoria Knoll',
    lat: 32.203, lng: -117.916,
    zoom: 40000, radiusKm: 5,
    description: 'Deep knoll south of San Salvador. Holds yellowtail and white seabass along the structure.',
    species: ['Yellowtail', 'White Seabass', 'Calico Bass', 'Bonito'],
    depth: '300-800ft',
    type: 'knoll',
    color: '#eab308',
    // From Google Earth KML trace
    polygon: [
      [-117.8282, 32.1304], [-117.8870, 32.0966], [-117.8704, 32.0690],
      [-117.8493, 32.0496], [-117.7987, 32.0514], [-117.7672, 32.0842],
      [-117.7688, 32.1090], [-117.7944, 32.1380], [-117.8282, 32.1304],
    ],
  },
];

export function getSpotById(id: string): FishingSpot | undefined {
  return FISHING_SPOTS.find(s => s.id === id);
}
