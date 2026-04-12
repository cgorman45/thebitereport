'use client';

import { useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
interface SatPosition {
  id: string; name: string; provider: string; resolution: string;
  swathKm: number; color: string; lat: number; lng: number;
  altitude: number; velocity: number;
}

interface OrbitPath {
  id: string; name: string; color: string;
  positions: { lat: number; lng: number; alt: number }[];
}

interface CesiumGlobeProps {
  cesiumIonToken?: string;
}

// Load CesiumJS from CDN (avoids webpack octal escape issue)
function loadCesiumFromCDN(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Cesium) {
      resolve((window as any).Cesium);
      return;
    }

    // Add CSS
    if (!document.querySelector('link[href*="cesium"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css';
      document.head.appendChild(css);
    }

    // Add Script
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js';
    script.onload = () => resolve((window as any).Cesium);
    script.onerror = () => reject(new Error('Failed to load CesiumJS'));
    document.head.appendChild(script);
  });
}

export default function CesiumGlobe({ cesiumIonToken }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [satData, setSatData] = useState<{ positions: SatPosition[]; orbits: OrbitPath[] } | null>(null);
  const [vessels, setVessels] = useState<any[]>([]);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showFootprints, setShowFootprints] = useState(true);

  // Load CesiumJS and create viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let cancelled = false;

    loadCesiumFromCDN().then(Cesium => {
      if (cancelled || !containerRef.current) return;

      if (cesiumIonToken) {
        Cesium.Ion.defaultAccessToken = cesiumIonToken;
      }

      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        selectionIndicator: true,
        timeline: false,
        animation: false,
        fullscreenButton: false,
        vrButton: false,
        navigationHelpButton: false,
        infoBox: true,
        skyAtmosphere: new Cesium.SkyAtmosphere(),
      });

      // Try Google 3D tiles
      if (cesiumIonToken) {
        try {
          Cesium.createGooglePhotorealistic3DTileset().then((tileset: any) => {
            viewer.scene.primitives.add(tileset);
          }).catch(() => {
            console.log('[Cesium] Google 3D tiles not available');
          });
        } catch { /* ignore */ }
      }

      // Camera: SoCal/Baja overview
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-117.5, 31.5, 1500000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-60),
          roll: 0,
        },
        duration: 0,
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050a15');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628');

      // Coverage area outline
      viewer.entities.add({
        name: 'Coverage Area',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            -120.5, 28.7, -115.0, 28.7, -115.0, 34.3, -120.5, 34.3, -120.5, 28.7,
          ]),
          width: 2,
          material: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.4),
          clampToGround: true,
        },
      });

      viewerRef.current = viewer;
      setLoaded(true);
    }).catch(err => {
      setError(err.message);
    });

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [cesiumIonToken]);

  // Fetch data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [satRes, vesRes] = await Promise.all([
          fetch('/api/ocean-data/satellite-orbits?orbit_minutes=90'),
          fetch('/api/ocean-data/all-vessels'),
        ]);
        if (satRes.ok) setSatData(await satRes.json());
        if (vesRes.ok) { const d = await vesRes.json(); setVessels(d.features || []); }
      } catch { /* ignore */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Update entities
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !satData || !loaded) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Remove old entities
    const toRemove: any[] = [];
    viewer.entities.values.forEach((e: any) => {
      if (e.id?.startsWith('sat-') || e.id?.startsWith('orbit-') || e.id?.startsWith('vessel-')) {
        toRemove.push(e);
      }
    });
    toRemove.forEach((e: any) => viewer.entities.remove(e));

    // Satellites
    for (const sat of satData.positions) {
      const altMeters = sat.altitude * 1000;
      const color = Cesium.Color.fromCssColorString(sat.color);

      viewer.entities.add({
        id: `sat-${sat.id}`,
        name: sat.name,
        description: `<table><tr><td>Provider</td><td><b>${sat.provider}</b></td></tr><tr><td>Resolution</td><td><b>${sat.resolution}</b></td></tr><tr><td>Altitude</td><td><b>${sat.altitude.toFixed(0)} km</b></td></tr><tr><td>Velocity</td><td><b>${sat.velocity.toFixed(1)} km/s</b></td></tr><tr><td>Swath</td><td><b>${sat.swathKm} km</b></td></tr></table>`,
        position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, altMeters),
        point: {
          pixelSize: 10,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: sat.name,
          font: '12px monospace',
          fillColor: color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14),
        },
      });

      // Nadir line
      viewer.entities.add({
        id: `sat-nadir-${sat.id}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            sat.lng, sat.lat, altMeters, sat.lng, sat.lat, 0,
          ]),
          width: 1,
          material: color.withAlpha(0.15),
        },
      });

      // Swath footprint
      if (showFootprints) {
        const R = 6371;
        const halfSwath = sat.swathKm / 2;
        const dLat = (halfSwath / R) * (180 / Math.PI);
        const dLng = (halfSwath / (R * Math.cos(sat.lat * Math.PI / 180))) * (180 / Math.PI);

        viewer.entities.add({
          id: `sat-footprint-${sat.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              sat.lng - dLng, sat.lat - dLat,
              sat.lng + dLng, sat.lat - dLat,
              sat.lng + dLng, sat.lat + dLat,
              sat.lng - dLng, sat.lat + dLat,
              sat.lng - dLng, sat.lat - dLat,
            ]),
            width: 1.5,
            material: color.withAlpha(0.3),
            clampToGround: true,
          },
        });
      }
    }

    // Orbit paths
    if (showOrbits) {
      for (const orbit of satData.orbits) {
        const color = Cesium.Color.fromCssColorString(orbit.color);
        let prevLng = orbit.positions[0]?.lng || 0;
        let segCoords: number[] = [];
        let segIdx = 0;

        for (const p of orbit.positions) {
          if (Math.abs(p.lng - prevLng) > 180) {
            if (segCoords.length >= 6) {
              viewer.entities.add({
                id: `orbit-${orbit.id}-${segIdx++}`,
                polyline: {
                  positions: Cesium.Cartesian3.fromDegreesArrayHeights(segCoords),
                  width: 1.5,
                  material: color.withAlpha(0.4),
                },
              });
            }
            segCoords = [];
          }
          segCoords.push(p.lng, p.lat, (p.alt || 786) * 1000);
          prevLng = p.lng;
        }
        if (segCoords.length >= 6) {
          viewer.entities.add({
            id: `orbit-${orbit.id}-final`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(segCoords),
              width: 1.5,
              material: color.withAlpha(0.4),
            },
          });
        }
      }
    }

    // Vessels
    if (showVessels) {
      for (let i = 0; i < vessels.length; i++) {
        const v = vessels[i];
        const [lng, lat] = v.geometry.coordinates;
        const isStopped = v.properties.status === 'stopped';

        viewer.entities.add({
          id: `vessel-${i}`,
          name: v.properties.name,
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          point: {
            pixelSize: isStopped ? 6 : 4,
            color: isStopped
              ? Cesium.Color.fromCssColorString('#ef4444')
              : Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.4),
          },
        });
      }
    }
  }, [satData, vessels, loaded, showOrbits, showVessels, showFootprints]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!loaded && !error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#050a15', color: '#00d4ff', fontSize: 16, fontFamily: 'monospace',
        }}>
          Loading 3D Globe...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#050a15', color: '#ef4444', fontSize: 14, fontFamily: 'monospace',
        }}>
          Error: {error}
        </div>
      )}

      {/* Layer controls */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        background: 'rgba(10, 15, 26, 0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid #1e2a42', borderRadius: 8, padding: '10px 14px', fontSize: 11,
      }}>
        <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 8, fontSize: 12 }}>🛰 3D Satellite View</div>
        {[
          { key: 'orbits', label: 'Orbit Paths', state: showOrbits, set: setShowOrbits, color: '#0ea5e9' },
          { key: 'footprints', label: 'Swath Footprints', state: showFootprints, set: setShowFootprints, color: '#a855f7' },
          { key: 'vessels', label: 'Fishing Vessels', state: showVessels, set: setShowVessels, color: '#38bdf8' },
        ].map(l => (
          <div key={l.key} onClick={() => l.set(!l.state)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
            cursor: 'pointer', opacity: l.state ? 1 : 0.35,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.state ? l.color : '#333' }} />
            <span style={{ color: '#cbd5e1' }}>{l.label}</span>
          </div>
        ))}
        {satData && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e2a42', color: '#667788', fontSize: 9 }}>
            {satData.positions.length} satellites · {vessels.length} vessels
          </div>
        )}
      </div>

      {/* Camera presets */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 10, display: 'flex', gap: 4 }}>
        {[
          { label: 'SoCal', lat: 32.7, lng: -117.5, alt: 800000, pitch: -60 },
          { label: 'Baja', lat: 30.5, lng: -117.0, alt: 600000, pitch: -50 },
          { label: 'Full Coverage', lat: 31.5, lng: -117.5, alt: 1500000, pitch: -60 },
          { label: 'Space View', lat: 31.5, lng: -117.5, alt: 5000000, pitch: -90 },
        ].map(p => (
          <button key={p.label} onClick={() => {
            const Cesium = (window as any).Cesium;
            viewerRef.current?.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.alt),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(p.pitch), roll: 0 },
              duration: 2,
            });
          }} style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: 'rgba(10, 15, 26, 0.9)', color: '#8899aa',
            border: '1px solid #1e2a42', cursor: 'pointer',
          }}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
