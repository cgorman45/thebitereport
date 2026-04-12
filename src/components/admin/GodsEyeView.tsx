'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Types ──────────────────────────────────────────────────────────────
type RenderMode = 'default' | 'thermal' | 'nvg' | 'targeting';

interface VesselSnapshot {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
}

interface TimeSnapshot {
  timestamp: string;
  vessels: VesselSnapshot[];
}

interface SatellitePassInfo {
  sentinel2: { name: string; timeUntil: string; passTime: string };
  pleiades: { name: string; timeUntil: string; passTime: string };
}

interface GodsEyeProps {
  onClose: () => void;
  scoresData?: { type: string; features: object[] };
  paddyData?: { type: string; features: object[] };
}

// ── Render Mode Styles ─────────────────────────────────────────────────
const modeConfig: Record<RenderMode, {
  label: string;
  icon: string;
  mapStyle: string;
  overlayColor: string;
  overlayOpacity: number;
  filter?: string;
  scanlines?: boolean;
  vesselColor: string;
  vesselStoppedColor: string;
  zoneColor: string;
  textColor: string;
  timestampColor: string;
}> = {
  default: {
    label: 'DEFAULT',
    icon: '🌊',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    overlayColor: 'transparent',
    overlayOpacity: 0,
    vesselColor: '#38bdf8',
    vesselStoppedColor: '#ef4444',
    zoneColor: '#f97316',
    textColor: '#e2e8f0',
    timestampColor: '#667788',
  },
  thermal: {
    label: 'FLIR',
    icon: '🔥',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    overlayColor: '#ff4400',
    overlayOpacity: 0.08,
    filter: 'saturate(0.3) contrast(1.4) brightness(0.7)',
    vesselColor: '#ff6600',
    vesselStoppedColor: '#ffff00',
    zoneColor: '#ff3300',
    textColor: '#ffaa44',
    timestampColor: '#ff6600',
  },
  nvg: {
    label: 'NVG',
    icon: '👁',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    overlayColor: '#00ff00',
    overlayOpacity: 0.06,
    filter: 'saturate(0) brightness(0.5) contrast(1.5)',
    scanlines: true,
    vesselColor: '#00ff44',
    vesselStoppedColor: '#88ff00',
    zoneColor: '#00cc33',
    textColor: '#00ff44',
    timestampColor: '#00cc33',
  },
  targeting: {
    label: 'TGT',
    icon: '🎯',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    overlayColor: '#00ffff',
    overlayOpacity: 0.04,
    filter: 'saturate(0.2) contrast(1.6) brightness(0.6)',
    vesselColor: '#00ffff',
    vesselStoppedColor: '#ff0044',
    zoneColor: '#ffaa00',
    textColor: '#00ffff',
    timestampColor: '#00aaff',
  },
};

// ── Time Slider ────────────────────────────────────────────────────────
function TimeSlider({
  snapshots,
  currentIndex,
  onChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
  mode,
}: {
  snapshots: TimeSnapshot[];
  currentIndex: number;
  onChange: (i: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (s: number) => void;
  mode: RenderMode;
}) {
  const cfg = modeConfig[mode];
  const current = snapshots[currentIndex];
  const total = snapshots.length;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      width: '70%', maxWidth: 700, zIndex: 20,
      background: 'rgba(10, 15, 26, 0.92)', backdropFilter: 'blur(12px)',
      border: `1px solid ${cfg.textColor}33`, borderRadius: 10,
      padding: '8px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: cfg.textColor, fontSize: 18, padding: 0, width: 24,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Speed */}
        <button
          onClick={() => onSpeedChange(playbackSpeed >= 8 ? 1 : playbackSpeed * 2)}
          style={{
            background: `${cfg.textColor}15`, border: `1px solid ${cfg.textColor}33`,
            borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
            color: cfg.textColor, fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
          }}
        >
          {playbackSpeed}x
        </button>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={total - 1}
          value={currentIndex}
          onChange={e => onChange(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: cfg.textColor }}
        />

        {/* Time label */}
        <span style={{ color: cfg.timestampColor, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {current ? formatTime(current.timestamp) : '—'}
        </span>
      </div>

      {/* Vessel count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: cfg.timestampColor, fontFamily: 'monospace' }}>
        <span>48h ago</span>
        <span>{current?.vessels.length || 0} vessels in frame</span>
        <span>Now</span>
      </div>
    </div>
  );
}

// ── Satellite Pass Indicator ───────────────────────────────────────────
function SatPassIndicator({ passes, mode }: { passes: SatellitePassInfo | null; mode: RenderMode }) {
  const cfg = modeConfig[mode];
  if (!passes) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 90, right: 10, zIndex: 20,
      background: 'rgba(10, 15, 26, 0.92)', backdropFilter: 'blur(8px)',
      border: `1px solid ${cfg.textColor}33`, borderRadius: 8,
      padding: '8px 12px', fontSize: 10, fontFamily: 'monospace',
    }}>
      <div style={{ color: cfg.textColor, fontWeight: 700, marginBottom: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
        Next Satellite Pass
      </div>
      <div style={{ color: '#0ea5e9', marginBottom: 2 }}>
        🛰 {passes.sentinel2.name}: {passes.sentinel2.timeUntil}
      </div>
      <div style={{ color: '#a855f7' }}>
        🛰 {passes.pleiades.name}: {passes.pleiades.timeUntil}
      </div>
    </div>
  );
}

// ── Crosshair Overlay (Targeting Mode) ─────────────────────────────────
function TargetingOverlay({ mode }: { mode: RenderMode }) {
  if (mode !== 'targeting') return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15,
    }}>
      {/* Center crosshair */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 80, height: 80,
      }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: 20, background: '#00ffff88' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: 20, background: '#00ffff88' }} />
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 20, height: 1, background: '#00ffff88' }} />
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 20, height: 1, background: '#00ffff88' }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 40, height: 40, border: '1px solid #00ffff44', borderRadius: '50%',
        }} />
      </div>

      {/* Corner brackets */}
      {[
        { top: 20, left: 20 },
        { top: 20, right: 20 },
        { bottom: 120, left: 20 },
        { bottom: 120, right: 20 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: 30, height: 30,
          borderTop: i < 2 ? '2px solid #00ffff66' : 'none',
          borderBottom: i >= 2 ? '2px solid #00ffff66' : 'none',
          borderLeft: (i % 2 === 0) ? '2px solid #00ffff66' : 'none',
          borderRight: (i % 2 === 1) ? '2px solid #00ffff66' : 'none',
        }} />
      ))}
    </div>
  );
}

// ── Scanline Overlay (NVG Mode) ────────────────────────────────────────
function ScanlineOverlay({ mode }: { mode: RenderMode }) {
  if (mode !== 'nvg') return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 14,
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      mixBlendMode: 'multiply',
    }} />
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function GodsEyeView({ onClose, scoresData, paddyData }: GodsEyeProps) {
  const mapRef = useRef<MapRef>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('default');
  const [snapshots, setSnapshots] = useState<TimeSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [satPasses, setSatPasses] = useState<SatellitePassInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());
  const [liveVessels, setLiveVessels] = useState<{ type: string; features: object[] } | null>(null);
  const [showLayers, setShowLayers] = useState({
    vessels: true,
    zones: true,
    kelp: true,
    trails: true,
    satPasses: true,
  });
  const playIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const cfg = modeConfig[renderMode];

  // Fetch trajectory data
  useEffect(() => {
    fetch('/api/ocean-data/vessel-trajectories?hours_back=48&interval_minutes=5')
      .then(r => r.json())
      .then(d => {
        if (d.snapshots?.length) {
          setSnapshots(d.snapshots);
          setCurrentIndex(d.snapshots.length - 1); // Start at "now"
        }
      })
      .catch(() => {});
  }, []);

  // Fetch live vessels (all fishing boats) + refresh every 30s
  useEffect(() => {
    const fetchVessels = () => {
      fetch('/api/ocean-data/all-vessels')
        .then(r => r.json())
        .then(d => { if (d.type === 'FeatureCollection') setLiveVessels(d); })
        .catch(() => {});
    };
    fetchVessels();
    const interval = setInterval(fetchVessels, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch satellite passes
  useEffect(() => {
    fetch('/api/ocean-data/satellite-passes')
      .then(r => r.json())
      .then(d => {
        if (d.next) setSatPasses(d.next);
      })
      .catch(() => {});
  }, []);

  // Playback timer
  useEffect(() => {
    if (isPlaying && snapshots.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + playbackSpeed;
        });
      }, 200); // ~5fps base rate
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, snapshots.length, playbackSpeed]);

  // Update current time display
  useEffect(() => {
    const snap = snapshots[currentIndex];
    if (snap) setCurrentTime(snap.timestamp);
  }, [currentIndex, snapshots]);

  // Convert current snapshot to GeoJSON
  const vesselGeoJson = useCallback(() => {
    const snap = snapshots[Math.min(currentIndex, snapshots.length - 1)];
    if (!snap) return { type: 'FeatureCollection', features: [] };

    return {
      type: 'FeatureCollection',
      features: snap.vessels.map(v => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
        properties: {
          mmsi: v.mmsi,
          name: v.name,
          speed: v.speed,
          heading: v.heading,
          stopped: v.speed < 1.5,
        },
      })),
    };
  }, [snapshots, currentIndex]);

  // Build vessel trail GeoJSON (last N positions as lines)
  const vesselTrailsGeoJson = useCallback(() => {
    const trailLength = 20; // Show last 20 snapshots as trail
    const startIdx = Math.max(0, currentIndex - trailLength);
    const endIdx = currentIndex;

    if (endIdx <= startIdx || snapshots.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    // Group positions by vessel
    const trails: Record<number, [number, number][]> = {};
    for (let i = startIdx; i <= endIdx; i++) {
      const snap = snapshots[i];
      if (!snap) continue;
      for (const v of snap.vessels) {
        if (!trails[v.mmsi]) trails[v.mmsi] = [];
        trails[v.mmsi].push([v.lng, v.lat]);
      }
    }

    return {
      type: 'FeatureCollection',
      features: Object.entries(trails)
        .filter(([, coords]) => coords.length >= 2)
        .map(([mmsi, coords]) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: { mmsi: parseInt(mmsi) },
        })),
    };
  }, [snapshots, currentIndex]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === '1') setRenderMode('default');
      if (e.key === '2') setRenderMode('thermal');
      if (e.key === '3') setRenderMode('nvg');
      if (e.key === '4') setRenderMode('targeting');
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(snapshots.length - 1, i + 1));
      if (e.key === 'v') setShowLayers(l => ({ ...l, vessels: !l.vessels }));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, snapshots.length]);

  const geojsonScores = scoresData || { type: 'FeatureCollection', features: [] };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
    }}>
      {/* Color overlay for render modes */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 13, pointerEvents: 'none',
        background: cfg.overlayColor, opacity: cfg.overlayOpacity,
        mixBlendMode: 'overlay',
      }} />

      {/* Scanlines for NVG */}
      <ScanlineOverlay mode={renderMode} />

      {/* Targeting crosshair */}
      <TargetingOverlay mode={renderMode} />

      {/* Top HUD bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
      }}>
        {/* Left: Mode toggles */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(modeConfig) as RenderMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setRenderMode(mode)}
              style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: renderMode === mode ? `${modeConfig[mode].textColor}33` : 'rgba(0,0,0,0.5)',
                color: renderMode === mode ? modeConfig[mode].textColor : '#4a5568',
                border: renderMode === mode ? `1px solid ${modeConfig[mode].textColor}66` : '1px solid #333',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              {modeConfig[mode].icon} {modeConfig[mode].label}
            </button>
          ))}
        </div>

        {/* Center: Timestamp */}
        <div style={{
          color: cfg.timestampColor, fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
          textShadow: `0 0 10px ${cfg.timestampColor}`,
        }}>
          <span style={{ color: cfg.vesselStoppedColor, marginRight: 6 }}>● REC</span>
          {new Date(currentTime).toUTCString().replace('GMT', 'UTC')}
        </div>

        {/* Right: Close button */}
        <button
          onClick={onClose}
          style={{
            padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700,
            background: 'rgba(0,0,0,0.5)', color: '#8899aa',
            border: '1px solid #333', cursor: 'pointer',
          }}
        >
          ESC ✕
        </button>
      </div>

      {/* Map with CSS filter for render modes */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: cfg.filter || 'none',
      }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ latitude: 32.7, longitude: -117.5, zoom: 8 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={cfg.mapStyle}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/* Scored zones */}
          {showLayers.zones && <Source id="ge-scores" type="geojson" data={geojsonScores as GeoJSON.FeatureCollection}>
            <Layer
              id="ge-score-circles"
              type="fill"
              filter={['==', '$type', 'Polygon']}
              paint={{
                'fill-color': cfg.zoneColor,
                'fill-opacity': 0.2,
              }}
            />
            <Layer
              id="ge-score-labels"
              type="symbol"
              filter={['==', '$type', 'Point']}
              layout={{
                'text-field': ['get', 'label'],
                'text-size': 16,
                'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                'text-allow-overlap': true,
              }}
              paint={{
                'text-color': cfg.textColor,
                'text-halo-color': '#000000',
                'text-halo-width': 2,
              }}
            />
          </Source>}

          {/* Vessel trails */}
          {showLayers.trails && <Source id="ge-trails" type="geojson" data={vesselTrailsGeoJson() as any}>
            <Layer
              id="ge-vessel-trails"
              type="line"
              paint={{
                'line-color': cfg.vesselColor,
                'line-width': 1.5,
                'line-opacity': 0.4,
              }}
            />
          </Source>}

          {/* Vessels at current time (from trajectory replay) */}
          <Source id="ge-vessels" type="geojson" data={vesselGeoJson() as any}>
            <Layer
              id="ge-vessels-stopped"
              type="circle"
              filter={['==', ['get', 'stopped'], true]}
              paint={{
                'circle-radius': 6,
                'circle-color': cfg.vesselStoppedColor,
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff44',
              }}
            />
            <Layer
              id="ge-vessels-moving"
              type="circle"
              filter={['==', ['get', 'stopped'], false]}
              paint={{
                'circle-radius': 4,
                'circle-color': cfg.vesselColor,
                'circle-opacity': 0.7,
              }}
            />
            {/* Vessel name labels */}
            <Layer
              id="ge-vessel-labels"
              type="symbol"
              filter={['==', ['get', 'stopped'], true]}
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                'text-offset': [0, 1.5],
                'text-allow-overlap': false,
              }}
              paint={{
                'text-color': cfg.textColor,
                'text-halo-color': '#000',
                'text-halo-width': 1,
              }}
            />
          </Source>

          {/* Kelp paddies + drift */}
          {showLayers.kelp && paddyData && (
            <Source id="ge-paddies" type="geojson" data={paddyData as GeoJSON.FeatureCollection}>
              <Layer
                id="ge-drift-path"
                type="line"
                filter={['==', ['get', 'type'], 'drift-path']}
                paint={{
                  'line-color': renderMode === 'nvg' ? '#00ff88' : '#00d4ff',
                  'line-width': 2,
                  'line-dasharray': [4, 4],
                  'line-opacity': 0.6,
                }}
              />
              <Layer
                id="ge-kelp-icon"
                type="circle"
                filter={['==', ['get', 'type'], 'kelp-paddy']}
                paint={{
                  'circle-radius': 10,
                  'circle-color': renderMode === 'thermal' ? '#ffff00' : '#22c55e',
                  'circle-opacity': 1,
                  'circle-stroke-width': 3,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          )}

          {/* Live fishing vessels (all AIS boats) */}
          {showLayers.vessels && liveVessels && (
            <Source id="ge-live-vessels" type="geojson" data={liveVessels as GeoJSON.FeatureCollection}>
              <Layer
                id="ge-live-stopped"
                type="circle"
                filter={['==', ['get', 'status'], 'stopped']}
                paint={{
                  'circle-radius': 5,
                  'circle-color': cfg.vesselStoppedColor,
                  'circle-opacity': 0.8,
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': '#ffffff44',
                }}
              />
              <Layer
                id="ge-live-slow"
                type="circle"
                filter={['==', ['get', 'status'], 'slow']}
                paint={{
                  'circle-radius': 4,
                  'circle-color': renderMode === 'thermal' ? '#ff9900' : '#eab308',
                  'circle-opacity': 0.6,
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#ffffff22',
                }}
              />
              <Layer
                id="ge-live-transit"
                type="circle"
                filter={['==', ['get', 'status'], 'transit']}
                paint={{
                  'circle-radius': 3,
                  'circle-color': cfg.vesselColor,
                  'circle-opacity': 0.3,
                }}
              />
              {/* Name labels for stopped/slow vessels */}
              <Layer
                id="ge-live-labels"
                type="symbol"
                filter={['in', ['get', 'status'], ['literal', ['stopped', 'slow']]]}
                layout={{
                  'text-field': ['get', 'name'],
                  'text-size': 9,
                  'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                  'text-offset': [0, 1.3],
                  'text-allow-overlap': false,
                }}
                paint={{
                  'text-color': cfg.timestampColor,
                  'text-halo-color': '#000',
                  'text-halo-width': 1,
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* Layer toggle panel */}
      <div style={{
        position: 'absolute', top: 50, left: 10, zIndex: 20,
        background: 'rgba(10, 15, 26, 0.92)', backdropFilter: 'blur(8px)',
        border: `1px solid ${cfg.textColor}22`, borderRadius: 8,
        padding: '8px 10px', fontSize: 10,
      }}>
        <div style={{ color: cfg.textColor, fontWeight: 700, marginBottom: 6, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
          Layers
        </div>
        {([
          { key: 'vessels', label: 'All Vessels', count: liveVessels?.features?.length, color: cfg.vesselColor, hotkey: 'V' },
          { key: 'zones', label: 'Scored Zones', color: cfg.zoneColor },
          { key: 'trails', label: 'Vessel Trails', color: cfg.vesselColor },
          { key: 'kelp', label: 'Confirmed Kelp', color: '#22c55e' },
          { key: 'satPasses', label: 'Sat Passes', color: '#a855f7' },
        ] as const).map(layer => (
          <div
            key={layer.key}
            onClick={() => setShowLayers(l => ({ ...l, [layer.key]: !l[layer.key] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
              cursor: 'pointer', opacity: showLayers[layer.key] ? 1 : 0.35,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: showLayers[layer.key] ? layer.color : '#333',
              border: `1px solid ${layer.color}66`,
              flexShrink: 0,
            }} />
            <span style={{ color: cfg.textColor, flex: 1 }}>{layer.label}</span>
            {'count' in layer && layer.count != null && (
              <span style={{ color: cfg.timestampColor, fontFamily: 'monospace', fontSize: 9 }}>
                {layer.count}
              </span>
            )}
            {'hotkey' in layer && (
              <span style={{ color: '#4a5568', fontSize: 8, fontFamily: 'monospace' }}>{layer.hotkey}</span>
            )}
          </div>
        ))}
      </div>

      {/* Satellite pass indicator */}
      {showLayers.satPasses && <SatPassIndicator passes={satPasses} mode={renderMode} />}

      {/* Time slider */}
      {snapshots.length > 0 && (
        <TimeSlider
          snapshots={snapshots}
          currentIndex={Math.min(currentIndex, snapshots.length - 1)}
          onChange={setCurrentIndex}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(p => !p)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          mode={renderMode}
        />
      )}

      {/* Bottom-left: Keyboard shortcuts */}
      <div style={{
        position: 'absolute', bottom: 20, left: 10, zIndex: 20,
        background: 'rgba(0,0,0,0.7)', borderRadius: 6,
        padding: '6px 10px', fontSize: 9, color: '#4a5568', fontFamily: 'monospace',
        lineHeight: 1.8,
      }}>
        <span style={{ color: cfg.textColor }}>1-4</span> Mode &nbsp;
        <span style={{ color: cfg.textColor }}>Space</span> Play &nbsp;
        <span style={{ color: cfg.textColor }}>←→</span> Scrub &nbsp;
        <span style={{ color: cfg.textColor }}>V</span> Vessels &nbsp;
        <span style={{ color: cfg.textColor }}>Esc</span> Exit
      </div>
    </div>
  );
}
