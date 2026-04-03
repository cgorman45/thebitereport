export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Proxy to the external AIS collector service (Railway/Render)
// The collector maintains a persistent WebSocket to aisstream.io
// and this endpoint simply fetches the latest positions from it.
const COLLECTOR_URL = process.env.AIS_COLLECTOR_URL || '';

export async function GET() {
  if (!COLLECTOR_URL) {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: 'AIS_COLLECTOR_URL not configured',
    });
  }

  try {
    const res = await fetch(`${COLLECTOR_URL}/positions`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return Response.json({
        connected: false,
        count: 0,
        positions: [],
        error: `Collector returned ${res.status}`,
      });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: String(err),
    });
  }
}
