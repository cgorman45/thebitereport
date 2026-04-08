'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import ReportFishButton from './ReportFishButton';
import ReportFishModal from './ReportFishModal';
import FishReportPopup from './FishReportPopup';
import FishActivityFeed from './FishActivityFeed';
import type { FishReport } from './FishActivityFeed';
import SightingPopup from './SightingPopup';
import CommunityFeed from './CommunityFeed';
import { useGPSTracking } from './useGPSTracking';
import ProximityAlertBanner from './ProximityAlertBanner';
import GPSToggle from './GPSToggle';
import type { Detection } from '@/lib/ocean-data/proximity';
import { getSupabase } from '@/lib/supabase/client';
import { useOptionalAuth } from '@/components/auth/AuthProvider';

const QUANTITY_LABELS: Record<string, string> = {
  'few': 'Few',
  'some': 'Some',
  'lots': 'Lots',
  'wide-open': 'Wide Open!',
};

const FISH_SPECIES_COLORS: Record<string, string> = {
  'yellowtail': '#eab308',
  'bluefin tuna': '#3b82f6',
  'yellowfin tuna': '#f59e0b',
  'calico bass': '#22c55e',
  'white seabass': '#e2e8f0',
  'barracuda': '#8b5cf6',
  'dorado': '#22d3ee',
  'bonito': '#06b6d4',
  'rockfish': '#ef4444',
  'halibut': '#84cc16',
  'sheephead': '#f97316',
};

type RasterLayerId = 'sst' | 'chlorophyll' | 'goes-sst';
type LayerId = RasterLayerId | 'breaks';

const RASTER_LAYERS: RasterLayerId[] = ['sst', 'chlorophyll', 'goes-sst'];

// Full SoCal + Baja California coverage (down to Cabo San Lucas)
const OVERLAY_COORDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-121.0, 35.0],
  [-109.0, 35.0],
  [-109.0, 22.0],
  [-121.0, 22.0],
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
    thumbnail_b64: string | null;
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

interface FishReportPopupState {
  report: FishReport;
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
    'boat-kelp-signals': false,
    'drift-heatmap': false,
    'current-vectors': false,
    'windy-wind': false,
    'windy-waves': false,
    'windy-currents': false,
    'windy-swell': false,
    'fish-reports': true,
  });

  const [loading, setLoading] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
    'kelp-markers': false,
    'kelp-polygons': false,
    'kelp-heatmap': false,
    'boat-kelp-signals': false,
    'drift-heatmap': false,
    'current-vectors': false,
    'windy-wind': false,
    'windy-waves': false,
    'windy-currents': false,
    'windy-swell': false,
    'fish-reports': false,
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

  // Fish report state
  const [fishReports, setFishReports] = useState<FishReport[]>([]);
  const [fishReportMode, setFishReportMode] = useState(false);
  const [fishReportCoords, setFishReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showFishReportModal, setShowFishReportModal] = useState(false);
  const [fishReportPopup, setFishReportPopup] = useState<FishReportPopupState | null>(null);
  const [showFishFeed, setShowFishFeed] = useState(false);
  const [userFishVerifications, setUserFishVerifications] = useState<Set<string>>(new Set());

  const mapLoadedRef = useRef(false);
  const sightingsRef = useRef<KelpSighting[]>([]);
  const fishReportsRef = useRef<FishReport[]>([]);

  // Build detections list for proximity alerts from all data sources
  const proximityDetections: Detection[] = useMemo(() => {
    const dets: Detection[] = [];
    // Add community sightings
    for (const s of sightings) {
      if (s.status !== 'expired') {
        dets.push({
          id: `sighting-${s.id}`,
          lat: s.lat,
          lng: s.lng,
          type: 'kelp-sighting',
          label: s.description || `Kelp sighting by ${s.display_name}`,
          confidence: s.verification_count >= 3 ? 0.9 : 0.5 + s.verification_count * 0.1,
        });
      }
    }
    // Add fish reports
    for (const r of fishReports) {
      if (r.status !== 'expired') {
        dets.push({
          id: `fish-${r.id}`,
          lat: r.lat,
          lng: r.lng,
          type: 'fish-report' as Detection['type'],
          label: `${r.species} — ${QUANTITY_LABELS[r.quantity] ?? r.quantity}${r.bait ? ` on ${r.bait}` : ''}`,
          confidence: r.verification_count >= 3 ? 0.95 : 0.6,
        });
      }
    }
    return dets;
  }, [sightings, fishReports]);

  const { gps, alerts, alertRadius, setAlertRadius, startTracking, stopTracking, dismissAlert } =
    useGPSTracking(proximityDetections);

  // Keep refs in sync for use in map event handlers
  useEffect(() => {
    sightingsRef.current = sightings;
  }, [sightings]);

  useEffect(() => {
    fishReportsRef.current = fishReports;
  }, [fishReports]);

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

  // Fetch fish reports
  const fetchFishReports = useCallback(async () => {
    try {
      const res = await fetch('/api/fish-reports');
      if (res.ok) {
        const data = await res.json();
        setFishReports(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently ignore
    }
  }, []);

  // On mount: fetch fish reports and refresh every 30s
  useEffect(() => {
    fetchFishReports();
    const interval = setInterval(fetchFishReports, 30000);
    return () => clearInterval(interval);
  }, [fetchFishReports]);

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

  // Update fish-reports GeoJSON source when fish reports change
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoadedRef.current) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: fishReports.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          species: r.species,
          quantity: r.quantity,
          status: r.status,
          verification_count: r.verification_count,
        },
      })),
    };

    if (map.getSource('fish-reports-source')) {
      (map.getSource('fish-reports-source') as mapboxgl.GeoJSONSource).setData(geojson);
    }
  }, [fishReports]);

  // Update user position on the map when GPS changes
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoadedRef.current) return;
    if (!gps.enabled || gps.lat === null || gps.lng === null) {
      // Hide user position layers when GPS is off
      if (map.getLayer('user-position-dot')) {
        map.setLayoutProperty('user-position-dot', 'visibility', 'none');
      }
      if (map.getLayer('user-position-ring')) {
        map.setLayoutProperty('user-position-ring', 'visibility', 'none');
      }
      return;
    }

    const point: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] },
          properties: {},
        },
      ],
    };

    if (map.getSource('user-position')) {
      (map.getSource('user-position') as mapboxgl.GeoJSONSource).setData(point);
      if (map.getLayer('user-position-dot')) {
        map.setLayoutProperty('user-position-dot', 'visibility', 'visible');
      }
      if (map.getLayer('user-position-ring')) {
        map.setLayoutProperty('user-position-ring', 'visibility', 'visible');
      }
    } else {
      map.addSource('user-position', { type: 'geojson', data: point });
      map.addLayer({
        id: 'user-position-ring',
        type: 'circle',
        source: 'user-position',
        paint: {
          'circle-radius': 14,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.2,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#3b82f6',
          'circle-stroke-opacity': 0.5,
        },
      });
      map.addLayer({
        id: 'user-position-dot',
        type: 'circle',
        source: 'user-position',
        paint: {
          'circle-radius': 7,
          'circle-color': '#3b82f6',
          'circle-opacity': 1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
  }, [gps.enabled, gps.lat, gps.lng]);

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

    // Add fish reports GeoJSON source and layer
    map.addSource('fish-reports-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'fish-reports-layer',
      type: 'circle',
      source: 'fish-reports-source',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'quantity'], 'wide-open'], 10,
          ['==', ['get', 'quantity'], 'lots'], 8,
          ['==', ['get', 'quantity'], 'some'], 6,
          5,
        ],
        'circle-color': [
          'case',
          ['in', 'yellowtail', ['downcase', ['get', 'species']]], '#eab308',
          ['in', 'tuna', ['downcase', ['get', 'species']]], '#3b82f6',
          ['in', 'bass', ['downcase', ['get', 'species']]], '#22c55e',
          '#f97316',
        ],
        'circle-opacity': [
          'case',
          ['==', ['get', 'status'], 'verified'], 0.9,
          0.6,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.3)',
      },
    });

    // Click handler for fish reports
    map.on('click', 'fish-reports-layer', (e: MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties as Record<string, unknown>;
      const reportId = String(props.id ?? '');
      const found = fishReportsRef.current.find((r) => r.id === reportId);
      if (found) {
        setFishReportPopup({ report: found });
        setKelpPopup(null);
        setSightingPopup(null);
      }
    });

    map.on('mouseenter', 'fish-reports-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'fish-reports-layer', () => {
      map.getCanvas().style.cursor = '';
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
          thumbnail_b64: props.thumbnail_b64 ? String(props.thumbnail_b64) : null,
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
      // Windy layers don't need the Mapbox map — handle separately
      if (layerId.startsWith('windy-')) {
        setLayers((prev) => {
          const next = { ...prev };
          // Mutually exclusive — turn off other windy layers
          for (const k of Object.keys(next)) {
            if (k.startsWith('windy-')) next[k] = false;
          }
          next[layerId] = !prev[layerId];
          return next;
        });
        return;
      }

      const map = mapRef.current?.getMap();
      if (!map || !mapLoadedRef.current) return;

      const currentlyOn = layers[layerId];
      const turningOn = !currentlyOn;

      setLayers((prev) => ({ ...prev, [layerId]: turningOn }));
      setLoading((prev) => ({ ...prev, [layerId]: true }));

      try {
        if (layerId === 'fish-reports') {
          if (map.getLayer('fish-reports-layer')) {
            map.setLayoutProperty('fish-reports-layer', 'visibility', turningOn ? 'visible' : 'none');
          }
        } else if (layerId === 'kelp-markers') {
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
        } else if (layerId === 'boat-kelp-signals') {
          if (turningOn) {
            const res = await fetch('/api/ocean-data/boat-kelp-signals');
            if (!res.ok) { setLayers((prev) => ({ ...prev, [layerId]: false })); return; }
            const geojson = await res.json();
            if (!geojson.features || geojson.features.length === 0) {
              setLayers((prev) => ({ ...prev, [layerId]: false }));
              return;
            }
            if (map.getSource('boat-kelp-source')) {
              (map.getSource('boat-kelp-source') as mapboxgl.GeoJSONSource).setData(geojson);
              if (map.getLayer('boat-kelp-circles')) {
                map.setPaintProperty('boat-kelp-circles', 'circle-opacity', 0.9);
              }
            } else {
              map.addSource('boat-kelp-source', { type: 'geojson', data: geojson });
              // Pulsing orange circles for boat clusters
              map.addLayer({
                id: 'boat-kelp-circles',
                type: 'circle',
                source: 'boat-kelp-source',
                paint: {
                  'circle-radius': ['interpolate', ['linear'], ['get', 'boat_count'], 2, 12, 5, 22, 10, 30],
                  'circle-color': '#ff6b35',
                  'circle-opacity': 0.9,
                  'circle-stroke-width': 3,
                  'circle-stroke-color': '#ff6b35',
                  'circle-stroke-opacity': 0.4,
                },
              });
              // Label with boat count
              map.addLayer({
                id: 'boat-kelp-labels',
                type: 'symbol',
                source: 'boat-kelp-source',
                layout: {
                  'text-field': ['concat', ['get', 'boat_count'], ' boats'],
                  'text-size': 11,
                  'text-offset': [0, 1.8],
                  'text-anchor': 'top',
                },
                paint: {
                  'text-color': '#ff6b35',
                  'text-halo-color': '#0a0f1a',
                  'text-halo-width': 1.5,
                },
              });
            }
          } else {
            if (map.getLayer('boat-kelp-circles')) map.setPaintProperty('boat-kelp-circles', 'circle-opacity', 0);
            if (map.getLayer('boat-kelp-labels')) map.setLayoutProperty('boat-kelp-labels', 'visibility', 'none');
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
                coordinates: OVERLAY_COORDS,
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

  // Map click handler for report mode (kelp or fish)
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (reportMode) {
        setReportCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        setShowReportModal(true);
        setReportMode(false);
        return;
      }
      if (fishReportMode) {
        setFishReportCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        setShowFishReportModal(true);
        setFishReportMode(false);
        return;
      }
    },
    [reportMode, fishReportMode]
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

  // Fish report verify handler
  const handleFishVerify = useCallback(async (reportId: string) => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token) {
        auth?.openAuthModal();
        return;
      }
      const res = await fetch(`/api/fish-reports/${reportId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      setUserFishVerifications((prev) => {
        const next = new Set(prev);
        if (next.has(reportId)) {
          next.delete(reportId);
        } else {
          next.add(reportId);
        }
        return next;
      });

      setFishReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                verification_count: userFishVerifications.has(reportId)
                  ? r.verification_count - 1
                  : r.verification_count + 1,
              }
            : r
        )
      );
    } catch {
      // Silently ignore
    }
  }, [auth, userFishVerifications]);

  // Handle new fish report submitted
  const handleFishReportSubmit = useCallback((_report: { id: string }) => {
    fetchFishReports();
  }, [fetchFishReports]);

  // Navigate map to fish report location
  const handleFishFeedClick = useCallback((lat: number, lng: number) => {
    mapRef.current?.getMap()?.flyTo({ center: [lng, lat], zoom: 12, duration: 1200 });
    setShowFishFeed(false);
  }, []);

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

  // Windy overlay state
  const activeWindyOverlay = (['windy-wind', 'windy-waves', 'windy-currents', 'windy-swell'] as const)
    .find((id) => layers[id]) ?? null;

  const windyOverlayMap: Record<string, string> = {
    'windy-wind': 'wind',
    'windy-waves': 'waves',
    'windy-currents': 'currents',
    'windy-swell': 'swell',
  };

  const windyUrl = activeWindyOverlay
    ? `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=imperial&metricTemp=imperial&metricWind=mph&zoom=6&overlay=${windyOverlayMap[activeWindyOverlay]}&product=ecmwf&level=surface&lat=29.0&lon=-116.0&marker=true&calendar=now&pressure=true&type=map&menu=&message=true&forecast=12&theme=dark`
    : null;

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
        @keyframes proximityPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 30px rgba(34,197,94,0.5); }
        }
      `}</style>
      <div
        style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)' }}
        className={(reportMode || fishReportMode) ? 'odm-cursor-crosshair' : ''}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ latitude: 28.0, longitude: -114.0, zoom: 4.5 }}
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
                thumbnail_b64={kelpPopup.properties.thumbnail_b64}
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
          {/* Fish report popup */}
          {fishReportPopup && (
            <Popup
              longitude={fishReportPopup.report.lng}
              latitude={fishReportPopup.report.lat}
              anchor="bottom"
              onClose={() => setFishReportPopup(null)}
              closeOnClick={false}
              style={{ padding: 0, background: 'none', border: 'none' }}
            >
              <FishReportPopup
                id={fishReportPopup.report.id}
                species={fishReportPopup.report.species}
                quantity={fishReportPopup.report.quantity}
                bait={fishReportPopup.report.bait}
                technique={fishReportPopup.report.technique}
                description={fishReportPopup.report.description}
                status={fishReportPopup.report.status}
                verification_count={fishReportPopup.report.verification_count}
                display_name={fishReportPopup.report.display_name}
                avatar_key={fishReportPopup.report.avatar_key}
                created_at={fishReportPopup.report.created_at}
                onVerify={handleFishVerify}
              />
            </Popup>
          )}
        </Map>

        {/* Windy weather overlay iframe */}
        {windyUrl && (
          <iframe
            src={windyUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: 0.75,
              pointerEvents: 'auto',
              zIndex: 5,
            }}
            title="Windy weather overlay"
          />
        )}

        {/* Proximity alert banner */}
        <ProximityAlertBanner
          alerts={alerts}
          onDismiss={dismissAlert}
          onTap={(lat, lng) => mapRef.current?.getMap()?.flyTo({ center: [lng, lat], zoom: 14, duration: 800 })}
        />

        {/* Top-left: data info */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <DataInfo timestamp={dataTimestamp} error={error} />
        </div>

        {/* Top-right: layer panel */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <LayerPanel layers={layers} loading={loading} onToggle={handleToggle} hasKelpData={hasKelpData} hasDriftData={hasDriftData} fishReportCount={fishReports.filter((r) => r.status !== 'expired').length} />
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

          {/* Fish activity feed toggle */}
          <button
            onClick={() => { setShowFishFeed((v) => !v); setShowFeed(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: showFishFeed ? 'rgba(249,115,22,0.1)' : 'rgba(13,19,32,0.92)',
              border: `1px solid ${showFishFeed ? '#f97316' : '#1e2a42'}`,
              borderRadius: 10,
              padding: '10px 14px',
              cursor: 'pointer',
              color: '#f97316',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
              boxShadow: showFishFeed ? '0 0 14px #f9731644' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 12C6.5 12 3 9 2 5c3 0 5.5 2 7.5 4" fill="#f9731633" />
              <path d="M6.5 12C6.5 12 3 15 2 19c3 0 5.5-2 7.5-4" fill="#f9731633" />
              <path d="M6.5 12h9" />
              <circle cx="18" cy="12" r="3" fill="#f9731444" />
            </svg>
            Fish Activity
            {fishReports.filter((r) => r.status !== 'expired').length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#f97316', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {fishReports.filter((r) => r.status !== 'expired').length}
              </span>
            )}
          </button>

          {/* GPS proximity toggle */}
          <GPSToggle
            enabled={gps.enabled}
            alertRadius={alertRadius}
            speed={gps.speed}
            onToggle={() => gps.enabled ? stopTracking() : startTracking()}
            onRadiusChange={setAlertRadius}
          />

          {/* Report kelp button */}
          <ReportKelpButton
            onReport={() => {
              setReportMode(true);
              setFishReportMode(false);
              setSightingPopup(null);
              setKelpPopup(null);
              setFishReportPopup(null);
            }}
          />

          {/* Report fish button */}
          <ReportFishButton
            onReport={() => {
              setFishReportMode(true);
              setReportMode(false);
              setSightingPopup(null);
              setKelpPopup(null);
              setFishReportPopup(null);
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

        {/* Fish report mode hint */}
        {fishReportMode && (
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
              border: '1px solid #f97316',
              borderRadius: 10,
              padding: '10px 18px',
              color: '#f97316',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 0 20px #f9731644',
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
            Click on the map to pin your fish report
            <button
              onClick={() => setFishReportMode(false)}
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

        {/* Fish report modal */}
        {showFishReportModal && fishReportCoords && (
          <ReportFishModal
            lat={fishReportCoords.lat}
            lng={fishReportCoords.lng}
            onClose={() => {
              setShowFishReportModal(false);
              setFishReportCoords(null);
            }}
            onSubmit={handleFishReportSubmit}
          />
        )}

        {/* Fish activity feed section inside community feed (separate toggle) */}
        {showFishFeed && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 350,
              height: '100%',
              background: 'rgba(13,19,32,0.96)',
              borderLeft: '1px solid #1e2a42',
              zIndex: 8,
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #1e2a42', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🐟</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Fish Activity</span>
                {fishReports.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', background: '#f9731618', border: '1px solid #f9731633', borderRadius: 4, padding: '1px 6px' }}>
                    {fishReports.filter((r) => r.status !== 'expired').length} active
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFishFeed(false)}
                style={{ background: 'none', border: 'none', color: '#8899aa', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              <FishActivityFeed
                reports={fishReports.filter((r) => r.status !== 'expired')}
                onReportClick={handleFishFeedClick}
              />
            </div>
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
