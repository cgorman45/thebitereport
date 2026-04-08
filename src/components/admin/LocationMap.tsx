'use client';

import { useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationMapProps {
  lat: number;
  lng: number;
  /** Area of detection in m² — used to size the marker */
  area_m2: number;
}

export default function LocationMap({ lat, lng, area_m2 }: LocationMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Fly to the detection on mount
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Small delay to let map initialize
    const t = setTimeout(() => {
      map.flyTo({ center: [lng, lat], zoom: 8, duration: 0 });
    }, 500);
    return () => clearTimeout(t);
  }, [lat, lng]);

  return (
    <div style={{
      background: '#131b2e',
      border: '1px solid #1e2a42',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', padding: '12px 16px 0' }}>
        Detection Location
      </div>
      <div style={{ height: 300, position: 'relative' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{
            latitude: lat,
            longitude: lng,
            zoom: 8,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          interactive={true}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/* Detection marker */}
          <Marker latitude={lat} longitude={lng} anchor="center">
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '3px solid #00d4ff',
              background: 'rgba(0, 212, 255, 0.2)',
              boxShadow: '0 0 12px rgba(0, 212, 255, 0.5)',
            }} />
          </Marker>
        </Map>
      </div>
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #1e2a42',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#667788',
      }}>
        <span>{lat.toFixed(4)}°N, {Math.abs(lng).toFixed(4)}°W</span>
        <span>Mapbox Satellite</span>
      </div>
    </div>
  );
}
