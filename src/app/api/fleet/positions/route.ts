import { execFile } from 'child_process';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const AIS_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';

export async function GET() {
  if (!AIS_API_KEY) {
    return Response.json({ connected: false, count: 0, positions: [], error: 'No API key' });
  }

  try {
    const scriptPath = join(process.cwd(), 'scripts', 'ais-snapshot.mjs');

    const result = await new Promise<string>((resolve, reject) => {
      execFile('node', [scriptPath, AIS_API_KEY, '5000'], {
        timeout: 9000,
      }, (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });

    const data = JSON.parse(result.trim());
    console.log(`[AIS] Snapshot: ${data.count} vessels collected`);

    return Response.json({
      connected: true,
      count: data.count || 0,
      positions: data.positions || [],
    });
  } catch (err) {
    console.error('[AIS] Snapshot error:', err);
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: String(err),
    });
  }
}
