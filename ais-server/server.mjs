/**
 * AIS Collector Server
 *
 * Always-on Node.js server that maintains a WebSocket connection to aisstream.io
 * and exposes vessel positions via a REST endpoint.
 *
 * Deploy to Railway ($5/mo) or Render.
 *
 * Environment variables:
 *   AIS_API_KEY - aisstream.io API key (required)
 *   PORT - server port (default 3001, Railway sets this automatically)
 *   ALLOWED_ORIGINS - comma-separated allowed CORS origins (default: *)
 */

import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';

const PORT = process.env.PORT || 3001;
const AIS_API_KEY = process.env.AIS_API_KEY || '';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://www.thebitereport.com', 'https://thebitereport.com', 'http://localhost:3000'];

if (!AIS_API_KEY) {
  console.error('AIS_API_KEY environment variable is required');
  process.exit(1);
}

// ---------- State ----------
const positions = new Map();
let ws = null;
let connecting = false;
let messageCount = 0;
let lastMessageTime = null;
let connectionStatus = 'disconnected';

// ---------- AIS WebSocket ----------
function connect() {
  if (connecting) return;
  connecting = true;
  connectionStatus = 'connecting';
  console.log('[AIS] Connecting to aisstream.io...');

  ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.on('open', () => {
    connecting = false;
    connectionStatus = 'connected';
    console.log('[AIS] Connected! Sending subscription...');

    ws.send(JSON.stringify({
      APIKey: AIS_API_KEY,
      // Full coverage: Channel Islands (34.3N) to Isla Guadalupe (28.7N)
      BoundingBoxes: [[[28.7, -120.5], [34.3, -115.0]]],
      // Include Class A (PositionReport) AND Class B (StandardClassBPositionReport)
      // Class B = recreational/fishing boats with smaller transponders
      FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport'],
    }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      // Handle Class A and Class B position reports
      const r = msg.Message?.PositionReport
        || msg.Message?.StandardClassBPositionReport
        || msg.Message?.ExtendedClassBPositionReport;
      if (!r) return;

      const mmsi = r.UserID || msg.MetaData?.MMSI;
      if (!mmsi) return;

      messageCount++;
      lastMessageTime = Date.now();

      positions.set(mmsi, {
        mmsi,
        name: msg.MetaData?.ShipName?.trim() || `Vessel ${mmsi}`,
        lat: r.Latitude,
        lng: r.Longitude,
        sog: r.Sog / 10,
        cog: r.Cog / 10,
        heading: r.TrueHeading === 511 ? r.Cog / 10 : r.TrueHeading,
        timestamp: Date.now(),
      });

      if (messageCount % 50 === 0) {
        console.log(`[AIS] ${messageCount} msgs, ${positions.size} vessels tracked`);
      }
    } catch { /* skip */ }
  });

  ws.on('error', (err) => {
    console.error('[AIS] Error:', err.message);
    connecting = false;
    connectionStatus = 'error';
  });

  ws.on('close', (code, reason) => {
    console.log(`[AIS] Closed: ${code} ${reason.toString()}`);
    ws = null;
    connecting = false;
    connectionStatus = 'disconnected';
    // Reconnect after 5 seconds
    setTimeout(connect, 5000);
  });
}

// Prune old positions every 30 seconds
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [mmsi, pos] of positions) {
    if (pos.timestamp < cutoff) positions.delete(mmsi);
  }
}, 30000);

// ---------- Express Server ----------
const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Bite Report AIS Collector',
    status: connectionStatus,
    vessels: positions.size,
    totalMessages: messageCount,
    lastMessage: lastMessageTime,
    uptime: process.uptime(),
  });
});

// Positions endpoint - polled by the frontend
app.get('/positions', (req, res) => {
  const data = Array.from(positions.values());
  res.json({
    connected: connectionStatus === 'connected',
    count: data.length,
    totalMessages: messageCount,
    positions: data,
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  connect();
});
