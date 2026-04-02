import WebSocket from 'ws';

const AIS_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';
const AIS_WS_URL = 'wss://stream.aisstream.io/v0/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!AIS_API_KEY) {
    return new Response(JSON.stringify({ error: 'No AIS API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let ws: WebSocket | null = null;
  let closed = false;

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;

      ws = new WebSocket(AIS_WS_URL);

      ws.on('open', () => {
        console.log('[AIS-PROXY] Connected');
        ws!.send(JSON.stringify({
          APIKey: AIS_API_KEY,
          BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
          FilterMessageTypes: ['PositionReport'],
        }));
        try {
          controller.enqueue(encoder.encode(': connected\n\n'));
        } catch { /* stream closed */ }
      });

      ws.on('message', (data: WebSocket.Data) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data.toString()}\n\n`));
        } catch {
          closed = true;
          ws?.close();
        }
      });

      ws.on('error', (err: Error) => {
        console.error('[AIS-PROXY] Error:', err.message);
      });

      ws.on('close', (code: number) => {
        console.log('[AIS-PROXY] WS closed:', code);
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* ok */ }
        }
      });

      // Send keepalive every 15s to prevent timeout
      const keepalive = setInterval(() => {
        if (closed) { clearInterval(keepalive); return; }
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          closed = true;
          clearInterval(keepalive);
          ws?.close();
        }
      }, 15000);
    },

    cancel() {
      closed = true;
      ws?.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
