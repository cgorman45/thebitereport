// Standalone script that connects to aisstream.io for N seconds and prints positions as JSON
// Called by the API route via child_process to bypass webpack bundling
import WebSocket from 'ws';

const API_KEY = process.argv[2] || '';
const DURATION = parseInt(process.argv[3] || '5000', 10);

if (!API_KEY) {
  console.log(JSON.stringify({ error: 'No API key', positions: [] }));
  process.exit(0);
}

const positions = new Map();
const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

function finish() {
  const result = Array.from(positions.values());
  console.log(JSON.stringify({ positions: result, count: result.length }));
  ws.close();
  process.exit(0);
}

ws.on('open', () => {
  ws.send(JSON.stringify({
    APIKey: API_KEY,
    BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
    FilterMessageTypes: ['PositionReport'],
  }));
  setTimeout(finish, DURATION);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    const r = msg.Message?.PositionReport;
    if (!r) return;
    const mmsi = r.UserID || msg.MetaData?.MMSI;
    if (!mmsi) return;
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
  } catch { /* skip */ }
});

ws.on('error', () => finish());
setTimeout(finish, DURATION + 2000); // safety
