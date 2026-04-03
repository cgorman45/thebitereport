export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const AIS_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';

interface StoredPosition {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  heading: number;
  timestamp: number;
}

// Use native Node.js WebSocket (available in Node 18+) instead of 'ws' library
// which has masking issues in Vercel's serverless environment
async function collectPositions(durationMs: number): Promise<StoredPosition[]> {
  return new Promise((resolve) => {
    const positions = new Map<number, StoredPosition>();
    // Use the global WebSocket (Node.js built-in since v21, polyfilled by Vercel)
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ok */ }
      resolve(Array.from(positions.values()));
    };

    const timer = setTimeout(finish, durationMs + 2000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
        FilterMessageTypes: ['PositionReport'],
      }));
      setTimeout(finish, durationMs);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
        const report = msg.Message?.PositionReport;
        if (!report) return;

        const mmsi = report.UserID || msg.MetaData?.MMSI;
        if (!mmsi) return;

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
      } catch { /* skip bad messages */ }
    };

    ws.onerror = () => finish();
    ws.onclose = () => { clearTimeout(timer); finish(); };
  });
}

export async function GET() {
  if (!AIS_API_KEY) {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: 'No AIS API key configured',
    });
  }

  try {
    const positions = await collectPositions(4000);
    return Response.json({
      connected: true,
      count: positions.length,
      positions,
    });
  } catch (err) {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: String(err),
    });
  }
}
