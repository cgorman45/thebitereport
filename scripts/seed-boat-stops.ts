#!/usr/bin/env npx tsx
/**
 * Seed realistic boat stop data for demo purposes.
 * Creates stops at known kelp paddy hotspots with varying scores.
 *
 * Usage: npx tsx scripts/seed-boat-stops.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const now = Date.now();
const hour = 60 * 60 * 1000;
const min = 60 * 1000;

// Realistic boat stop scenarios at known kelp paddy areas
const STOPS = [
  // HIGH SCORE: Nine Mile Bank — 3 boats stopped, 2 confirmed
  {
    mmsi: 367438800, boat_name: 'Mission Belle', lat: 32.52, lng: -117.38,
    stopped_at: new Date(now - 3 * hour).toISOString(), duration_minutes: 45,
    confirmed: true, confirming_mmsi: 367516700, confirming_boat: 'Patriot',
  },
  {
    mmsi: 367516700, boat_name: 'Patriot', lat: 32.525, lng: -117.375,
    stopped_at: new Date(now - 2.5 * hour).toISOString(), duration_minutes: 30,
    confirmed: true, confirming_mmsi: 367438800, confirming_boat: 'Mission Belle',
  },
  {
    mmsi: 367672130, boat_name: 'Fortune', lat: 32.518, lng: -117.385,
    stopped_at: new Date(now - 1.5 * hour).toISOString(), duration_minutes: 25,
    confirmed: true, confirming_mmsi: 367438800, confirming_boat: 'Mission Belle',
  },

  // MEDIUM SCORE: Coronado Islands — 2 boats
  {
    mmsi: 367678200, boat_name: 'Liberty', lat: 32.42, lng: -117.26,
    stopped_at: new Date(now - 5 * hour).toISOString(), duration_minutes: 35,
    confirmed: true, confirming_mmsi: 338312000, confirming_boat: 'Islander',
  },
  {
    mmsi: 338312000, boat_name: 'Islander', lat: 32.415, lng: -117.255,
    stopped_at: new Date(now - 4 * hour).toISOString(), duration_minutes: 20,
    confirmed: true, confirming_mmsi: 367678200, confirming_boat: 'Liberty',
  },

  // LOW SCORE: Offshore La Jolla — 1 boat, long stop
  {
    mmsi: 367453390, boat_name: 'Dolphin', lat: 32.88, lng: -117.42,
    stopped_at: new Date(now - 6 * hour).toISOString(), duration_minutes: 40,
    confirmed: false,
  },

  // LOW SCORE: Ensenada corridor — 1 boat, short stop
  {
    mmsi: 367469470, boat_name: 'Polaris Supreme', lat: 31.85, lng: -117.53,
    stopped_at: new Date(now - 8 * hour).toISOString(), duration_minutes: 12,
    confirmed: false,
  },

  // MEDIUM: San Clemente Island — 2 boats
  {
    mmsi: 367004700, boat_name: 'Highliner', lat: 32.90, lng: -118.55,
    stopped_at: new Date(now - 10 * hour).toISOString(), duration_minutes: 55,
    confirmed: true, confirming_mmsi: 367547700, confirming_boat: 'Cortez',
  },
  {
    mmsi: 367547700, boat_name: 'Cortez', lat: 32.905, lng: -118.545,
    stopped_at: new Date(now - 9 * hour).toISOString(), duration_minutes: 28,
    confirmed: true, confirming_mmsi: 367004700, confirming_boat: 'Highliner',
  },

  // HIGH: Catalina — 3 boats converged
  {
    mmsi: 367469480, boat_name: 'Excel', lat: 33.35, lng: -118.40,
    stopped_at: new Date(now - 7 * hour).toISOString(), duration_minutes: 60,
    confirmed: true, confirming_mmsi: 367612350, confirming_boat: 'Pegasus',
  },
  {
    mmsi: 367612350, boat_name: 'Pegasus', lat: 33.348, lng: -118.405,
    stopped_at: new Date(now - 6.5 * hour).toISOString(), duration_minutes: 35,
    confirmed: true, confirming_mmsi: 367469480, confirming_boat: 'Excel',
  },
  {
    mmsi: 367438790, boat_name: 'Pacific Queen', lat: 33.355, lng: -118.395,
    stopped_at: new Date(now - 6 * hour).toISOString(), duration_minutes: 22,
    confirmed: true, confirming_mmsi: 367469480, confirming_boat: 'Excel',
  },
];

async function seed() {
  console.log('Seeding boat stops for demo...\n');

  // Clear existing stops
  await supabase.from('boat_stops').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const rows = STOPS.map(s => ({
    mmsi: s.mmsi,
    boat_name: s.boat_name,
    lat: s.lat,
    lng: s.lng,
    speed: 0,
    stopped_at: s.stopped_at,
    duration_minutes: s.duration_minutes,
    confirmed: s.confirmed,
    confirmed_at: s.confirmed ? s.stopped_at : null,
    confirming_mmsi: s.confirming_mmsi || null,
    confirming_boat: s.confirming_boat || null,
  }));

  const { error } = await supabase.from('boat_stops').insert(rows);
  if (error) {
    console.error('Failed:', error.message);
    return;
  }

  console.log(`Inserted ${rows.length} boat stops:`);
  console.log('  Nine Mile Bank: 3 boats (Score 9 — HIGH-RES satellite trigger)');
  console.log('  Coronado Islands: 2 boats (Score 6 — MED-RES satellite trigger)');
  console.log('  San Clemente Island: 2 boats (Score 6 — MED-RES satellite trigger)');
  console.log('  Catalina: 3 boats (Score 9 — HIGH-RES satellite trigger)');
  console.log('  Offshore La Jolla: 1 boat (Score 3)');
  console.log('  Ensenada corridor: 1 boat (Score 2)');
  console.log('\nVisit /demo/kelp-signals to see the dashboard.');
}

seed().catch(console.error);
