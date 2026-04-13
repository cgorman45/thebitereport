'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FISHING_SPOTS } from '@/lib/ocean-data/fishing-spots';
import type { FishingSpot } from '@/lib/ocean-data/fishing-spots';
import { ALL_WAYPOINTS } from '@/lib/ocean-data/baja-directions-waypoints';
import { detectHotspots, generateReplayNarration } from '@/lib/ocean-data/replay-engine';
import type { Hotspot } from '@/lib/ocean-data/replay-engine';
import { generateAllFlightPlans, getDronePosition, getVidarScanArea, getVidarFanPoints } from '@/lib/ocean-data/drone-simulation';
import type { DroneFlightPlan } from '@/lib/ocean-data/drone-simulation';

// ── Types ──────────────────────────────────────────────────────────────
interface SatPosition {
  id: string; name: string; provider: string; resolution: string;
  swathKm: number; color: string; lat: number; lng: number;
  altitude: number; velocity: number; type?: string; timestamp?: string;
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

// Safe color helper — NEVER use .withAlpha() on Cesium.Color over Google 3D Tiles ocean.
// It renders as white/opaque blocks. Always use explicit new Cesium.Color(r,g,b,a).
function safeColor(Cesium: any, hex: string, alpha: number): any {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Cesium.Color(r, g, b, alpha);
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
  const [playbackSpeed, setPlaybackSpeed] = useState(0.25); // Slow cinematic default

  // Layers
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false); // Off by default — lots of points
  const [showDrones, setShowDrones] = useState(false); // Phase 2 toggle — OFF by default
  const [droneFlightPlans] = useState<DroneFlightPlan[]>(() => generateAllFlightPlans());
  const [droneTimeMs, setDroneTimeMs] = useState(5 * 60 * 60 * 1000); // Start at 5am
  const droneTimeMsRef = useRef(5 * 60 * 60 * 1000); // Ref for animation loop (avoids re-render)
  // dronePlaying removed — drones sync to main trajectory timeline
  const [showSatellites, setShowSatellites] = useState(false);
  const [godsEyeView, setGodsEyeView] = useState(false);
  const defaultFov = useRef(60); // Store original FOV
  const [showVessels, setShowVessels] = useState(true);
  const [showSpots, setShowSpots] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true); // On by default — show boat history

  // Sync drone time to trajectory timeline
  useEffect(() => {
    if (!showDrones || trajectories.length === 0) return;
    const idx = Math.min(trajIndex, trajectories.length - 1);
    const snap = trajectories[idx];
    if (snap) {
      const d = new Date(snap.timestamp);
      const ms = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000;
      droneTimeMsRef.current = ms;
      setDroneTimeMs(ms); // Update state only on index change (not every frame)
    }
  }, [showDrones, trajIndex, trajectories]);

  // Close search on outside click
  useEffect(() => {
    const handler = () => setSearchOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // God's Eye orbital view toggle — wide FOV, high altitude, shows Earth curvature + satellites
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (!viewer || !Cesium) return;

    if (godsEyeView) {
      // Save current FOV
      defaultFov.current = Cesium.Math.toDegrees(viewer.camera.frustum.fov);

      // Extreme wide FOV for fish-eye effect (120°) — shows satellites + ground together
      viewer.camera.frustum.fov = Cesium.Math.toRadians(120);

      // Near plane must be adjusted for extreme FOV to avoid clipping
      viewer.camera.frustum.near = 1;

      // Enable stars and atmosphere
      viewer.scene.skyBox.show = true;
      if (viewer.scene.sun) viewer.scene.sun.show = true;
      if (viewer.scene.moon) viewer.scene.moon.show = true;

      // Enable satellites and hotspots
      setShowSatellites(true);
      setShowHotspots(true);

      // Position camera at ~1200km — between ground and satellite orbits (600-800km)
      // Shallow pitch so satellites are visible "above" and ground is "below"
      // This creates the WorldView-style perspective where you see both
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-118.5, 30.0, 1200000), // 1200km, south of fishing area
        orientation: {
          heading: Cesium.Math.toRadians(10),   // Looking slightly NNE
          pitch: Cesium.Math.toRadians(-40),     // Shallow angle — see satellites above horizon
          roll: 0,
        },
        duration: 3,
      });
    } else {
      // Restore normal FOV
      viewer.camera.frustum.fov = Cesium.Math.toRadians(defaultFov.current || 60);

      // Fly back to default view
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-118.2, 32.7, 200000),
        orientation: {
          heading: Cesium.Math.toRadians(240),
          pitch: Cesium.Math.toRadians(-25),
          roll: 0,
        },
        duration: 2,
      });
    }
  }, [godsEyeView]);

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

      // Cesium World Bathymetry terrain — shows underwater ridges and valleys
      try {
        Cesium.CesiumTerrainProvider.fromIonAssetId(2426648).then((bathyTerrain: any) => {
          viewer.terrainProvider = bathyTerrain;
          viewer.scene.globe.enableLighting = true;
        }).catch(() => {
          console.log('[Cesium] Bathymetry terrain not available');
        });
      } catch { /* ignore */ }

      // Google 3D tiles
      if (cesiumIonToken) {
        try {
          Cesium.createGooglePhotorealistic3DTileset().then((t: any) => {
            viewer.scene.primitives.add(t);
          }).catch(() => {});
        } catch { /* ignore */ }
      }

      // Camera: San Diego offshore — looking WSW over the open ocean
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-117.25, 32.75, 60000),
        orientation: {
          heading: Cesium.Math.toRadians(240), // Looking WSW toward open ocean
          pitch: Cesium.Math.toRadians(-30),
          roll: 0,
        },
        duration: 0,
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050a15');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628');
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;

      // Coverage area outline
      viewer.entities.add({
        id: 'coverage-area',
        name: 'Coverage Area',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            -120.5, 28.7, 10, -115.0, 28.7, 10, -115.0, 34.3, 10, -120.5, 34.3, 10, -120.5, 28.7, 10,
          ]),
          width: 2,
          material: safeColor(Cesium, '#00d4ff', 0.3),
        },
      });

      viewerRef.current = viewer;
      (window as any).__cesiumViewer = viewer;
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
            // Expose hotspots to page via custom event
            window.dispatchEvent(new CustomEvent('hotspotsDetected', { detail: hs }));
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
      // 0.25x default = slow cinematic replay
      const speed = 0.004 * dt * playbackSpeed;
      trajProgressRef.current += speed;

      if (trajProgressRef.current >= 1) {
        trajProgressRef.current = 0;
        setTrajIndex(i => {
          if (i >= trajectories.length - 2) {
            // Auto-loop: restart from beginning
            trajProgressRef.current = 0;
            return 0;
          }
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

        // Smoothly interpolate drone time between trajectory snapshots
        if (showDrones) {
          const d1 = new Date(curr.timestamp);
          const ms1 = (d1.getHours() * 3600 + d1.getMinutes() * 60 + d1.getSeconds()) * 1000;
          const d2 = new Date(next.timestamp);
          const ms2 = (d2.getHours() * 3600 + d2.getMinutes() * 60 + d2.getSeconds()) * 1000;
          const smoothDroneTime = ms1 + (ms2 - ms1) * t;
          droneTimeMsRef.current = smoothDroneTime;

          // Also smoothly move drone entities between their waypoint positions
          for (const plan of droneFlightPlans) {
            const pos = getDronePosition(plan, smoothDroneTime);
            if (!pos) continue;
            const droneEntity = viewer.entities.getById(`drone-${plan.id}`);
            if (droneEntity) {
              droneEntity.position = Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, pos.altitude);
              if (droneEntity.billboard) {
                droneEntity.billboard.rotation = -Cesium.Math.toRadians(pos.heading);
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [trajPlaying, trajectories, trajIndex, playbackSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Listen for flyToHotspot events from page
  useEffect(() => {
    const handler = (e: Event) => {
      const hs = (e as CustomEvent).detail;
      const Cesium = (window as any).Cesium;
      if (viewerRef.current && Cesium && hs) {
        viewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(hs.lng, hs.lat, 20000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
          duration: 2,
        });
      }
    };
    window.addEventListener('flyToHotspot', handler);
    return () => window.removeEventListener('flyToHotspot', handler);
  }, []);

  // Listen for flyToSpot events from page-level buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      // Find the full spot object from FISHING_SPOTS (event may have partial data)
      const fullSpot = FISHING_SPOTS.find(s => s.id === detail.id) || detail;
      flyToSpot(fullSpot);
    };
    window.addEventListener('flyToSpot', handler);
    return () => window.removeEventListener('flyToSpot', handler);
  }, [flyToSpot]);

  // Reset view — back to San Diego offshore default
  const resetView = useCallback(() => {
    const Cesium = (window as any).Cesium;
    if (!viewerRef.current || !Cesium) return;
    setSelectedSpot(null);
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-117.25, 32.75, 60000),
      orientation: {
        heading: Cesium.Math.toRadians(240),
        pitch: Cesium.Math.toRadians(-30),
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

        const isSelected = selectedSpot?.id === spot.id;

        // Ground-level geofence — ONLY show when selected or active
        if (isSelected || isActive) {
          const wallHeight = isSelected ? 2500 : 1200;

          // Parse the spot color into RGB components for explicit RGBA
          const hexColor = spot.color;
          const r = parseInt(hexColor.slice(1, 3), 16) / 255;
          const g = parseInt(hexColor.slice(3, 5), 16) / 255;
          const b = parseInt(hexColor.slice(5, 7), 16) / 255;

          // NOTE: Cesium polygon entities with alpha render as WHITE BLOCKS over Google 3D Tiles.
          // This is a known CesiumJS bug. NEVER use polygon entities with transparency over 3D tiles.
          // Use polyline outlines only.

          // Ground ring polyline
          const groundPositions = [];
          for (let pi = 0; pi < geofencePoints.length; pi += 2) {
            groundPositions.push(geofencePoints[pi], geofencePoints[pi + 1], 100);
          }
          viewer.entities.add({
            id: `geofence-ground-${spot.id}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(groundPositions),
              width: isSelected ? 3 : 2,
              material: new Cesium.Color(r, g, b, isSelected ? 0.8 : 0.5),
            },
          });

          // Top ring
          const topPositions = [];
          for (let pi = 0; pi < geofencePoints.length; pi += 2) {
            topPositions.push(geofencePoints[pi], geofencePoints[pi + 1], wallHeight);
          }
          viewer.entities.add({
            id: `geofence-top-${spot.id}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(topPositions),
              width: isSelected ? 2 : 1,
              material: new Cesium.Color(r, g, b, isSelected ? 0.5 : 0.3),
            },
          });

          // Vertical pillars connecting ground to top ring (every N points for wireframe effect)
          const pillarStep = Math.max(1, Math.floor(geofencePoints.length / (2 * (isSelected ? 16 : 8))));
          for (let pi = 0; pi < geofencePoints.length - 1; pi += 2 * pillarStep) {
            const lng = geofencePoints[pi];
            const lat = geofencePoints[pi + 1];
            viewer.entities.add({
              id: `geofence-pillar-${spot.id}-${pi}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([lng, lat, 100, lng, lat, wallHeight]),
                width: 1,
                material: new Cesium.Color(r, g, b, isSelected ? 0.4 : 0.2),
              },
            });
          }
        }

        // Boat count label — only when active with boats inside
        if (isActive) {
          viewer.entities.add({
            id: `geofence-count-${spot.id}`,
            position: Cesium.Cartesian3.fromDegrees(spot.lng, spot.lat + (spot.radiusKm / 111), 500),
            label: {
              text: `${boatsInside} boat${boatsInside > 1 ? 's' : ''}`,
              font: 'bold 11px sans-serif',
              fillColor: color,
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
            color: safeColor(Cesium, chartColors[wp.chart] || '#eab308', 0.7),
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
          color = safeColor(Cesium, '#4a5568', 0.2);
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
          color = safeColor(Cesium, '#38bdf8', 0.5);
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
        // Deduplicate vessels by MMSI — API may return duplicate entries
        const seenMmsi = new Set<number>();
        const uniqueVessels = snap.vessels.filter((v: any) => {
          if (seenMmsi.has(v.mmsi)) return false;
          seenMmsi.add(v.mmsi);
          return true;
        });

        for (const v of uniqueVessels) {
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
            color = safeColor(Cesium, '#4a5568', 0.15);
          } else if (isFishing) {
            pixelSize = 7;
            color = Cesium.Color.fromCssColorString('#eab308'); // Yellow = fishing
          } else if (isStopped) {
            pixelSize = 4;
            color = safeColor(Cesium, '#f97316', 0.6);
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

        // Helper: convert [lng,lat] pairs to [lng,lat,alt,...] for fromDegreesArrayHeights
        // clampToGround doesn't work over ocean with Google 3D Tiles — use small altitude instead
        const withHeight = (coords: [number, number][], alt: number) =>
          coords.flatMap(([lng, lat]) => [lng, lat, alt]);

        let trailCount = 0;
        for (const [mmsi, trail] of Object.entries(trails)) {
          if (trail.coords.length < 2 || !trail.wasMoving) continue;
          try {
            const segCount = trail.coords.length;
            const third = Math.max(2, Math.floor(segCount / 3));

            // Old segment — very faint
            if (segCount > 4) {
              const oldCoords = trail.coords.slice(0, third);
              if (oldCoords.length >= 2) {
                viewer.entities.add({
                  id: `traj-trail-${mmsi}-old`,
                  polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights(withHeight(oldCoords, 5)),
                    width: 1,
                    material: safeColor(Cesium, '#88ccff', 0.15),
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
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights(withHeight(midCoords, 5)),
                    width: 1.5,
                    material: safeColor(Cesium, '#88ccff', 0.35),
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
                  positions: Cesium.Cartesian3.fromDegreesArrayHeights(withHeight(recentCoords, 5)),
                  width: 2.5,
                  material: safeColor(Cesium, isNearLive ? '#ffffff' : '#88ddff', 0.6),
                },
              });
            }
            trailCount++;
          } catch { /* skip bad trail data */ }
        }
        // Trails rendered: ${trailCount} at trajIndex ${trajIndex}
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
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              order.lng - dLng, order.lat - dLat, 10,
              order.lng + dLng, order.lat - dLat, 10,
              order.lng + dLng, order.lat + dLat, 10,
              order.lng - dLng, order.lat + dLat, 10,
              order.lng - dLng, order.lat - dLat, 10,
            ]),
            width: 2,
            material: safeColor(Cesium, tierColor, 0.6),
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
          ringPoints.push(hs.lng + dLng, hs.lat + dLat, 10);
        }

        viewer.entities.add({
          id: `hotspot-ring-${hs.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(ringPoints),
            width: 3,
            material: safeColor(Cesium, color, 0.6),
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

    // ── Satellites with imaging geometry ──
    if (showSatellites && satData) {
      const R = 6371;

      // Demo satellites that always pass over the SoCal fishing area
      // These simulate upcoming passes for the demo presentation
      const timeProgress = trajectories.length > 0 ? trajIndex / Math.max(1, trajectories.length - 1) : 0; // 0-1
      const demoSats: typeof satData.positions = [
        {
          id: 'DEMO-PLEIADES-NEO', name: 'Pléiades Neo 3', provider: 'Airbus', resolution: '30cm',
          swathKm: 14, color: '#d946ef', type: 'optical',
          // Flies NNW to SSE over fishing grounds
          lat: 35.0 - timeProgress * 8, lng: -119.5 + timeProgress * 3,
          altitude: 620, velocity: 7.5, timestamp: '',
        },
        {
          id: 'DEMO-WORLDVIEW', name: 'WorldView-3', provider: 'Maxar', resolution: '31cm',
          swathKm: 13, color: '#ef4444', type: 'optical',
          // Flies NE to SW, offset timing from Pleiades
          lat: 34.5 - ((timeProgress + 0.3) % 1) * 6, lng: -116.0 - ((timeProgress + 0.3) % 1) * 4,
          altitude: 617, velocity: 7.5, timestamp: '',
        },
        {
          id: 'DEMO-SENTINEL', name: 'Sentinel-2A', provider: 'ESA', resolution: '10m',
          swathKm: 290, color: '#0ea5e9', type: 'multispectral',
          // Wide swath pass N to S
          lat: 36.0 - ((timeProgress + 0.6) % 1) * 10, lng: -117.5 + ((timeProgress + 0.6) % 1) * 1,
          altitude: 786, velocity: 7.5, timestamp: '',
        },
      ];

      // Render both real + demo satellites
      const allSats = [...satData.positions, ...demoSats];

      for (const sat of allSats) {
        const altMeters = sat.altitude * 1000;
        const sr = parseInt(sat.color.slice(1, 3), 16) / 255;
        const sg = parseInt(sat.color.slice(3, 5), 16) / 255;
        const sb = parseInt(sat.color.slice(5, 7), 16) / 255;

        // Satellite icon
        const satSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <rect x="3" y="10" width="18" height="4" rx="1" fill="${sat.color}" opacity="0.9" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/>
          <rect x="0" y="8" width="6" height="8" rx="1" fill="${sat.color}" opacity="0.6"/>
          <rect x="18" y="8" width="6" height="8" rx="1" fill="${sat.color}" opacity="0.6"/>
          <circle cx="12" cy="12" r="2" fill="white" opacity="0.8"/>
        </svg>`;

        viewer.entities.add({
          id: `sat-${sat.id}`,
          name: sat.name,
          description: `<table><tr><td>Provider</td><td><b>${sat.provider}</b></td></tr><tr><td>Resolution</td><td><b>${sat.resolution}</b></td></tr><tr><td>Swath</td><td><b>${sat.swathKm} km</b></td></tr><tr><td>Altitude</td><td><b>${sat.altitude.toFixed(0)} km</b></td></tr></table>`,
          position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, altMeters),
          billboard: {
            image: 'data:image/svg+xml,' + encodeURIComponent(satSvg),
            width: 28, height: 28,
            scaleByDistance: new Cesium.NearFarScalar(5e4, 3, 5e6, 0.8),
          },
          label: {
            text: `${sat.name}\n${sat.resolution} · ${sat.provider}`,
            font: 'bold 12px monospace',
            fillColor: new Cesium.Color(sr, sg, sb, 1),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            scaleByDistance: new Cesium.NearFarScalar(5e4, 1.5, 5e6, 0.5),
          },
        });

        // Imaging cone — lines from satellite to swath edges on ground
        const halfSwathDeg = (sat.swathKm / 2) / 111;
        // Compute ground footprint corners based on satellite heading (assume N-S orbit)
        const footprint = [
          [sat.lng - halfSwathDeg, sat.lat - halfSwathDeg * 0.5],
          [sat.lng + halfSwathDeg, sat.lat - halfSwathDeg * 0.5],
          [sat.lng + halfSwathDeg, sat.lat + halfSwathDeg * 0.5],
          [sat.lng - halfSwathDeg, sat.lat + halfSwathDeg * 0.5],
        ];

        // 4 cone lines from satellite down to footprint corners — bright and visible
        for (let ci = 0; ci < 4; ci++) {
          viewer.entities.add({
            id: `sat-cone-${sat.id}-${ci}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                sat.lng, sat.lat, altMeters,
                footprint[ci][0], footprint[ci][1], 15,
              ]),
              width: 2,
              material: new Cesium.Color(sr, sg, sb, 0.45),
            },
          });
        }

        // Cross lines inside cone for visual density (like WorldView reference)
        const fpCenter = [(footprint[0][0] + footprint[2][0]) / 2, (footprint[0][1] + footprint[2][1]) / 2];
        viewer.entities.add({
          id: `sat-cone-center-${sat.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              sat.lng, sat.lat, altMeters,
              fpCenter[0], fpCenter[1], 15,
            ]),
            width: 1.5,
            material: new Cesium.Color(sr, sg, sb, 0.3),
          },
        });

        // Ground footprint rectangle
        const fpFlat: number[] = [];
        for (const [fLng, fLat] of [...footprint, footprint[0]]) {
          fpFlat.push(fLng, fLat, 12);
        }
        viewer.entities.add({
          id: `sat-fp-${sat.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(fpFlat),
            width: 2,
            material: new Cesium.Color(sr, sg, sb, 0.5),
          },
        });

        // 📸 label at ground nadir
        viewer.entities.add({
          id: `sat-nadir-label-${sat.id}`,
          position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, 20),
          label: {
            text: `📸 ${sat.resolution}`,
            font: 'bold 10px monospace',
            fillColor: new Cesium.Color(sr, sg, sb, 0.8),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 4),
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 5e5, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e5),
          },
        });
      }

      // Orbit paths with ground track swath
      for (const orbit of satData.orbits) {
        // Find swath width for this satellite
        const satInfo = satData.positions.find(s => s.id === orbit.id);
        const swathKm = satInfo?.swathKm || 20;
        const halfSwathDeg = (swathKm / 2) / 111;
        const oColor = orbit.color;
        const or = parseInt(oColor.slice(1, 3), 16) / 255;
        const og = parseInt(oColor.slice(3, 5), 16) / 255;
        const ob = parseInt(oColor.slice(5, 7), 16) / 255;

        let prevLng = orbit.positions[0]?.lng || 0;

        // Build orbit path + left/right ground swath edges
        let segCoords: number[] = [];
        let leftEdge: number[] = [];
        let rightEdge: number[] = [];
        let segIdx = 0;

        const flushSeg = () => {
          if (segCoords.length >= 6) {
            viewer.entities.add({
              id: `orbit-${orbit.id}-${segIdx}`,
              polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(segCoords), width: 1.5, material: new Cesium.Color(or, og, ob, 0.35) },
            });
          }
          // Ground swath edges (only for non-huge swaths — skip Terra MODIS 2330km)
          if (swathKm < 500 && leftEdge.length >= 6) {
            viewer.entities.add({
              id: `orbit-swath-L-${orbit.id}-${segIdx}`,
              polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(leftEdge), width: 1, material: new Cesium.Color(or, og, ob, 0.12) },
            });
            viewer.entities.add({
              id: `orbit-swath-R-${orbit.id}-${segIdx}`,
              polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(rightEdge), width: 1, material: new Cesium.Color(or, og, ob, 0.12) },
            });
          }
          segIdx++;
          segCoords = [];
          leftEdge = [];
          rightEdge = [];
        };

        for (const p of orbit.positions) {
          if (Math.abs(p.lng - prevLng) > 180) {
            flushSeg();
          }
          const alt = (p.alt || 786) * 1000;
          segCoords.push(p.lng, p.lat, alt);
          leftEdge.push(p.lng - halfSwathDeg, p.lat, 10);
          rightEdge.push(p.lng + halfSwathDeg, p.lat, 10);
          prevLng = p.lng;
        }
        flushSeg();
      }

      // Demo satellite ground tracks over SoCal
      for (const ds of demoSats) {
        const dr = parseInt(ds.color.slice(1, 3), 16) / 255;
        const dg = parseInt(ds.color.slice(3, 5), 16) / 255;
        const db = parseInt(ds.color.slice(5, 7), 16) / 255;
        const altM = ds.altitude * 1000;
        const halfSwDeg = (ds.swathKm / 2) / 111;

        // Generate ground track: 20 points along the pass trajectory
        const trackPts: number[] = [];
        const trackL: number[] = [];
        const trackR: number[] = [];
        for (let step = 0; step <= 20; step++) {
          const t = step / 20;
          let tLat: number, tLng: number;
          if (ds.id === 'DEMO-PLEIADES-NEO') {
            tLat = 35.0 - t * 8; tLng = -119.5 + t * 3;
          } else if (ds.id === 'DEMO-WORLDVIEW') {
            tLat = 34.5 - t * 6; tLng = -116.0 - t * 4;
          } else {
            tLat = 36.0 - t * 10; tLng = -117.5 + t * 1;
          }
          trackPts.push(tLng, tLat, altM);
          trackL.push(tLng - halfSwDeg, tLat, 10);
          trackR.push(tLng + halfSwDeg, tLat, 10);
        }

        // Orbit track at altitude
        viewer.entities.add({
          id: `demo-orbit-${ds.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(trackPts),
            width: 2,
            material: new Cesium.Color(dr, dg, db, 0.4),
          },
        });

        // Ground swath edges
        if (ds.swathKm < 500) {
          viewer.entities.add({
            id: `demo-swath-L-${ds.id}`,
            polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(trackL), width: 1, material: new Cesium.Color(dr, dg, db, 0.15) },
          });
          viewer.entities.add({
            id: `demo-swath-R-${ds.id}`,
            polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(trackR), width: 1, material: new Cesium.Color(dr, dg, db, 0.15) },
          });
        }
      }
    }
    // ── Phase 2: Penguin B VTOL Drones with VIDAR ──
    if (showDrones) {
      const activePlans = droneFlightPlans.filter(p => {
        const startMs = p.startHour * 60 * 60 * 1000;
        return droneTimeMs >= startMs && droneTimeMs <= startMs + 8 * 60 * 60 * 1000;
      });

      for (const plan of activePlans) {
        const pos = getDronePosition(plan, droneTimeMs);
        if (!pos) continue;

        const hexC = plan.color;
        const cr = parseInt(hexC.slice(1, 3), 16) / 255;
        const cg = parseInt(hexC.slice(3, 5), 16) / 255;
        const cb = parseInt(hexC.slice(5, 7), 16) / 255;
        const isScanning = pos.action === 'scanning';
        const isTransit = pos.action === 'transit';

        // ── Drone SVG icon (custom UAV shape, not vessel arrow) ──
        const droneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g fill="${plan.color}" stroke="rgba(0,0,0,0.6)" stroke-width="0.8">
            <polygon points="16,2 20,12 16,10 12,12" opacity="0.9"/>
            <rect x="6" y="12" width="20" height="3" rx="1.5"/>
            <polygon points="16,15 20,24 16,22 12,24" opacity="0.9"/>
            <circle cx="7" cy="13.5" r="3" fill="none" stroke="${plan.color}" stroke-width="1" opacity="0.6"/>
            <circle cx="25" cy="13.5" r="3" fill="none" stroke="${plan.color}" stroke-width="1" opacity="0.6"/>
          </g>
        </svg>`;
        const droneImg = 'data:image/svg+xml,' + encodeURIComponent(droneSvg);

        // Drone body — large and visible from far away
        viewer.entities.add({
          id: `drone-${plan.id}`,
          name: `Penguin B VTOL — ${plan.name}`,
          description: `<div style="font-family:sans-serif"><p><b>Aircraft:</b> Penguin B VTOL</p><p><b>Sensor:</b> VIDAR (Visual Detection and Ranging)</p><p><b>Altitude:</b> ${pos.altitude.toFixed(0)}m (${Math.round(pos.altitude * 3.281)}ft)</p><p><b>Action:</b> ${pos.action}</p>${pos.spotName ? `<p><b>Target:</b> ${pos.spotName}</p>` : ''}</div>`,
          position: Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, pos.altitude),
          billboard: {
            image: droneImg,
            width: 32,
            height: 32,
            rotation: -Cesium.Math.toRadians(pos.heading),
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            scaleByDistance: new Cesium.NearFarScalar(500, 2.5, 1e5, 0.8),
          },
          label: {
            text: `PENGUIN-${plan.direction === 'north' ? 'N' : 'S'}${plan.sortie} ${isScanning ? '📡 SCANNING' : isTransit ? '✈ TRANSIT' : '↩ RTB'}${pos.spotName ? '\n' + pos.spotName : ''}`,
            font: 'bold 11px monospace',
            fillColor: new Cesium.Color(cr, cg, cb, 1),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -22),
            scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 1e5, 0.5),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e5),
          },
        });

        // Altitude line — vertical line from drone down to surface
        viewer.entities.add({
          id: `drone-alt-${plan.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([pos.lng, pos.lat, pos.altitude, pos.lng, pos.lat, 5]),
            width: 1,
            material: new Cesium.Color(cr, cg, cb, 0.25),
          },
        });

        // ── VIDAR 180° sweep fan — wide triangle from drone to ocean ──
        const fan = getVidarFanPoints(pos.lat, pos.lng, pos.altitude, pos.heading);
        const scanArea = getVidarScanArea(pos.lat, pos.lng, pos.heading, plan.scanWidthKm, 2);
        const fanAlpha = isScanning ? 0.4 : 0.08;

        // Two main sweep lines: drone → left edge, drone → right edge
        viewer.entities.add({
          id: `drone-fan-L-${plan.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              pos.lng, pos.lat, pos.altitude,
              fan.left[0], fan.left[1], 8,
            ]),
            width: isScanning ? 2 : 1,
            material: new Cesium.Color(cr, cg, cb, fanAlpha),
          },
        });
        viewer.entities.add({
          id: `drone-fan-R-${plan.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              pos.lng, pos.lat, pos.altitude,
              fan.right[0], fan.right[1], 8,
            ]),
            width: isScanning ? 2 : 1,
            material: new Cesium.Color(cr, cg, cb, fanAlpha),
          },
        });

        // Intermediate sweep lines (fill the fan with ~6 dashed rays)
        if (isScanning) {
          for (let fi = 1; fi < fan.arcPoints.length - 1; fi += 2) {
            viewer.entities.add({
              id: `drone-fan-ray-${plan.id}-${fi}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                  pos.lng, pos.lat, pos.altitude,
                  fan.arcPoints[fi][0], fan.arcPoints[fi][1], 8,
                ]),
                width: 1,
                material: new Cesium.Color(cr, cg, cb, 0.15),
              },
            });
          }
        }

        // Arc on ocean surface showing the sweep width
        const arcFlat: number[] = [];
        for (const [aLng, aLat] of fan.arcPoints) {
          arcFlat.push(aLng, aLat, 8);
        }
        if (arcFlat.length >= 6) {
          viewer.entities.add({
            id: `drone-fan-arc-${plan.id}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(arcFlat),
              width: isScanning ? 3 : 1,
              material: new Cesium.Color(cr, cg, cb, isScanning ? 0.7 : 0.15),
            },
          });
        }

        // Nadir point on surface directly below drone
        viewer.entities.add({
          id: `drone-nadir-${plan.id}`,
          position: Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, 8),
          point: {
            pixelSize: isScanning ? 5 : 3,
            color: new Cesium.Color(cr, cg, cb, isScanning ? 0.8 : 0.3),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: isScanning ? 1 : 0,
            scaleByDistance: new Cesium.NearFarScalar(500, 2, 5e4, 0.5),
          },
        });

        // ── Flight path trail at altitude (dissipating) ──
        const trailSteps = 60;
        const trailTimeStep = 1 * 60 * 1000; // 1 minute per step
        // Recent trail — bright
        const recentTrail: number[] = [];
        for (let ts = 15; ts >= 0; ts--) {
          const trailT = droneTimeMs - ts * trailTimeStep;
          const trailPos = getDronePosition(plan, trailT);
          if (trailPos) recentTrail.push(trailPos.lng, trailPos.lat, trailPos.altitude);
        }
        if (recentTrail.length >= 6) {
          viewer.entities.add({
            id: `drone-trail-${plan.id}-recent`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(recentTrail),
              width: 2, material: new Cesium.Color(cr, cg, cb, 0.5),
            },
          });
        }
        // Older trail — faded
        const oldTrail: number[] = [];
        for (let ts = trailSteps; ts >= 14; ts--) {
          const trailT = droneTimeMs - ts * trailTimeStep;
          const trailPos = getDronePosition(plan, trailT);
          if (trailPos) oldTrail.push(trailPos.lng, trailPos.lat, trailPos.altitude);
        }
        if (oldTrail.length >= 6) {
          viewer.entities.add({
            id: `drone-trail-${plan.id}-old`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(oldTrail),
              width: 1, material: new Cesium.Color(cr, cg, cb, 0.12),
            },
          });
        }

        // ── Scanned swath — shows actual 1km-wide coverage area on ocean surface ──
        // Build scan corridor using perpendicular "rung" lines across the flight path
        // This clearly shows exactly how much ocean has been scanned
        const swathSteps = 240; // Look back full sortie
        const swathTimeStep = 20 * 1000; // Every 20 seconds
        const scanPositions: { lng: number; lat: number; heading: number }[] = [];

        for (let ts = swathSteps; ts >= 0; ts--) {
          const st = droneTimeMs - ts * swathTimeStep;
          const sp = getDronePosition(plan, st);
          if (sp && sp.action === 'scanning') {
            scanPositions.push({ lng: sp.lng, lat: sp.lat, heading: sp.heading });
          }
        }

        if (scanPositions.length >= 2) {
          // Build left and right edge polylines (offset ±0.5km from center)
          const R = 6371;
          const halfWidthKm = plan.scanWidthKm / 2;
          const leftEdge: number[] = [];
          const rightEdge: number[] = [];
          const centerLine: number[] = [];

          for (const sp of scanPositions) {
            const perpRad = ((sp.heading + 90) * Math.PI) / 180;
            const dLatL = (halfWidthKm * Math.cos(perpRad) / R) * (180 / Math.PI);
            const dLngL = (halfWidthKm * Math.sin(perpRad) / (R * Math.cos(sp.lat * Math.PI / 180))) * (180 / Math.PI);
            leftEdge.push(sp.lng + dLngL, sp.lat + dLatL, 6);
            rightEdge.push(sp.lng - dLngL, sp.lat - dLatL, 6);
            centerLine.push(sp.lng, sp.lat, 6);
          }

          // Left edge of scanned corridor — bright and thick
          if (leftEdge.length >= 6) {
            viewer.entities.add({
              id: `drone-swath-L-${plan.id}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(leftEdge),
                width: 4,
                material: new Cesium.Color(cr, cg, cb, 0.6),
              },
            });
          }

          // Right edge of scanned corridor
          if (rightEdge.length >= 6) {
            viewer.entities.add({
              id: `drone-swath-R-${plan.id}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(rightEdge),
                width: 4,
                material: new Cesium.Color(cr, cg, cb, 0.6),
              },
            });
          }

          // Center line — visible fill between edges
          if (centerLine.length >= 6) {
            viewer.entities.add({
              id: `drone-swath-C-${plan.id}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(centerLine),
                width: 8,
                material: new Cesium.Color(cr, cg, cb, 0.18),
              },
            });
          }

          // Cross-rungs every ~1.5km to fill corridor and show width clearly
          const rungInterval = Math.max(1, Math.floor(scanPositions.length / 60));
          for (let ri = 0; ri < scanPositions.length; ri += rungInterval) {
            const sp = scanPositions[ri];
            const perpRad = ((sp.heading + 90) * Math.PI) / 180;
            const dLat = (halfWidthKm * Math.cos(perpRad) / R) * (180 / Math.PI);
            const dLng = (halfWidthKm * Math.sin(perpRad) / (R * Math.cos(sp.lat * Math.PI / 180))) * (180 / Math.PI);
            viewer.entities.add({
              id: `drone-rung-${plan.id}-${ri}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                  sp.lng + dLng, sp.lat + dLat, 6,
                  sp.lng - dLng, sp.lat - dLat, 6,
                ]),
                width: 2,
                material: new Cesium.Color(cr, cg, cb, 0.35),
              },
            });
          }

          // Coverage stats label at most recent scan position
          const lastScan = scanPositions[scanPositions.length - 1];
          const totalScanKm = scanPositions.length * (swathTimeStep / 1000) * (100 / 3600); // 100km/h
          const areaSqKm = totalScanKm * plan.scanWidthKm;
          viewer.entities.add({
            id: `drone-coverage-label-${plan.id}`,
            position: Cesium.Cartesian3.fromDegrees(lastScan.lng, lastScan.lat, 300),
            label: {
              text: `Coverage: ${areaSqKm.toFixed(0)} km²`,
              font: 'bold 11px monospace',
              fillColor: new Cesium.Color(cr, cg, cb, 0.9),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 8),
              scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 1e5, 0.4),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e5),
            },
          });
        }
      }
    }

    // ── Satellite Imaging over Hotspots ──
    // When satellites are enabled and hotspots exist, show imaging geometry
    if (showSatellites && satData && hotspots.length > 0) {
      for (const sat of satData.positions) {
        const altMeters = sat.altitude * 1000;
        // Check if satellite is near any hotspot (within swath width)
        for (const hs of hotspots) {
          const dLat = Math.abs(sat.lat - hs.lat);
          const dLng = Math.abs(sat.lng - hs.lng);
          const approxDistKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
          const swathHalfKm = sat.swathKm / 2;

          if (approxDistKm < swathHalfKm + 10) {
            // Satellite is imaging this hotspot!
            const satHex = sat.color;
            const sr = parseInt(satHex.slice(1, 3), 16) / 255;
            const sg = parseInt(satHex.slice(3, 5), 16) / 255;
            const sb = parseInt(satHex.slice(5, 7), 16) / 255;

            // Imaging cone — 4 lines from satellite to ground swath corners
            const halfSwathDeg = (sat.swathKm / 2) / 111;
            const corners = [
              [hs.lng - halfSwathDeg, hs.lat - halfSwathDeg],
              [hs.lng + halfSwathDeg, hs.lat - halfSwathDeg],
              [hs.lng + halfSwathDeg, hs.lat + halfSwathDeg],
              [hs.lng - halfSwathDeg, hs.lat + halfSwathDeg],
            ];

            for (let ci = 0; ci < 4; ci++) {
              viewer.entities.add({
                id: `sat-img-cone-${sat.id}-${hs.id}-${ci}`,
                polyline: {
                  positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                    sat.lng, sat.lat, altMeters,
                    corners[ci][0], corners[ci][1], 20,
                  ]),
                  width: 1.5,
                  material: new Cesium.Color(sr, sg, sb, 0.3),
                },
              });
            }

            // Ground swath outline
            const swathOutline: number[] = [];
            for (const [lng, lat] of [...corners, corners[0]]) {
              swathOutline.push(lng, lat, 15);
            }
            viewer.entities.add({
              id: `sat-img-swath-${sat.id}-${hs.id}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(swathOutline),
                width: 2,
                material: new Cesium.Color(sr, sg, sb, 0.5),
              },
            });

            // 📸 IMAGING label at ground
            viewer.entities.add({
              id: `sat-img-label-${sat.id}-${hs.id}`,
              position: Cesium.Cartesian3.fromDegrees(hs.lng, hs.lat, 100),
              label: {
                text: `📸 ${sat.name} IMAGING\n${sat.resolution} · ${hs.boatCount} boats`,
                font: 'bold 11px monospace',
                fillColor: new Cesium.Color(sr, sg, sb, 1),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, 12),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e5),
              },
            });
          }
        }
      }
    }

    } catch (e: any) {
      console.error('[CesiumGlobe] Entity update error:', e?.message || e, e?.stack?.split('\n')[1]);
    }
  }, [satData, vessels, satOrders, trajectories, trajIndex, loaded, showSatellites, showVessels, showSpots, showOrders, showTrajectories, showWaypoints, showHotspots, hotspots, selectedSpot, showDrones, droneFlightPlans]); // eslint-disable-line react-hooks/exhaustive-deps
  // NOTE: droneTimeMs removed from deps — uses droneTimeMsRef.current in entity update to avoid infinite re-render loop

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

        {/* God's Eye orbital view toggle */}
        <button
          onClick={() => setGodsEyeView(!godsEyeView)}
          style={{
            width: 40, height: 28, borderRadius: 6,
            background: godsEyeView ? 'rgba(0,212,255,0.25)' : 'rgba(30,35,50,0.85)',
            backdropFilter: 'blur(8px)',
            border: godsEyeView ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.12)',
            color: godsEyeView ? '#00d4ff' : '#8899aa', fontSize: 9, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)', letterSpacing: 0.5,
          }}
          title="God's Eye orbital view — wide FOV showing satellites and Earth curvature"
        >
          🛰
        </button>

        {/* Center / Home */}
        <button
          onClick={() => { if (godsEyeView) setGodsEyeView(false); else resetView(); }}
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
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(10,15,26,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #1e2a42', borderRadius: 10, padding: layerPanelOpen ? '10px 14px' : '6px 10px', fontSize: 11, maxWidth: 220, transition: 'padding 0.2s' }}>
        <div
          onClick={() => setLayerPanelOpen(!layerPanelOpen)}
          style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: layerPanelOpen ? 6 : 0 }}
        >
          <span>Fishing Intelligence</span>
          <span style={{ color: '#667788', fontSize: 10 }}>{layerPanelOpen ? '▲' : '▼'}</span>
        </div>

        {layerPanelOpen && <>
          {[
            { key: 'spots', label: 'Fishing Spots', state: showSpots, set: setShowSpots, color: '#f97316', count: FISHING_SPOTS.length },
            { key: 'waypoints', label: 'Chart Waypoints', state: showWaypoints, set: setShowWaypoints, color: '#eab308', count: ALL_WAYPOINTS.length },
            { key: 'vessels', label: 'Live Vessels', state: showVessels, set: setShowVessels, color: '#38bdf8', count: vessels.length },
            { key: 'hotspots', label: 'AI Hotspots', state: showHotspots, set: setShowHotspots, color: '#ef4444', count: hotspots.length },
            { key: 'orders', label: 'Satellite Orders', state: showOrders, set: setShowOrders, color: '#a855f7', count: satOrders.length },
            { key: 'trajectories', label: '48h Replay', state: showTrajectories, set: setShowTrajectories, color: '#00d4ff' },
            { key: 'drones', label: '🛩 Phase 2: VIDAR Drones', state: showDrones, set: (v: boolean) => { setShowDrones(v); if (v) { setShowSatellites(true); setShowHotspots(true); } }, color: '#00d4ff' },
          { key: 'satellites', label: 'Satellite Tracker', state: showSatellites, set: setShowSatellites, color: '#667788', count: satData?.positions.length },
          ].map(l => (
            <div key={l.key} onClick={() => l.set(!l.state)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', opacity: l.state ? 1 : 0.35 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.state ? l.color : '#333', border: `1px solid ${l.color}44`, flexShrink: 0 }} />
              <span style={{ color: '#cbd5e1', flex: 1, fontSize: 10 }}>{l.label}</span>
              {'count' in l && l.count != null && <span style={{ color: '#667788', fontSize: 9, fontFamily: 'monospace' }}>{l.count}</span>}
            </div>
          ))}

          {satOrders.length > 0 && showOrders && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #1e2a42' }}>
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
        </>}
      </div>

      {/* Fishing spot buttons moved to below the map in the page layout */}

      {/* ── Time Scrubber (for trajectory replay) ── */}
      {showTrajectories && trajectories.length > 0 && (
        <div style={{ position: 'absolute', bottom: 50, left: 10, right: 10, zIndex: 10, background: 'rgba(10,15,26,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #1e2a42', borderRadius: 8, padding: '8px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => {
              if (!trajPlaying) {
                // Start from beginning when pressing play
                setTrajIndex(0);
                trajProgressRef.current = 0;
              }
              setTrajPlaying(p => !p);
            }} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 16, cursor: 'pointer', padding: 0 }}>
              {trajPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => setPlaybackSpeed(s => s >= 8 ? 0.25 : s >= 0.25 && s < 0.5 ? 0.5 : s * 2)}
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

      {/* Phase 2 drones synced to main timeline — no separate control needed */}

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

      {/* AI Narration Panel moved to page layout below the map */}

      {/* ── Selected Spot Detail ── */}
      {selectedSpot && (
        <div style={{ position: 'absolute', top: 10, right: 56, zIndex: 10, background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(8px)', border: `1px solid ${selectedSpot.color}44`, borderRadius: 10, padding: 14, maxWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{selectedSpot.name}</span>
            <button onClick={() => setSelectedSpot(null)} style={{ background: 'none', border: 'none', color: '#667788', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <p style={{ color: '#8899aa', fontSize: 11, margin: '0 0 8px', lineHeight: 1.5 }}>{selectedSpot.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {(selectedSpot.species || []).map(s => (
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
