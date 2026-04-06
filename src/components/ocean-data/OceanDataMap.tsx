'use client';

import { useState, useCallback, useRef } from 'react';
import Map from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { MapEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LayerPanel from './LayerPanel';
import ColorScale from './ColorScale';
import DataInfo from './DataInfo';

type RasterLayerId = 'sst' | 'chlorophyll' | 'goes-sst';
type LayerId = RasterLayerId | 'breaks';

const RASTER_LAYERS: RasterLayerId[] = ['sst', 'chlorophyll', 'goes-sst'];

const OVERLAY_COORDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-121.0, 35.0],
  [-117.0, 35.0],
  [-117.0, 32.0],
  [-121.0, 32.0],
];

export default function OceanDataMap() {
  const mapRef = useRef<MapRef>(null);

  const [layers, setLayers] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
  });

  const [loading, setLoading] = useState<Record<string, boolean>>({
    sst: false,
    chlorophyll: false,
    breaks: false,
    'goes-sst': false,
  });

  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const mapLoadedRef = useRef(false);

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

      const id = layerId as LayerId;
      const currentlyOn = layers[id];
      const turningOn = !currentlyOn;

      setLayers((prev) => ({ ...prev, [id]: turningOn }));
      setLoading((prev) => ({ ...prev, [id]: true }));

      try {
        if (id === 'breaks') {
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
        } else {
          // Raster layer
          const rasterOpacity = id === 'chlorophyll' ? 0.6 : 0.7;
          map.setPaintProperty(id, 'raster-opacity', turningOn ? rasterOpacity : 0);

          if (turningOn) {
            setError(false);
            fetchTimestamp();
          }
        }
      } catch {
        setError(true);
        // Revert toggle on error
        setLayers((prev) => ({ ...prev, [id]: currentlyOn }));
      } finally {
        setLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [layers, fetchTimestamp]
  );

  const activeColorScale: 'sst' | 'chlorophyll' | null =
    layers.sst || layers['goes-sst']
      ? 'sst'
      : layers.chlorophyll
      ? 'chlorophyll'
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
      />

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
        <DataInfo timestamp={dataTimestamp} error={error} />
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <LayerPanel layers={layers} loading={loading} onToggle={handleToggle} />
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
