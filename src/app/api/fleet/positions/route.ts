import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Read positions from the file written by the background AIS collector script
export async function GET() {
  const dataFile = join(process.cwd(), '.ais-positions.json');

  try {
    const raw = readFileSync(dataFile, 'utf-8');
    const data = JSON.parse(raw);
    return Response.json(data);
  } catch {
    return Response.json({
      connected: false,
      count: 0,
      totalMessages: 0,
      positions: [],
      error: 'AIS collector not running. Start it with: node scripts/ais-collector.mjs',
    });
  }
}
