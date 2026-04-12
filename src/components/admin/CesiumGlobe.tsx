'use client';

import { useEffect, useRef, useState } from 'react';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// ── Types ──────────────────────────────────────────────────────────────
interface SatPosition {
  id: string;
  name: string;
  provider: string;
  resolution: string;
  swathKm: number;
  color: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
}

interface OrbitPath {
  id: string;
  name: string;
  color: string;
  positions: { lat: number; lng: number; alt: number }[];
}

interface VesselFeature {
  geometry: { coordinates: [number, number] };
  properties: { name: string; status: string; speed: number };
}

interface CesiumGlobeProps {
  cesiumIonToken?: string;
  googleApiKey?: string;
}

export default function CesiumGlobe({ cesiumIonToken, googleApiKey }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [satData, setSatData] = useState<{ positions: SatPosition[]; orbits: OrbitPath[] } | null>(null);
  const [vessels, setVessels] = useState<VesselFeature[]>([]);
  const [selectedSat, setSelectedSat] = useState<string | null>(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showFootprints, setShowFootprints] = useState(true);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Initialize CesiumJS viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let cancelled = false;

    (async () => {
      const Cesium = await import('cesium');

      if (cancelled) return;

      // Set Cesium Ion token if provided
      if (cesiumIonToken) {
        Cesium.Ion.defaultAccessToken = cesiumIonToken;
      }

      // Create viewer
      const viewer = new Cesium.Viewer(containerRef.current!, {
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
        skyBox: new Cesium.SkyBox({
          sources: {
            positiveX: '/Cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
            negativeX: '/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
            positiveY: '/Cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
            negativeY: '/Cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
            positiveZ: '/Cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
            negativeZ: '/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg',
          },
        }),
        skyAtmosphere: new Cesium.SkyAtmosphere(),
      });

      // Try to add Google 3D Tiles or Cesium Ion tiles
      try {
        if (googleApiKey) {
          // Direct Google 3D Tiles
          const tileset = await Cesium.Cesium3DTileset.fromUrl(
            `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleApiKey}`
          );
          viewer.scene.primitives.add(tileset);
        } else if (cesiumIonToken) {
          // Cesium Ion hosted Google 3D Tiles (asset ID 2275207)
          try {
            const tileset = await Cesium.createGooglePhotorealistic3DTileset();
            viewer.scene.primitives.add(tileset);
          } catch {
            // Fall back to default imagery if 3D tiles not available
            console.log('[Cesium] Google 3D tiles not available, using default imagery');
          }
        }
      } catch (e) {
        console.log('[Cesium] 3D tiles error:', e);
      }

      // Set initial camera to SoCal/Baja coverage area
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-117.5, 31.5, 1500000), // 1500km altitude
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-60), // Looking down at 60°
          roll: 0,
        },
        duration: 0,
      });

      // Dark background
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050a15');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628');

      // Enable depth testing against terrain
      viewer.scene.globe.depthTestAgainstTerrain = false;

      // Add coverage area as a polyline outline (avoids Rectangle radian issues)
      viewer.entities.add({
        name: 'Coverage Area',
        description: 'Channel Islands to Isla Guadalupe',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            -120.5, 28.7,
            -115.0, 28.7,
            -115.0, 34.3,
            -120.5, 34.3,
            -120.5, 28.7,
          ]),
          width: 2,
          material: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.4),
          clampToGround: true,
        },
      });

      viewerRef.current = viewer;
      setLoaded(true);

      // Click handler
      viewer.screenSpaceEventHandler.setInputAction((click: any) => {
        const picked = viewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id) {
          setSelectedSat(picked.id.id || null);
        } else {
          setSelectedSat(null);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [cesiumIonToken, googleApiKey]);

  // Fetch satellite + vessel data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [satRes, vesRes] = await Promise.all([
          fetch('/api/ocean-data/satellite-orbits?orbit_minutes=90'),
          fetch('/api/ocean-data/all-vessels'),
        ]);
        if (satRes.ok) setSatData(await satRes.json());
        if (vesRes.ok) {
          const d = await vesRes.json();
          setVessels(d.features || []);
        }
      } catch { /* ignore */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Update entities when data changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !satData || !loaded) return;

    let Cesium: any;
    import('cesium').then(C => {
      Cesium = C;
      updateEntities();
    });

    function updateEntities() {
      // Remove old satellite entities (keep coverage area)
      const toRemove: any[] = [];
      viewer.entities.values.forEach((e: any) => {
        if (e.id?.startsWith('sat-') || e.id?.startsWith('orbit-') || e.id?.startsWith('vessel-')) {
          toRemove.push(e);
        }
      });
      toRemove.forEach((e: any) => viewer.entities.remove(e));

      // Add satellites
      for (const sat of satData!.positions) {
        const altMeters = sat.altitude * 1000;
        const color = Cesium.Color.fromCssColorString(sat.color);

        // Satellite point
        viewer.entities.add({
          id: `sat-${sat.id}`,
          name: sat.name,
          description: `
            <table style="width:100%">
              <tr><td>Provider</td><td><b>${sat.provider}</b></td></tr>
              <tr><td>Resolution</td><td><b>${sat.resolution}</b></td></tr>
              <tr><td>Altitude</td><td><b>${sat.altitude.toFixed(0)} km</b></td></tr>
              <tr><td>Velocity</td><td><b>${sat.velocity.toFixed(1)} km/s</b></td></tr>
              <tr><td>Swath Width</td><td><b>${sat.swathKm} km</b></td></tr>
            </table>
          `,
          position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, altMeters),
          point: {
            pixelSize: selectedSat === sat.id ? 16 : 10,
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 5e6, 0.5),
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
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1e7),
          },
        });

        // Swath footprint (rectangle on ground below satellite)
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

          // Line from satellite to ground (nadir line)
          viewer.entities.add({
            id: `sat-nadir-${sat.id}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                sat.lng, sat.lat, altMeters,
                sat.lng, sat.lat, 0,
              ]),
              width: 1,
              material: color.withAlpha(0.2),
            },
          });
        }
      }

      // Add orbit paths
      if (showOrbits) {
        for (const orbit of satData!.orbits) {
          const color = Cesium.Color.fromCssColorString(orbit.color);
          const coords: number[] = [];

          // Split orbit at antimeridian crossings
          let prevLng = orbit.positions[0]?.lng || 0;
          let segCoords: number[] = [];

          for (const p of orbit.positions) {
            // Detect antimeridian crossing
            if (Math.abs(p.lng - prevLng) > 180) {
              // Finish current segment
              if (segCoords.length >= 6) {
                viewer.entities.add({
                  id: `orbit-${orbit.id}-${coords.length}`,
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

          // Final segment
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

      // Add vessel positions
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
              outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
              outlineWidth: isStopped ? 1 : 0,
            },
          });
        }
      }
    }
  }, [satData, vessels, loaded, selectedSat, showOrbits, showVessels, showFootprints]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#050a15', color: '#00d4ff', fontSize: 16, fontFamily: 'monospace',
        }}>
          Loading 3D Globe...
        </div>
      )}

      {/* Floating controls */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        background: 'rgba(10, 15, 26, 0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid #1e2a42', borderRadius: 8,
        padding: '10px 14px', fontSize: 11,
      }}>
        <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 8, fontSize: 12 }}>
          🛰 3D Satellite View
        </div>
        {[
          { key: 'orbits', label: 'Orbit Paths', state: showOrbits, set: setShowOrbits, color: '#0ea5e9' },
          { key: 'footprints', label: 'Swath Footprints', state: showFootprints, set: setShowFootprints, color: '#a855f7' },
          { key: 'vessels', label: 'Fishing Vessels', state: showVessels, set: setShowVessels, color: '#38bdf8' },
        ].map(l => (
          <div
            key={l.key}
            onClick={() => l.set(!l.state)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
              cursor: 'pointer', opacity: l.state ? 1 : 0.35,
            }}
          >
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
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 10,
        display: 'flex', gap: 4,
      }}>
        {[
          { label: 'SoCal', lat: 32.7, lng: -117.5, alt: 800000, pitch: -60 },
          { label: 'Baja', lat: 30.5, lng: -117.0, alt: 600000, pitch: -50 },
          { label: 'Full Coverage', lat: 31.5, lng: -117.5, alt: 1500000, pitch: -60 },
          { label: 'Space View', lat: 31.5, lng: -117.5, alt: 5000000, pitch: -90 },
        ].map(preset => (
          <button
            key={preset.label}
            onClick={async () => {
              const Cesium = await import('cesium');
              viewerRef.current?.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(preset.lng, preset.lat, preset.alt),
                orientation: {
                  heading: 0,
                  pitch: Cesium.Math.toRadians(preset.pitch),
                  roll: 0,
                },
                duration: 2,
              });
            }}
            style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: 'rgba(10, 15, 26, 0.9)', color: '#8899aa',
              border: '1px solid #1e2a42', cursor: 'pointer',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
