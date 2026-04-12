'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

// ── Types ──────────────────────────────────────────────────────────────
interface SatPosition {
  id: string;
  name: string;
  provider: string;
  resolution: string;
  swathKm: number;
  color: string;
  type: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
}

interface OrbitPath {
  id: string;
  name: string;
  color: string;
  positions: { lat: number; lng: number; alt: number; time: string }[];
}

interface NextPass {
  satellite: string;
  name: string;
  provider: string;
  resolution: string;
  color: string;
  passTime: string;
  timeUntil: string;
  lat: number;
  lng: number;
  altitude: number;
}

interface SatData {
  positions: SatPosition[];
  orbits: OrbitPath[];
  nextPasses: NextPass[];
  coverage: { south: number; north: number; west: number; east: number };
  meta: { total_satellites: number; in_view: number; next_pass: NextPass | null };
}

interface VesselFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { mmsi: number; name: string; speed: number; status: string };
}

// ── Coverage area bounds ───────────────────────────────────────────────
const COVERAGE = { south: 28.7, north: 34.3, west: -120.5, east: -115.0 };

// ── Main Page Component ────────────────────────────────────────────────
export default function SatelliteViewPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [satData, setSatData] = useState<SatData | null>(null);
  const [vessels, setVessels] = useState<VesselFeature[]>([]);
  const [selectedSat, setSelectedSat] = useState<SatPosition | null>(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showCoverage, setShowCoverage] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [viewAngle, setViewAngle] = useState<'overhead' | 'orbit' | 'side'>('overhead');
  const [time, setTime] = useState(new Date());
  const animFrameRef = useRef<number>();

  // Fetch satellite data
  const fetchData = useCallback(async () => {
    try {
      const [satRes, vesRes] = await Promise.all([
        fetch('/api/ocean-data/satellite-orbits'),
        fetch('/api/ocean-data/all-vessels'),
      ]);

      if (satRes.ok) {
        const data = await satRes.json();
        setSatData(data);
      }

      if (vesRes.ok) {
        const data = await vesRes.json();
        setVessels(data.features || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Animate time
  useEffect(() => {
    const tick = () => {
      setTime(new Date());
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  // Render the 2D overhead satellite map (using Canvas for performance)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !satData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Map projection: Mercator centered on coverage area
    const centerLat = (COVERAGE.south + COVERAGE.north) / 2;
    const centerLng = (COVERAGE.west + COVERAGE.east) / 2;
    const latRange = 120; // Show ±60° latitude — enough to see full orbits
    const lngRange = 120; // Show wide longitude range

    const toX = (lng: number) => ((lng - centerLng + lngRange / 2) / lngRange) * W;
    const toY = (lat: number) => ((centerLat + latRange / 2 - lat) / latRange) * H;

    // Clear
    ctx.fillStyle = '#050a15';
    ctx.fillRect(0, 0, W, H);

    // Draw ocean grid
    ctx.strokeStyle = '#0d1a35';
    ctx.lineWidth = 0.5;
    for (let lat = -90; lat <= 90; lat += 5) {
      const y = toY(lat);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 5) {
      const x = toX(lng);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Draw coverage area
    if (showCoverage) {
      const cx1 = toX(COVERAGE.west);
      const cy1 = toY(COVERAGE.north);
      const cx2 = toX(COVERAGE.east);
      const cy2 = toY(COVERAGE.south);
      ctx.strokeStyle = '#00d4ff44';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx1, cy1, cx2 - cx1, cy2 - cy1);
      ctx.fillStyle = '#00d4ff08';
      ctx.fillRect(cx1, cy1, cx2 - cx1, cy2 - cy1);

      // Label
      ctx.fillStyle = '#00d4ff88';
      ctx.font = '10px monospace';
      ctx.fillText('COVERAGE AREA', cx1 + 4, cy1 + 14);
      ctx.fillText('Channel Islands → Guadalupe', cx1 + 4, cy1 + 26);
    }

    // Draw rough coastline approximation
    const coastPoints = [
      [34.5, -120.5], [34.4, -119.8], [34.0, -118.5], [33.8, -118.3],
      [33.7, -118.0], [33.2, -117.3], [32.7, -117.2], [32.5, -117.1],
      [32.0, -116.9], [31.5, -116.6], [31.0, -116.4], [30.5, -116.0],
      [30.0, -115.7], [29.5, -115.2], [29.0, -114.5], [28.5, -114.0],
    ];
    ctx.strokeStyle = '#1a3050';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    coastPoints.forEach(([lat, lng], i) => {
      const x = toX(lng); const y = toY(lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Fill land side
    ctx.lineTo(toX(-114.0), toY(45));
    ctx.lineTo(toX(-120.5), toY(45));
    ctx.closePath();
    ctx.fillStyle = '#0d1520';
    ctx.fill();

    // Draw orbit paths
    if (showOrbits) {
      for (const orbit of satData.orbits) {
        ctx.strokeStyle = orbit.color + '88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (const p of orbit.positions) {
          const x = toX(p.lng);
          const y = toY(p.lat);
          if (x < -100 || x > W + 100 || y < -100 || y > H + 100) {
            started = false;
            continue;
          }
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Draw vessel positions
    if (showVessels) {
      for (const v of vessels) {
        const [lng, lat] = v.geometry.coordinates;
        const x = toX(lng);
        const y = toY(lat);
        if (x < 0 || x > W || y < 0 || y > H) continue;

        const isStopped = v.properties.status === 'stopped';
        ctx.fillStyle = isStopped ? '#ef4444' : '#38bdf833';
        ctx.beginPath();
        ctx.arc(x, y, isStopped ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw satellites
    for (const sat of satData.positions) {
      const x = toX(sat.lng);
      const y = toY(sat.lat);

      // Satellite dot
      const isSelected = selectedSat?.id === sat.id;
      // Check if satellite is within the visible canvas area
      const sx = toX(sat.lng);
      const sy = toY(sat.lat);
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;

      // Pulsing glow
      const pulse = Math.sin(time.getTime() / 500 + sat.id.length) * 0.3 + 0.7;
      ctx.fillStyle = sat.color + Math.round(pulse * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();

      // White center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw swath footprint
      {
        const R = 6371;
        const halfSwath = sat.swathKm / 2;
        const dLat = (halfSwath / R) * (180 / Math.PI);
        const dLng = (halfSwath / (R * Math.cos(sat.lat * Math.PI / 180))) * (180 / Math.PI);

        ctx.strokeStyle = sat.color + '33';
        ctx.fillStyle = sat.color + '0a';
        ctx.lineWidth = 1;
        const fx1 = toX(sat.lng - dLng);
        const fy1 = toY(sat.lat + dLat);
        const fw = toX(sat.lng + dLng) - fx1;
        const fh = toY(sat.lat - dLat) - fy1;
        ctx.strokeRect(fx1, fy1, fw, fh);
        ctx.fillRect(fx1, fy1, fw, fh);
      }

      // Label
      if (showLabels) {
        ctx.fillStyle = sat.color;
        ctx.font = isSelected ? 'bold 11px monospace' : '9px monospace';
        ctx.fillText(sat.name, x + 8, y - 4);
        ctx.fillStyle = '#667788';
        ctx.font = '8px monospace';
        ctx.fillText(`${sat.altitude.toFixed(0)}km ${sat.resolution}`, x + 8, y + 8);
      }
    }

    // Draw timestamp HUD
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`● LIVE  ${time.toUTCString().replace('GMT', 'UTC')}`, 10, 20);

    ctx.fillStyle = '#667788';
    ctx.font = '10px monospace';
    ctx.fillText(`${satData.meta.total_satellites} satellites tracked | ${satData.meta.in_view} in view | ${vessels.length} vessels`, 10, 38);

  }, [satData, vessels, time, selectedSat, showOrbits, showVessels, showCoverage, showLabels]);

  // Handle canvas clicks
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !satData) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const W = canvasRef.current.width;
    const H = canvasRef.current.height;
    const centerLat = (COVERAGE.south + COVERAGE.north) / 2;
    const centerLng = (COVERAGE.west + COVERAGE.east) / 2;
    const latRange = 120;
    const lngRange = 120;

    const toX = (lng: number) => ((lng - centerLng + lngRange / 2) / lngRange) * W;
    const toY = (lat: number) => ((centerLat + latRange / 2 - lat) / latRange) * H;

    // Find clicked satellite
    let closest: SatPosition | null = null;
    let closestDist = 20; // 20px threshold
    for (const sat of satData.positions) {
      const sx = toX(sat.lng);
      const sy = toY(sat.lat);
      const dist = Math.sqrt((clickX - sx) ** 2 + (clickY - sy) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closest = sat;
      }
    }
    setSelectedSat(closest);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050a15' }}>
      <Header />
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Left panel — satellite list + controls */}
        <div style={{
          width: 320, flexShrink: 0, background: '#0a0f1a',
          borderRight: '1px solid #1e2a42', overflowY: 'auto',
          padding: 16,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: 0 }}>
              Satellite Tracker
            </h2>
            <Link href="/" style={{ color: '#667788', fontSize: 11, textDecoration: 'none' }}>
              ← Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: '#131b2e', borderRadius: 8, padding: '8px 12px', border: '1px solid #1e2a42' }}>
              <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase' }}>Tracked</div>
              <div style={{ color: '#00d4ff', fontSize: 20, fontWeight: 800 }}>{satData?.meta.total_satellites || '—'}</div>
            </div>
            <div style={{ background: '#131b2e', borderRadius: 8, padding: '8px 12px', border: '1px solid #1e2a42' }}>
              <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase' }}>In View</div>
              <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 800 }}>{satData?.meta.in_view || '—'}</div>
            </div>
          </div>

          {/* Layer toggles */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Layers</div>
            {[
              { key: 'orbits', label: 'Orbit Paths', state: showOrbits, set: setShowOrbits },
              { key: 'vessels', label: 'Fishing Vessels', state: showVessels, set: setShowVessels },
              { key: 'coverage', label: 'Coverage Area', state: showCoverage, set: setShowCoverage },
              { key: 'labels', label: 'Satellite Labels', state: showLabels, set: setShowLabels },
            ].map(l => (
              <div
                key={l.key}
                onClick={() => l.set(!l.state)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                  cursor: 'pointer', opacity: l.state ? 1 : 0.4,
                }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: l.state ? '#00d4ff' : '#333',
                  border: '1px solid #00d4ff44',
                }} />
                <span style={{ color: '#e2e8f0', fontSize: 12 }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Next passes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
              Next Passes Over Coverage Area
            </div>
            {satData?.nextPasses.slice(0, 8).map((pass, i) => (
              <div
                key={i}
                onClick={() => {
                  const pos = satData.positions.find(p => p.id === pass.satellite);
                  if (pos) setSelectedSat(pos);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', marginBottom: 4,
                  background: selectedSat?.id === pass.satellite ? '#1e2a42' : 'transparent',
                  borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${selectedSat?.id === pass.satellite ? pass.color + '44' : 'transparent'}`,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: pass.color, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{pass.name}</div>
                  <div style={{ color: '#667788', fontSize: 9 }}>{pass.provider} · {pass.resolution}</div>
                </div>
                <div style={{ color: pass.color, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                  {pass.timeUntil}
                </div>
              </div>
            )) || (
              <div style={{ color: '#4a5568', fontSize: 11 }}>Loading...</div>
            )}
          </div>

          {/* Selected satellite detail */}
          {selectedSat && (
            <div style={{
              background: '#131b2e', borderRadius: 8, padding: 12,
              border: `1px solid ${selectedSat.color}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedSat.color }} />
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>{selectedSat.name}</span>
              </div>
              <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                {[
                  ['Provider', selectedSat.provider],
                  ['Resolution', selectedSat.resolution],
                  ['Swath', `${selectedSat.swathKm} km`],
                  ['Altitude', `${selectedSat.altitude.toFixed(1)} km`],
                  ['Velocity', `${selectedSat.velocity.toFixed(1)} km/s`],
                  ['Position', `${selectedSat.lat.toFixed(2)}°, ${selectedSat.lng.toFixed(2)}°`],
                  ['Type', selectedSat.type],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#667788' }}>{label}</span>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Satellite catalog */}
          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
              All Satellites ({satData?.positions.length || 0})
            </div>
            {satData?.positions.map(sat => (
              <div
                key={sat.id}
                onClick={() => setSelectedSat(selectedSat?.id === sat.id ? null : sat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 6px', marginBottom: 2,
                  background: selectedSat?.id === sat.id ? '#1e2a42' : 'transparent',
                  borderRadius: 4, cursor: 'pointer', fontSize: 11,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: sat.color, flexShrink: 0,
                }} />
                <span style={{ color: '#e2e8f0', flex: 1 }}>{sat.name}</span>
                <span style={{ color: '#667788', fontSize: 9, fontFamily: 'monospace' }}>
                  {sat.altitude.toFixed(0)}km
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Canvas satellite map */}
        <div style={{ flex: 1, position: 'relative', background: '#050a15' }}>
          <canvas
            ref={canvasRef}
            width={1600}
            height={900}
            onClick={handleCanvasClick}
            style={{
              width: '100%', height: '100%',
              cursor: 'crosshair',
            }}
          />

          {/* Top overlay — live indicator */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(5, 10, 21, 0.8)', borderRadius: 6,
            padding: '6px 12px', fontSize: 10, fontFamily: 'monospace',
            color: '#00d4ff',
          }}>
            <span style={{ color: '#ef4444' }}>● LIVE</span> &nbsp;
            Satellites update every 30s
          </div>

          {/* View controls */}
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            display: 'flex', gap: 4,
          }}>
            <Link
              href="/"
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: '#1e2a42', color: '#667788', textDecoration: 'none',
              }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
