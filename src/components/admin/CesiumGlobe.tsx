'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FISHING_SPOTS } from '@/lib/ocean-data/fishing-spots';
import type { FishingSpot } from '@/lib/ocean-data/fishing-spots';
import { ALL_WAYPOINTS } from '@/lib/ocean-data/baja-directions-waypoints';

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

interface SatOrder {
  id: string; lat: number; lng: number; tier: string; provider: string;
  status: string; resolution: number; ordered_at: string; scene_id: string;
}

interface TimeSnapshot {
  timestamp: string;
  vessels: { mmsi: number; name: string; lat: number; lng: number; speed: number; heading: number }[];
}

interface CesiumGlobeProps {
  cesiumIonToken?: string;
}

// Load CesiumJS from CDN
function loadCesiumFromCDN(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Cesium) { resolve((window as any).Cesium); return; }
    if (!document.querySelector('link[href*="cesium"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css';
      document.head.appendChild(css);
    }
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js';
    script.onload = () => resolve((window as any).Cesium);
    script.onerror = () => reject(new Error('Failed to load CesiumJS'));
    document.head.appendChild(script);
  });
}

// ── Main Component ─────────────────────────────────────────────────────
export default function CesiumGlobe({ cesiumIonToken }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [satData, setSatData] = useState<{ positions: SatPosition[]; orbits: OrbitPath[] } | null>(null);
  const [vessels, setVessels] = useState<any[]>([]);
  const [satOrders, setSatOrders] = useState<SatOrder[]>([]);
  const [trajectories, setTrajectories] = useState<TimeSnapshot[]>([]);
  const [trajIndex, setTrajIndex] = useState(0);
  const [trajPlaying, setTrajPlaying] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot | null>(null);

  // Layers
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false); // Off by default — lots of points
  const [showSatellites, setShowSatellites] = useState(false); // Off by default to reduce clutter
  const [showVessels, setShowVessels] = useState(true);
  const [showSpots, setShowSpots] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true); // On by default — show boat history

  // Close search on outside click
  useEffect(() => {
    const handler = () => setSearchOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Initialize CesiumJS
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    let cancelled = false;

    loadCesiumFromCDN().then(Cesium => {
      if (cancelled || !containerRef.current) return;

      if (cesiumIonToken) Cesium.Ion.defaultAccessToken = cesiumIonToken;

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

      // Google 3D tiles
      if (cesiumIonToken) {
        try {
          Cesium.createGooglePhotorealistic3DTileset().then((t: any) => {
            viewer.scene.primitives.add(t);
          }).catch(() => {});
        } catch { /* ignore */ }
      }

      // Camera: San Diego offshore — looking out over the open ocean
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-117.35, 32.65, 80000),
        orientation: {
          heading: Cesium.Math.toRadians(250), // Looking west-southwest toward open ocean
          pitch: Cesium.Math.toRadians(-35),
          roll: 0,
        },
        duration: 0,
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050a15');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628');
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;

      // Coverage area outline
      viewer.entities.add({
        id: 'coverage-area',
        name: 'Coverage Area',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            -120.5, 28.7, -115.0, 28.7, -115.0, 34.3, -120.5, 34.3, -120.5, 28.7,
          ]),
          width: 2,
          material: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.3),
          clampToGround: true,
        },
      });

      viewerRef.current = viewer;
      setLoaded(true);
    }).catch(err => setError(err.message));

    return () => { cancelled = true; if (viewerRef.current) { viewerRef.current.destroy(); viewerRef.current = null; } };
  }, [cesiumIonToken]);

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [satRes, vesRes, ordRes, trajRes] = await Promise.all([
          fetch('/api/ocean-data/satellite-orbits?orbit_minutes=90'),
          fetch('/api/ocean-data/all-vessels'),
          fetch('/api/admin/satellite-orders').catch(() => null),
          fetch('/api/ocean-data/vessel-trajectories?hours_back=48&interval_minutes=10').catch(() => null),
        ]);
        if (satRes.ok) setSatData(await satRes.json());
        if (vesRes.ok) { const d = await vesRes.json(); setVessels(d.features || []); }
        if (ordRes?.ok) { const d = await ordRes.json(); setSatOrders(d.orders || []); }
        if (trajRes?.ok) { const d = await trajRes.json(); setTrajectories(d.snapshots || []); setTrajIndex(d.snapshots?.length - 1 || 0); }
      } catch { /* ignore */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Trajectory playback
  useEffect(() => {
    if (!trajPlaying || trajectories.length === 0) return;
    const interval = setInterval(() => {
      setTrajIndex(i => i >= trajectories.length - 1 ? (setTrajPlaying(false), i) : i + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [trajPlaying, trajectories.length]);

  // Fly to fishing spot
  const flyToSpot = useCallback((spot: FishingSpot) => {
    const Cesium = (window as any).Cesium;
    if (!viewerRef.current || !Cesium) return;
    setSelectedSpot(spot);
    try {
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(spot.lng, spot.lat, spot.zoom),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
        duration: 2,
      });
    } catch (e) {
      console.log('[CesiumGlobe] flyTo error:', e);
    }
  }, []);

  // Reset view — back to San Diego offshore
  const resetView = useCallback(() => {
    const Cesium = (window as any).Cesium;
    if (!viewerRef.current || !Cesium) return;
    setSelectedSpot(null);
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-117.35, 32.65, 80000),
      orientation: {
        heading: Cesium.Math.toRadians(250),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
      duration: 2,
    });
  }, []);

  // ── Update entities ──────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !loaded) return;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    try {
    // Clear dynamic entities
    const toRemove: any[] = [];
    viewer.entities.values.forEach((e: any) => {
      if (e.id && e.id !== 'coverage-area') toRemove.push(e);
    });
    toRemove.forEach((e: any) => { try { viewer.entities.remove(e); } catch { /* skip */ } });

    // ── Fishing spots ──
    if (showSpots) {
      for (const spot of FISHING_SPOTS) {
        const color = Cesium.Color.fromCssColorString(spot.color);
        const isSelected = selectedSpot?.id === spot.id;

        viewer.entities.add({
          id: `spot-${spot.id}`,
          name: spot.name,
          description: `<div style="font-family:sans-serif"><p>${spot.description}</p><p><b>Species:</b> ${spot.species.join(', ')}</p><p><b>Depth:</b> ${spot.depth}</p><p><b>Type:</b> ${spot.type}</p></div>`,
          position: Cesium.Cartesian3.fromDegrees(spot.lng, spot.lat, 100),
          point: {
            pixelSize: isSelected ? 18 : 12,
            color: isSelected ? Cesium.Color.WHITE : color,
            outlineColor: color,
            outlineWidth: isSelected ? 3 : 2,
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 2e6, 0.6),
          },
          label: {
            text: spot.name,
            font: isSelected ? 'bold 14px sans-serif' : '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 2e6, 0.4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
          },
        });
      }
    }

    // ── Baja Directions Waypoints ──
    if (showWaypoints) {
      const chartColors: Record<string, string> = {
        'sd-offshore': '#eab308',
        'la-offshore': '#f97316',
        'channel-islands': '#22c55e',
        'sd-bay': '#38bdf8',
      };

      for (const wp of ALL_WAYPOINTS) {
        const color = Cesium.Color.fromCssColorString(chartColors[wp.chart] || '#eab308');

        viewer.entities.add({
          id: `wp-${wp.id}`,
          name: wp.name,
          description: `<div style="font-family:sans-serif"><p><b>Chart:</b> ${wp.chart}</p><p><b>Type:</b> ${wp.type}</p><p><b>Position:</b> ${wp.lat.toFixed(4)}°N, ${Math.abs(wp.lng).toFixed(4)}°W</p></div>`,
          position: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, 50),
          point: {
            pixelSize: 6,
            color: color.withAlpha(0.7),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1e3, 1.2, 1e6, 0.3),
          },
          label: {
            text: wp.name,
            font: '9px monospace',
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            scaleByDistance: new Cesium.NearFarScalar(1e3, 1, 5e5, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e5),
          },
        });
      }
    }

    // ── Live vessels ──
    // Parked boats (stopped >2hrs) get tiny gray dots — nobody cares about parked boats
    // Active/fishing boats get prominent dots
    // Moving boats get medium dots with speed-based color
    if (showVessels && !(showTrajectories && trajPlaying)) {
      // Show live vessels unless trajectory is actively playing
      for (let i = 0; i < vessels.length; i++) {
        const v = vessels[i];
        const [lng, lat] = v.geometry.coordinates;
        const isStopped = v.properties.status === 'stopped';
        const isSlow = v.properties.status === 'slow';
        const ageSec = v.properties.age_sec || 0;
        const isParked = isStopped && ageSec > 7200; // >2 hours = parked, minimize

        let pixelSize = 5;
        let color;
        let outlineWidth = 0;

        if (isParked) {
          // Parked >2hrs: tiny gray dot, almost invisible
          pixelSize = 2;
          color = Cesium.Color.fromCssColorString('#4a5568').withAlpha(0.2);
        } else if (isStopped) {
          // Recently stopped: notable but not dominant
          pixelSize = 5;
          color = Cesium.Color.fromCssColorString('#f97316');
          outlineWidth = 1;
        } else if (isSlow) {
          // Slow/fishing: prominent — this is what we care about
          pixelSize = 6;
          color = Cesium.Color.fromCssColorString('#eab308');
          outlineWidth = 1;
        } else {
          // Transit: medium blue
          pixelSize = 4;
          color = Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.5);
        }

        viewer.entities.add({
          id: `vessel-${i}`,
          name: v.properties.name || `Vessel ${i}`,
          description: `<div style="font-family:sans-serif"><p><b>Speed:</b> ${v.properties.speed?.toFixed(1) || 0} kts</p><p><b>Status:</b> ${v.properties.status}</p></div>`,
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          point: {
            pixelSize,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(outlineWidth > 0 ? 0.4 : 0),
            outlineWidth,
          },
        });
      }
    }

    // ── Trajectory replay vessels ──
    // Shows boat positions at the current time index with trails showing where they've been
    // Red trail = recent/live movement, Yellow trail = older history
    // Parked boats (speed 0 for extended periods) get minimized
    if (showTrajectories && trajectories.length > 0) {
      const snap = trajectories[Math.min(trajIndex, trajectories.length - 1)];
      const isNearLive = trajIndex >= trajectories.length - 5; // Within last 5 snapshots = "live"

      if (snap) {
        for (const v of snap.vessels) {
          const isStopped = v.speed < 1.5;
          const isFishing = v.speed >= 0.5 && v.speed < 3;

          // Check if this vessel has been stationary for a long time
          let stationaryCount = 0;
          for (let i = Math.max(0, trajIndex - 12); i <= trajIndex; i++) {
            const s = trajectories[i];
            const vInSnap = s?.vessels.find((x: any) => x.mmsi === v.mmsi);
            if (vInSnap && vInSnap.speed < 0.5) stationaryCount++;
          }
          const isParked = stationaryCount > 10; // Parked for >10 snapshots (~100min)

          let pixelSize = 5;
          let color;

          if (isParked) {
            pixelSize = 2;
            color = Cesium.Color.fromCssColorString('#4a5568').withAlpha(0.15);
          } else if (isFishing) {
            pixelSize = 7;
            color = Cesium.Color.fromCssColorString('#eab308'); // Yellow = fishing
          } else if (isStopped) {
            pixelSize = 4;
            color = Cesium.Color.fromCssColorString('#f97316').withAlpha(0.6);
          } else {
            pixelSize = 5;
            color = Cesium.Color.fromCssColorString('#38bdf8');
          }

          viewer.entities.add({
            id: `traj-vessel-${v.mmsi}`,
            name: v.name,
            description: `<div><b>Speed:</b> ${v.speed.toFixed(1)} kts</div>`,
            position: Cesium.Cartesian3.fromDegrees(v.lng, v.lat, 0),
            point: {
              pixelSize,
              color,
              outlineColor: Cesium.Color.WHITE.withAlpha(isParked ? 0 : 0.4),
              outlineWidth: isParked ? 0 : 1,
            },
          });
        }

        // Vessel trails — show where boats have been
        // Red trail for recent/live, yellow for historical
        const trailLength = 15; // Show last 15 snapshots (~2.5hrs at 10min intervals)
        const trailStart = Math.max(0, trajIndex - trailLength);
        const trails: Record<number, { coords: [number, number][]; wasMoving: boolean }> = {};

        for (let i = trailStart; i <= trajIndex; i++) {
          const s = trajectories[i];
          if (!s) continue;
          for (const v of s.vessels) {
            if (!trails[v.mmsi]) trails[v.mmsi] = { coords: [], wasMoving: false };
            trails[v.mmsi].coords.push([v.lng, v.lat]);
            if (v.speed > 1.5) trails[v.mmsi].wasMoving = true;
          }
        }

        for (const [mmsi, trail] of Object.entries(trails)) {
          if (trail.coords.length < 2 || !trail.wasMoving) continue; // Skip stationary boats
          const flat = trail.coords.flatMap(([lng, lat]) => [lng, lat]);

          // Red for live/recent, yellow for historical replay
          const trailColor = isNearLive ? '#ef4444' : '#eab308';

          viewer.entities.add({
            id: `traj-trail-${mmsi}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray(flat),
              width: 2,
              material: Cesium.Color.fromCssColorString(trailColor).withAlpha(0.6),
              clampToGround: true,
            },
          });
        }
      }
    }

    // ── Satellite orders (imagery request markers) ──
    if (showOrders) {
      for (const order of satOrders) {
        const tierColor = order.tier === 'up42' ? '#a855f7' : order.tier === 'sentinel' ? '#0ea5e9' : '#ef4444';
        const color = Cesium.Color.fromCssColorString(tierColor);

        // Pulsing marker at order location
        viewer.entities.add({
          id: `order-${order.id}`,
          name: `📡 ${order.provider || order.tier} Order`,
          description: `<div style="font-family:sans-serif"><p><b>Resolution:</b> ${order.resolution}m</p><p><b>Status:</b> ${order.status}</p><p><b>Ordered:</b> ${new Date(order.ordered_at).toLocaleString()}</p><p><b>Scene:</b> ${order.scene_id?.substring(0, 20) || '—'}...</p></div>`,
          position: Cesium.Cartesian3.fromDegrees(order.lng, order.lat, 500),
          point: {
            pixelSize: 14,
            color: Cesium.Color.WHITE,
            outlineColor: color,
            outlineWidth: 3,
          },
          label: {
            text: `📡 ${order.resolution}m`,
            font: '10px monospace',
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e5),
          },
        });

        // 1km circle showing the imagery area
        const R = 6371;
        const halfKm = 0.5;
        const dLat = (halfKm / R) * (180 / Math.PI);
        const dLng = (halfKm / (R * Math.cos(order.lat * Math.PI / 180))) * (180 / Math.PI);
        viewer.entities.add({
          id: `order-area-${order.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              order.lng - dLng, order.lat - dLat,
              order.lng + dLng, order.lat - dLat,
              order.lng + dLng, order.lat + dLat,
              order.lng - dLng, order.lat + dLat,
              order.lng - dLng, order.lat - dLat,
            ]),
            width: 2,
            material: color.withAlpha(0.6),
            clampToGround: true,
          },
        });
      }
    }

    // ── Satellites ──
    if (showSatellites && satData) {
      for (const sat of satData.positions) {
        const altMeters = sat.altitude * 1000;
        const color = Cesium.Color.fromCssColorString(sat.color);

        viewer.entities.add({
          id: `sat-${sat.id}`,
          name: sat.name,
          description: `<table><tr><td>Provider</td><td><b>${sat.provider}</b></td></tr><tr><td>Resolution</td><td><b>${sat.resolution}</b></td></tr><tr><td>Altitude</td><td><b>${sat.altitude.toFixed(0)} km</b></td></tr></table>`,
          position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, altMeters),
          point: { pixelSize: 8, color: color, outlineColor: Cesium.Color.WHITE, outlineWidth: 1 },
          label: {
            text: sat.name,
            font: '10px monospace',
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
          },
        });

        // Nadir line
        viewer.entities.add({
          id: `sat-nadir-${sat.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([sat.lng, sat.lat, altMeters, sat.lng, sat.lat, 0]),
            width: 1,
            material: color.withAlpha(0.15),
          },
        });
      }

      // Orbit paths
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
                polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(segCoords), width: 1, material: color.withAlpha(0.3) },
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
            polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(segCoords), width: 1, material: color.withAlpha(0.3) },
          });
        }
      }
    }
    } catch (e) {
      console.log('[CesiumGlobe] Entity update error:', e);
    }
  }, [satData, vessels, satOrders, trajectories, trajIndex, loaded, showSatellites, showVessels, showSpots, showOrders, showTrajectories, showWaypoints, selectedSpot]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!loaded && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a15', color: '#00d4ff', fontSize: 16, fontFamily: 'monospace' }}>
          Loading 3D Globe...
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a15', color: '#ef4444', fontSize: 14, fontFamily: 'monospace' }}>
          Error: {error}
        </div>
      )}

      {/* ── Search Bar (top center) ── */}
      <div style={{ position: 'absolute', top: 12, right: 60, zIndex: 20, width: searchOpen ? 260 : 36, transition: 'width 0.3s ease' }}>
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          {searchOpen ? (
            <input
              type="text"
              placeholder="Search spots..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '7px 12px 7px 30px', borderRadius: 20,
                background: 'rgba(30,35,50,0.9)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                fontSize: 12, outline: 'none',
              }}
            />
          ) : null}
          <button
            onClick={(e) => { e.stopPropagation(); setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
            style={{
              position: searchOpen ? 'absolute' : 'relative',
              left: searchOpen ? 6 : 0, top: searchOpen ? '50%' : 0,
              transform: searchOpen ? 'translateY(-50%)' : 'none',
              width: 36, height: 36, borderRadius: '50%',
              background: searchOpen ? 'transparent' : 'rgba(30,35,50,0.85)',
              backdropFilter: searchOpen ? 'none' : 'blur(8px)',
              border: searchOpen ? 'none' : '1px solid rgba(255,255,255,0.12)',
              color: '#8899aa', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: searchOpen ? 'none' : '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >🔍</button>
          {searchOpen && searchQuery.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'rgba(15,20,35,0.95)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
              maxHeight: 240, overflowY: 'auto',
            }}>
              {[...FISHING_SPOTS, ...ALL_WAYPOINTS.map(w => ({ id: `wp-${w.id}`, name: w.name, lat: w.lat, lng: w.lng, zoom: 30000, description: `${w.chart} · ${w.type}`, species: [], depth: '', type: w.type, color: '#eab308' }))]
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 8)
                .map(spot => (
                  <div
                    key={spot.id}
                    onClick={() => {
                      const Cesium = (window as any).Cesium;
                      if (viewerRef.current && Cesium) {
                        viewerRef.current.camera.flyTo({
                          destination: Cesium.Cartesian3.fromDegrees(spot.lng, spot.lat, (spot as any).zoom || 30000),
                          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
                          duration: 2,
                        });
                      }
                      if ('species' in spot && (spot as FishingSpot).species?.length) setSelectedSpot(spot as FishingSpot);
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    style={{
                      padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ color: (spot as any).color || '#eab308', fontSize: 10 }}>●</span>
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500 }}>{spot.name}</div>
                      <div style={{ color: '#667788', fontSize: 10 }}>{spot.description?.substring(0, 50)}</div>
                    </div>
                  </div>
                ))}
              {[...FISHING_SPOTS, ...ALL_WAYPOINTS].filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div style={{ padding: '12px 14px', color: '#4a5568', fontSize: 12 }}>No spots found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Google Maps-style Controls (right side) ── */}
      <div style={{ position: 'absolute', top: 70, right: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Compass */}
        <button
          onClick={() => {
            const Cesium = (window as any).Cesium;
            const cam = viewerRef.current?.camera;
            if (cam && Cesium) {
              const pos = cam.positionCartographic;
              cam.flyTo({
                destination: Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height),
                orientation: { heading: 0, pitch: cam.pitch, roll: 0 },
                duration: 1,
              });
            }
          }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(30,35,50,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
          title="Reset north"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <polygon points="10,2 13,10 10,8 7,10" fill="#ef4444" />
            <polygon points="10,18 7,10 10,12 13,10" fill="#e2e8f0" />
          </svg>
        </button>

        {/* 3D / Tilt toggle */}
        <button
          onClick={() => {
            const Cesium = (window as any).Cesium;
            const cam = viewerRef.current?.camera;
            if (cam && Cesium) {
              const pos = cam.positionCartographic;
              const newPitch = cam.pitch > Cesium.Math.toRadians(-60) ? Cesium.Math.toRadians(-90) : Cesium.Math.toRadians(-35);
              cam.flyTo({
                destination: Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height),
                orientation: { heading: cam.heading, pitch: newPitch, roll: 0 },
                duration: 1,
              });
            }
          }}
          style={{
            width: 40, height: 28, borderRadius: 6,
            background: 'rgba(30,35,50,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#00d4ff', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
          title="Toggle 3D tilt"
        >
          3D
        </button>

        {/* Center / Home */}
        <button
          onClick={resetView}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(30,35,50,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
          title="Reset view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="#e2e8f0" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="#e2e8f0" />
            <line x1="8" y1="0" x2="8" y2="3" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="8" y1="13" x2="8" y2="16" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="0" y1="8" x2="3" y2="8" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="13" y1="8" x2="16" y2="8" stroke="#e2e8f0" strokeWidth="1.5" />
          </svg>
        </button>

        {/* Zoom +/- */}
        <div style={{
          borderRadius: 8, overflow: 'hidden',
          background: 'rgba(30,35,50,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={() => viewerRef.current?.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * 0.3)}
            style={{
              width: 40, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 18, cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >+</button>
          <button
            onClick={() => viewerRef.current?.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * 0.5)}
            style={{
              width: 40, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 18, cursor: 'pointer',
            }}
          >−</button>
        </div>
      </div>

      {/* ── Layer Panel (left side) ── */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(10,15,26,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #1e2a42', borderRadius: 10, padding: '12px 14px', fontSize: 11, maxWidth: 220 }}>
        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Fishing Intelligence</div>

        {[
          { key: 'spots', label: 'Fishing Spots', state: showSpots, set: setShowSpots, color: '#f97316', count: FISHING_SPOTS.length },
          { key: 'waypoints', label: 'Chart Waypoints', state: showWaypoints, set: setShowWaypoints, color: '#eab308', count: ALL_WAYPOINTS.length },
          { key: 'vessels', label: 'Live Vessels', state: showVessels, set: setShowVessels, color: '#38bdf8', count: vessels.length },
          { key: 'orders', label: 'Satellite Orders', state: showOrders, set: setShowOrders, color: '#a855f7', count: satOrders.length },
          { key: 'trajectories', label: '48h Replay', state: showTrajectories, set: setShowTrajectories, color: '#00d4ff' },
          { key: 'satellites', label: 'Satellite Tracker', state: showSatellites, set: setShowSatellites, color: '#667788', count: satData?.positions.length },
        ].map(l => (
          <div key={l.key} onClick={() => l.set(!l.state)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', opacity: l.state ? 1 : 0.35 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.state ? l.color : '#333', border: `1px solid ${l.color}44`, flexShrink: 0 }} />
            <span style={{ color: '#e2e8f0', flex: 1 }}>{l.label}</span>
            {'count' in l && l.count != null && <span style={{ color: '#667788', fontSize: 9, fontFamily: 'monospace' }}>{l.count}</span>}
          </div>
        ))}

        {/* Satellite orders indicator */}
        {satOrders.length > 0 && showOrders && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e2a42' }}>
            <div style={{ color: '#a855f7', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              📡 {satOrders.length} Imagery Order{satOrders.length > 1 ? 's' : ''}
            </div>
            {satOrders.slice(0, 3).map(o => (
              <div key={o.id} style={{ fontSize: 9, color: '#8899aa', marginBottom: 2 }}>
                {o.provider || o.tier} · {o.resolution}m · {o.status}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fishing Spots Quick Access (bottom) ── */}
      {showSpots && (
        <div style={{ position: 'absolute', bottom: showTrajectories ? 110 : 50, left: 10, right: showTrajectories ? 10 : 'auto', zIndex: 10, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: showTrajectories ? '100%' : 600 }}>
          {FISHING_SPOTS.map(spot => (
            <button key={spot.id} onClick={() => flyToSpot(spot)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: selectedSpot?.id === spot.id ? spot.color + '44' : 'rgba(10,15,26,0.85)',
              color: selectedSpot?.id === spot.id ? '#fff' : '#8899aa',
              border: `1px solid ${selectedSpot?.id === spot.id ? spot.color : '#1e2a42'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {spot.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Time Scrubber (for trajectory replay) ── */}
      {showTrajectories && trajectories.length > 0 && (
        <div style={{ position: 'absolute', bottom: 50, left: 10, right: 10, zIndex: 10, background: 'rgba(10,15,26,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #1e2a42', borderRadius: 8, padding: '8px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setTrajPlaying(p => !p)} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 16, cursor: 'pointer', padding: 0 }}>
              {trajPlaying ? '⏸' : '▶'}
            </button>
            <input type="range" min={0} max={trajectories.length - 1} value={trajIndex} onChange={e => setTrajIndex(parseInt(e.target.value))} style={{ flex: 1, accentColor: '#00d4ff' }} />
            <span style={{ color: '#667788', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {trajectories[trajIndex] ? new Date(trajectories[trajIndex].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#4a5568', marginTop: 2 }}>
            <span>48h ago</span>
            <span>{trajectories[trajIndex]?.vessels.length || 0} vessels</span>
            <span>Now</span>
          </div>
        </div>
      )}

      {/* ── Selected Spot Detail ── */}
      {selectedSpot && (
        <div style={{ position: 'absolute', top: 10, right: 56, zIndex: 10, background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(8px)', border: `1px solid ${selectedSpot.color}44`, borderRadius: 10, padding: 14, maxWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{selectedSpot.name}</span>
            <button onClick={() => setSelectedSpot(null)} style={{ background: 'none', border: 'none', color: '#667788', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <p style={{ color: '#8899aa', fontSize: 11, margin: '0 0 8px', lineHeight: 1.5 }}>{selectedSpot.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {selectedSpot.species.map(s => (
              <span key={s} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, background: selectedSpot.color + '22', color: selectedSpot.color, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#667788' }}>
            Depth: {selectedSpot.depth} · Type: {selectedSpot.type}
          </div>
        </div>
      )}
    </div>
  );
}
