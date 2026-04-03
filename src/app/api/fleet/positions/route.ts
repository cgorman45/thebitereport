import https from 'node:https';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const AIS_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';
const AIS_HOST = 'stream.aisstream.io';
const AIS_PATH = '/v0/stream';

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

// Raw WebSocket client using only node:https and node:crypto
// No external libraries — cannot be broken by webpack bundling
function collectPositions(durationMs: number): Promise<StoredPosition[]> {
  return new Promise((resolve) => {
    const positions = new Map<number, StoredPosition>();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(Array.from(positions.values()));
    };

    const safetyTimer = setTimeout(finish, durationMs + 3000);

    // WebSocket handshake key
    const wsKey = crypto.randomBytes(16).toString('base64');

    const req = https.request({
      host: AIS_HOST,
      path: AIS_PATH,
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': wsKey,
        'Sec-WebSocket-Version': '13',
      },
    });

    req.on('upgrade', (res, socket) => {
      console.log(`[AIS] WebSocket upgraded, status: ${res.statusCode}`);

      // Send subscription as a WebSocket text frame
      const sub = JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
        FilterMessageTypes: ['PositionReport'],
      });
      socket.write(encodeWSFrame(sub));

      // Collect for durationMs
      setTimeout(() => {
        console.log(`[AIS] Collected ${positions.size} vessels`);
        socket.end();
        clearTimeout(safetyTimer);
        finish();
      }, durationMs);

      let buffer = Buffer.alloc(0);

      socket.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        // Parse WebSocket frames from buffer
        while (buffer.length >= 2) {
          const secondByte = buffer[1] & 0x7f;
          let payloadLen: number;
          let headerLen: number;

          if (secondByte < 126) {
            payloadLen = secondByte;
            headerLen = 2;
          } else if (secondByte === 126) {
            if (buffer.length < 4) break;
            payloadLen = buffer.readUInt16BE(2);
            headerLen = 4;
          } else {
            if (buffer.length < 10) break;
            payloadLen = Number(buffer.readBigUInt64BE(2));
            headerLen = 10;
          }

          if (buffer.length < headerLen + payloadLen) break;

          const payload = buffer.subarray(headerLen, headerLen + payloadLen);
          buffer = buffer.subarray(headerLen + payloadLen);

          const opcode = buffer[0] & 0x0f;
          // opcode 1 = text, 8 = close
          if (opcode === 8) {
            socket.end();
            finish();
            return;
          }

          try {
            const msg = JSON.parse(payload.toString('utf8'));
            const r = msg.Message?.PositionReport;
            if (!r) continue;
            const mmsi = r.UserID || msg.MetaData?.MMSI;
            if (!mmsi) continue;

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
          } catch { /* skip non-JSON or non-position */ }
        }
      });

      socket.on('error', (err: Error) => {
        console.error('[AIS] Socket error:', err.message);
        clearTimeout(safetyTimer);
        finish();
      });

      socket.on('end', () => {
        clearTimeout(safetyTimer);
        finish();
      });
    });

    req.on('error', (err) => {
      console.error('[AIS] Request error:', err.message);
      clearTimeout(safetyTimer);
      finish();
    });

    req.end();
  });
}

// Encode a string as an unmasked WebSocket text frame
// (Server-to-server connections don't require masking in practice,
// but per RFC 6455 client frames should be masked)
function encodeWSFrame(data: string): Buffer {
  const payload = Buffer.from(data, 'utf8');
  const mask = crypto.randomBytes(4);

  let header: Buffer;
  if (payload.length < 126) {
    header = Buffer.alloc(6);
    header[0] = 0x81; // FIN + TEXT
    header[1] = 0x80 | payload.length; // MASK bit + length
    mask.copy(header, 2);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(8);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
    mask.copy(header, 4);
  } else {
    header = Buffer.alloc(14);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
    mask.copy(header, 10);
  }

  // Apply mask to payload
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    masked[i] = payload[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, masked]);
}

export async function GET() {
  if (!AIS_API_KEY) {
    return Response.json({ connected: false, count: 0, positions: [], error: 'No API key' });
  }

  try {
    const positions = await collectPositions(5000);
    return Response.json({ connected: true, count: positions.length, positions });
  } catch (err) {
    console.error('[AIS] Fatal:', err);
    return Response.json({ connected: false, count: 0, positions: [], error: String(err) });
  }
}
