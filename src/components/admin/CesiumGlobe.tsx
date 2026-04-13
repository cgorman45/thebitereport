'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FISHING_SPOTS } from '@/lib/ocean-data/fishing-spots';
import type { FishingSpot } from '@/lib/ocean-data/fishing-spots';
import { ALL_WAYPOINTS } from '@/lib/ocean-data/baja-directions-waypoints';
import { detectHotspots, generateReplayNarration } from '@/lib/ocean-data/replay-engine';
import type { Hotspot } from '@/lib/ocean-data/replay-engine';

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

// Generate vessel arrow SVG as data URI (MarineTraffic style)
function vesselArrowSvg(color: string, size: number = 20): string {
  // Pointed triangle/arrow shape like MarineTraffic
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20">
    <polygon points="10,1 17,17 10,13 3,17" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
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
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [replayNarration, setReplayNarration] = useState<string[]>([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

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

      // Camera: San Diego offshore — same as the screenshot default view
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-117.40, 32.72, 45000),
        orientation: {
          heading: Cesium.Math.toRadians(15), // Slightly NNE heading
          pitch: Cesium.Math.toRadians(-40),
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
        if (trajRes?.ok) {
          const d = await trajRes.json();
          const snaps = d.snapshots || [];
          setTrajectories(snaps);
          setTrajIndex(snaps.length - 1 || 0);
          // Run AI hotspot detection
          if (snaps.length > 2) {
            const hs = detectHotspots(snaps, 1.5, 3, 3);
            setHotspots(hs);
            setReplayNarration(generateReplayNarration(snaps, hs));
          }
        }
      } catch { /* ignore */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Smooth animated trajectory playback using requestAnimationFrame
  const trajProgressRef = useRef(0); // Sub-index progress 0-1 between snapshots
  useEffect(() => {
    if (!trajPlaying || trajectories.length < 2) return;
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      // Advance progress — speed adjustable via playbackSpeed state
      const speed = 0.004 * dt * playbackSpeed; // Base ~4 snapshots/sec at 1x
      trajProgressRef.current += speed;

      if (trajProgressRef.current >= 1) {
        trajProgressRef.current = 0;
        setTrajIndex(i => {
          if (i >= trajectories.length - 2) { setTrajPlaying(false); return i; }
          return i + 1;
        });
      }

      // Interpolate vessel positions between current and next snapshot
      const viewer = viewerRef.current;
      const Cesium = (window as any).Cesium;
      if (viewer && Cesium && trajectories[trajIndex] && trajectories[trajIndex + 1]) {
        const curr = trajectories[trajIndex];
        const next = trajectories[trajIndex + 1];
        const t = trajProgressRef.current;

        for (const v of curr.vessels) {
          const nextV = next.vessels.find((n: any) => n.mmsi === v.mmsi);
          if (!nextV) continue;

          const entity = viewer.entities.getById(`traj-vessel-${v.mmsi}`);
          if (entity) {
            const interpLat = v.lat + (nextV.lat - v.lat) * t;
            const interpLng = v.lng + (nextV.lng - v.lng) * t;
            entity.position = Cesium.Cartesian3.fromDegrees(interpLng, interpLat, 0);

            // Interpolate heading
            const interpHeading = v.heading + (nextV.heading - v.heading) * t;
            if (entity.billboard) {
              entity.billboard.rotation = -Cesium.Math.toRadians(interpHeading || 0);
            }
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [trajPlaying, trajectories, trajIndex, playbackSpeed]);

  // Fly to fishing spot — offset camera slightly so the spot is centered in view
  const flyToSpot = useCallback((spot: FishingSpot) => {
    const Cesium = (window as any).Cesium;
    if (!viewerRef.current || !Cesium) return;
    setSelectedSpot(spot);
    try {
      // Offset camera slightly south so the spot appears in the center of view
      const offsetLat = spot.lat - (spot.radiusKm / 111) * 0.8;
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(spot.lng, offsetLat, spot.zoom),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
        duration: 2,
      });
    } catch (e) {
      console.log('[CesiumGlobe] flyTo error:', e);
    }
  }, []);

  // Reset view — back to San Diego offshore default
  const resetView = useCallback(() => {
    const Cesium = (window as any).Cesium;
    if (!viewerRef.current || !Cesium) return;
    setSelectedSpot(null);
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-117.40, 32.72, 45000),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-40),
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

    // ── Fishing Spot Geofences ──
    if (showSpots) {
      // Count vessels inside each geofence
      const allVesselsForCount = showTrajectories && trajectories[trajIndex]
        ? trajectories[trajIndex].vessels
        : vessels.map((v: any) => ({
            lat: v.geometry.coordinates[1],
            lng: v.geometry.coordinates[0],
            speed: v.properties.speed || 0,
          }));

      for (const spot of FISHING_SPOTS) {
        const R = 6371;
        const radiusM = spot.radiusKm * 1000;

        // Count boats inside this geofence (polygon or radius)
        let boatsInside = 0;
        for (const v of allVesselsForCount) {
          let inside = false;
          if (spot.polygon && spot.polygon.length > 2) {
            // Point-in-polygon test (ray casting)
            const poly = spot.polygon;
            let j = poly.length - 1;
            for (let pi = 0; pi < poly.length; pi++) {
              if ((poly[pi][1] > v.lat) !== (poly[j][1] > v.lat) &&
                  v.lng < (poly[j][0] - poly[pi][0]) * (v.lat - poly[pi][1]) / (poly[j][1] - poly[pi][1]) + poly[pi][0]) {
                inside = !inside;
              }
              j = pi;
            }
          } else {
            // Radius-based check
            const dLat = ((v.lat - spot.lat) * Math.PI) / 180;
            const dLng = ((v.lng - spot.lng) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 +
              Math.cos((spot.lat * Math.PI) / 180) * Math.cos((v.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            inside = dist <= spot.radiusKm;
          }
          if (inside) boatsInside++;
        }

        const isActive = boatsInside > 0;
        const color = Cesium.Color.fromCssColorString(spot.color);

        // Use custom polygon contour if available, otherwise compute circle
        let geofencePoints: number[];
        if (spot.polygon && spot.polygon.length > 2) {
          // Custom contour from bathymetric chart
          geofencePoints = spot.polygon.flatMap(([lng, lat]) => [lng, lat]);
          // Close the polygon
          geofencePoints.push(spot.polygon[0][0], spot.polygon[0][1]);
        } else {
          // Fallback: computed circle
          geofencePoints = [];
          for (let a = 0; a <= 360; a += 5) {
            const rad = (a * Math.PI) / 180;
            const dLat = (radiusM * Math.cos(rad) / (R * 1000)) * (180 / Math.PI);
            const dLng = (radiusM * Math.sin(rad) / (R * 1000 * Math.cos(spot.lat * Math.PI / 180))) * (180 / Math.PI);
            geofencePoints.push(spot.lng + dLng, spot.lat + dLat);
          }
        }

        // Ground-level geofence border — very transparent, thin line
        viewer.entities.add({
          id: `geofence-${spot.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(geofencePoints),
            width: isActive ? 2 : 0.8,
            material: color.withAlpha(isActive ? 0.35 : 0.08),
            clampToGround: true,
          },
        });

        // 3D extruded transparent wall — always visible, brighter when selected/active
        const isSelected = selectedSpot?.id === spot.id;
        {
          const wallHeight = isSelected ? 4000 : isActive ? 2000 : 800;

          // Use polygon with extrudedHeight for true 3D transparent volume
          // Convert flat [lng, lat, lng, lat...] to hierarchy
          const polyPositions = [];
          for (let pi = 0; pi < geofencePoints.length; pi += 2) {
            polyPositions.push(Cesium.Cartesian3.fromDegrees(geofencePoints[pi], geofencePoints[pi + 1]));
          }

          // Semi-transparent filled polygon on the surface
          viewer.entities.add({
            id: `geofence-fill-${spot.id}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(polyPositions),
              height: 0,
              extrudedHeight: wallHeight,
              material: color.withAlpha(isSelected ? 0.10 : isActive ? 0.06 : 0.03),
              outline: true,
              outlineColor: color.withAlpha(isSelected ? 0.5 : isActive ? 0.3 : 0.12),
            },
          });

          // Top cap outline at wall height
          viewer.entities.add({
            id: `geofence-top-${spot.id}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(
                geofencePoints.flatMap((v: number, i: number) =>
                  i % 2 === 0 ? [v] : [v, wallHeight]
                )
              ),
              width: 1.5,
              material: color.withAlpha(0.3),
            },
          });
        }

        // Boat count + radius label
        viewer.entities.add({
          id: `geofence-count-${spot.id}`,
          position: Cesium.Cartesian3.fromDegrees(spot.lng, spot.lat + (spot.radiusKm / 111), 500),
          label: {
            text: isActive
              ? `${boatsInside} boat${boatsInside > 1 ? 's' : ''} · ${spot.radiusKm}km`
              : `${spot.radiusKm}km zone`,
            font: isActive ? 'bold 11px sans-serif' : '10px sans-serif',
            fillColor: isActive ? color : Cesium.Color.fromCssColorString('#667788'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4e5),
            scaleByDistance: new Cesium.NearFarScalar(1e3, 1, 3e5, 0.4),
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

        // Use arrow billboards rotated to heading (MarineTraffic style)
        const heading = v.properties.heading || v.properties.course || 0;
        const arrowColor = isParked ? '#4a5568' : isStopped ? '#f97316' : isSlow ? '#eab308' : '#38bdf8';

        viewer.entities.add({
          id: `vessel-${i}`,
          name: v.properties.name || `Vessel ${i}`,
          description: `<div style="font-family:sans-serif"><p><b>Speed:</b> ${v.properties.speed?.toFixed(1) || 0} kts</p><p><b>Status:</b> ${v.properties.status}</p></div>`,
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          billboard: {
            image: vesselArrowSvg(arrowColor, isParked ? 10 : 18),
            width: isParked ? 8 : 16,
            height: isParked ? 8 : 16,
            rotation: -Cesium.Math.toRadians(heading),
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            scaleByDistance: new Cesium.NearFarScalar(1e3, 1.5, 5e5, 0.4),
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

          const arrowColor = isParked ? '#4a5568' : isFishing ? '#eab308' : isStopped ? '#f97316' : '#38bdf8';
          const hdg = v.heading || 0;

          viewer.entities.add({
            id: `traj-vessel-${v.mmsi}`,
            name: v.name,
            description: `<div><b>Speed:</b> ${v.speed.toFixed(1)} kts</div>`,
            position: Cesium.Cartesian3.fromDegrees(v.lng, v.lat, 0),
            billboard: {
              image: vesselArrowSvg(arrowColor, isParked ? 10 : 18),
              width: isParked ? 8 : 16,
              height: isParked ? 8 : 16,
              rotation: -Cesium.Math.toRadians(hdg),
              alignedAxis: Cesium.Cartesian3.UNIT_Z,
              scaleByDistance: new Cesium.NearFarScalar(1e3, 1.5, 5e5, 0.4),
            },
          });
        }

        // Long dissipating trails — show full history up to current index
        // Thin white/cyan lines that fade over time, like the WorldView/CaptureWorld style
        const trailLength = Math.min(trajIndex, 72); // Up to 72 snapshots (~12hrs at 10min)
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
          if (trail.coords.length < 2 || !trail.wasMoving) continue;

          // Single polyline per vessel for the full trail (performance)
          // Opacity based on how recent — older trails are more transparent
          const age = trail.coords.length;
          const maxOpacity = 0.7;
          const minOpacity = 0.05;

          // Split into 3 segments: old (faint), mid, recent (bright)
          const segCount = trail.coords.length;
          const third = Math.max(2, Math.floor(segCount / 3));

          // Old segment — very faint
          if (segCount > 4) {
            const oldCoords = trail.coords.slice(0, third);
            if (oldCoords.length >= 2) {
              viewer.entities.add({
                id: `traj-trail-${mmsi}-old`,
                polyline: {
                  positions: Cesium.Cartesian3.fromDegreesArray(oldCoords.flatMap(c => c)),
                  width: 1,
                  material: Cesium.Color.fromCssColorString('#88ccff').withAlpha(0.08),
                  clampToGround: true,
                },
              });
            }
          }

          // Mid segment — moderate
          if (segCount > 4) {
            const midCoords = trail.coords.slice(Math.max(0, third - 1), third * 2);
            if (midCoords.length >= 2) {
              viewer.entities.add({
                id: `traj-trail-${mmsi}-mid`,
                polyline: {
                  positions: Cesium.Cartesian3.fromDegreesArray(midCoords.flatMap(c => c)),
                  width: 1.5,
                  material: Cesium.Color.fromCssColorString('#88ccff').withAlpha(0.2),
                  clampToGround: true,
                },
              });
            }
          }

          // Recent segment — bright
          const recentCoords = trail.coords.slice(Math.max(0, segCount - third - 1));
          if (recentCoords.length >= 2) {
            viewer.entities.add({
              id: `traj-trail-${mmsi}-new`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(recentCoords.flatMap(c => c)),
                width: 2,
                material: Cesium.Color.fromCssColorString(isNearLive ? '#ffffff' : '#88ddff').withAlpha(0.5),
                clampToGround: true,
              },
            });
          }
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

    // ── AI-Detected Hotspots ──
    if (showHotspots && hotspots.length > 0) {
      for (const hs of hotspots) {
        const color = hs.score >= 7 ? '#ef4444' : hs.score >= 4 ? '#eab308' : '#667788';
        const pulseSize = 800 + hs.score * 200; // Larger pulse for higher scores

        // Pulsing ring on ground
        const ringPoints: number[] = [];
        for (let a = 0; a <= 360; a += 10) {
          const rad = (a * Math.PI) / 180;
          const R = 6371000;
          const dLat = (pulseSize * Math.cos(rad) / R) * (180 / Math.PI);
          const dLng = (pulseSize * Math.sin(rad) / (R * Math.cos(hs.lat * Math.PI / 180))) * (180 / Math.PI);
          ringPoints.push(hs.lng + dLng, hs.lat + dLat);
        }

        viewer.entities.add({
          id: `hotspot-ring-${hs.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(ringPoints),
            width: 3,
            material: Cesium.Color.fromCssColorString(color).withAlpha(0.6),
            clampToGround: true,
          },
        });

        // Center marker
        viewer.entities.add({
          id: `hotspot-${hs.id}`,
          name: `⚠ Hotspot: ${hs.boatCount} vessels`,
          description: `<div style="font-family:sans-serif;max-width:300px"><p>${hs.narrative}</p><p><b>Duration:</b> ${Math.round(hs.durationMinutes)} min</p><p><b>Vessels:</b> ${hs.vessels.map(v => v.name).join(', ')}</p></div>`,
          position: Cesium.Cartesian3.fromDegrees(hs.lng, hs.lat, 200),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: `⚠ ${hs.boatCount} boats · ${hs.score}/10`,
            font: 'bold 11px sans-serif',
            fillColor: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e5),
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
  }, [satData, vessels, satOrders, trajectories, trajIndex, loaded, showSatellites, showVessels, showSpots, showOrders, showTrajectories, showWaypoints, showHotspots, hotspots, selectedSpot]);

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
          { key: 'hotspots', label: 'AI Hotspots', state: showHotspots, set: setShowHotspots, color: '#ef4444', count: hotspots.length },
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
            <button
              onClick={() => setPlaybackSpeed(s => s >= 8 ? 0.5 : s * 2)}
              style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid #00d4ff33', borderRadius: 4, color: '#00d4ff', fontSize: 10, fontWeight: 700, padding: '2px 6px', cursor: 'pointer', fontFamily: 'monospace', minWidth: 32 }}
            >{playbackSpeed}x</button>
            <input type="range" min={0} max={trajectories.length - 1} value={trajIndex} onChange={e => { setTrajIndex(parseInt(e.target.value)); trajProgressRef.current = 0; }} style={{ flex: 1, accentColor: '#00d4ff' }} />
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

      {/* ── Geofence Admin Panel (shows when a spot is selected) ── */}
      {selectedSpot && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
          background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(12px)',
          border: `2px solid ${selectedSpot.color}66`, borderRadius: 10,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, fontSize: 12,
        }}>
          <span style={{ color: selectedSpot.color, fontWeight: 700 }}>● {selectedSpot.name}</span>
          <span style={{ color: '#667788' }}>Geofence: <b style={{ color: '#e2e8f0' }}>{selectedSpot.radiusKm}km</b></span>
          <span style={{ color: '#667788' }}>Center: <b style={{ color: '#e2e8f0' }}>{selectedSpot.lat.toFixed(3)}°N, {Math.abs(selectedSpot.lng).toFixed(3)}°W</b></span>
          <span style={{ color: '#667788' }}>Type: <b style={{ color: '#e2e8f0' }}>{selectedSpot.type}</b></span>
          <button onClick={() => setSelectedSpot(null)} style={{ background: 'none', border: 'none', color: '#667788', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* ── AI Narration Panel ── */}
      {hotspots.length > 0 && showHotspots && !selectedSpot && (
        <div style={{
          position: 'absolute', bottom: showTrajectories ? 120 : 60, right: 12, zIndex: 15,
          background: 'rgba(10,15,26,0.92)', backdropFilter: 'blur(8px)',
          border: '1px solid #ef444444', borderRadius: 10,
          padding: '10px 14px', maxWidth: 280, maxHeight: 200, overflowY: 'auto',
        }}>
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            ⚠ AI Detection — {hotspots.length} Hotspot{hotspots.length > 1 ? 's' : ''}
          </div>
          {hotspots.slice(0, 3).map(hs => (
            <div
              key={hs.id}
              onClick={() => {
                const Cesium = (window as any).Cesium;
                if (viewerRef.current && Cesium) {
                  viewerRef.current.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(hs.lng, hs.lat, 20000),
                    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
                    duration: 2,
                  });
                }
              }}
              style={{
                padding: '6px 0', borderBottom: '1px solid #1e2a42', cursor: 'pointer',
                fontSize: 10, color: '#cbd5e1', lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: hs.score >= 7 ? '#ef4444' : '#eab308', fontWeight: 700 }}>
                  Score {hs.score}/10
                </span>
                <span style={{ color: '#667788' }}>{hs.boatCount} boats · {Math.round(hs.durationMinutes)}min</span>
              </div>
              <div style={{ color: '#8899aa', fontSize: 9 }}>
                {hs.vessels.slice(0, 3).map(v => v.name).join(', ')}
                {hs.vessels.length > 3 ? ` +${hs.vessels.length - 3}` : ''}
              </div>
            </div>
          ))}
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
