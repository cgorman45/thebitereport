#!/usr/bin/env npx tsx
/**
 * Seed realistic 48-hour vessel trajectory data for the God's Eye 4D visualization.
 * Generates transit-out, fishing, and transit-back patterns for 12 boats.
 *
 * Usage: npx tsx scripts/seed-vessel-trajectories.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local (same pattern as seed-boat-stops.ts) ────────────────────
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Constants ───────────────────────────────────────────────────────────────
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between positions
const TOTAL_HOURS = 48;
const TOTAL_POINTS = (TOTAL_HOURS * 60) / 5; // 576 points per boat

const HARBOR = { lat: 32.715, lng: -117.175 }; // San Diego harbor

interface Boat {
  mmsi: number;
  name: string;
  fishLat: number;
  fishLng: number;
}

const BOATS: Boat[] = [
  { mmsi: 367438800, name: 'Mission Belle', fishLat: 32.52, fishLng: -117.38 },
  { mmsi: 367516700, name: 'Patriot', fishLat: 32.525, fishLng: -117.375 },
  { mmsi: 367672130, name: 'Fortune', fishLat: 32.518, fishLng: -117.385 },
  { mmsi: 367678200, name: 'Liberty', fishLat: 32.42, fishLng: -117.26 },
  { mmsi: 338312000, name: 'Islander', fishLat: 32.415, fishLng: -117.255 },
  { mmsi: 367469480, name: 'Excel', fishLat: 33.35, fishLng: -118.40 },
  { mmsi: 367612350, name: 'Pegasus', fishLat: 33.348, fishLng: -118.405 },
  { mmsi: 367438790, name: 'Pacific Queen', fishLat: 33.355, fishLng: -118.395 },
  { mmsi: 367004700, name: 'Highliner', fishLat: 32.90, fishLng: -118.55 },
  { mmsi: 367547700, name: 'Cortez', fishLat: 32.905, fishLng: -118.545 },
  { mmsi: 367453390, name: 'Dolphin', fishLat: 32.88, fishLng: -117.42 },
  { mmsi: 367469470, name: 'Polaris Supreme', fishLat: 31.85, fishLng: -117.53 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Degrees → radians */
const deg2rad = (d: number) => (d * Math.PI) / 180;
/** Radians → degrees */
const rad2deg = (r: number) => (r * 180) / Math.PI;

/** Bearing from point A to point B in degrees 0-360 */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = deg2rad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLng);
  return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}

/** Haversine distance in nautical miles */
function distNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3440.065; // Earth radius in nm
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Small random jitter */
function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * 2 * range;
}

/** Normalize angle to 0-360 */
function normAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

// ── Trajectory generation ───────────────────────────────────────────────────

interface Point {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  cog: number;
}

function generateTrajectory(boat: Boat): Point[] {
  const points: Point[] = [];

  const dist = distNm(HARBOR.lat, HARBOR.lng, boat.fishLat, boat.fishLng);
  const transitSpeed = jitter(10, 2); // 8-12 knots
  const transitHours = dist / transitSpeed;
  const transitSteps = Math.round((transitHours * 60) / 5);

  const fishingHours = jitter(6, 2); // 4-8 hours
  const fishingSteps = Math.round((fishingHours * 60) / 5);

  const returnSteps = Math.round(transitSteps * jitter(1.0, 0.05));

  // Pad the rest with harbor idle if needed
  const usedSteps = transitSteps + fishingSteps + returnSteps;

  // ── Phase 1: Transit out ──────────────────────────────────────────────
  const hdgOut = bearing(HARBOR.lat, HARBOR.lng, boat.fishLat, boat.fishLng);
  const dLatOut = (boat.fishLat - HARBOR.lat) / transitSteps;
  const dLngOut = (boat.fishLng - HARBOR.lng) / transitSteps;

  for (let i = 0; i < transitSteps; i++) {
    const frac = i / transitSteps;
    const lat = HARBOR.lat + dLatOut * i + jitter(0, 0.001);
    const lng = HARBOR.lng + dLngOut * i + jitter(0, 0.001);
    // Ramp up speed in first few steps (leaving harbor)
    const ramp = Math.min(1, frac * 5);
    const spd = jitter(transitSpeed, 0.5) * ramp;
    const hdg = normAngle(hdgOut + jitter(0, 3));
    points.push({ lat, lng, speed: Math.max(0, spd), heading: hdg, cog: hdg });
  }

  // ── Phase 2: Fishing ──────────────────────────────────────────────────
  // Simulate figure-8 / circling around the fishing spot with occasional stops
  const fishCenterLat = boat.fishLat;
  const fishCenterLng = boat.fishLng;
  const orbitRadius = 0.005 + Math.random() * 0.005; // ~0.3-0.6 nm radius
  const orbitPeriod = 20 + Math.random() * 20; // steps per orbit (100-200 min)
  let stopped = false;
  let stopCountdown = 0;

  for (let i = 0; i < fishingSteps; i++) {
    // Decide whether to stop
    if (!stopped && stopCountdown <= 0 && Math.random() < 0.03) {
      // Start a stop: 4-12 steps (20-60 min)
      stopped = true;
      stopCountdown = 4 + Math.floor(Math.random() * 9);
    }

    if (stopped) {
      // Drifting at near-zero speed
      const lat = fishCenterLat + jitter(0, 0.001);
      const lng = fishCenterLng + jitter(0, 0.001);
      const hdg = normAngle(jitter(180, 180));
      points.push({ lat, lng, speed: jitter(0.1, 0.1), heading: hdg, cog: hdg });
      stopCountdown--;
      if (stopCountdown <= 0) stopped = false;
    } else {
      // Figure-8 / orbit pattern
      const angle = (2 * Math.PI * i) / orbitPeriod;
      // figure-8: use sin(angle) for lat, sin(2*angle) for lng
      const lat = fishCenterLat + orbitRadius * Math.sin(angle) + jitter(0, 0.0005);
      const lng = fishCenterLng + orbitRadius * 0.7 * Math.sin(2 * angle) + jitter(0, 0.0005);
      const spd = jitter(1.2, 0.7); // 0.5-2 knots
      // heading roughly tangent to orbit
      const nextAngle = (2 * Math.PI * (i + 1)) / orbitPeriod;
      const nextLat = fishCenterLat + orbitRadius * Math.sin(nextAngle);
      const nextLng = fishCenterLng + orbitRadius * 0.7 * Math.sin(2 * nextAngle);
      const hdg = normAngle(bearing(lat, lng, nextLat, nextLng) + jitter(0, 5));
      points.push({ lat, lng, speed: Math.max(0, spd), heading: hdg, cog: normAngle(hdg + jitter(0, 10)) });
    }
  }

  // ── Phase 3: Transit back ─────────────────────────────────────────────
  const lastFish = points[points.length - 1];
  const hdgBack = bearing(lastFish.lat, lastFish.lng, HARBOR.lat, HARBOR.lng);
  const dLatBack = (HARBOR.lat - lastFish.lat) / returnSteps;
  const dLngBack = (HARBOR.lng - lastFish.lng) / returnSteps;

  for (let i = 0; i < returnSteps; i++) {
    const frac = i / returnSteps;
    const lat = lastFish.lat + dLatBack * i + jitter(0, 0.001);
    const lng = lastFish.lng + dLngBack * i + jitter(0, 0.001);
    // Slow down approaching harbor
    const rampDown = Math.min(1, (returnSteps - i) / 5);
    const spd = jitter(transitSpeed, 0.5) * rampDown;
    const hdg = normAngle(hdgBack + jitter(0, 3));
    points.push({ lat, lng, speed: Math.max(0, spd), heading: hdg, cog: hdg });
  }

  // ── Phase 4: Idle at harbor (fill remaining time) ─────────────────────
  const remaining = TOTAL_POINTS - points.length;
  for (let i = 0; i < remaining; i++) {
    points.push({
      lat: HARBOR.lat + jitter(0, 0.001),
      lng: HARBOR.lng + jitter(0, 0.001),
      speed: 0,
      heading: jitter(180, 180),
      cog: jitter(180, 180),
    });
  }

  // Trim to exact length if we overshot
  return points.slice(0, TOTAL_POINTS);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding vessel trajectories (48 h, 12 boats)...\n');

  // Clear existing data
  console.log('Clearing existing vessel_trajectories...');
  await supabase.from('vessel_trajectories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const startTime = Date.now() - TOTAL_HOURS * 60 * 60 * 1000;
  let totalInserted = 0;

  for (const boat of BOATS) {
    const trajectory = generateTrajectory(boat);

    // Build row objects
    const rows = trajectory.map((pt, i) => ({
      mmsi: boat.mmsi,
      boat_name: boat.name,
      lat: Math.round(pt.lat * 1e6) / 1e6,
      lng: Math.round(pt.lng * 1e6) / 1e6,
      speed: Math.round(pt.speed * 10) / 10,
      heading: Math.round(pt.heading * 10) / 10,
      cog: Math.round(pt.cog * 10) / 10,
      timestamp: new Date(startTime + i * INTERVAL_MS).toISOString(),
    }));

    // Insert in batches of 100
    for (let b = 0; b < rows.length; b += 100) {
      const batch = rows.slice(b, b + 100);
      const { error } = await supabase.from('vessel_trajectories').insert(batch);
      if (error) {
        console.error(`  ERROR inserting batch for ${boat.name}: ${error.message}`);
        return;
      }
    }

    totalInserted += rows.length;
    console.log(`  ${boat.name} (${boat.mmsi}): ${rows.length} points`);
  }

  console.log(`\nInserted ${totalInserted} trajectory points for ${BOATS.length} boats.`);
  console.log('Done.');
}

seed().catch(console.error);
