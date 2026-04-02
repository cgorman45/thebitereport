import type { Location, Region } from '@/types';

// ---------------------------------------------------------------------------
// SAN DIEGO REGION
// ---------------------------------------------------------------------------

const sandiegoLocations: Location[] = [
  // --- Ports / Landings ---
  {
    slug: 'hm-landing-san-diego',
    name: 'H&M Landing (San Diego)',
    lat: 32.7203,
    lng: -117.2392,
    type: 'port',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'One of San Diego\'s premier sportfishing landings, located in Point Loma. Departure point for local kelp trips, overnight tuna runs, and multi-day bluewater charters.',
  },
  {
    slug: 'point-loma-sportfishing',
    name: 'Point Loma Sportfishing',
    lat: 32.7180,
    lng: -117.2385,
    type: 'port',
    region: 'San Diego',
    noaaTideStation: '9410230',
    ndbcBuoyId: '46225',
    description:
      'Full-service sportfishing landing at Point Loma offering half-day, 3/4-day, and full-day trips targeting yellowtail, bass, and tuna depending on the season.',
  },
  {
    slug: 'mission-bay',
    name: 'Mission Bay',
    lat: 32.7724,
    lng: -117.2270,
    type: 'port',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'Protected bay north of San Diego offering bay fishing for halibut, leopard sharks, and corvina, plus quick access to offshore kelp beds and La Jolla Cove.',
  },
  // --- Offshore Spots ---
  {
    slug: '9-mile-bank',
    name: '9 Mile Bank',
    lat: 32.6200,
    lng: -117.3900,
    type: 'offshore',
    region: 'San Diego',
    noaaTideStation: '9410230',
    ndbcBuoyId: '46225',
    description:
      'Located roughly 9 miles south of Point Loma, this underwater bank produces excellent yellowtail action spring through fall and holds albacore and bluefin tuna during warm water years.',
  },
  {
    slug: '43-fathom-spot',
    name: '43 Fathom Spot',
    lat: 32.5300,
    lng: -117.4800,
    type: 'offshore',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'A reliable tuna ground south of San Diego sitting at 43 fathoms depth. Known for yellowfin tuna in summer and fall when warm water pushes north out of Mexican waters.',
  },
  {
    slug: 'tanner-bank',
    name: 'Tanner Bank',
    lat: 32.7000,
    lng: -119.1000,
    type: 'offshore',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46086',
    description:
      'Located approximately 60 miles west of San Diego, Tanner Bank is legendary for bluefin tuna. An underwater seamount that concentrates bait and predators, requiring an overnight run for most boats.',
  },
  {
    slug: 'cortez-bank',
    name: 'Cortez Bank',
    lat: 32.4500,
    lng: -119.5500,
    type: 'offshore',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46086',
    description:
      'One of Southern California\'s most remote and productive fishing grounds, about 100 miles west of San Diego. A nearly submerged seamount holding impressive populations of yellowtail and white seabass year-round.',
  },
  {
    slug: '277-302-spots',
    name: '277/302 Spots',
    lat: 32.4800,
    lng: -117.6500,
    type: 'offshore',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'Productive yellowfin tuna grounds south of San Diego, just inside or slightly south of the international border. Coordinates 277 and 302 refer to chart markings used by local captains to locate offshore structure.',
  },
  {
    slug: '209-267-spots',
    name: '209/267 Spots',
    lat: 32.5500,
    lng: -117.5800,
    type: 'offshore',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'Classic San Diego tuna grounds referenced by local chart coordinates. These offshore humps and temperature breaks are prime yellowfin tuna territory during summer and early fall.',
  },
  // --- Piers / Shore ---
  {
    slug: 'ocean-beach-pier',
    name: 'Ocean Beach Pier',
    lat: 32.7490,
    lng: -117.2562,
    type: 'pier',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'The longest concrete fishing pier on the West Coast at 1,971 feet. Located in Ocean Beach, it targets mackerel, jacksmelt, white croaker, and occasional halibut. Free to fish, no license required on the pier.',
  },
  {
    slug: 'crystal-pier',
    name: 'Crystal Pier (Pacific Beach)',
    lat: 32.7939,
    lng: -117.2559,
    type: 'pier',
    region: 'San Diego',
    noaaTideStation: '9410170',
    ndbcBuoyId: '46225',
    description:
      'Historic wooden pier in Pacific Beach built in 1927. A community staple for surf perch, mackerel, and jacksmelt fishing. Unique in that it features cottages on the pier itself.',
  },
  {
    slug: 'oceanside-harbor',
    name: 'Oceanside Harbor',
    lat: 33.2148,
    lng: -117.3913,
    type: 'port',
    region: 'San Diego',
    noaaTideStation: '9410580',
    ndbcBuoyId: '46224',
    description:
      'Oceanside\'s main sportfishing hub in northern San Diego County. Sportfishing boats depart for kelp bass, yellowtail, and offshore tuna trips. Close proximity to productive nearshore kelp beds.',
  },
  {
    slug: 'oceanside-pier',
    name: 'Oceanside Pier',
    lat: 33.1936,
    lng: -117.3881,
    type: 'pier',
    region: 'San Diego',
    noaaTideStation: '9410580',
    ndbcBuoyId: '46224',
    description:
      'One of the longest wooden piers in California at 1,942 feet. Targets barred surf perch, yellowfin croaker, halibut, and mackerel. Popular family fishing spot with bait and tackle available on the pier.',
  },
];

// ---------------------------------------------------------------------------
// ORANGE COUNTY REGION
// ---------------------------------------------------------------------------

const orangeCountyLocations: Location[] = [
  // --- Ports / Landings ---
  {
    slug: 'dana-point-harbor',
    name: 'Dana Point Harbor (Davey\'s Locker)',
    lat: 33.4594,
    lng: -117.6981,
    type: 'port',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46086',
    description:
      'Orange County\'s premier sportfishing destination at Dana Point Harbor. Davey\'s Locker operates half-day, 3/4-day, and longer offshore trips targeting yellowtail, halibut, bass, and seasonal tuna.',
  },
  {
    slug: 'newport-beach-daveys-locker',
    name: 'Newport Beach (Davey\'s Locker Newport)',
    lat: 33.6017,
    lng: -117.8820,
    type: 'port',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46222',
    description:
      'Davey\'s Locker Newport operates from Newport Harbor offering year-round sportfishing trips. Targets halibut, calico bass, and yellowtail nearshore, with offshore tuna charters in season.',
  },
  // --- Offshore Spots ---
  {
    slug: '14-mile-bank',
    name: '14 Mile Bank',
    lat: 33.3000,
    lng: -117.9500,
    type: 'offshore',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46086',
    description:
      'An underwater bank roughly 14 miles offshore from Dana Point. A consistent producer of bluefin tuna during warm water years, and holds yellowtail, white seabass, and rockfish year-round.',
  },
  {
    slug: 'san-clemente-island',
    name: 'San Clemente Island',
    lat: 33.0000,
    lng: -118.5500,
    type: 'offshore',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46086',
    description:
      'A Navy-controlled island 68 miles southwest of San Pedro. World-class fishing for yellowtail, calico bass, and white seabass around the kelp beds. Access is permitted in designated areas; check current Navy restrictions.',
  },
  // --- Piers / Shore ---
  {
    slug: 'san-clemente-pier',
    name: 'San Clemente Pier',
    lat: 33.4153,
    lng: -117.6214,
    type: 'pier',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46086',
    description:
      'A classic Southern California wooden pier in downtown San Clemente. Known for mackerel, halibut, and corbina fishing. The pier sits near quality kelp habitat, occasionally producing bonito and yellowtail.',
  },
  {
    slug: 'balboa-pier',
    name: 'Balboa Pier',
    lat: 33.5994,
    lng: -117.8992,
    type: 'pier',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46222',
    description:
      'Located on the Balboa Peninsula in Newport Beach, this 920-foot pier is a popular family fishing spot. Targets surf perch, mackerel, jacksmelt, and occasional halibut along the sandy bottom.',
  },
  {
    slug: 'huntington-beach-pier',
    name: 'Huntington Beach Pier',
    lat: 33.6553,
    lng: -118.0058,
    type: 'pier',
    region: 'Orange County',
    noaaTideStation: '9410660',
    ndbcBuoyId: '46222',
    description:
      'One of the most iconic piers in Southern California at 1,850 feet long. Known for surf perch, corbina, and croaker close to shore, with mackerel and bonito schooling under the pier during summer.',
  },
  {
    slug: 'seal-beach-pier',
    name: 'Seal Beach Pier',
    lat: 33.7397,
    lng: -118.1050,
    type: 'pier',
    region: 'Orange County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46222',
    description:
      'A 1,835-foot pier in the quiet coastal city of Seal Beach. Sandy bottom holds corbina, yellowfin croaker, and halibut. Less crowded than piers to the south, offering a relaxed fishing experience.',
  },
];

// ---------------------------------------------------------------------------
// LA COUNTY REGION
// ---------------------------------------------------------------------------

const laCountyLocations: Location[] = [
  // --- Ports / Landings ---
  {
    slug: 'long-beach-pierpoint',
    name: 'Long Beach (Pierpoint Landing)',
    lat: 33.7490,
    lng: -118.1890,
    type: 'port',
    region: 'LA County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46222',
    description:
      'Pierpoint Landing at Long Beach is a full-service sportfishing operation offering year-round trips for halibut, bass, and yellowtail, plus overnight runs to offshore tuna grounds during summer.',
  },
  {
    slug: 'long-beach-22nd-street',
    name: '22nd Street Landing (Long Beach)',
    lat: 33.7361,
    lng: -118.2731,
    type: 'port',
    region: 'LA County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46222',
    description:
      'Historic sportfishing landing in San Pedro / Long Beach area. One of the oldest fishing operations in Los Angeles, offering multi-day offshore trips, local kelp trips, and whale watching.',
  },
  {
    slug: 'san-pedro-22nd-street',
    name: '22nd Street Landing (San Pedro)',
    lat: 33.7269,
    lng: -118.2831,
    type: 'port',
    region: 'LA County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46222',
    description:
      'San Pedro\'s iconic sportfishing hub offering access to the San Pedro Channel, Catalina Island, and offshore tuna grounds. Targets yellowtail, calico bass, and bluefin tuna with full-day and overnight trips.',
  },
  {
    slug: 'marina-del-rey',
    name: 'Marina del Rey',
    lat: 33.9802,
    lng: -118.4517,
    type: 'port',
    region: 'LA County',
    noaaTideStation: '9410840',
    ndbcBuoyId: '46221',
    description:
      'The largest man-made small craft harbor in the US, located in western Los Angeles. Home to several sportfishing and charter operations targeting halibut, calico bass, and white seabass in Santa Monica Bay.',
  },
  {
    slug: 'santa-monica-pier',
    name: 'Santa Monica Pier',
    lat: 34.0083,
    lng: -118.4988,
    type: 'pier',
    region: 'LA County',
    noaaTideStation: '9410840',
    ndbcBuoyId: '46221',
    description:
      'The famous Santa Monica Pier hosts a bait and tackle shop and is a public fishing pier. Targets mackerel, jacksmelt, surf perch, and occasional halibut. The pier offers stunning views of Santa Monica Bay.',
  },
  // --- Offshore Spots ---
  {
    slug: 'horseshoe-kelp',
    name: 'The Horseshoe Kelp',
    lat: 33.6500,
    lng: -118.3200,
    type: 'offshore',
    region: 'LA County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46222',
    description:
      'A large horseshoe-shaped kelp bed off Long Beach / San Pedro in the San Pedro Channel. One of LA\'s top local spots for calico bass, yellowtail, and white seabass. Accessible on half-day and 3/4-day trips.',
  },
  {
    slug: 'catalina-island',
    name: 'Catalina Island',
    lat: 33.3894,
    lng: -118.4162,
    type: 'offshore',
    region: 'LA County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46025',
    description:
      'Located 22 miles off the coast, Catalina Island offers diverse fishing in kelp forests, rocky reefs, and open water. Targets include calico bass, yellowtail, white seabass, opaleye, and sheephead.',
  },
  // --- Piers / Shore ---
  {
    slug: 'belmont-pier',
    name: 'Belmont Pier (Long Beach)',
    lat: 33.7617,
    lng: -118.1397,
    type: 'pier',
    region: 'LA County',
    noaaTideStation: '9410680',
    ndbcBuoyId: '46222',
    description:
      'A 1,620-foot concrete pier in Long Beach. Popular for halibut, croaker, surf perch, and mackerel. The pier extends over relatively deep water compared to many SoCal piers, improving access to halibut.',
  },
  {
    slug: 'redondo-beach-pier',
    name: 'Redondo Beach Pier',
    lat: 33.8447,
    lng: -118.3928,
    type: 'pier',
    region: 'LA County',
    noaaTideStation: '9410840',
    ndbcBuoyId: '46221',
    description:
      'The Redondo Beach Pier and Horseshoe Pier complex offers public fishing along the pier railings. Known for mackerel, bonito, and croaker, with bait and tackle shops on the pier.',
  },
  {
    slug: 'manhattan-beach-pier',
    name: 'Manhattan Beach Pier',
    lat: 33.8847,
    lng: -118.4114,
    type: 'pier',
    region: 'LA County',
    noaaTideStation: '9410840',
    ndbcBuoyId: '46221',
    description:
      'A 928-foot T-shaped pier in Manhattan Beach, home to the Roundhouse Marine Lab. Targets perch, mackerel, and jacksmelt. The sandy beach approaches are excellent for barred surf perch and corbina.',
  },
  {
    slug: 'hermosa-beach-pier',
    name: 'Hermosa Beach Pier',
    lat: 33.8617,
    lng: -118.4000,
    type: 'pier',
    region: 'LA County',
    noaaTideStation: '9410840',
    ndbcBuoyId: '46221',
    description:
      'A 1,000-foot pier in the heart of Hermosa Beach. Consistently productive for mackerel schools in summer and surf perch and corbina year-round. Located in the heart of the South Bay fishing scene.',
  },
  {
    slug: 'malibu-pier',
    name: 'Malibu Pier',
    lat: 34.0355,
    lng: -118.6782,
    type: 'pier',
    region: 'LA County',
    noaaTideStation: '9410840',
    ndbcBuoyId: '46221',
    description:
      'A historic private/public pier in Malibu offering fishing access to the rocky reefs and kelp beds of the Malibu Coast. Targets calico bass, white seabass, and yellowtail during warm water intrusions.',
  },
];

// ---------------------------------------------------------------------------
// VENTURA COUNTY REGION
// ---------------------------------------------------------------------------

const venturaCountyLocations: Location[] = [
  // --- Ports / Landings ---
  {
    slug: 'ventura-harbor',
    name: 'Ventura Harbor',
    lat: 34.2297,
    lng: -119.2700,
    type: 'port',
    region: 'Ventura County',
    noaaTideStation: '9411340',
    ndbcBuoyId: '46218',
    description:
      'Ventura Harbor is the launching point for trips to the Northern Channel Islands (Anacapa, Santa Cruz, Santa Rosa, San Miguel) and offers excellent local fishing for calico bass, halibut, and white seabass.',
  },
  {
    slug: 'channel-islands-harbor-oxnard',
    name: 'Channel Islands Harbor (Oxnard)',
    lat: 34.1564,
    lng: -119.2211,
    type: 'port',
    region: 'Ventura County',
    noaaTideStation: '9411340',
    ndbcBuoyId: '46218',
    description:
      'Located in Oxnard, Channel Islands Harbor is home to several sportfishing operations offering trips to the Northern Channel Islands. Prime destination for lingcod, rockfish, calico bass, and white seabass.',
  },
  {
    slug: 'santa-barbara-harbor',
    name: 'Santa Barbara Harbor',
    lat: 34.4072,
    lng: -119.6913,
    type: 'port',
    region: 'Ventura County',
    noaaTideStation: '9411340',
    ndbcBuoyId: '46218',
    description:
      'Santa Barbara Harbor offers access to productive fishing around the Channel Islands and nearshore reefs. Known for rockfish, lingcod, calico bass, and halibut, with white seabass possible in spring.',
  },
  // --- Piers / Shore ---
  {
    slug: 'ventura-pier',
    name: 'Ventura Pier',
    lat: 34.2708,
    lng: -119.3089,
    type: 'pier',
    region: 'Ventura County',
    noaaTideStation: '9411340',
    ndbcBuoyId: '46218',
    description:
      'The Ventura Pier, also known as the San Buenaventura State Beach Pier, extends 1,620 feet into the ocean. Targets halibut, jacksmelt, mackerel, and surf perch. The sandy beach nearby holds corbina and croaker.',
  },
  {
    slug: 'goleta-pier',
    name: 'Goleta Pier',
    lat: 34.4181,
    lng: -119.8280,
    type: 'pier',
    region: 'Ventura County',
    noaaTideStation: '9411340',
    ndbcBuoyId: '46218',
    description:
      'Located at Goleta Beach County Park near Santa Barbara, Goleta Pier is 1,450 feet long. A relaxed fishing spot targeting surf perch, jacksmelt, mackerel, and halibut over a sandy bottom.',
  },
];

// ---------------------------------------------------------------------------
// COMBINED DATABASE
// ---------------------------------------------------------------------------

export const locations: Location[] = [
  ...sandiegoLocations,
  ...orangeCountyLocations,
  ...laCountyLocations,
  ...venturaCountyLocations,
];

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

export function getLocationBySlug(slug: string): Location | undefined {
  return locations.find((loc) => loc.slug === slug);
}

export function getLocationsByRegion(region: Region): Location[] {
  return locations.filter((loc) => loc.region === region);
}
