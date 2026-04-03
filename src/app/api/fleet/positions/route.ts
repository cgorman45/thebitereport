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

// Use dynamic import to prevent webpack from bundling ws
// This avoids the "b.mask is not a function" error on Vercel
async function getWS() {
  const mod = await import('ws');
  return mod.default;
}

async function collectPositions(durationMs: number): Promise<StoredPosition[]> {
  const WS = await getWS();

  return new Promise((resolve) => {
    const positions = new Map<number, StoredPosition>();
    let settled = false;
    const ws = new WS('wss://stream.aisstream.io/v0/stream');

    const finish = () => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ok */ }
      resolve(Array.from(positions.values()));
    };

    const timer = setTimeout(finish, durationMs + 2000);

    ws.on('open', () => {
      console.log('[AIS] Connected to aisstream.io');
      ws.send(JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
        FilterMessageTypes: ['PositionReport'],
      }));
      setTimeout(() => {
        console.log(`[AIS] Collected ${positions.size} vessels`);
        finish();
      }, durationMs);
    });

    ws.on('message', (data: Buffer) => {
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
      } catch { /* skip */ }
    });

    ws.on('error', (err: Error) => {
      console.error('[AIS] Error:', err.message);
      finish();
    });

    ws.on('close', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

export async function GET() {
  if (!AIS_API_KEY) {
    return Response.json({ connected: false, count: 0, positions: [], error: 'No API key' });
  }

  try {
    const positions = await collectPositions(5000);
    return Response.json({ connected: true, count: positions.length, positions });
  } catch (err) {
    return Response.json({ connected: false, count: 0, positions: [], error: String(err) });
  }
}
