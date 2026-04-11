'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { FillLayer, SymbolLayer } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Header from '@/components/Header';

interface BoatInfo {
  name: string;
  mmsi: number;
  duration: number;
  stopped_at: string;
}

interface ScoredZone {
  id: string;
  lat: number;
  lng: number;
  score: number;
  boat_count: number;
  boats: BoatInfo[];
  max_duration: number;
  confirmed: boolean;
  satellite_requested: boolean;
  satellite_action: 'none' | 'medium-res' | 'high-res';
}

interface ScoresResponse {
  type: string;
  features: object[];
  zones: ScoredZone[];
  meta: {
    total_stops: number;
    scored_zones: number;
    high_confidence: number;
    medium_confidence: number;
    satellite_queued: number;
  };
}

const REFRESH_INTERVAL = 30_000; // 30 seconds

// Map layers
const circleFillLayer: FillLayer = {
  id: 'kelp-score-circles',
  type: 'fill',
  source: 'kelp-scores',
  filter: ['==', '$type', 'Polygon'],
  paint: {
    'fill-color': ['get', 'fill_color'],
    'fill-opacity': ['get', 'fill_opacity'],
  },
};

const circleOutlineLayer: FillLayer & { paint: Record<string, unknown> } = {
  id: 'kelp-score-outlines',
  type: 'fill' as const,
  source: 'kelp-scores',
  filter: ['==', '$type', 'Polygon'],
  paint: {
    'fill-color': 'transparent',
    'fill-outline-color': ['get', 'fill_color'],
  },
} as any;

const scoreLabelLayer: SymbolLayer = {
  id: 'kelp-score-labels',
  type: 'symbol',
  source: 'kelp-scores',
  filter: ['==', '$type', 'Point'],
  layout: {
    'text-field': ['get', 'label'],
    'text-size': 18,
    'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#ffffff',
    'text-halo-color': '#000000',
    'text-halo-width': 2,
  },
};

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function scoreColor(score: number) {
  if (score >= 7) return '#ef4444';
  if (score >= 5) return '#eab308';
  if (score >= 3) return '#f97316';
  return '#8899aa';
}

function actionLabel(action: string) {
  if (action === 'high-res') return 'HIGH-RES';
  if (action === 'medium-res') return 'MED-RES';
  return '—';
}

function actionColor(action: string) {
  if (action === 'high-res') return '#ef4444';
  if (action === 'medium-res') return '#eab308';
  return '#4a5568';
}

export default function KelpSignalsDemo() {
  const mapRef = useRef<MapRef>(null);
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [vesselMeta, setVesselMeta] = useState<{ total: number; stopped: number; slow: number } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [paddyData, setPaddyData] = useState<{ type: string; features: object[] } | null>(null);
  const [vesselData, setVesselData] = useState<{ type: string; features: object[] } | null>(null);
  const [confirming, setConfirming] = useState<Set<string>>(new Set());
  const [ordering, setOrdering] = useState<Set<string>>(new Set());
  const [orderResults, setOrderResults] = useState<Record<string, { scene: string; orderId: string; status: string }>>({});

  const handleConfirmKelp = async (zone: ScoredZone) => {
    setConfirming(prev => new Set(prev).add(zone.id));
    try {
      const res = await fetch('/api/demo/confirm-kelp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: zone.lat, lng: zone.lng, boat_stop_id: zone.id }),
      });
      const result = await res.json();
      if (result.success) {
        fetchData(); // refresh to show the new paddy + drift path
      } else {
        alert(result.error || 'Failed to confirm');
      }
    } catch (err) {
      alert('Error: ' + String(err));
    } finally {
      setConfirming(prev => { const n = new Set(prev); n.delete(zone.id); return n; });
    }
  };

  const handleOrderSatellite = async (zone: ScoredZone) => {
    setOrdering(prev => new Set(prev).add(zone.id));
    try {
      const res = await fetch('/api/demo/order-satellite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: zone.lat,
          lng: zone.lng,
          boat_stop_id: zone.id,
          score: zone.score,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderResults(prev => ({
          ...prev,
          [zone.id]: {
            scene: data.scene.id,
            orderId: data.order.id,
            status: data.order.status,
          },
        }));
      } else {
        alert(data.message || data.error || 'No scenes available');
      }
    } catch (err) {
      alert('Order failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setOrdering(prev => { const n = new Set(prev); n.delete(zone.id); return n; });
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [scoresRes, vesselsRes, paddyRes] = await Promise.all([
        fetch('/api/demo/kelp-scores'),
        fetch('/api/ocean-data/all-vessels'),
        fetch('/api/demo/kelp-paddies'),
      ]);

      if (scoresRes.ok) {
        const scores = await scoresRes.json();
        setData(scores);
      }

      if (paddyRes.ok) {
        const paddies = await paddyRes.json();
        setPaddyData(paddies);
      }

      if (vesselsRes.ok) {
        const vessels = await vesselsRes.json();
        setVesselData(vessels);
        setVesselMeta({
          total: vessels.meta?.total_vessels || 0,
          stopped: vessels.meta?.stopped || 0,
          slow: vessels.meta?.slow_fishing || 0,
        });
      }

      setLastRefresh(new Date());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const meta = data?.meta || { total_stops: 0, scored_zones: 0, high_confidence: 0, medium_confidence: 0, satellite_queued: 0 };
  const zones = data?.zones || [];
  const geojsonData = data ? { type: data.type, features: data.features } : { type: 'FeatureCollection', features: [] };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
      <Header />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px' }}>
        {/* Title */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: 0 }}>
              Kelp Paddy Detection — Live Scoring
            </h1>
            <p style={{ color: '#667788', fontSize: 13, marginTop: 4 }}>
              Boats stopping in open ocean trigger 1km geofence circles. Multiple boats = higher kelp paddy probability.
            </p>
          </div>
          <div style={{ fontSize: 11, color: '#4a5568' }}>
            Updated: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every 30s
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Active Vessels', value: vesselMeta?.total || '—', sub: `${vesselMeta?.stopped || 0} stopped, ${vesselMeta?.slow || 0} fishing`, color: '#38bdf8' },
            { label: 'Boat Stops (48h)', value: meta.total_stops, sub: 'In open ocean', color: '#f97316' },
            { label: 'Scored Zones', value: meta.scored_zones, sub: 'Clustered within 1km', color: '#eab308' },
            { label: 'High Confidence', value: meta.high_confidence, sub: 'Score ≥7 (satellite trigger)', color: '#ef4444' },
            { label: 'Satellite Queue', value: meta.satellite_queued, sub: 'Imagery requested', color: '#a855f7' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, color: '#667788', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: '#4a5568', marginTop: 2 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{
          background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
          overflow: 'hidden', marginBottom: 16, height: '50vh',
        }}>
          <Map
            ref={mapRef}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            initialViewState={{ latitude: 32.7, longitude: -117.5, zoom: 8 }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
          >
            <NavigationControl position="top-right" />

            <Source id="kelp-scores" type="geojson" data={geojsonData as GeoJSON.FeatureCollection}>
              <Layer {...circleFillLayer} />
              <Layer {...scoreLabelLayer} />
            </Source>

            {/* Live AIS vessels */}
            {vesselData && (
              <Source id="demo-vessels" type="geojson" data={vesselData as GeoJSON.FeatureCollection}>
                <Layer
                  id="demo-vessels-stopped"
                  type="circle"
                  filter={['==', ['get', 'status'], 'stopped']}
                  paint={{
                    'circle-radius': 4,
                    'circle-color': '#ef4444',
                    'circle-opacity': 0.7,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff',
                  }}
                />
                <Layer
                  id="demo-vessels-moving"
                  type="circle"
                  filter={['!=', ['get', 'status'], 'stopped']}
                  paint={{
                    'circle-radius': 3,
                    'circle-color': '#38bdf8',
                    'circle-opacity': 0.3,
                  }}
                />
              </Source>
            )}

            {/* Confirmed kelp paddies + drift paths */}
            {paddyData && (
              <Source id="kelp-paddies" type="geojson" data={paddyData as GeoJSON.FeatureCollection}>
                {/* Predicted drift path — dashed line */}
                <Layer
                  id="drift-path-line"
                  type="line"
                  filter={['==', ['get', 'type'], 'drift-path']}
                  paint={{
                    'line-color': '#00d4ff',
                    'line-width': 2,
                    'line-dasharray': [4, 4],
                    'line-opacity': 0.7,
                  }}
                />
                {/* Historical drift — solid line */}
                <Layer
                  id="drift-history-line"
                  type="line"
                  filter={['==', ['get', 'type'], 'drift-history']}
                  paint={{
                    'line-color': '#22c55e',
                    'line-width': 3,
                    'line-opacity': 0.8,
                  }}
                />
                {/* Kelp paddy icon — green circle with white border */}
                <Layer
                  id="kelp-paddy-icon"
                  type="circle"
                  filter={['==', ['get', 'type'], 'kelp-paddy']}
                  paint={{
                    'circle-radius': 10,
                    'circle-color': '#22c55e',
                    'circle-opacity': 1,
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff',
                  }}
                />
                {/* Drift endpoint — small cyan circle */}
                <Layer
                  id="drift-endpoint"
                  type="circle"
                  filter={['==', ['get', 'type'], 'drift-endpoint']}
                  paint={{
                    'circle-radius': 5,
                    'circle-color': '#00d4ff',
                    'circle-opacity': 0.6,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#00d4ff',
                  }}
                />
              </Source>
            )}
          </Map>
        </div>

        {/* Scoring legend */}
        <div style={{
          display: 'flex', gap: 20, marginBottom: 16, padding: '10px 16px',
          background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 8,
          fontSize: 12, color: '#8899aa', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Scoring:</span>
          <span>5-10min stop = <b style={{ color: '#f97316' }}>1pt</b></span>
          <span>10-20min = <b style={{ color: '#f97316' }}>2pt</b></span>
          <span>20+min = <b style={{ color: '#f97316' }}>3pt</b></span>
          <span>Each extra boat = <b style={{ color: '#eab308' }}>+3pt</b></span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#f97316' }}>●</span> Score 3-4
          <span style={{ color: '#eab308' }}>●</span> Score 5-6 (med-res satellite)
          <span style={{ color: '#ef4444' }}>●</span> Score 7+ (high-res satellite)
          <div style={{ width: 1, height: 16, background: '#1e2a42', margin: '0 4px' }} />
          <span style={{ color: '#ef4444', fontSize: 8 }}>●</span> Stopped vessel
          <span style={{ color: '#38bdf8', fontSize: 8 }}>●</span> Moving vessel
          <div style={{ width: 1, height: 16, background: '#1e2a42', margin: '0 4px' }} />
          <span style={{ color: '#22c55e' }}>●</span> Confirmed kelp
          <span style={{ color: '#00d4ff' }}>- -</span> Predicted drift
        </div>

        {/* Zones table */}
        <div style={{
          background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2a42', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>
              Scored Zones ({zones.length})
            </span>
            <span style={{ color: '#4a5568', fontSize: 11 }}>
              Sorted by score (highest first)
            </span>
          </div>

          {zones.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 14 }}>
              {loading ? 'Loading...' : 'No boat stops detected in the last 48 hours. Waiting for boats to stop in open ocean...'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2a42' }}>
                    {['Score', 'Location', 'Boats', 'Max Duration', 'Confirmed', 'Satellite Action', 'Track Kelp', 'Last Activity'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#667788', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <tr key={zone.id} style={{ borderBottom: '1px solid #1e2a4222' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block', width: 36, height: 36, borderRadius: '50%',
                          background: scoreColor(zone.score) + '22',
                          border: `2px solid ${scoreColor(zone.score)}`,
                          textAlign: 'center', lineHeight: '32px',
                          color: scoreColor(zone.score), fontWeight: 800, fontSize: 16,
                        }}>
                          {zone.score}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                        {zone.lat.toFixed(4)}°N, {Math.abs(zone.lng).toFixed(4)}°W
                      </td>
                      <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                        <span style={{ color: '#00d4ff', fontWeight: 600 }}>{zone.boat_count}</span>
                        <span style={{ color: '#667788', marginLeft: 6, fontSize: 11 }}>
                          {zone.boats.map(b => b.name).join(', ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                        {zone.max_duration} min
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {zone.confirmed ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>YES</span>
                        ) : (
                          <span style={{ color: '#4a5568' }}>No</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {orderResults[zone.id] ? (
                          <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#22c55e22', color: '#22c55e' }}>
                            ORDERED
                          </span>
                        ) : zone.score >= 3 ? (
                          <button
                            onClick={() => handleOrderSatellite(zone)}
                            disabled={ordering.has(zone.id)}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: ordering.has(zone.id) ? '#4a5568' : actionColor(zone.satellite_action),
                              color: '#fff', border: 'none', cursor: ordering.has(zone.id) ? 'wait' : 'pointer',
                            }}
                          >
                            {ordering.has(zone.id) ? 'Ordering...' : `Order ${actionLabel(zone.satellite_action)}`}
                          </button>
                        ) : (
                          <span style={{ color: '#4a5568', fontSize: 11 }}>Score too low</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {zone.confirmed ? (
                          <button
                            onClick={() => handleConfirmKelp(zone)}
                            disabled={confirming.has(zone.id)}
                            style={{
                              padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                              background: confirming.has(zone.id) ? '#4a5568' : '#22c55e',
                              color: '#fff', border: 'none', cursor: confirming.has(zone.id) ? 'wait' : 'pointer',
                            }}
                          >
                            {confirming.has(zone.id) ? 'Confirming...' : 'Confirm & Track'}
                          </button>
                        ) : (
                          <span style={{ color: '#4a5568', fontSize: 11 }}>Needs 2+ boats</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#667788', fontSize: 12 }}>
                        {zone.boats.length > 0 ? relativeTime(zone.boats[0].stopped_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How it works section */}
        <div style={{
          marginTop: 16, padding: 20, background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
          color: '#8899aa', fontSize: 13, lineHeight: 1.8,
        }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>How It Works</div>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            <li>AIS tracks all vessels in the Channel Islands to Guadalupe coverage area (28.7°N - 34.3°N)</li>
            <li>When a boat stops in open ocean ({'>'}1 mile from shore) for 5+ minutes, a 1km geofence circle is drawn</li>
            <li>The circle accumulates a score based on stop duration and number of boats that enter it</li>
            <li>Score ≥5: request medium-resolution satellite imagery (Sentinel-2, 10m)</li>
            <li>Score ≥7: request high-resolution satellite imagery (PlanetScope, 3m)</li>
            <li>Satellite images are analyzed to visually confirm floating kelp rafts</li>
            <li>Confirmed kelp raft locations are tracked over time to build drift models</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
