import WebSocket from 'ws';

const AIS_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';
const AIS_WS_URL = 'wss://stream.aisstream.io/v0/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Vercel serverless timeout

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

// Open a WebSocket to aisstream.io, collect positions for a few seconds, return them.
// Each poll request gets a fresh snapshot of AIS traffic in the San Diego area.
async function collectPositions(durationMs: number): Promise<StoredPosition[]> {
  return new Promise((resolve) => {
    const positions = new Map<number, StoredPosition>();
    const ws = new WebSocket(AIS_WS_URL);
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ok */ }
      resolve(Array.from(positions.values()));
    };

    // Safety timeout
    const timer = setTimeout(finish, durationMs + 2000);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
        FilterMessageTypes: ['PositionReport'],
      }));

      // Collect for durationMs then return
      setTimeout(finish, durationMs);
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
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
    });

    ws.on('error', () => finish());
    ws.on('close', () => { clearTimeout(timer); finish(); });
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
    // Collect AIS positions for 4 seconds
    const positions = await collectPositions(4000);

    return Response.json({
      connected: true,
      count: positions.length,
      positions,
    });
  } catch {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: 'Failed to connect to AIS stream',
    });
  }
}
