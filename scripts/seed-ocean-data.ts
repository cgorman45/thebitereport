#!/usr/bin/env npx tsx
/**
 * Seed Supabase with realistic sample kelp detections, drift predictions,
 * and current vectors so the ocean-data map layers render during development.
 *
 * Usage:
 *   npx tsx scripts/seed-ocean-data.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// --- Kelp paddy candidate locations ---
// Realistic offshore positions near known kelp forests
// These represent where floating paddies would be found
const KELP_DETECTIONS = [
  // Offshore San Diego — paddies drifting from Point Loma beds
  { lat: 32.72, lng: -117.35, confidence: 0.65, area_m2: 180 },
  { lat: 32.68, lng: -117.40, confidence: 0.45, area_m2: 90 },
  { lat: 32.80, lng: -117.38, confidence: 0.72, area_m2: 250 },
  // Offshore La Jolla
  { lat: 32.88, lng: -117.42, confidence: 0.58, area_m2: 150 },
  { lat: 32.92, lng: -117.45, confidence: 0.40, area_m2: 70 },
  // Offshore Carlsbad/Oceanside
  { lat: 33.15, lng: -117.48, confidence: 0.52, area_m2: 120 },
  // Dana Point / San Clemente
  { lat: 33.40, lng: -117.82, confidence: 0.68, area_m2: 200 },
  { lat: 33.35, lng: -117.90, confidence: 0.55, area_m2: 160 },
  // Catalina area — paddies in the channel
  { lat: 33.30, lng: -118.20, confidence: 0.78, area_m2: 350 },
  { lat: 33.25, lng: -118.10, confidence: 0.62, area_m2: 220 },
  { lat: 33.42, lng: -118.50, confidence: 0.50, area_m2: 100 },
  // San Clemente Island
  { lat: 32.90, lng: -118.60, confidence: 0.70, area_m2: 280 },
  { lat: 32.85, lng: -118.55, confidence: 0.48, area_m2: 110 },
  // Palos Verdes shelf
  { lat: 33.68, lng: -118.48, confidence: 0.75, area_m2: 300 },
  // Santa Barbara Channel
  { lat: 34.15, lng: -119.50, confidence: 0.60, area_m2: 170 },
  { lat: 34.10, lng: -119.35, confidence: 0.55, area_m2: 140 },
  // --- BAJA SOURCES ---
  // Ensenada / Punta Banda offshore
  { lat: 31.78, lng: -116.82, confidence: 0.72, area_m2: 260 },
  { lat: 31.72, lng: -116.85, confidence: 0.58, area_m2: 150 },
  { lat: 31.65, lng: -116.80, confidence: 0.45, area_m2: 95 },
  // San Quintin offshore
  { lat: 30.48, lng: -116.18, confidence: 0.62, area_m2: 190 },
  { lat: 30.42, lng: -116.12, confidence: 0.50, area_m2: 130 },
  // Isla Cedros — major kelp forest, lots of paddies
  { lat: 28.25, lng: -115.35, confidence: 0.80, area_m2: 400 },
  { lat: 28.18, lng: -115.40, confidence: 0.75, area_m2: 320 },
  { lat: 28.10, lng: -115.30, confidence: 0.68, area_m2: 240 },
  { lat: 28.00, lng: -115.35, confidence: 0.55, area_m2: 160 },
  // Isla Natividad
  { lat: 27.90, lng: -115.25, confidence: 0.65, area_m2: 210 },
  { lat: 27.85, lng: -115.22, confidence: 0.52, area_m2: 140 },
  // Bahia Tortugas
  { lat: 27.68, lng: -114.95, confidence: 0.58, area_m2: 170 },
  // Bahia Asuncion
  { lat: 27.12, lng: -114.35, confidence: 0.48, area_m2: 120 },
  // Punta Abreojos
  { lat: 26.72, lng: -113.65, confidence: 0.55, area_m2: 145 },
  // Bahia Magdalena (southern Baja kelp)
  { lat: 24.60, lng: -112.15, confidence: 0.42, area_m2: 85 },
  { lat: 24.55, lng: -112.20, confidence: 0.38, area_m2: 70 },
  // Cabo San Lucas offshore
  { lat: 22.95, lng: -110.05, confidence: 0.35, area_m2: 60 },
];

// --- Drift prediction grid ---
function generateDriftGrid() {
  const latMin = 22.0, latMax = 35.0;
  const lngMin = -121.0, lngMax = -109.0;
  const resolution = 0.1;

  const lats: number[] = [];
  const lngs: number[] = [];
  for (let lat = latMin; lat < latMax; lat += resolution) lats.push(lat);
  for (let lng = lngMin; lng < lngMax; lng += resolution) lngs.push(lng);

  // Create probability grid — higher values near kelp sources and along current paths
  const values = lats.map((lat) =>
    lngs.map((lng) => {
      let prob = 0;

      // California Current: southward flow creates drift corridor
      // Higher probability along the coast and offshore islands
      const coastDist = Math.min(
        Math.abs(lng - (-117.3)),  // SD coast
        Math.abs(lng - (-118.4)),  // LA coast
        Math.abs(lng - (-116.7)),  // Ensenada coast
        Math.abs(lng - (-115.2)),  // Cedros
      );

      if (coastDist < 2.0 && lat > 22.0 && lat < 35.0) {
        prob += Math.max(0, 0.3 * (1 - coastDist / 2.0));
      }

      // Hotspots near kelp sources
      const sources = [
        { lat: 32.7, lng: -117.3 }, // Point Loma
        { lat: 33.4, lng: -118.4 }, // Catalina
        { lat: 33.75, lng: -118.42 }, // Palos Verdes
        { lat: 31.75, lng: -116.75 }, // Ensenada
        { lat: 28.1, lng: -115.2 }, // Isla Cedros
        { lat: 27.85, lng: -115.2 }, // Isla Natividad
      ];

      for (const src of sources) {
        const dist = Math.sqrt((lat - src.lat) ** 2 + (lng - src.lng) ** 2);
        if (dist < 1.5) {
          // Drift direction: slightly south and offshore (California Current)
          const driftLat = src.lat - 0.3;
          const driftLng = src.lng - 0.2;
          const driftDist = Math.sqrt((lat - driftLat) ** 2 + (lng - driftLng) ** 2);
          prob += Math.max(0, 0.7 * Math.exp(-driftDist * 2));
        }
      }

      return Math.min(1.0, prob);
    }),
  );

  return { lat: lats, lng: lngs, values };
}

// --- Current vectors ---
function generateCurrentVectors() {
  const features: object[] = [];
  const arrowScale = 0.03;

  // California Current: general southward flow with some eddies
  for (let lat = 28.0; lat < 35.0; lat += 0.5) {
    for (let lng = -120.5; lng < -110.0; lng += 0.5) {
      // Base California Current: south-southeast
      let u = -0.05 + Math.random() * 0.04; // slight westward
      let v = -0.15 + Math.random() * 0.06; // southward

      // Nearshore counter-current (northward) close to coast
      const coastDist = Math.abs(lng - (-117.2));
      if (coastDist < 0.5 && lat > 32 && lat < 34) {
        v += 0.10; // northward counter-current
      }

      // Santa Barbara Channel eddy
      if (lat > 34.0 && lat < 34.5 && lng > -120.0 && lng < -119.0) {
        u += 0.08;
        v += 0.05;
      }

      const speed = Math.sqrt(u ** 2 + v ** 2);
      if (speed < 0.01) continue;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng, lat],
            [lng + u * arrowScale, lat + v * arrowScale],
          ],
        },
        properties: {
          speed_knots: Math.round(speed * 1.94384 * 100) / 100,
          direction_deg: Math.round(((Math.atan2(u, v) * 180) / Math.PI + 360) % 360),
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

async function seed() {
  console.log('Seeding ocean data...\n');

  // 1. Kelp detections
  console.log(`Inserting ${KELP_DETECTIONS.length} kelp detections...`);
  const now = new Date().toISOString();
  const detectionRows = KELP_DETECTIONS.map((d) => ({
    scene_id: `SEED_S2A_${now.slice(0, 10)}`,
    detected_at: now,
    lat: d.lat,
    lng: d.lng,
    area_m2: d.area_m2,
    confidence: d.confidence,
    method: 'threshold',
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [d.lng - 0.001, d.lat - 0.001],
        [d.lng + 0.001, d.lat - 0.001],
        [d.lng + 0.001, d.lat + 0.001],
        [d.lng - 0.001, d.lat + 0.001],
        [d.lng - 0.001, d.lat - 0.001],
      ]],
    }),
    indices: JSON.stringify({
      ndvi: 0.25 + d.confidence * 0.3,
      fai: 0.01 + d.confidence * 0.04,
      fdi: 0.005 + d.confidence * 0.02,
    }),
  }));

  const { error: detError } = await supabase.from('kelp_detections').insert(detectionRows);
  if (detError) {
    console.error('  Failed:', detError.message);
  } else {
    console.log(`  Done: ${detectionRows.length} detections inserted`);
  }

  // 2. Drift prediction grid
  console.log('Generating drift prediction grid...');
  const gridData = generateDriftGrid();
  const validUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error: driftError } = await supabase.from('drift_predictions').insert({
    lat_min: 22.0,
    lat_max: 35.0,
    lng_min: -121.0,
    lng_max: -109.0,
    grid_data: gridData,
    forecast_hours: 48,
    valid_until: validUntil,
  });

  if (driftError) {
    console.error('  Failed:', driftError.message);
  } else {
    console.log(`  Done: ${gridData.lat.length}x${gridData.lng.length} grid inserted`);
  }

  // 3. Current vectors
  console.log('Generating current vectors...');
  const vectors = generateCurrentVectors();

  const { error: vecError } = await supabase.from('current_vectors').insert({
    vectors: vectors,
    valid_until: validUntil,
  });

  if (vecError) {
    console.error('  Failed:', vecError.message);
  } else {
    console.log(`  Done: ${vectors.features.length} vectors inserted`);
  }

  console.log('\nSeed complete. Visit /ocean-data and toggle the kelp/drift layers.');
}

seed().catch(console.error);
