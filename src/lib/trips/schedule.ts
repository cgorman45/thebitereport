// ---------------------------------------------------------------------------
// Trip schedule — edit this array to update what shows in "Plan Your Trip".
//
// FLEET REFERENCE
// Seaforth Landing:    New Seaforth (367703230), Apollo (367478120),
//                      Aztec (338409157), Cortez (367547700),
//                      Highliner (367004700), Legacy (367739800),
//                      San Diego (366918840), Sea Watch (367710460),
//                      El Gato Dos (367523170)
//
// Fisherman's Landing: Polaris Supreme (367469470), Dolphin (367453390),
//                      Liberty (367678200), Fortune (367672130),
//                      Islander (338312000), Pacific Queen (367438790),
//                      Excel (367469480), Constitution (367516650),
//                      Pegasus (367612350)
// ---------------------------------------------------------------------------

import type { ScheduledTrip, TripFilters } from './types';

export type { ScheduledTrip, TripFilters };

export const TRIP_SCHEDULE: ScheduledTrip[] = [

  // ── FRIDAY, APRIL 3 ─────────────────────────────────────────────────────

  {
    id: 'sf-new-seaforth-0403-am',
    boatName: 'New Seaforth',
    landing: 'seaforth',
    departureDate: '2026-04-03',
    departureTime: '6:00 AM',
    duration: '1/2 Day AM',
    durationHours: 5,
    pricePerPerson: 65,
    maxAnglers: 65,
    spotsLeft: 18,
    description:
      'Classic morning half-day out of Mission Bay. Targets kelp bass and local yellows along the Coronado Islands kelp line. Great trip for beginners and families.',
    targetSpecies: ['calico bass', 'yellowtail', 'sheephead', 'sculpin'],
    mmsi: 367703230,
  },
  {
    id: 'sf-new-seaforth-0403-pm',
    boatName: 'New Seaforth',
    landing: 'seaforth',
    departureDate: '2026-04-03',
    departureTime: '1:00 PM',
    duration: '1/2 Day PM',
    durationHours: 5,
    pricePerPerson: 65,
    maxAnglers: 65,
    spotsLeft: 31,
    description:
      'Afternoon half-day targeting local structure fish and the inner kelp beds. Perfect after a morning activity — back by 6 PM.',
    targetSpecies: ['calico bass', 'sheephead', 'sculpin', 'rockfish'],
    mmsi: 367703230,
  },
  {
    id: 'sf-apollo-0403',
    boatName: 'Apollo',
    landing: 'seaforth',
    departureDate: '2026-04-03',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 95,
    maxAnglers: 55,
    spotsLeft: 8,
    description:
      'Three-quarter day trip pushing out to the 9 Mile Bank and Coronado Islands. Excellent yellowtail action expected; rockfish limits are a strong backup.',
    targetSpecies: ['yellowtail', 'rockfish', 'calico bass', 'white seabass'],
    mmsi: 367478120,
  },
  {
    id: 'fl-dolphin-0403',
    boatName: 'Dolphin',
    landing: 'fishermans',
    departureDate: '2026-04-03',
    departureTime: '6:00 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 92,
    maxAnglers: 50,
    spotsLeft: 22,
    description:
      "Fisherman's Landing 3/4-day targeting the Coronado Islands and local offshore kelp beds. Yellowtail and calico bass on the menu.",
    targetSpecies: ['yellowtail', 'calico bass', 'rockfish', 'lingcod'],
    mmsi: 367453390,
  },
  {
    id: 'sf-cortez-0403',
    boatName: 'Cortez',
    landing: 'seaforth',
    departureDate: '2026-04-03',
    departureTime: '6:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 150,
    maxAnglers: 40,
    spotsLeft: 5,
    description:
      'Full-day run to the 302 and Coronado Canyon. Targeting bluefin and yellowfin tuna on recent warm water intrusions. Trophy fish territory — almost full, book now.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'],
    mmsi: 367547700,
  },
  {
    id: 'fl-liberty-0403',
    boatName: 'Liberty',
    landing: 'fishermans',
    departureDate: '2026-04-03',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 155,
    maxAnglers: 35,
    spotsLeft: 14,
    description:
      "Full-day offshore trip targeting early season tuna on the 9 Mile Bank and Coronado Ridge. Liberty's experienced crew put fish on deck last weekend.",
    targetSpecies: ['bluefin tuna', 'yellowtail', 'yellowfin tuna', 'white seabass'],
    mmsi: 367678200,
  },

  // ── SATURDAY, APRIL 4 ───────────────────────────────────────────────────

  {
    id: 'sf-aztec-0404-am',
    boatName: 'Aztec',
    landing: 'seaforth',
    departureDate: '2026-04-04',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 95,
    maxAnglers: 55,
    spotsLeft: 3,
    description:
      "Weekend warrior special — nearly sold out. Heading to the islands for yellowtail and trophy calicos. Get in while you can.",
    targetSpecies: ['yellowtail', 'calico bass', 'white seabass'],
    mmsi: 338409157,
  },
  {
    id: 'sf-highliner-0404',
    boatName: 'Highliner',
    landing: 'seaforth',
    departureDate: '2026-04-04',
    departureTime: '6:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 160,
    maxAnglers: 40,
    spotsLeft: 20,
    description:
      "Full-day offshore targeting the 43 Fathom Spot and 302 Ridge. Yellowfin and bluefin tuna counts have been strong. Highliner's long-range crew runs this trip with precision.",
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'dorado', 'yellowtail'],
    mmsi: 367004700,
  },
  {
    id: 'fl-fortune-0404',
    boatName: 'Fortune',
    landing: 'fishermans',
    departureDate: '2026-04-04',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 155,
    maxAnglers: 38,
    spotsLeft: 17,
    description:
      'Weekend full-day offshore targeting mixed tuna schools at the Coronado Canyon. Fortune has been on fish the last three trips.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'],
    mmsi: 367672130,
  },
  {
    id: 'fl-pacific-queen-0404',
    boatName: 'Pacific Queen',
    landing: 'fishermans',
    departureDate: '2026-04-04',
    departureTime: '9:00 PM',
    duration: 'Overnight',
    durationHours: 16,
    pricePerPerson: 295,
    maxAnglers: 30,
    spotsLeft: 11,
    description:
      'Saturday overnight — depart dusk, fish through the night and into Sunday morning. Targeting white seabass and yellowtail. Back in port by early afternoon Sunday.',
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass', 'rockfish'],
    mmsi: 367438790,
  },

  // ── SUNDAY, APRIL 5 ─────────────────────────────────────────────────────

  {
    id: 'sf-sea-watch-0405-am',
    boatName: 'Sea Watch',
    landing: 'seaforth',
    departureDate: '2026-04-05',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 92,
    maxAnglers: 50,
    spotsLeft: 29,
    description:
      'Sunday 3/4-day working the Coronado Islands kelp and outer banks. Great mixed-bag trip — calico bass, rockfish, and yellows all likely.',
    targetSpecies: ['yellowtail', 'calico bass', 'rockfish', 'sheephead'],
    mmsi: 367710460,
  },
  {
    id: 'sf-san-diego-0405',
    boatName: 'San Diego',
    landing: 'seaforth',
    departureDate: '2026-04-05',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 145,
    maxAnglers: 45,
    spotsLeft: 24,
    description:
      'Full-day run to Coronado Canyon and the 302. San Diego is a proven offshore platform — expect a mixed bag of tuna and yellowtail.',
    targetSpecies: ['bluefin tuna', 'yellowtail', 'yellowfin tuna'],
    mmsi: 366918840,
  },
  {
    id: 'fl-constitution-0405',
    boatName: 'Constitution',
    landing: 'fishermans',
    departureDate: '2026-04-05',
    departureTime: '6:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 150,
    maxAnglers: 38,
    spotsLeft: 33,
    description:
      "Sunday full-day targeting structure fish and offshore tuna. Constitution's bottom-fishing setup is ideal for anglers wanting lingcod and rockfish along with any tuna bonus.",
    targetSpecies: ['rockfish', 'lingcod', 'yellowtail', 'bluefin tuna'],
    mmsi: 367516650,
  },
  {
    id: 'fl-legacy-0405',
    boatName: 'Legacy',
    landing: 'seaforth',
    departureDate: '2026-04-05',
    departureTime: '10:00 PM',
    duration: 'Overnight',
    durationHours: 16,
    pricePerPerson: 320,
    maxAnglers: 28,
    spotsLeft: 7,
    description:
      'Sunday overnight targeting white seabass in prime spawning grounds along the Coronado Islands. Night fishing with live squid. Almost sold out.',
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass'],
    mmsi: 367739800,
  },

  // ── MONDAY, APRIL 6 ─────────────────────────────────────────────────────

  {
    id: 'sf-el-gato-dos-0406-am',
    boatName: 'El Gato Dos',
    landing: 'seaforth',
    departureDate: '2026-04-06',
    departureTime: '6:00 AM',
    duration: '1/2 Day AM',
    durationHours: 5,
    pricePerPerson: 62,
    maxAnglers: 60,
    spotsLeft: 45,
    description:
      'Weekday morning half-day — relaxed pace, great for newer anglers or a quick fish before work. Inner kelp and local structure.',
    targetSpecies: ['calico bass', 'sculpin', 'sheephead', 'rockfish'],
    mmsi: 367523170,
  },
  {
    id: 'fl-pegasus-0406',
    boatName: 'Pegasus',
    landing: 'fishermans',
    departureDate: '2026-04-06',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 90,
    maxAnglers: 50,
    spotsLeft: 36,
    description:
      "Weekday 3/4-day from Fisherman's Landing. Light load means more rail space and more personal attention from the crew. Yellowtail and local kelp species.",
    targetSpecies: ['yellowtail', 'calico bass', 'white seabass', 'rockfish'],
    mmsi: 367612350,
  },
  {
    id: 'fl-islander-0406',
    boatName: 'Islander',
    landing: 'fishermans',
    departureDate: '2026-04-06',
    departureTime: '8:00 PM',
    duration: '1.5 Day',
    durationHours: 30,
    pricePerPerson: 420,
    maxAnglers: 25,
    spotsLeft: 12,
    description:
      '1.5-day trip pushing down toward Ensenada and the Coronado Ridge. More time on the grounds means better chances at quality yellowtail and the early tuna season.',
    targetSpecies: ['yellowtail', 'bluefin tuna', 'white seabass', 'yellowfin tuna'],
    mmsi: 338312000,
  },

  // ── TUESDAY, APRIL 7 ────────────────────────────────────────────────────

  {
    id: 'sf-aztec-0407-am',
    boatName: 'Aztec',
    landing: 'seaforth',
    departureDate: '2026-04-07',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 92,
    maxAnglers: 55,
    spotsLeft: 40,
    description:
      'Midweek 3/4-day to the islands. Calm weather forecast — perfect conditions for working the kelp paddies and structure. Calico bass are biting well right now.',
    targetSpecies: ['calico bass', 'yellowtail', 'sheephead', 'white seabass'],
    mmsi: 338409157,
  },
  {
    id: 'fl-fortune-0407',
    boatName: 'Fortune',
    landing: 'fishermans',
    departureDate: '2026-04-07',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 150,
    maxAnglers: 38,
    spotsLeft: 28,
    description:
      'Midweek full-day offshore. Small load guarantees a premium experience. Targeting bluefin on recent kelp paddy action at 35+ miles offshore.',
    targetSpecies: ['bluefin tuna', 'yellowtail', 'dorado', 'yellowfin tuna'],
    mmsi: 367672130,
  },
  {
    id: 'fl-excel-0407',
    boatName: 'Excel',
    landing: 'fishermans',
    departureDate: '2026-04-07',
    departureTime: '8:00 PM',
    duration: '2 Day',
    durationHours: 48,
    pricePerPerson: 595,
    maxAnglers: 22,
    spotsLeft: 6,
    description:
      "Two-day offshore aboard the legendary Excel. Running to the Cortez Bank and beyond for bluefin, yellowfin, and dorado. One of SoCal's finest multi-day platforms.",
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'dorado', 'yellowtail'],
    mmsi: 367469480,
  },

  // ── WEDNESDAY, APRIL 8 ──────────────────────────────────────────────────

  {
    id: 'sf-highliner-0408',
    boatName: 'Highliner',
    landing: 'seaforth',
    departureDate: '2026-04-08',
    departureTime: '6:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 160,
    maxAnglers: 40,
    spotsLeft: 32,
    description:
      'Mid-week full-day targeting the 43 Fathom Spot and Coronado Ridge. Reports of yellowfin schools in 68°F water. Highliner has the range and crew to make it happen.',
    targetSpecies: ['yellowfin tuna', 'bluefin tuna', 'yellowtail', 'dorado'],
    mmsi: 367004700,
  },
  {
    id: 'fl-dolphin-0408',
    boatName: 'Dolphin',
    landing: 'fishermans',
    departureDate: '2026-04-08',
    departureTime: '6:00 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 90,
    maxAnglers: 50,
    spotsLeft: 42,
    description:
      "Wednesday 3/4-day — great for a midweek escape. Targeting yellowtail and local kelp species at the Coronado Islands. Dolphin's nimble hull gets you there fast.",
    targetSpecies: ['yellowtail', 'calico bass', 'rockfish', 'lingcod'],
    mmsi: 367453390,
  },
  {
    id: 'fl-polaris-supreme-0408',
    boatName: 'Polaris Supreme',
    landing: 'fishermans',
    departureDate: '2026-04-08',
    departureTime: '9:00 PM',
    duration: '3 Day',
    durationHours: 72,
    pricePerPerson: 1150,
    maxAnglers: 20,
    spotsLeft: 4,
    description:
      "Three-day trip aboard the iconic Polaris Supreme — one of the finest long-range vessels in the Pacific. Targeting bluefin, yellowfin, and wahoo off Guadalupe Island. Nearly sold out.",
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'wahoo', 'dorado', 'yellowtail'],
    mmsi: 367469470,
  },

  // ── THURSDAY, APRIL 9 ───────────────────────────────────────────────────

  {
    id: 'sf-cortez-0409',
    boatName: 'Cortez',
    landing: 'seaforth',
    departureDate: '2026-04-09',
    departureTime: '6:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 150,
    maxAnglers: 40,
    spotsLeft: 26,
    description:
      "Thursday full-day offshore run. Cortez heads to the Coronado Canyon targeting bluefin tuna on fresh kelp paddy action. Lighter load means more rail space.",
    targetSpecies: ['bluefin tuna', 'yellowtail', 'yellowfin tuna'],
    mmsi: 367547700,
  },
  {
    id: 'sf-sea-watch-0409',
    boatName: 'Sea Watch',
    landing: 'seaforth',
    departureDate: '2026-04-09',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 92,
    maxAnglers: 50,
    spotsLeft: 38,
    description:
      'Thursday 3/4-day working the Coronado Islands structure. White seabass have been active on the kelp edges — bring your iron.',
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass', 'sheephead'],
    mmsi: 367710460,
  },
  {
    id: 'fl-liberty-0409',
    boatName: 'Liberty',
    landing: 'fishermans',
    departureDate: '2026-04-09',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 155,
    maxAnglers: 35,
    spotsLeft: 21,
    description:
      'End-of-week full-day targeting mixed offshore schools. Liberty runs a clean, well-organized trip with experienced deckhands to help all skill levels.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'],
    mmsi: 367678200,
  },
  {
    id: 'fl-pacific-queen-0409',
    boatName: 'Pacific Queen',
    landing: 'fishermans',
    departureDate: '2026-04-09',
    departureTime: '9:00 PM',
    duration: 'Overnight',
    durationHours: 16,
    pricePerPerson: 285,
    maxAnglers: 30,
    spotsLeft: 19,
    description:
      "Thursday overnight — depart Thursday night, fish into Friday morning. White seabass on live squid is the primary target along the Coronado Islands kelp edges.",
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass'],
    mmsi: 367438790,
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Filter the trip schedule.  All criteria are optional — omit any to skip
 * that filter.  `anglers` means "we need at least N spots still available."
 */
export function filterTrips(filters: TripFilters): ScheduledTrip[] {
  return TRIP_SCHEDULE.filter(trip => {
    // Date filter — exact ISO date match
    if (filters.date && trip.departureDate !== filters.date) return false;

    // Duration filter — loose keyword match (case-insensitive)
    if (filters.duration) {
      const d = filters.duration.toLowerCase();
      const t = trip.duration.toLowerCase();

      // Support shorthand: "half", "full", "overnight", "2 day", "long range", etc.
      const halfDay = d.includes('half') || d === '1/2';
      const threeQuarter = d.includes('3/4') || d.includes('three quarter') || d.includes('quarter');
      const fullDay = d === 'full day' || d === 'full' || d.includes('full day');
      const overnight = d.includes('overnight') || d.includes('night');
      const onePointFive = d.includes('1.5') || d.includes('one and a half');
      const twoDay = d.includes('2 day') || d.includes('two day');
      const threeDay = d.includes('3 day') || d.includes('three day');
      const longRange = d.includes('long range') || d.includes('long-range') || d.includes('multi');

      if (halfDay && !t.includes('1/2')) return false;
      if (threeQuarter && !t.includes('3/4')) return false;
      if (fullDay && t !== 'full day') return false;
      if (overnight && t !== 'overnight') return false;
      if (onePointFive && t !== '1.5 day') return false;
      if (twoDay && t !== '2 day') return false;
      if (threeDay && t !== '3 day') return false;
      if (longRange && !['1.5 day', '2 day', '3 day', 'long range'].includes(t)) return false;
    }

    // Anglers filter — must have enough spots left
    if (filters.anglers !== undefined && trip.spotsLeft < filters.anglers) return false;

    // Species filter — keyword matched against targetSpecies array
    if (filters.species) {
      const s = filters.species.toLowerCase();
      const matched = trip.targetSpecies.some(sp => sp.toLowerCase().includes(s));
      if (!matched) return false;
    }

    return true;
  });
}

/** Look up a single trip by its unique id. */
export function getTripById(id: string): ScheduledTrip | undefined {
  return TRIP_SCHEDULE.find(t => t.id === id);
}
