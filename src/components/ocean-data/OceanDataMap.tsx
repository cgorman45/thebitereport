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

export default function OceanDataMap() {
  const mapRef = useRef<MapRef>(null);

  const [layers, setLayers] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
    'kelp-markers': false,
    'kelp-polygons': false,
    'kelp-heatmap': false,
  });

  const [loading, setLoading] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
    'kelp-markers': false,
    'kelp-polygons': false,
    'kelp-heatmap': false,
  });

  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [hasKelpData, setHasKelpData] = useState(false);
  const [kelpPopup, setKelpPopup] = useState<KelpPopupState | null>(null);

  const mapLoadedRef = useRef(false);

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

    // Click handler for kelp markers
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

  const activeColorScale: 'sst' | 'chlorophyll' | 'kelp-heatmap' | null =
    layers.sst || layers['goes-sst']
      ? 'sst'
      : layers.chlorophyll
      ? 'chlorophyll'
      : layers['kelp-heatmap']
      ? 'kelp-heatmap'
      : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: 33.5, longitude: -119.0, zoom: 8 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: 'calc(100vh - 64px)' }}
        onLoad={onMapLoad}
      >
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
      </Map>

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
        <DataInfo timestamp={dataTimestamp} error={error} />
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <LayerPanel layers={layers} loading={loading} onToggle={handleToggle} hasKelpData={hasKelpData} />
      </div>

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
    </div>
  );
}
