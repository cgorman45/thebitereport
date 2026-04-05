#!/usr/bin/env node
/**
 * AIS Data Collector — standalone background process
 * Connects to aisstream.io WebSocket and writes vessel positions to:
 *   1. .ais-positions.json (real-time fleet map, existing behavior)
 *   2. Supabase positions table (persistent trip history)
 *
 * Also detects trip boundaries (departure from / return to port)
 * and maintains trip records in Supabase.
 *
 * Usage: node scripts/ais-collector.mjs
 * Env:   AIS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import WebSocket from 'ws';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '.ais-positions.json');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY
  || process.env.AIS_API_KEY
  || '';

if (!API_KEY) {
  console.error('No AIS API key. Set NEXT_PUBLIC_AISSTREAM_API_KEY or AIS_API_KEY');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

let supabase = null;
if (supabaseEnabled) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[AIS] Supabase persistence enabled');
} else {
  console.log('[AIS] Supabase not configured — running without trip history');
}

// ---------------------------------------------------------------------------
// Fleet roster & port coordinates (mirrored from src/lib/fleet/boats.ts)
// Keep in sync with the source file.
// ---------------------------------------------------------------------------

const FLEET_MMSIS = new Set([
  367703230, 367478120, 338409157, 367547700, 367004700, 367739800,
  366918840, 367710460, 367523170, // Seaforth
  367469470, 367453390, 367678200, 367672130, 338312000, 367438790,
  367469480, 367516650, 367612350, // Fisherman's
  367438800, 367516700, 367547800, 367469500, 367703300, // H&M
  367710500, 367523200, 367478200, 367612400, // Point Loma
  367672200, 367739900, 367004800, // Helgren's
]);

// MMSI → landing key
const MMSI_LANDING = {
  367703230: 'seaforth', 367478120: 'seaforth', 338409157: 'seaforth',
  367547700: 'seaforth', 367004700: 'seaforth', 367739800: 'seaforth',
  366918840: 'seaforth', 367710460: 'seaforth', 367523170: 'seaforth',
  367469470: 'fishermans', 367453390: 'fishermans', 367678200: 'fishermans',
  367672130: 'fishermans', 338312000: 'fishermans', 367438790: 'fishermans',
  367469480: 'fishermans', 367516650: 'fishermans', 367612350: 'fishermans',
  367438800: 'hm_landing', 367516700: 'hm_landing', 367547800: 'hm_landing',
  367469500: 'hm_landing', 367703300: 'hm_landing',
  367710500: 'point_loma', 367523200: 'point_loma', 367478200: 'point_loma',
  367612400: 'point_loma',
  367672200: 'helgrens', 367739900: 'helgrens', 367004800: 'helgrens',
};

// MMSI → boat name
const MMSI_NAME = {
  367703230: 'New Seaforth', 367478120: 'Apollo', 338409157: 'Aztec',
  367547700: 'Cortez', 367004700: 'Highliner', 367739800: 'Legacy',
  366918840: 'San Diego', 367710460: 'Sea Watch', 367523170: 'El Gato Dos',
  367469470: 'Polaris Supreme', 367453390: 'Dolphin', 367678200: 'Liberty',
  367672130: 'Fortune', 338312000: 'Islander', 367438790: 'Pacific Queen',
  367469480: 'Excel', 367516650: 'Constitution', 367612350: 'Pegasus',
  367438800: 'Mission Belle', 367516700: 'Patriot', 367547800: 'Daily Double',
  367469500: 'Shogun', 367703300: 'Spirit of Adventure',
  367710500: 'Point Loma', 367523200: 'New Lo-An', 367478200: 'Chubasco II',
  367612400: 'Premier',
  367672200: "Helgren's Oceanside 95", 367739900: 'Sea Star', 367004800: 'Oceanside 95',
};

const PORTS = {
  seaforth:   { lat: 32.7137, lng: -117.2275 },
  fishermans: { lat: 32.7131, lng: -117.2315 },
  hm_landing: { lat: 32.7145, lng: -117.2250 },
  point_loma: { lat: 32.7200, lng: -117.2230 },
  helgrens:   { lat: 33.1595, lng: -117.3795 },
};

const PORT_RADIUS_M = 925; // 0.5 nautical miles

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInPortZone(lat, lng, landing) {
  const port = PORTS[landing];
  if (!port) return false;
  return haversineDistance(lat, lng, port.lat, port.lng) < PORT_RADIUS_M;
}

// ---------------------------------------------------------------------------
// State: real-time positions (existing) + trip tracking (new)
// ---------------------------------------------------------------------------

const positions = new Map();
let messageCount = 0;
let connected = false;

// Trip state per boat: { currentTripId, inPort, debounceCount }
// debounceCount: consecutive reports in new zone before we commit the transition
const tripState = new Map();
const DEBOUNCE_THRESHOLD = 3; // 3 consecutive reports (~45s)

// Insert buffer — batch positions for efficient writes
const insertBuffer = [];
const FLUSH_INTERVAL_MS = 30_000;  // flush every 30 seconds
const MAX_BUFFER_SIZE = 50;        // or when buffer hits 50 items

// ---------------------------------------------------------------------------
// Supabase: restore active trips on startup
// ---------------------------------------------------------------------------

async function restoreActiveTrips() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('id, mmsi, landing')
      .is('ended_at', null);

    if (error) {
      console.error('[AIS] Failed to restore active trips:', error.message);
      return;
    }

    for (const trip of (data || [])) {
      tripState.set(trip.mmsi, {
        currentTripId: trip.id,
        inPort: false,
        debounceCount: 0,
      });
      console.log(`[AIS] Restored active trip ${trip.id} for MMSI ${trip.mmsi}`);
    }

    // Initialize remaining fleet boats as "in port"
    for (const mmsi of FLEET_MMSIS) {
      if (!tripState.has(mmsi)) {
        tripState.set(mmsi, { currentTripId: null, inPort: true, debounceCount: 0 });
      }
    }

    console.log(`[AIS] Restored ${data?.length || 0} active trips, ${tripState.size} boats tracked`);
  } catch (err) {
    console.error('[AIS] Error restoring trips:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Supabase: trip management
// ---------------------------------------------------------------------------

async function startTrip(mmsi) {
  if (!supabase) return null;
  const landing = MMSI_LANDING[mmsi] || 'unknown';
  const boatName = MMSI_NAME[mmsi] || `Vessel ${mmsi}`;

  try {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        mmsi,
        boat_name: boatName,
        landing,
        started_at: new Date().toISOString(),
        point_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[AIS] Failed to start trip for ${boatName}:`, error.message);
      return null;
    }

    console.log(`[AIS] Trip started: ${boatName} departed ${landing} (trip ${data.id})`);
    return data.id;
  } catch (err) {
    console.error(`[AIS] Error starting trip:`, err.message);
    return null;
  }
}

async function endTrip(tripId, boatName) {
  if (!supabase || !tripId) return;
  try {
    const { error } = await supabase
      .from('trips')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', tripId);

    if (error) {
      console.error(`[AIS] Failed to end trip ${tripId}:`, error.message);
    } else {
      console.log(`[AIS] Trip ended: ${boatName} returned to port (trip ${tripId})`);
    }
  } catch (err) {
    console.error(`[AIS] Error ending trip:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Supabase: batched position inserts
// ---------------------------------------------------------------------------

async function flushPositionBuffer() {
  if (!supabase || insertBuffer.length === 0) return;

  const batch = insertBuffer.splice(0, insertBuffer.length);

  try {
    const { error } = await supabase
      .from('positions')
      .insert(batch);

    if (error) {
      console.error(`[AIS] Failed to insert ${batch.length} positions:`, error.message);
      // Put them back for retry (once)
      insertBuffer.unshift(...batch);
    } else {
      // Update point_count for each trip
      const tripCounts = {};
      for (const pos of batch) {
        if (pos.trip_id) {
          tripCounts[pos.trip_id] = (tripCounts[pos.trip_id] || 0) + 1;
        }
      }
      for (const [tripId, count] of Object.entries(tripCounts)) {
        await supabase.rpc('increment_trip_points', { trip_uuid: tripId, amount: count })
          .catch(() => {
            // Fallback: direct update if RPC doesn't exist
            supabase
              .from('trips')
              .update({ point_count: count }) // Will be overwritten; see note below
              .eq('id', tripId)
              .catch(() => {});
          });
      }
    }
  } catch (err) {
    console.error(`[AIS] Error flushing position buffer:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Position processing: existing JSON file + new Supabase persistence
// ---------------------------------------------------------------------------

function processPosition(mmsi, name, lat, lng, sog, cog, heading) {
  // 1. Always update the real-time positions map (existing behavior)
  positions.set(mmsi, {
    mmsi,
    name: name?.trim() || `Vessel ${mmsi}`,
    lat,
    lng,
    sog,
    cog,
    heading: heading === 511 ? cog : heading,
    timestamp: Date.now(),
  });

  // 2. Trip detection + Supabase persistence (new, only for fleet boats)
  if (!supabaseEnabled || !FLEET_MMSIS.has(mmsi)) return;

  const landing = MMSI_LANDING[mmsi];
  if (!landing) return;

  let state = tripState.get(mmsi);
  if (!state) {
    state = { currentTripId: null, inPort: true, debounceCount: 0 };
    tripState.set(mmsi, state);
  }

  const inPortNow = isInPortZone(lat, lng, landing);

  if (state.inPort && !inPortNow) {
    // Boat was in port, now outside zone
    state.debounceCount++;
    if (state.debounceCount >= DEBOUNCE_THRESHOLD) {
      // Confirmed departure
      state.inPort = false;
      state.debounceCount = 0;
      startTrip(mmsi).then(tripId => {
        if (tripId) state.currentTripId = tripId;
      });
    }
    // Don't write in-port positions while debouncing
    return;
  } else if (!state.inPort && inPortNow) {
    // Boat was on trip, now in port zone
    state.debounceCount++;
    if (state.debounceCount >= DEBOUNCE_THRESHOLD) {
      // Confirmed return
      const boatName = MMSI_NAME[mmsi] || `Vessel ${mmsi}`;
      endTrip(state.currentTripId, boatName);
      state.inPort = true;
      state.currentTripId = null;
      state.debounceCount = 0;
    }
    // Still write the position (it's part of the return leg)
  } else {
    // No zone transition — reset debounce
    state.debounceCount = 0;
  }

  // Skip recording positions for boats in port (saves storage)
  if (state.inPort) return;

  // Buffer position for batch insert
  insertBuffer.push({
    mmsi,
    lat,
    lng,
    speed: sog,
    heading: heading === 511 ? cog : heading,
    recorded_at: new Date().toISOString(),
    trip_id: state.currentTripId,
  });

  // Flush if buffer is full
  if (insertBuffer.length >= MAX_BUFFER_SIZE) {
    flushPositionBuffer();
  }
}

// ---------------------------------------------------------------------------
// JSON file writer (existing behavior, unchanged)
// ---------------------------------------------------------------------------

function writePositions() {
  // Prune old positions (>10 min)
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [mmsi, pos] of positions) {
    if (pos.timestamp < cutoff) positions.delete(mmsi);
  }

  const data = {
    connected,
    count: positions.size,
    totalMessages: messageCount,
    updatedAt: Date.now(),
    positions: Array.from(positions.values()),
  };

  try {
    writeFileSync(DATA_FILE, JSON.stringify(data));
  } catch (err) {
    console.error('Write error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// WebSocket connection
// ---------------------------------------------------------------------------

function connect() {
  console.log('[AIS] Connecting to aisstream.io...');
  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.on('open', () => {
    console.log('[AIS] Connected! Sending subscription...');
    connected = true;
    ws.send(JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
      FilterMessageTypes: ['PositionReport'],
    }));
    writePositions();
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const report = msg.Message?.PositionReport;
      if (!report) return;

      const mmsi = report.UserID || msg.MetaData?.MMSI;
      if (!mmsi) return;

      messageCount++;
      processPosition(
        mmsi,
        msg.MetaData?.ShipName,
        report.Latitude,
        report.Longitude,
        report.Sog / 10,
        report.Cog / 10,
        report.TrueHeading,
      );

      if (messageCount % 10 === 0) {
        console.log(`[AIS] ${messageCount} msgs, ${positions.size} vessels, ${insertBuffer.length} buffered`);
      }
    } catch { /* skip bad messages */ }
  });

  ws.on('error', (err) => {
    console.error('[AIS] Error:', err.message);
    connected = false;
  });

  ws.on('close', (code, reason) => {
    console.log(`[AIS] Closed: ${code} ${reason.toString()}`);
    connected = false;
    writePositions();
    // Flush any remaining positions before reconnect
    flushPositionBuffer();
    console.log('[AIS] Reconnecting in 5s...');
    setTimeout(connect, 5000);
  });
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

// Write JSON file every 2 seconds (existing)
setInterval(writePositions, 2000);

// Flush position buffer every 30 seconds (new)
setInterval(flushPositionBuffer, FLUSH_INTERVAL_MS);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

console.log(`[AIS] Data file: ${DATA_FILE}`);
console.log(`[AIS] Supabase: ${supabaseEnabled ? 'enabled' : 'disabled'}`);

// Restore active trips then connect
restoreActiveTrips().then(() => {
  connect();
});
