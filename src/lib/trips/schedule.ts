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
//
// H&M Landing:         Mission Belle, Patriot, Daily Double, Shogun,
//                      Spirit of Adventure
//                      2803 Emerson St, San Diego
//
// Point Loma Sports.:  Point Loma, New Lo-An, Chubasco II, Premier
//                      1403 Scott St, San Diego
//
// Helgren's Sports.:   Helgren's Oceanside 95, Sea Star
//                      Oceanside (~45 min north of San Diego)
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

  // ── H&M LANDING ─────────────────────────────────────────────────────────
  // 2803 Emerson St, San Diego — Oldest sportfishing operation on the West Coast

  {
    id: 'hm-mission-belle-0403',
    boatName: 'Mission Belle',
    landing: 'hm_landing',
    departureDate: '2026-04-03',
    departureTime: '6:00 AM',
    duration: '1/2 Day AM',
    durationHours: 5,
    pricePerPerson: 70,
    maxAnglers: 60,
    spotsLeft: 27,
    description:
      "Morning half-day aboard H&M's reliable Mission Belle. Works the local kelp beds and structure near Point Loma and the Coronado Islands. Perfect intro trip for families and newer anglers.",
    targetSpecies: ['calico bass', 'sculpin', 'sheephead', 'rockfish'],
  },
  {
    id: 'hm-patriot-0404',
    boatName: 'Patriot',
    landing: 'hm_landing',
    departureDate: '2026-04-04',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 100,
    maxAnglers: 55,
    spotsLeft: 14,
    description:
      "H&M's Patriot runs a Saturday 3/4-day to the Coronado Islands and 9 Mile Bank. Yellowtail and white seabass are the primary targets with calico bass as a bonus on the kelp edges.",
    targetSpecies: ['yellowtail', 'white seabass', 'calico bass', 'rockfish'],
  },
  {
    id: 'hm-daily-double-0405',
    boatName: 'Daily Double',
    landing: 'hm_landing',
    departureDate: '2026-04-05',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 145,
    maxAnglers: 45,
    spotsLeft: 30,
    description:
      "Full-day offshore run aboard the Daily Double. Heading to the Coronado Canyon and 302 Ridge for bluefin and yellowfin tuna. H&M's experienced crew has been putting anglers on fish all spring.",
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'],
  },
  {
    id: 'hm-shogun-0407',
    boatName: 'Shogun',
    landing: 'hm_landing',
    departureDate: '2026-04-07',
    departureTime: '9:00 PM',
    duration: '2 Day',
    durationHours: 48,
    pricePerPerson: 650,
    maxAnglers: 28,
    spotsLeft: 9,
    description:
      "Two-day trip aboard the Shogun, one of H&M's storied long-range platforms. Running to the Cortez Bank for bluefin tuna, yellowfin, and dorado on a wide-open offshore run. Bunk and meals included.",
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'dorado', 'yellowtail'],
  },
  {
    id: 'hm-spirit-of-adventure-0409',
    boatName: 'Spirit of Adventure',
    landing: 'hm_landing',
    departureDate: '2026-04-09',
    departureTime: '8:00 PM',
    duration: 'Overnight',
    durationHours: 16,
    pricePerPerson: 310,
    maxAnglers: 32,
    spotsLeft: 18,
    description:
      "Thursday overnight aboard the Spirit of Adventure. Departing at dusk and working the Coronado Islands through the night for white seabass on live squid. Back to H&M Landing by early Friday afternoon.",
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass', 'sheephead'],
  },

  // ── POINT LOMA SPORTFISHING ──────────────────────────────────────────────
  // 1403 Scott St, San Diego — Fleet of 16 boats

  {
    id: 'pl-point-loma-0403',
    boatName: 'Point Loma',
    landing: 'point_loma',
    departureDate: '2026-04-03',
    departureTime: '6:00 AM',
    duration: '1/2 Day AM',
    durationHours: 5,
    pricePerPerson: 68,
    maxAnglers: 65,
    spotsLeft: 38,
    description:
      "Friday morning half-day aboard the flagship Point Loma. Works the local kelp beds and reefs just outside the harbor. Great beginner trip — patient crew, gear rental available.",
    targetSpecies: ['calico bass', 'sculpin', 'sheephead', 'rockfish'],
  },
  {
    id: 'pl-new-lo-an-0404',
    boatName: 'New Lo-An',
    landing: 'point_loma',
    departureDate: '2026-04-04',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 98,
    maxAnglers: 50,
    spotsLeft: 22,
    description:
      "Saturday 3/4-day aboard the New Lo-An targeting yellowtail and white seabass at the Coronado Islands. Point Loma's fleet has been finding fish consistently — good numbers on the kelp edges.",
    targetSpecies: ['yellowtail', 'white seabass', 'calico bass', 'lingcod'],
  },
  {
    id: 'pl-chubasco-ii-0406',
    boatName: 'Chubasco II',
    landing: 'point_loma',
    departureDate: '2026-04-06',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 155,
    maxAnglers: 40,
    spotsLeft: 25,
    description:
      "Monday full-day offshore aboard the Chubasco II. Pushing to the 9 Mile Bank and Coronado Ridge for bluefin and yellowfin tuna. Light weekday load means more room on the rail.",
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'],
  },
  {
    id: 'pl-premier-0408',
    boatName: 'Premier',
    landing: 'point_loma',
    departureDate: '2026-04-08',
    departureTime: '6:00 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 95,
    maxAnglers: 55,
    spotsLeft: 43,
    description:
      "Midweek 3/4-day aboard the Premier. Working Coronado Islands structure and local kelp paddies for yellowtail and calico bass. Calm weather expected — excellent conditions for all skill levels.",
    targetSpecies: ['yellowtail', 'calico bass', 'white seabass', 'sheephead'],
  },
  {
    id: 'pl-point-loma-0409',
    boatName: 'Point Loma',
    landing: 'point_loma',
    departureDate: '2026-04-09',
    departureTime: '9:00 PM',
    duration: 'Overnight',
    durationHours: 16,
    pricePerPerson: 275,
    maxAnglers: 35,
    spotsLeft: 20,
    description:
      "Thursday overnight running the Point Loma to the Coronado Islands for white seabass on live squid and sardines. Fish through the night and return Friday morning with a box full of fillets.",
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass', 'rockfish'],
  },

  // ── HELGREN'S SPORTFISHING ───────────────────────────────────────────────
  // Oceanside, ~45 min north of San Diego — half-day, multi-day, whale watching

  {
    id: 'hg-oceanside-95-0403',
    boatName: "Helgren's Oceanside 95",
    landing: 'helgrens',
    departureDate: '2026-04-03',
    departureTime: '6:30 AM',
    duration: '1/2 Day AM',
    durationHours: 5,
    pricePerPerson: 65,
    maxAnglers: 70,
    spotsLeft: 34,
    description:
      "Half-day out of Oceanside Harbor aboard the spacious Oceanside 95. Targets calico bass, rockfish, and sheephead along the local kelp beds and nearshore structure. A great trip 45 minutes north of San Diego.",
    targetSpecies: ['calico bass', 'rockfish', 'sheephead', 'sculpin'],
  },
  {
    id: 'hg-sea-star-0405',
    boatName: 'Sea Star',
    landing: 'helgrens',
    departureDate: '2026-04-05',
    departureTime: '6:00 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 92,
    maxAnglers: 50,
    spotsLeft: 31,
    description:
      "Sunday 3/4-day aboard the Sea Star working the offshore banks north of San Diego. Yellowtail have been showing on the kelp paddies — calico bass and rockfish are reliable backup.",
    targetSpecies: ['yellowtail', 'calico bass', 'rockfish', 'lingcod'],
  },
  {
    id: 'hg-oceanside-95-0406',
    boatName: "Helgren's Oceanside 95",
    landing: 'helgrens',
    departureDate: '2026-04-06',
    departureTime: '7:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 135,
    maxAnglers: 55,
    spotsLeft: 40,
    description:
      "Monday full-day offshore aboard the Oceanside 95. Running to the La Jolla Canyon and 9 Mile Bank for yellowtail and bluefin tuna. Light weekday load — more room and more personal attention from the crew.",
    targetSpecies: ['yellowtail', 'bluefin tuna', 'yellowfin tuna', 'calico bass'],
  },
  {
    id: 'hg-sea-star-0407',
    boatName: 'Sea Star',
    landing: 'helgrens',
    departureDate: '2026-04-07',
    departureTime: '8:00 PM',
    duration: '1.5 Day',
    durationHours: 30,
    pricePerPerson: 450,
    maxAnglers: 24,
    spotsLeft: 15,
    description:
      "1.5-day trip aboard the Sea Star departing Tuesday evening. Fishing through the night and into Wednesday afternoon targeting yellowtail, white seabass, and early-season tuna on the offshore banks. Bunk and galley onboard.",
    targetSpecies: ['yellowtail', 'white seabass', 'bluefin tuna', 'yellowfin tuna'],
  },
  {
    id: 'hg-oceanside-95-0409',
    boatName: "Helgren's Oceanside 95",
    landing: 'helgrens',
    departureDate: '2026-04-09',
    departureTime: '6:30 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 90,
    maxAnglers: 60,
    spotsLeft: 47,
    description:
      "End-of-week 3/4-day out of Oceanside. The Oceanside 95 is working the offshore kelp paddies and structure north of the Coronado Islands. White seabass have been active at dawn — bring your iron jigs.",
    targetSpecies: ['white seabass', 'yellowtail', 'calico bass', 'sheephead'],
  },

  // ── Private Charters (6-pack boats) ─────────────────────────────────────
  // Smaller, personalized trips departing from Mission Bay or Shelter Island.
  // Prices shown are per-person based on full boat (6 anglers).

  {
    id: 'pc-clowers-0403',
    boatName: 'Capt. Clowers Charter',
    landing: 'private_charter',
    departureDate: '2026-04-03',
    departureTime: '5:30 AM',
    duration: 'Full Day',
    durationHours: 10,
    pricePerPerson: 250,
    maxAnglers: 6,
    spotsLeft: 6,
    description: 'Private 6-pack charter with Captain Clowers out of Mission Bay. Targeting yellowtail and calico bass along the kelp lines. Personalized instruction, all tackle provided. Perfect for small groups wanting a premium experience.',
    targetSpecies: ['yellowtail', 'calico bass', 'white seabass', 'barracuda'],
    charterType: 'private_charter',
    operator: 'Captain Clowers Charters',
    maxPassengers: 6,
    privateBoatRate: 1500,
  },
  {
    id: 'pc-clowers-0406',
    boatName: 'Capt. Clowers Charter',
    landing: 'private_charter',
    departureDate: '2026-04-06',
    departureTime: '5:00 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 200,
    maxAnglers: 6,
    spotsLeft: 6,
    description: '3/4 day private charter targeting inshore species and kelp bass. Captain Clowers has 20+ years of experience in San Diego waters. Light tackle and fly fishing friendly.',
    targetSpecies: ['calico bass', 'yellowtail', 'sheephead', 'barracuda'],
    charterType: 'private_charter',
    operator: 'Captain Clowers Charters',
    maxPassengers: 6,
    privateBoatRate: 1200,
  },
  {
    id: 'pc-boundless-0404',
    boatName: 'Boundless',
    landing: 'private_charter',
    departureDate: '2026-04-04',
    departureTime: '5:30 AM',
    duration: 'Full Day',
    durationHours: 10,
    pricePerPerson: 275,
    maxAnglers: 6,
    spotsLeft: 4,
    description: 'Boundless Boat Charters offers a premium offshore experience out of Shelter Island. Full day targeting bluefin and yellowfin tuna on the outer banks. Top-of-the-line gear, experienced captain, and a focus on putting you on fish.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'],
    charterType: 'private_charter',
    operator: 'Boundless Boat Charters',
    maxPassengers: 6,
    privateBoatRate: 1650,
  },
  {
    id: 'pc-boundless-0407',
    boatName: 'Boundless',
    landing: 'private_charter',
    departureDate: '2026-04-07',
    departureTime: '6:00 AM',
    duration: '1/2 Day AM',
    durationHours: 5,
    pricePerPerson: 175,
    maxAnglers: 6,
    spotsLeft: 6,
    description: 'Half-day morning charter perfect for families or first-timers. Boundless runs the bay and nearshore kelp beds for calico bass and sand bass. All gear and bait included.',
    targetSpecies: ['calico bass', 'sand bass', 'sheephead', 'rockfish'],
    charterType: 'private_charter',
    operator: 'Boundless Boat Charters',
    maxPassengers: 6,
    privateBoatRate: 1050,
  },
  {
    id: 'pc-coletta-0405',
    boatName: 'Coletta',
    landing: 'private_charter',
    departureDate: '2026-04-05',
    departureTime: '5:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 300,
    maxAnglers: 6,
    spotsLeft: 6,
    description: 'Coletta Sportfishing runs a full day offshore trip from Mission Bay. Known for finding the bite on tuna and yellowtail. This is a serious fishing trip for anglers who want to put fish on the deck. Premium tackle available.',
    targetSpecies: ['bluefin tuna', 'yellowtail', 'dorado', 'yellowfin tuna'],
    charterType: 'private_charter',
    operator: 'Coletta Sportfishing',
    maxPassengers: 6,
    privateBoatRate: 1800,
  },
  {
    id: 'pc-coletta-0408',
    boatName: 'Coletta',
    landing: 'private_charter',
    departureDate: '2026-04-08',
    departureTime: '5:30 AM',
    duration: 'Overnight',
    durationHours: 20,
    pricePerPerson: 425,
    maxAnglers: 6,
    spotsLeft: 6,
    description: 'Overnight private charter hitting the offshore banks for tuna. Coletta Sportfishing provides an intimate experience — just your group, a skilled captain, and world-class fishing. Dinner and breakfast included.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail'],
    charterType: 'private_charter',
    operator: 'Coletta Sportfishing',
    maxPassengers: 6,
    privateBoatRate: 2550,
  },
  {
    id: 'pc-ironclad-0403',
    boatName: 'Ironclad',
    landing: 'private_charter',
    departureDate: '2026-04-03',
    departureTime: '6:00 AM',
    duration: '3/4 Day',
    durationHours: 8,
    pricePerPerson: 215,
    maxAnglers: 6,
    spotsLeft: 6,
    description: 'Ironclad Sportfishing runs a tight ship out of Shelter Island. 3/4 day targeting yellowtail and white seabass on the Coronado Islands. Known for aggressive fish-finding and non-stop action.',
    targetSpecies: ['yellowtail', 'white seabass', 'calico bass', 'barracuda'],
    charterType: 'private_charter',
    operator: 'Ironclad Sportfishing',
    maxPassengers: 6,
    privateBoatRate: 1290,
  },
  {
    id: 'pc-ironclad-0409',
    boatName: 'Ironclad',
    landing: 'private_charter',
    departureDate: '2026-04-09',
    departureTime: '5:00 AM',
    duration: 'Full Day',
    durationHours: 12,
    pricePerPerson: 265,
    maxAnglers: 6,
    spotsLeft: 2,
    description: 'Full day offshore run with Ironclad. Heading to the 9 Mile Bank and beyond for tuna. This trip has limited availability — Captain runs it only when conditions are right. Serious anglers only.',
    targetSpecies: ['bluefin tuna', 'yellowtail', 'dorado'],
    charterType: 'private_charter',
    operator: 'Ironclad Sportfishing',
    maxPassengers: 6,
    privateBoatRate: 1590,
  },
];

// ---------------------------------------------------------------------------
// Extend schedule through May 31 by repeating weekly boat patterns
// ---------------------------------------------------------------------------

/**
 * Each template defines a boat that runs on certain days of the week.
 * dayOfWeek: 0=Sun … 6=Sat
 */
interface WeeklyTemplate {
  boatName: string;
  landing: ScheduledTrip['landing'];
  dayOfWeek: number[];
  departureTime: string;
  duration: ScheduledTrip['duration'];
  durationHours: number;
  pricePerPerson: number;
  maxAnglers: number;
  spotsLeft: number;
  description: string;
  targetSpecies: string[];
  mmsi?: number;
  charterType?: ScheduledTrip['charterType'];
  operator?: string;
  maxPassengers?: number;
  privateBoatRate?: number;
}

const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  // Seaforth — New Seaforth AM/PM half-days daily
  {
    boatName: 'New Seaforth', landing: 'seaforth', dayOfWeek: [0,1,2,3,4,5,6],
    departureTime: '6:00 AM', duration: '1/2 Day AM', durationHours: 5,
    pricePerPerson: 75, maxAnglers: 65, spotsLeft: 22,
    description: 'Morning half-day targeting kelp bass and yellows along the Coronado Islands kelp line.',
    targetSpecies: ['calico bass', 'yellowtail', 'sheephead', 'sculpin'], mmsi: 367703230,
  },
  {
    boatName: 'New Seaforth', landing: 'seaforth', dayOfWeek: [0,1,2,3,4,5,6],
    departureTime: '1:00 PM', duration: '1/2 Day PM', durationHours: 5,
    pricePerPerson: 75, maxAnglers: 65, spotsLeft: 30,
    description: 'Afternoon half-day targeting kelp bass and barracuda near the Islands.',
    targetSpecies: ['calico bass', 'barracuda', 'sheephead'], mmsi: 367703230,
  },
  // Seaforth — San Diego 3/4 day Wed–Sun
  {
    boatName: 'San Diego', landing: 'seaforth', dayOfWeek: [0,3,4,5,6],
    departureTime: '6:30 AM', duration: '3/4 Day', durationHours: 10,
    pricePerPerson: 150, maxAnglers: 45, spotsLeft: 15,
    description: '3/4-day trip to the Coronado Islands for yellowtail and bass.',
    targetSpecies: ['yellowtail', 'calico bass', 'barracuda', 'white seabass'], mmsi: 366918840,
  },
  // Seaforth — Sea Watch full day Fri/Sat/Sun
  {
    boatName: 'Sea Watch', landing: 'seaforth', dayOfWeek: [0,5,6],
    departureTime: '5:00 AM', duration: 'Full Day', durationHours: 16,
    pricePerPerson: 250, maxAnglers: 35, spotsLeft: 10,
    description: 'Full-day offshore trip targeting tuna and yellowtail at the banks.',
    targetSpecies: ['bluefin tuna', 'yellowtail', 'dorado'], mmsi: 367710460,
  },
  // Fisherman's — Dolphin 3/4 day daily
  {
    boatName: 'Dolphin', landing: 'fishermans', dayOfWeek: [0,1,2,3,4,5,6],
    departureTime: '6:00 AM', duration: '3/4 Day', durationHours: 10,
    pricePerPerson: 80, maxAnglers: 50, spotsLeft: 20,
    description: '3/4-day trip to the Islands for yellowtail and bass.',
    targetSpecies: ['yellowtail', 'calico bass', 'barracuda'], mmsi: 367453390,
  },
  // Fisherman's — Liberty full day Tue/Thu/Sat/Sun
  {
    boatName: 'Liberty', landing: 'fishermans', dayOfWeek: [0,2,4,6],
    departureTime: '5:30 AM', duration: 'Full Day', durationHours: 16,
    pricePerPerson: 250, maxAnglers: 40, spotsLeft: 12,
    description: 'Full-day offshore run to the banks for tuna and yellowtail.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'dorado'], mmsi: 367678200,
  },
  // Fisherman's — Pacific Queen overnight Fri/Sat
  {
    boatName: 'Pacific Queen', landing: 'fishermans', dayOfWeek: [5,6],
    departureTime: '10:00 PM', duration: 'Overnight', durationHours: 20,
    pricePerPerson: 375, maxAnglers: 30, spotsLeft: 8,
    description: 'Overnight trip to the outer banks targeting tuna and yellowtail.',
    targetSpecies: ['bluefin tuna', 'yellowfin tuna', 'yellowtail'], mmsi: 367438790,
  },
  // H&M Landing — Mission Belle half day daily
  {
    boatName: 'Mission Belle', landing: 'hm_landing', dayOfWeek: [0,1,2,3,4,5,6],
    departureTime: '7:30 AM', duration: '1/2 Day AM', durationHours: 5,
    pricePerPerson: 70, maxAnglers: 50, spotsLeft: 25,
    description: 'Morning half-day trip from H&M Landing targeting local species.',
    targetSpecies: ['calico bass', 'sculpin', 'sand bass'],
  },
  // H&M Landing — Patriot 3/4 day Fri–Sun
  {
    boatName: 'Patriot', landing: 'hm_landing', dayOfWeek: [0,5,6],
    departureTime: '6:00 AM', duration: '3/4 Day', durationHours: 10,
    pricePerPerson: 140, maxAnglers: 45, spotsLeft: 18,
    description: '3/4-day trip from H&M Landing targeting yellowtail and bass.',
    targetSpecies: ['yellowtail', 'calico bass', 'barracuda', 'white seabass'],
  },
  // Point Loma — Point Loma half day daily
  {
    boatName: 'Point Loma', landing: 'point_loma', dayOfWeek: [0,1,2,3,4,5,6],
    departureTime: '6:00 AM', duration: '1/2 Day AM', durationHours: 5,
    pricePerPerson: 68, maxAnglers: 55, spotsLeft: 20,
    description: 'Morning half-day out of Point Loma targeting kelp bass and rockfish.',
    targetSpecies: ['calico bass', 'rockfish', 'sculpin', 'sheephead'],
  },
  // Point Loma — New Lo-An 3/4 day Wed/Thu/Fri/Sat/Sun
  {
    boatName: 'New Lo-An', landing: 'point_loma', dayOfWeek: [0,3,4,5,6],
    departureTime: '6:30 AM', duration: '3/4 Day', durationHours: 10,
    pricePerPerson: 135, maxAnglers: 40, spotsLeft: 14,
    description: '3/4-day from Point Loma targeting yellowtail and bass at the Islands.',
    targetSpecies: ['yellowtail', 'calico bass', 'white seabass'],
  },
  // Helgren's — Helgren's 95 half day daily
  {
    boatName: "Helgren's 95", landing: 'helgrens', dayOfWeek: [0,1,2,3,4,5,6],
    departureTime: '6:30 AM', duration: '1/2 Day AM', durationHours: 5,
    pricePerPerson: 65, maxAnglers: 60, spotsLeft: 28,
    description: 'Morning half-day from Oceanside targeting local bass and rockfish.',
    targetSpecies: ['calico bass', 'rockfish', 'barracuda', 'sculpin'],
  },
];

/**
 * Generate trips for a date range based on weekly templates.
 * startIso/endIso are inclusive ISO date strings e.g. '2026-04-10'.
 */
function generateWeeklyTrips(startIso: string, endIso: string): ScheduledTrip[] {
  const result: ScheduledTrip[] = [];
  const start = new Date(startIso + 'T12:00:00');
  const end = new Date(endIso + 'T12:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const iso = d.toISOString().split('T')[0];
    const dayNum = iso.replace(/-/g, '').slice(4); // "0410"

    for (const tpl of WEEKLY_TEMPLATES) {
      if (!tpl.dayOfWeek.includes(dow)) continue;

      // Slight randomization of spots left so it feels real
      const spotsVariance = Math.floor(Math.random() * 8) - 3;
      const spots = Math.max(2, Math.min(tpl.maxAnglers - 5, tpl.spotsLeft + spotsVariance));

      const trip: ScheduledTrip = {
        id: `gen-${tpl.boatName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${dayNum}-${tpl.duration.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        boatName: tpl.boatName,
        landing: tpl.landing,
        departureDate: iso,
        departureTime: tpl.departureTime,
        duration: tpl.duration,
        durationHours: tpl.durationHours,
        pricePerPerson: tpl.pricePerPerson,
        maxAnglers: tpl.maxAnglers,
        spotsLeft: spots,
        description: tpl.description,
        targetSpecies: [...tpl.targetSpecies],
      };

      if (tpl.mmsi) trip.mmsi = tpl.mmsi;
      if (tpl.charterType) trip.charterType = tpl.charterType;
      if (tpl.operator) trip.operator = tpl.operator;
      if (tpl.maxPassengers) trip.maxPassengers = tpl.maxPassengers;
      if (tpl.privateBoatRate) trip.privateBoatRate = tpl.privateBoatRate;

      result.push(trip);
    }
  }

  return result;
}

// Add generated trips from April 10 through May 31 (after hand-curated dates end)
const GENERATED_TRIPS = generateWeeklyTrips('2026-04-10', '2026-05-31');
TRIP_SCHEDULE.push(...GENERATED_TRIPS);

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
