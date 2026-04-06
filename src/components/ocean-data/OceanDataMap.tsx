'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Popup } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { MapEvent, MapMouseEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LayerPanel from './LayerPanel';
import ColorScale from './ColorScale';
import DataInfo from './DataInfo';
import KelpPopup from './KelpPopup';
import ReportKelpButton from './ReportKelpButton';
import ReportKelpModal from './ReportKelpModal';
import SightingPopup from './SightingPopup';
import CommunityFeed from './CommunityFeed';
import { getSupabase } from '@/lib/supabase/client';
import { useOptionalAuth } from '@/components/auth/AuthProvider';

type RasterLayerId = 'sst' | 'chlorophyll' | 'goes-sst';
type LayerId = RasterLayerId | 'breaks';

const RASTER_LAYERS: RasterLayerId[] = ['sst', 'chlorophyll', 'goes-sst'];

const OVERLAY_COORDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-121.0, 35.0],
  [-117.0, 35.0],
  [-117.0, 32.0],
  [-121.0, 32.0],
];

interface KelpPopupState {
  lng: number;
  lat: number;
  properties: {
    confidence: number;
    area_m2: number;
    method: string;
    detected_at: string;
    ndvi: number | null;
    fai: number | null;
    fdi: number | null;
  };
}

interface KelpSighting {
  id: string;
  lat: number;
  lng: number;
  description: string | null;
  status: 'pending' | 'verified' | 'expired';
  verification_count: number;
  display_name: string;
  avatar_key: string;
  photo_url: string | null;
  created_at: string;
}

interface SightingPopupState {
  sighting: KelpSighting;
}

export default function OceanDataMap() {
  const mapRef = useRef<MapRef>(null);
  const auth = useOptionalAuth();

  const [layers, setLayers] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
    'kelp-markers': false,
    'kelp-polygons': false,
    'kelp-heatmap': false,
    'drift-heatmap': false,
    'current-vectors': false,
  });

  const [loading, setLoading] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
    'kelp-markers': false,
    'kelp-polygons': false,
    'kelp-heatmap': false,
    'drift-heatmap': false,
    'current-vectors': false,
  });

  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [hasKelpData, setHasKelpData] = useState(false);
  const [hasDriftData, setHasDriftData] = useState(false);
  const [kelpPopup, setKelpPopup] = useState<KelpPopupState | null>(null);

  // Community kelp sightings state
  const [sightings, setSightings] = useState<KelpSighting[]>([]);
  const [reportMode, setReportMode] = useState(false);
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [sightingPopup, setSightingPopup] = useState<SightingPopupState | null>(null);
  const [userVerifications, setUserVerifications] = useState<Set<string>>(new Set());

  const mapLoadedRef = useRef(false);
  const sightingsRef = useRef<KelpSighting[]>([]);

  // Keep ref in sync for use in map event handlers
  useEffect(() => {
    sightingsRef.current = sightings;
  }, [sightings]);

  // Fetch community sightings
  const fetchSightings = useCallback(async () => {
    try {
      const res = await fetch('/api/kelp-sightings');
      if (!res.ok) return;
      const data: KelpSighting[] = await res.json();
      setSightings(data);
    } catch {
      // Silently ignore
    }
  }, []);

  // On mount: fetch sightings and refresh every 60s
  useEffect(() => {
    fetchSightings();
    const interval = setInterval(fetchSightings, 60000);
    return () => clearInterval(interval);
  }, [fetchSightings]);

  // Update kelp-sightings GeoJSON source when sightings change
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoadedRef.current) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: sightings.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id,
          status: s.status,
          verification_count: s.verification_count,
        },
      })),
    };

    if (map.getSource('kelp-sightings-source')) {
      (map.getSource('kelp-sightings-source') as mapboxgl.GeoJSONSource).setData(geojson);
    }
  }, [sightings]);

  // Check for kelp data on mount
  useEffect(() => {
    fetch('/api/ocean-data/kelp-detections')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((geojson: GeoJSON.FeatureCollection | null) => {
        if (geojson && geojson.features && geojson.features.length > 0) {
          setHasKelpData(true);
        }
      })
      .catch(() => {
        // Silently ignore
      });
  }, []);

  // Check for drift data on mount
  useEffect(() => {
    fetch('/api/ocean-data/current-vectors')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((geojson: GeoJSON.FeatureCollection | null) => {
        if (geojson && geojson.features && geojson.features.length > 0) {
          setHasDriftData(true);
        }
      })
      .catch(() => {
        // Silently ignore
      });
  }, []);

  const onMapLoad = useCallback((evt: MapEvent) => {
    const map = evt.target;
    mapLoadedRef.current = true;

    for (const id of RASTER_LAYERS) {
      const url =
        id === 'sst'
          ? '/api/ocean-data/sst'
          : id === 'chlorophyll'
          ? '/api/ocean-data/chlorophyll'
          : '/api/ocean-data/goes-sst';

      map.addSource(id, {
        type: 'image',
        url,
        coordinates: OVERLAY_COORDS,
      });

      map.addLayer({
        id,
        type: 'raster',
        source: id,
        paint: { 'raster-opacity': 0 },
        minzoom: 6,
        maxzoom: 12,
      });
    }

    // Add kelp sightings GeoJSON source and layer
    map.addSource('kelp-sightings-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'kelp-sightings-layer',
      type: 'circle',
      source: 'kelp-sightings-source',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'status'], 'verified'], 10,
          8,
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'status'], 'verified'], '#22c55e',
          ['==', ['get', 'status'], 'expired'], '#8899aa',
          '#eab308',
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'case',
          ['==', ['get', 'status'], 'verified'], '#16a34a',
          ['==', ['get', 'status'], 'expired'], '#64748b',
          '#ca8a04',
        ],
      },
    });

    // Click handler for kelp sightings
    map.on('click', 'kelp-sightings-layer', (e: MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties as Record<string, unknown>;
      const sightingId = String(props.id ?? '');
      const found = sightingsRef.current.find((s) => s.id === sightingId);
      if (found) {
        setSightingPopup({ sighting: found });
        setKelpPopup(null);
      }
    });

    map.on('mouseenter', 'kelp-sightings-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'kelp-sightings-layer', () => {
      map.getCanvas().style.cursor = '';
    });

    // Click handler for kelp markers (satellite detections)
    map.on('click', 'kelp-markers', (e: MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const props = feature.properties as Record<string, unknown>;
      setKelpPopup({
        lng: coords[0],
        lat: coords[1],
        properties: {
          confidence: Number(props.confidence ?? 0),
          area_m2: Number(props.area_m2 ?? 0),
          method: String(props.method ?? 'threshold'),
          detected_at: String(props.detected_at ?? new Date().toISOString()),
          ndvi: props.ndvi != null ? Number(props.ndvi) : null,
          fai: props.fai != null ? Number(props.fai) : null,
          fdi: props.fdi != null ? Number(props.fdi) : null,
        },
      });
    });

    map.on('mouseenter', 'kelp-markers', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'kelp-markers', () => {
      map.getCanvas().style.cursor = '';
    });
  }, []);

  const fetchTimestamp = useCallback(async () => {
    try {
      const res = await fetch('/api/ocean-data/sst', { method: 'HEAD' });
      const ts = res.headers.get('X-Data-Timestamp');
      if (ts) setDataTimestamp(ts);
    } catch {
      // Silently ignore
    }
  }, []);

  const handleToggle = useCallback(
    async (layerId: string) => {
      const map = mapRef.current?.getMap();
      if (!map || !mapLoadedRef.current) return;

      const currentlyOn = layers[layerId];
      const turningOn = !currentlyOn;

      setLayers((prev) => ({ ...prev, [layerId]: turningOn }));
      setLoading((prev) => ({ ...prev, [layerId]: true }));

      try {
        if (layerId === 'kelp-markers') {
          if (turningOn) {
            const res = await fetch('/api/ocean-data/kelp-detections');
            if (!res.ok) throw new Error('Failed to fetch kelp detections');
            const geojson: GeoJSON.FeatureCollection = await res.json();

            if (map.getSource('kelp-markers-source')) {
              (map.getSource('kelp-markers-source') as mapboxgl.GeoJSONSource).setData(geojson);
              if (map.getLayer('kelp-markers')) {
                map.setPaintProperty('kelp-markers', 'circle-opacity', [
                  'interpolate',
                  ['linear'],
                  ['get', 'confidence'],
                  0, 0.4,
                  1, 1.0,
                ]);
              }
            } else {
              map.addSource('kelp-markers-source', {
                type: 'geojson',
                data: geojson,
              });
              map.addLayer({
                id: 'kelp-markers',
                type: 'circle',
                source: 'kelp-markers-source',
                paint: {
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'area_m2'],
                    0, 4,
                    100000, 12,
                  ],
                  'circle-color': '#22c55e',
                  'circle-opacity': [
                    'interpolate',
                    ['linear'],
                    ['get', 'confidence'],
                    0, 0.4,
                    1, 1.0,
                  ],
                },
              });
            }
          } else {
            if (map.getLayer('kelp-markers')) {
              map.setPaintProperty('kelp-markers', 'circle-opacity', 0);
            }
          }
        } else if (layerId === 'kelp-polygons') {
          if (turningOn) {
            const res = await fetch('/api/ocean-data/kelp-polygons');
            if (!res.ok) throw new Error('Failed to fetch kelp polygons');
            const geojson: GeoJSON.FeatureCollection = await res.json();

            if (map.getSource('kelp-polygons-source')) {
              (map.getSource('kelp-polygons-source') as mapboxgl.GeoJSONSource).setData(geojson);
              if (map.getLayer('kelp-polygons-fill')) {
                map.setPaintProperty('kelp-polygons-fill', 'fill-opacity', 0.2);
              }
              if (map.getLayer('kelp-polygons-line')) {
                map.setPaintProperty('kelp-polygons-line', 'line-opacity', 1);
              }
            } else {
              map.addSource('kelp-polygons-source', {
                type: 'geojson',
                data: geojson,
              });
              map.addLayer({
                id: 'kelp-polygons-fill',
                type: 'fill',
                source: 'kelp-polygons-source',
                paint: {
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.2,
                },
              });
              map.addLayer({
                id: 'kelp-polygons-line',
                type: 'line',
                source: 'kelp-polygons-source',
                paint: {
                  'line-color': '#22c55e',
                  'line-width': 2,
                  'line-opacity': 1,
                },
              });
            }
          } else {
            if (map.getLayer('kelp-polygons-fill')) {
              map.setPaintProperty('kelp-polygons-fill', 'fill-opacity', 0);
            }
            if (map.getLayer('kelp-polygons-line')) {
              map.setPaintProperty('kelp-polygons-line', 'line-opacity', 0);
            }
          }
        } else if (layerId === 'kelp-heatmap') {
          if (turningOn) {
            if (map.getSource('kelp-heatmap-source')) {
              if (map.getLayer('kelp-heatmap')) {
                map.setPaintProperty('kelp-heatmap', 'raster-opacity', 0.7);
              }
            } else {
              map.addSource('kelp-heatmap-source', {
                type: 'image',
                url: '/api/ocean-data/kelp-heatmap',
                coordinates: OVERLAY_COORDS,
              });
              map.addLayer({
                id: 'kelp-heatmap',
                type: 'raster',
                source: 'kelp-heatmap-source',
                paint: { 'raster-opacity': 0.7 },
              });
            }
          } else {
            if (map.getLayer('kelp-heatmap')) {
              map.setPaintProperty('kelp-heatmap', 'raster-opacity', 0);
            }
          }
        } else if (layerId === 'drift-heatmap') {
          if (turningOn) {
            // Check if data is available (204 = no data)
            const res = await fetch('/api/ocean-data/drift-heatmap', { method: 'HEAD' });
            if (res.status === 204) {
              // No data, revert toggle
              setLayers((prev) => ({ ...prev, [layerId]: false }));
            } else if (map.getSource('drift-heatmap-source')) {
              if (map.getLayer('drift-heatmap')) {
                map.setPaintProperty('drift-heatmap', 'raster-opacity', 0.7);
              }
            } else {
              map.addSource('drift-heatmap-source', {
                type: 'image',
                url: '/api/ocean-data/drift-heatmap',
                coordinates: [[-121, 35], [-117, 35], [-117, 32], [-121, 32]],
              });
              map.addLayer({
                id: 'drift-heatmap',
                type: 'raster',
                source: 'drift-heatmap-source',
                paint: { 'raster-opacity': 0.7 },
                minzoom: 6,
                maxzoom: 12,
              });
            }
          } else {
            if (map.getLayer('drift-heatmap')) {
              map.setPaintProperty('drift-heatmap', 'raster-opacity', 0);
            }
          }
        } else if (layerId === 'current-vectors') {
          if (turningOn) {
            const res = await fetch('/api/ocean-data/current-vectors');
            if (!res.ok) throw new Error('Failed to fetch current vectors');
            const geojson: GeoJSON.FeatureCollection = await res.json();

            if (map.getSource('current-vectors-source')) {
              (map.getSource('current-vectors-source') as mapboxgl.GeoJSONSource).setData(geojson);
              if (map.getLayer('current-vectors-layer')) {
                map.setPaintProperty('current-vectors-layer', 'line-opacity', 0.8);
              }
            } else {
              map.addSource('current-vectors-source', {
                type: 'geojson',
                data: geojson,
              });
              map.addLayer({
                id: 'current-vectors-layer',
                type: 'line',
                source: 'current-vectors-source',
                paint: {
                  'line-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'speed_knots'],
                    0, '#06b6d4',
                    2, '#ec4899',
                  ],
                  'line-width': 2,
                  'line-opacity': 0.8,
                },
              });
            }
          } else {
            if (map.getLayer('current-vectors-layer')) {
              map.setPaintProperty('current-vectors-layer', 'line-opacity', 0);
            }
          }
        } else if (layerId === 'breaks') {
          const id = layerId as LayerId;
          if (turningOn) {
            const res = await fetch('/api/ocean-data/breaks');
            if (!res.ok) throw new Error('Failed to fetch breaks');
            const geojson: GeoJSON.FeatureCollection = await res.json();
            setError(false);

            if (map.getSource('breaks')) {
              (map.getSource('breaks') as mapboxgl.GeoJSONSource).setData(geojson);
              map.setLayoutProperty('breaks-layer', 'visibility', 'visible');
            } else {
              map.addSource('breaks', {
                type: 'geojson',
                data: geojson,
              });
              map.addLayer({
                id: 'breaks-layer',
                type: 'line',
                source: 'breaks',
                paint: {
                  'line-color': '#ff6b35',
                  'line-width': 2,
                  'line-dasharray': [6, 3],
                },
              });
            }

            fetchTimestamp();
          } else {
            if (map.getLayer('breaks-layer')) {
              map.setLayoutProperty('breaks-layer', 'visibility', 'none');
            }
          }
          void id;
        } else {
          // Raster layer (sst, chlorophyll, goes-sst)
          const rasterOpacity = layerId === 'chlorophyll' ? 0.6 : 0.7;
          map.setPaintProperty(layerId, 'raster-opacity', turningOn ? rasterOpacity : 0);

          if (turningOn) {
            setError(false);
            fetchTimestamp();
          }
        }
      } catch {
        setError(true);
        // Revert toggle on error
        setLayers((prev) => ({ ...prev, [layerId]: currentlyOn }));
      } finally {
        setLoading((prev) => ({ ...prev, [layerId]: false }));
      }
    },
    [layers, fetchTimestamp]
  );

  // Map click handler for report mode
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!reportMode) return;
      setReportCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setShowReportModal(true);
      setReportMode(false);
    },
    [reportMode]
  );

  // Verify handler
  const handleVerify = useCallback(async (sightingId: string) => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token) {
        auth?.openAuthModal();
        return;
      }
      const res = await fetch(`/api/kelp-sightings/${sightingId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      // Optimistically update verification count
      setUserVerifications((prev) => {
        const next = new Set(prev);
        if (next.has(sightingId)) {
          next.delete(sightingId);
        } else {
          next.add(sightingId);
        }
        return next;
      });

      setSightings((prev) =>
        prev.map((s) =>
          s.id === sightingId
            ? {
                ...s,
                verification_count: userVerifications.has(sightingId)
                  ? s.verification_count - 1
                  : s.verification_count + 1,
              }
            : s
        )
      );

      // Refresh popup if open
      setSightingPopup((prev) => {
        if (!prev || prev.sighting.id !== sightingId) return prev;
        const updated = sightings.find((s) => s.id === sightingId);
        return updated ? { sighting: updated } : prev;
      });
    } catch {
      // Silently ignore
    }
  }, [auth, sightings, userVerifications]);

  // Handle new sighting submitted
  const handleSightingSubmit = useCallback((sighting: { id: string }) => {
    // Refresh sightings list to include the new one
    void sighting;
    fetchSightings();
  }, [fetchSightings]);

  // Navigate map to sighting location
  const handleFeedSightingClick = useCallback((lat: number, lng: number) => {
    mapRef.current?.getMap()?.flyTo({ center: [lng, lat], zoom: 12, duration: 1200 });
    setShowFeed(false);
  }, []);

  const activeColorScale: 'sst' | 'chlorophyll' | 'kelp-heatmap' | 'drift-heatmap' | null =
    layers.sst || layers['goes-sst']
      ? 'sst'
      : layers.chlorophyll
      ? 'chlorophyll'
      : layers['kelp-heatmap']
      ? 'kelp-heatmap'
      : layers['drift-heatmap']
      ? 'drift-heatmap'
      : null;

  return (
    <>
      <style>{`
        .odm-cursor-crosshair { cursor: crosshair !important; }
        .odm-community-btn:hover { border-color: #00d4ff !important; box-shadow: 0 0 14px #00d4ff44 !important; }
        .odm-report-mode-hint {
          animation: odm-pulse 1.5s ease-in-out infinite;
        }
        @keyframes odm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div
        style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)' }}
        className={reportMode ? 'odm-cursor-crosshair' : ''}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ latitude: 33.5, longitude: -119.0, zoom: 8 }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: 'calc(100vh - 64px)' }}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          {/* Satellite kelp detection popup */}
          {kelpPopup && (
            <Popup
              longitude={kelpPopup.lng}
              latitude={kelpPopup.lat}
              anchor="bottom"
              onClose={() => setKelpPopup(null)}
              closeOnClick={false}
              style={{ padding: 0, background: 'none', border: 'none' }}
            >
              <KelpPopup
                confidence={kelpPopup.properties.confidence}
                area_m2={kelpPopup.properties.area_m2}
                method={kelpPopup.properties.method}
                detected_at={kelpPopup.properties.detected_at}
                indices={
                  kelpPopup.properties.ndvi != null &&
                  kelpPopup.properties.fai != null &&
                  kelpPopup.properties.fdi != null
                    ? {
                        ndvi: kelpPopup.properties.ndvi,
                        fai: kelpPopup.properties.fai,
                        fdi: kelpPopup.properties.fdi,
                      }
                    : null
                }
                lat={kelpPopup.lat}
                lng={kelpPopup.lng}
              />
            </Popup>
          )}

          {/* Community sighting popup */}
          {sightingPopup && (
            <Popup
              longitude={sightingPopup.sighting.lng}
              latitude={sightingPopup.sighting.lat}
              anchor="bottom"
              onClose={() => setSightingPopup(null)}
              closeOnClick={false}
              style={{ padding: 0, background: 'none', border: 'none' }}
            >
              <SightingPopup
                id={sightingPopup.sighting.id}
                lat={sightingPopup.sighting.lat}
                lng={sightingPopup.sighting.lng}
                description={sightingPopup.sighting.description}
                status={sightingPopup.sighting.status}
                verification_count={sightingPopup.sighting.verification_count}
                display_name={sightingPopup.sighting.display_name}
                avatar_key={sightingPopup.sighting.avatar_key}
                photo_url={sightingPopup.sighting.photo_url}
                created_at={sightingPopup.sighting.created_at}
                onVerify={handleVerify}
              />
            </Popup>
          )}
        </Map>

        {/* Top-left: data info */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <DataInfo timestamp={dataTimestamp} error={error} />
        </div>

        {/* Top-right: layer panel */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <LayerPanel layers={layers} loading={loading} onToggle={handleToggle} hasKelpData={hasKelpData} hasDriftData={hasDriftData} />
        </div>

        {/* Bottom-center: color scale */}
        {activeColorScale && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <ColorScale activeLayer={activeColorScale} />
          </div>
        )}

        {/* Bottom-left: Community + Report buttons */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 12,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          {/* Community feed toggle */}
          <button
            className="odm-community-btn"
            onClick={() => setShowFeed((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: showFeed ? 'rgba(0,212,255,0.1)' : 'rgba(13,19,32,0.92)',
              border: `1px solid ${showFeed ? '#00d4ff' : '#1e2a42'}`,
              borderRadius: 10,
              padding: '10px 14px',
              cursor: 'pointer',
              color: '#00d4ff',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
              boxShadow: showFeed ? '0 0 14px #00d4ff44' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Community
          </button>

          {/* Report kelp button */}
          <ReportKelpButton
            onReport={() => {
              setReportMode(true);
              setSightingPopup(null);
              setKelpPopup(null);
            }}
          />
        </div>

        {/* Report mode hint */}
        {reportMode && (
          <div
            className="odm-report-mode-hint"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 20,
              background: 'rgba(13,19,32,0.92)',
              border: '1px solid #22c55e',
              borderRadius: 10,
              padding: '10px 18px',
              color: '#22c55e',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 0 20px #22c55e44',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Click on the map to place your sighting
            <button
              onClick={() => setReportMode(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8899aa',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
                marginLeft: 4,
                pointerEvents: 'auto',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Report kelp modal */}
        {showReportModal && reportCoords && (
          <ReportKelpModal
            lat={reportCoords.lat}
            lng={reportCoords.lng}
            onClose={() => {
              setShowReportModal(false);
              setReportCoords(null);
            }}
            onSubmit={handleSightingSubmit}
          />
        )}

        {/* Community feed slide-out */}
        <CommunityFeed
          isOpen={showFeed}
          onClose={() => setShowFeed(false)}
          onSightingClick={handleFeedSightingClick}
        />
      </div>
    </>
  );
}
