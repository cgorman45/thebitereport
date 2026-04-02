#!/usr/bin/env node
/**
 * AIS Data Collector — standalone background process
 * Connects to aisstream.io WebSocket and writes vessel positions to a JSON file.
 * The Next.js API route reads from this file to serve data to the frontend.
 *
 * Usage: node scripts/ais-collector.mjs
 * Or: AIS_API_KEY=xxx node scripts/ais-collector.mjs
 */

import WebSocket from 'ws';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '.ais-positions.json');

const API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY
  || process.env.AIS_API_KEY
  || '';

if (!API_KEY) {
  console.error('No AIS API key. Set NEXT_PUBLIC_AISSTREAM_API_KEY or AIS_API_KEY');
  process.exit(1);
}

const positions = new Map();
let messageCount = 0;
let connected = false;

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
      positions.set(mmsi, {
        mmsi,
        name: msg.MetaData?.ShipName?.trim() || `Vessel ${mmsi}`,
        lat: report.Latitude,
        lng: report.Longitude,
        sog: report.Sog / 10,
        cog: report.Cog / 10,
        heading: report.TrueHeading === 511 ? report.Cog / 10 : report.TrueHeading,
        timestamp: Date.now(),
      });

      if (messageCount % 10 === 0) {
        console.log(`[AIS] ${messageCount} msgs, ${positions.size} vessels`);
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
    console.log('[AIS] Reconnecting in 5s...');
    setTimeout(connect, 5000);
  });
}

// Write positions to file every 2 seconds
setInterval(writePositions, 2000);

// Start
console.log(`[AIS] Data file: ${DATA_FILE}`);
connect();
