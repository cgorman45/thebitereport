import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GFW_BASE = 'https://gateway.api.globalfishingwatch.org/v3';
const CACHE_KEY = 'ocean:sar-vessels';
const CACHE_TTL = 30 * 60_000; // 30 minutes

// Coverage area
const COVERAGE = {
  latMin: 28.7, latMax: 34.3,
  lngMin: -120.5, lngMax: -115.0,
};

/**
 * GET /api/ocean-data/sar-vessels
 *
 * Returns SAR (radar) vessel detections from Global Fishing Watch.
 * Includes both AIS-matched and "dark" vessels (no transponder).
 * Query params:
 *   days=3 — lookback period (default 3, max 30)
 */
export async function GET(req: NextRequest) {
  const token = process.env.GFW_API_TOKEN;
  if (!token) {
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      meta: { error: 'GFW_API_TOKEN not configured' },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') || '3'), 30);
    const cacheKey = `${CACHE_KEY}:${days}`;

    // Don't serve cached errors
    const cached = cache.get<{ meta?: { error?: string } }>(cacheKey);
    if (cached && !cached.meta?.error) return NextResponse.json(cached);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Use the events API to get vessel detections in our area
    // The events endpoint supports geographic filtering natively
    const params = new URLSearchParams({
      'datasets[0]': 'public-global-sar-presence:latest',
      'date-range': `${startDate},${endDate}`,
      'spatial-resolution': 'LOW',
      'temporal-resolution': 'MONTHLY',
      'group-by': 'VESSEL_ID',
      format: 'JSON',
    });

    const regionBody = {
      geojson: {
          type: 'Polygon',
          coordinates: [[
            [COVERAGE.lngMin, COVERAGE.latMin],
            [COVERAGE.lngMax, COVERAGE.latMin],
            [COVERAGE.lngMax, COVERAGE.latMax],
            [COVERAGE.lngMin, COVERAGE.latMax],
            [COVERAGE.lngMin, COVERAGE.latMin],
          ]],
        },
      },
    };

    const res = await fetch(`${GFW_BASE}/4wings/report?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regionBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[sar-vessels] GFW API error:', res.status, text.substring(0, 200));
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        meta: { error: `GFW API ${res.status}` },
      });
    }

    const data = await res.json();

    // Transform GFW report response to GeoJSON
    const features: object[] = [];
    const entries = data.entries || [];

    for (const entry of entries) {
      // Each entry has a dataset key with an array of vessel records
      const records = Object.values(entry).flat().filter(Boolean) as Record<string, unknown>[];
      for (const rec of records) {
        // Extract lat/lng from the record if available
        const lat = rec.lat ?? rec.latitude;
        const lng = rec.lon ?? rec.longitude;
        if (lat != null && lng != null) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
            properties: {
              vessel_id: rec.vesselId || rec.vessel_id,
              vessel_name: rec.shipname || rec.vesselName,
              flag: rec.flag,
              gear_type: rec.geartype,
              detections: rec.detections || 1,
              date: rec.date,
              source: 'sentinel-1-sar',
            },
          });
        }
      }
    }

    const result = {
      type: 'FeatureCollection',
      features,
      meta: {
        source: 'Global Fishing Watch — Sentinel-1 SAR',
        date_range: `${startDate} to ${endDate}`,
        total_detections: features.length,
        attribution: 'Global Fishing Watch, www.globalfishingwatch.org',
      },
    };

    // Only cache successful results
    if (features.length > 0) {
      cache.set(cacheKey, result, CACHE_TTL);
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sar-vessels]', msg);
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      meta: { error: msg },
    });
  }
}
