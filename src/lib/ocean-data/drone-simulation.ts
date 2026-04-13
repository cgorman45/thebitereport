/**
 * Drone Simulation for Phase 2 Demo
 *
 * Two VIDAR-equipped drones launching from Carlsbad:
 * - Drone North: covers fishing spots north (Catalina, SCI, 14 Mile, Avalon, etc.)
 * - Drone South: covers fishing spots south (Nine Mile, Coronados, Kidney Bank, etc.)
 *
 * Each drone:
 * - Speed: 100 km/h
 * - Altitude: 1500ft (457m) above sea level
 * - VIDAR scan width: ~1km swath below (pyramid scan pattern)
 * - Two 8-hour sorties per day (05:00-13:00, 13:00-21:00)
 */

import { FISHING_SPOTS } from './fishing-spots';

// Carlsbad launch point
const CARLSBAD = { lat: 33.158, lng: -117.350 };

// Haversine distance
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get fishing spots within range, sorted by bearing
function getSpotsInRange(maxRangeKm: number, direction: 'north' | 'south') {
  return FISHING_SPOTS
    .filter(s => {
      const dist = distKm(CARLSBAD.lat, CARLSBAD.lng, s.lat, s.lng);
      if (dist > maxRangeKm) return false;
      if (direction === 'north') return s.lat >= CARLSBAD.lat - 0.5; // North + nearby
      return s.lat <= CARLSBAD.lat + 0.5; // South + nearby
    })
    .sort((a, b) => {
      // Sort by bearing from Carlsbad
      const bearA = Math.atan2(a.lng - CARLSBAD.lng, a.lat - CARLSBAD.lat);
      const bearB = Math.atan2(b.lng - CARLSBAD.lng, b.lat - CARLSBAD.lat);
      return direction === 'north' ? bearA - bearB : bearB - bearA;
    });
}

export interface DroneWaypoint {
  lat: number;
  lng: number;
  altitude: number; // meters
  timestamp: number; // ms since midnight
  action: 'transit' | 'scanning' | 'loiter' | 'return';
  spotName?: string;
}

export interface DroneFlightPlan {
  id: string;
  name: string;
  direction: 'north' | 'south';
  color: string;
  sortie: 1 | 2;
  startHour: number; // 5 or 13
  waypoints: DroneWaypoint[];
  scanWidthKm: number;
}

/**
 * Generate a flight plan for a drone.
 * The drone visits fishing spots in order, spending time scanning each one.
 */
function generateFlightPlan(
  direction: 'north' | 'south',
  sortie: 1 | 2,
): DroneFlightPlan {
  const startHour = sortie === 1 ? 5 : 13;
  const flightDurationMs = 8 * 60 * 60 * 1000; // 8 hours
  const speedKmH = 100;
  const altitude = 457; // 1500ft in meters
  const scanWidthKm = 3; // VIDAR 180° sweep: ~1.5km each side at 1500ft

  const spots = getSpotsInRange(100, direction);
  const waypoints: DroneWaypoint[] = [];

  let currentTime = startHour * 60 * 60 * 1000; // ms since midnight
  const endTime = currentTime + flightDurationMs;
  let currentLat = CARLSBAD.lat;
  let currentLng = CARLSBAD.lng;

  // Launch from Carlsbad
  waypoints.push({
    lat: CARLSBAD.lat,
    lng: CARLSBAD.lng,
    altitude: 0,
    timestamp: currentTime,
    action: 'transit',
    spotName: 'Carlsbad (Launch)',
  });

  // Climb to altitude (2 min)
  currentTime += 2 * 60 * 1000;
  waypoints.push({
    lat: CARLSBAD.lat,
    lng: CARLSBAD.lng,
    altitude,
    timestamp: currentTime,
    action: 'transit',
    spotName: 'Climbing',
  });

  // Visit each fishing spot
  for (const spot of spots) {
    if (currentTime >= endTime - 60 * 60 * 1000) break; // Reserve 1hr for return

    // Transit to spot
    const dist = distKm(currentLat, currentLng, spot.lat, spot.lng);
    const transitTimeMs = (dist / speedKmH) * 60 * 60 * 1000;

    // Add intermediate transit points every 2 minutes
    const transitSteps = Math.max(1, Math.floor(transitTimeMs / (2 * 60 * 1000)));
    for (let step = 1; step <= transitSteps; step++) {
      const t = step / transitSteps;
      waypoints.push({
        lat: currentLat + (spot.lat - currentLat) * t,
        lng: currentLng + (spot.lng - currentLng) * t,
        altitude,
        timestamp: currentTime + transitTimeMs * t,
        action: 'transit',
      });
    }

    currentTime += transitTimeMs;
    currentLat = spot.lat;
    currentLng = spot.lng;

    // Scan the spot — orbit around it for 15-30 min
    const scanDuration = Math.min(30, 15 + spot.radiusKm * 2) * 60 * 1000;
    const scanSteps = Math.floor(scanDuration / (30 * 1000)); // Every 30 seconds

    for (let step = 0; step < scanSteps; step++) {
      const angle = (step / scanSteps) * 2 * Math.PI;
      const orbitRadius = spot.radiusKm * 0.7; // Orbit at 70% of geofence radius
      const R = 6371;
      const dLat = (orbitRadius * Math.cos(angle) / R) * (180 / Math.PI);
      const dLng = (orbitRadius * Math.sin(angle) / (R * Math.cos(spot.lat * Math.PI / 180))) * (180 / Math.PI);

      waypoints.push({
        lat: spot.lat + dLat,
        lng: spot.lng + dLng,
        altitude,
        timestamp: currentTime + (step / scanSteps) * scanDuration,
        action: 'scanning',
        spotName: spot.name,
      });
    }

    currentTime += scanDuration;
  }

  // Return to Carlsbad
  const returnDist = distKm(currentLat, currentLng, CARLSBAD.lat, CARLSBAD.lng);
  const returnTime = (returnDist / speedKmH) * 60 * 60 * 1000;
  const returnSteps = Math.max(1, Math.floor(returnTime / (2 * 60 * 1000)));

  for (let step = 1; step <= returnSteps; step++) {
    const t = step / returnSteps;
    waypoints.push({
      lat: currentLat + (CARLSBAD.lat - currentLat) * t,
      lng: currentLng + (CARLSBAD.lng - currentLng) * t,
      altitude: altitude * (1 - t * 0.3), // Gradual descent
      timestamp: currentTime + returnTime * t,
      action: 'return',
    });
  }

  // Landing
  waypoints.push({
    lat: CARLSBAD.lat,
    lng: CARLSBAD.lng,
    altitude: 0,
    timestamp: currentTime + returnTime + 2 * 60 * 1000,
    action: 'return',
    spotName: 'Carlsbad (Landing)',
  });

  return {
    id: `drone-${direction}-s${sortie}`,
    name: `Drone ${direction === 'north' ? 'North' : 'South'} (Sortie ${sortie})`,
    direction,
    color: direction === 'north' ? '#00d4ff' : '#a855f7',
    sortie,
    startHour,
    waypoints,
    scanWidthKm,
  };
}

/**
 * Get drone position at a given time (ms since midnight).
 */
export function getDronePosition(
  plan: DroneFlightPlan,
  timeMs: number,
): { lat: number; lng: number; altitude: number; heading: number; action: string; spotName?: string } | null {
  if (plan.waypoints.length < 2) return null;

  // Find the two waypoints we're between
  for (let i = 0; i < plan.waypoints.length - 1; i++) {
    const wp1 = plan.waypoints[i];
    const wp2 = plan.waypoints[i + 1];

    if (timeMs >= wp1.timestamp && timeMs <= wp2.timestamp) {
      const t = (timeMs - wp1.timestamp) / (wp2.timestamp - wp1.timestamp);
      const lat = wp1.lat + (wp2.lat - wp1.lat) * t;
      const lng = wp1.lng + (wp2.lng - wp1.lng) * t;
      const alt = wp1.altitude + (wp2.altitude - wp1.altitude) * t;

      // Calculate heading
      const dLng = wp2.lng - wp1.lng;
      const dLat = wp2.lat - wp1.lat;
      const heading = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;

      return {
        lat, lng, altitude: alt, heading,
        action: wp2.action,
        spotName: wp2.spotName || wp1.spotName,
      };
    }
  }

  return null;
}

/**
 * Generate all 4 flight plans (2 drones x 2 sorties).
 */
export function generateAllFlightPlans(): DroneFlightPlan[] {
  return [
    generateFlightPlan('north', 1),
    generateFlightPlan('south', 1),
    generateFlightPlan('north', 2),
    generateFlightPlan('south', 2),
  ];
}

/**
 * Get VIDAR scan area on ocean surface.
 *
 * VIDAR uses a 180° sweep perpendicular to flight path.
 * At 1,500ft (457m), effective scan width is ~3km (1.5km each side).
 * Returns 4 corners of the ground footprint + closing point.
 */
export function getVidarScanArea(
  lat: number, lng: number, heading: number, widthKm: number, lengthKm: number = 2,
): [number, number][] {
  const R = 6371;
  const headingRad = (heading * Math.PI) / 180;
  const perpRad = headingRad + Math.PI / 2;

  const halfW = widthKm / 2;

  // 4 corners of the scan rectangle
  const corners: [number, number][] = [];

  for (const [along, across] of [
    [-lengthKm / 2, -halfW],
    [-lengthKm / 2, halfW],
    [lengthKm / 2, halfW],
    [lengthKm / 2, -halfW],
  ]) {
    const dLat = (along * Math.cos(headingRad) + across * Math.cos(perpRad)) / R * (180 / Math.PI);
    const dLng = (along * Math.sin(headingRad) + across * Math.sin(perpRad)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    corners.push([lng + dLng, lat + dLat]);
  }

  corners.push(corners[0]); // Close the polygon
  return corners;
}

/**
 * Get VIDAR 180° sweep fan — array of points forming the fan arc on the ground.
 * The VIDAR sweeps perpendicular to flight direction, 90° to each side.
 */
export function getVidarFanPoints(
  lat: number, lng: number, altitude: number, heading: number,
): { left: [number, number]; right: [number, number]; arcPoints: [number, number][] } {
  const R = 6371;
  // Effective ground range at 1500ft — VIDAR sees ~1.5km to each side
  const groundRangeKm = Math.max(1, altitude * 0.003); // ~1.37km at 457m
  const headingRad = (heading * Math.PI) / 180;

  // Perpendicular directions
  const leftRad = headingRad - Math.PI / 2;
  const rightRad = headingRad + Math.PI / 2;

  const offsetPt = (angleDeg: number, distKm: number): [number, number] => {
    const rad = (angleDeg * Math.PI) / 180;
    const dLat = (distKm * Math.cos(rad) / R) * (180 / Math.PI);
    const dLng = (distKm * Math.sin(rad) / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
    return [lng + dLng, lat + dLat];
  };

  const leftDeg = (leftRad * 180) / Math.PI;
  const rightDeg = (rightRad * 180) / Math.PI;

  const left = offsetPt(leftDeg, groundRangeKm);
  const right = offsetPt(rightDeg, groundRangeKm);

  // Arc points for the sweep fan (semicircle on the ground)
  const arcPoints: [number, number][] = [];
  const startAngle = leftDeg;
  const endAngle = rightDeg;
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Interpolate angle from left to right (going through front)
    let angle = startAngle + t * (((endAngle - startAngle + 360) % 360) || 360);
    if (Math.abs(endAngle - startAngle) < 180) {
      angle = startAngle + t * (endAngle - startAngle);
    }
    arcPoints.push(offsetPt(angle, groundRangeKm));
  }

  return { left, right, arcPoints };
}
