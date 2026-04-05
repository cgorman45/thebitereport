#!/usr/bin/env node
/**
 * AIS Data Collector — standalone background process
 * Connects to aisstream.io WebSocket and writes vessel positions to:
 *   1. .ais-positions.json (real-time fleet map, existing behavior)
 *   2. Supabase positions table (persistent trip history)
 *
 * Dynamically tracks only boats that appear in 976-tuna.com catch reports.
 * Refreshes the active boat list every 4 hours from the deployed API.
 *
 * Also detects trip boundaries (departure from / return to port)
 * and maintains trip records in Supabase.
 *
 * Usage: node scripts/ais-collector.mjs
 * Env:   AIS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *        SITE_URL (optional, defaults to https://thebitereport.vercel.app)
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

const SITE_URL = process.env.SITE_URL || 'https://thebitereport.vercel.app';
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

let supabase = null;
if (supabaseEnabled) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[AIS] Supabase persistence enabled');
} else {
  console.log('[AIS] Supabase not configured — running without trip history');
}

// ---------------------------------------------------------------------------
// Full fleet roster (static fallback)
// Used for name/landing lookups and as a fallback if the API is unreachable.
// ---------------------------------------------------------------------------

const FULL_ROSTER = {
  367703230: { name: 'New Seaforth', landing: 'seaforth' },
  367478120: { name: 'Apollo', landing: 'seaforth' },
  338409157: { name: 'Aztec', landing: 'seaforth' },
  367547700: { name: 'Cortez', landing: 'seaforth' },
  367004700: { name: 'Highliner', landing: 'seaforth' },
  367739800: { name: 'Legacy', landing: 'seaforth' },
  366918840: { name: 'San Diego', landing: 'seaforth' },
  367710460: { name: 'Sea Watch', landing: 'seaforth' },
  367523170: { name: 'El Gato Dos', landing: 'seaforth' },
  367188060: { name: 'Voyager', landing: 'seaforth' },
  367469470: { name: 'Polaris Supreme', landing: 'fishermans' },
  367453390: { name: 'Dolphin', landing: 'fishermans' },
  367678200: { name: 'Liberty', landing: 'fishermans' },
  367672130: { name: 'Fortune', landing: 'fishermans' },
  338312000: { name: 'Islander', landing: 'fishermans' },
  367438790: { name: 'Pacific Queen', landing: 'fishermans' },
  367469480: { name: 'Excel', landing: 'fishermans' },
  367516650: { name: 'Constitution', landing: 'fishermans' },
  367612350: { name: 'Pegasus', landing: 'fishermans' },
  367438800: { name: 'Mission Belle', landing: 'hm_landing' },
  367516700: { name: 'Patriot', landing: 'hm_landing' },
  367547800: { name: 'Daily Double', landing: 'hm_landing' },
  367469500: { name: 'Shogun', landing: 'hm_landing' },
  367703300: { name: 'Spirit of Adventure', landing: 'hm_landing' },
  367710500: { name: 'Point Loma', landing: 'point_loma' },
  367523200: { name: 'New Lo-An', landing: 'point_loma' },
  367478200: { name: 'Chubasco II', landing: 'point_loma' },
  367612400: { name: 'Premier', landing: 'point_loma' },
  367672200: { name: "Helgren's Oceanside 95", landing: 'helgrens' },
  367739900: { name: 'Sea Star', landing: 'helgrens' },
  367004800: { name: 'Oceanside 95', landing: 'helgrens' },
};

// ---------------------------------------------------------------------------
// Dynamic active boat tracking
// Only boats that appear in recent catch reports get AIS tracking.
// ---------------------------------------------------------------------------

/** Set of MMSIs to actively track — updated from catch report API */
let activeMMSIs = new Set();

/** Whether we've successfully loaded active boats at least once */
let hasLoadedActiveBoats = false;

/**
 * Fetch the list of boats with recent catch reports from the deployed site.
 * Updates activeMMSIs and the lookup maps accordingly.
 */
async function refreshActiveBoats() {
  try {
    const url = `${SITE_URL}/api/fleet/active-boats`;
    console.log(`[AIS] Refreshing active boats from ${url}...`);

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (Array.isArray(data.boats) && data.boats.length > 0) {
      const newSet = new Set();
      for (const boat of data.boats) {
        newSet.add(boat.mmsi);
        // Ensure this boat exists in FULL_ROSTER for name/landing lookups
        if (!FULL_ROSTER[boat.mmsi]) {
          FULL_ROSTER[boat.mmsi] = { name: boat.name, landing: boat.landing };
        }
      }

      activeMMSIs = newSet;
      hasLoadedActiveBoats = true;

      const names = data.boats.map(b => b.name).join(', ');
      console.log(`[AIS] Active boats (${activeMMSIs.size}): ${names}`);

      if (data.unmatchedBoats?.length > 0) {
        console.log(`[AIS] Boats in catch reports without AIS: ${data.unmatchedBoats.join(', ')}`);
      }

      // Initialize trip state for any new boats
      for (const mmsi of activeMMSIs) {
        if (!tripState.has(mmsi)) {
          tripState.set(mmsi, { currentTripId: null, inPort: true, debounceCount: 0 });
        }
      }
    } else {
      console.log('[AIS] API returned no active boats — keeping previous set');
    }
  } catch (err) {
    console.error(`[AIS] Failed to refresh active boats: ${err.message}`);

    // On first load failure, fall back to full fleet
    if (!hasLoadedActiveBoats) {
      activeMMSIs = new Set(Object.keys(FULL_ROSTER).map(Number));
      console.log(`[AIS] Falling back to full fleet (${activeMMSIs.size} boats)`);
    }
  }
}

/**
 * Check if an MMSI should be tracked.
 * Returns true if the boat is in the active set.
 */
function isTrackedBoat(mmsi) {
  return activeMMSIs.has(mmsi);
}

/**
 * Get the landing key for a given MMSI.
 */
function getLanding(mmsi) {
  return FULL_ROSTER[mmsi]?.landing || 'unknown';
}

/**
 * Get the boat name for a given MMSI.
 */
function getBoatName(mmsi) {
  return FULL_ROSTER[mmsi]?.name || `Vessel ${mmsi}`;
}

// ---------------------------------------------------------------------------
// Port coordinates & helpers
// ---------------------------------------------------------------------------

const PORTS = {
  seaforth:   { lat: 32.7137, lng: -117.2275 },
  fishermans: { lat: 32.7131, lng: -117.2315 },
  hm_landing: { lat: 32.7145, lng: -117.2250 },
  point_loma: { lat: 32.7200, lng: -117.2230 },
  helgrens:   { lat: 33.1595, lng: -117.3795 },
};

const PORT_RADIUS_M = 925; // 0.5 nautical miles

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
// State: real-time positions + trip tracking
// ---------------------------------------------------------------------------

const positions = new Map();
let messageCount = 0;
let connected = false;

// Trip state per boat: { currentTripId, inPort, debounceCount }
const tripState = new Map();
const DEBOUNCE_THRESHOLD = 3; // 3 consecutive reports (~45s)

// Insert buffer — batch positions for efficient writes
const insertBuffer = [];
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER_SIZE = 50;

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

    // Initialize tracked boats as "in port"
    for (const mmsi of activeMMSIs) {
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
  const landing = getLanding(mmsi);
  const boatName = getBoatName(mmsi);

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
      insertBuffer.unshift(...batch);
    } else {
      const tripCounts = {};
      for (const pos of batch) {
        if (pos.trip_id) {
          tripCounts[pos.trip_id] = (tripCounts[pos.trip_id] || 0) + 1;
        }
      }
      for (const [tripId, count] of Object.entries(tripCounts)) {
        await supabase.rpc('increment_trip_points', { trip_uuid: tripId, amount: count })
          .catch(() => {
            supabase
              .from('trips')
              .update({ point_count: count })
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
// Position processing
// ---------------------------------------------------------------------------

function processPosition(mmsi, name, lat, lng, sog, cog, heading) {
  // Only process positions for actively tracked boats
  if (!isTrackedBoat(mmsi)) return;

  // 1. Update the real-time positions map
  positions.set(mmsi, {
    mmsi,
    name: name?.trim() || getBoatName(mmsi),
    lat,
    lng,
    sog,
    cog,
    heading: heading === 511 ? cog : heading,
    timestamp: Date.now(),
  });

  // 2. Trip detection + Supabase persistence
  if (!supabaseEnabled) return;

  const landing = getLanding(mmsi);
  if (landing === 'unknown') return;

  let state = tripState.get(mmsi);
  if (!state) {
    state = { currentTripId: null, inPort: true, debounceCount: 0 };
    tripState.set(mmsi, state);
  }

  const inPortNow = isInPortZone(lat, lng, landing);

  if (state.inPort && !inPortNow) {
    state.debounceCount++;
    if (state.debounceCount >= DEBOUNCE_THRESHOLD) {
      state.inPort = false;
      state.debounceCount = 0;
      startTrip(mmsi).then(tripId => {
        if (tripId) state.currentTripId = tripId;
      });
    }
    return;
  } else if (!state.inPort && inPortNow) {
    state.debounceCount++;
    if (state.debounceCount >= DEBOUNCE_THRESHOLD) {
      const boatName = getBoatName(mmsi);
      endTrip(state.currentTripId, boatName);
      state.inPort = true;
      state.currentTripId = null;
      state.debounceCount = 0;
    }
  } else {
    state.debounceCount = 0;
  }

  if (state.inPort) return;

  insertBuffer.push({
    mmsi,
    lat,
    lng,
    speed: sog,
    heading: heading === 511 ? cog : heading,
    recorded_at: new Date().toISOString(),
    trip_id: state.currentTripId,
  });

  if (insertBuffer.length >= MAX_BUFFER_SIZE) {
    flushPositionBuffer();
  }
}

// ---------------------------------------------------------------------------
// JSON file writer
// ---------------------------------------------------------------------------

function writePositions() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [mmsi, pos] of positions) {
    if (pos.timestamp < cutoff) positions.delete(mmsi);
  }

  const data = {
    connected,
    count: positions.size,
    activeBoats: activeMMSIs.size,
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

      if (messageCount % 100 === 0) {
        console.log(`[AIS] ${messageCount} msgs, ${positions.size} tracked, ${activeMMSIs.size} active boats, ${insertBuffer.length} buffered`);
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
    flushPositionBuffer();
    console.log('[AIS] Reconnecting in 5s...');
    setTimeout(connect, 5000);
  });
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

// Write JSON file every 2 seconds
setInterval(writePositions, 2000);

// Flush position buffer every 30 seconds
setInterval(flushPositionBuffer, FLUSH_INTERVAL_MS);

// Refresh active boat list every 4 hours
setInterval(refreshActiveBoats, REFRESH_INTERVAL_MS);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

console.log(`[AIS] Data file: ${DATA_FILE}`);
console.log(`[AIS] Site URL: ${SITE_URL}`);
console.log(`[AIS] Supabase: ${supabaseEnabled ? 'enabled' : 'disabled'}`);

// 1. Load active boats from catch reports
// 2. Restore any in-progress trips from Supabase
// 3. Connect to AIS stream
refreshActiveBoats()
  .then(() => restoreActiveTrips())
  .then(() => connect());
