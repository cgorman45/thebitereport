'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AISStreamManager } from '@/lib/fleet/ais';
import { KNOWN_MMSIS, getFleetBoat } from '@/lib/fleet/boats';
import { classifyBoatStatus, pruneHistory } from '@/lib/fleet/fishing-detection';
import Sidebar from './Sidebar';
import MapLegend from './MapLegend';
import type { TrackedBoat, AISMessage, PositionEntry, BoatStatus } from '@/lib/fleet/types';

// Status → color map
const STATUS_COLORS: Record<BoatStatus, string> = {
  catching_fish: '#22c55e',
  circling: '#f97316',
  transit: '#3b82f6',
  drifting: '#06b6d4',
  in_port: '#6b7280',
  unknown: '#6b7280',
};

// Build an SVG boat icon as a data URL
function boatIconSvg(color: string, heading: number): string {
  return `<div style="transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L8 10H16L12 2Z" fill="${color}" stroke="${color}" stroke-width="0.5"/>
      <path d="M6 12L12 22L18 12H6Z" fill="${color}" opacity="0.6"/>
    </svg>
  </div>`;
}

// Create a Leaflet DivIcon for a boat
function createBoatIcon(boat: TrackedBoat): L.DivIcon {
  const color = STATUS_COLORS[boat.status];
  const isPulsing = boat.status === 'catching_fish';
  const isCircling = boat.status === 'circling';

  const pulseRing = isPulsing
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:${color}33;animation:pulseRing 2s ease-in-out infinite;"></div>`
    : '';

  const circleRing = isCircling
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;border:2px dashed ${color};opacity:0.7;animation:spinRing 4s linear infinite;"></div>`
    : '';

  const statusLabel =
    boat.status === 'catching_fish'
      ? `<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-weight:700;color:#22c55e;background:#131b2ecc;padding:1px 4px;border-radius:3px;border:1px solid #22c55e55;">ON THE BITE</div>`
      : boat.status === 'circling'
        ? `<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-weight:700;color:#f97316;background:#131b2ecc;padding:1px 4px;border-radius:3px;border:1px solid #f9731655;">THROWING BAIT</div>`
        : '';

  const html = `
    <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
      ${pulseRing}
      ${circleRing}
      ${statusLabel}
      ${boatIconSvg(color, boat.heading)}
      <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:600;color:#e2e8f0;text-shadow:0 1px 3px #000,0 0 6px #000;">${boat.name}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'fleet-boat-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Popup HTML for a boat
function createPopupContent(boat: TrackedBoat): string {
  const color = STATUS_COLORS[boat.status];
  const landing = boat.landing === 'seaforth' ? 'Seaforth Landing' : boat.landing === 'fishermans' ? "Fisherman's Landing" : 'Unknown';
  const ago = Math.round((Date.now() - boat.lastUpdate) / 1000);
  const agoText = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;

  return `
    <div style="background:#131b2e;color:#e2e8f0;padding:12px;border-radius:8px;min-width:220px;font-family:system-ui,sans-serif;">
      <div style="font-size:16px;font-weight:700;margin-bottom:2px;">${boat.name}</div>
      <div style="font-size:11px;color:#8899aa;margin-bottom:8px;">${landing}${boat.vesselType ? ' \u00b7 ' + boat.vesselType : ''}</div>
      <div style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:${color};background:${color}22;border:1px solid ${color}44;margin-bottom:8px;">${boat.statusLabel}</div>
      <div style="font-size:11px;color:#8899aa;margin-bottom:10px;">${boat.statusDetail}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
        <div><span style="color:#8899aa;">Speed</span><br/><span style="font-weight:600;">${boat.speed.toFixed(1)} kts</span></div>
        <div><span style="color:#8899aa;">Course</span><br/><span style="font-weight:600;">${Math.round(boat.heading)}\u00b0</span></div>
        <div><span style="color:#8899aa;">Lat</span><br/><span style="font-weight:600;">${boat.lat.toFixed(4)}</span></div>
        <div><span style="color:#8899aa;">Lng</span><br/><span style="font-weight:600;">${boat.lng.toFixed(4)}</span></div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:#8899aa;">Updated ${agoText}</div>
    </div>
  `;
}

export default function FleetMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  const [boats, setBoats] = useState<Map<number, TrackedBoat>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref to hold mutable boats state for the WebSocket callback
  const boatsRef = useRef<Map<number, TrackedBoat>>(new Map());

  // Update or create a Leaflet marker for a boat
  const updateMarker = useCallback((boat: TrackedBoat) => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current.get(boat.mmsi);

    if (existing) {
      // Mutate existing marker (smooth transition via CSS)
      existing.setLatLng([boat.lat, boat.lng]);
      existing.setIcon(createBoatIcon(boat));

      // Update popup content if open
      const popup = existing.getPopup();
      if (popup?.isOpen()) {
        popup.setContent(createPopupContent(boat));
      }

      // Update tooltip
      existing.setTooltipContent(
        `<strong>${boat.name}</strong><br/>${boat.speed.toFixed(1)} kts \u00b7 ${Math.round(boat.heading)}\u00b0<br/><span style="color:${STATUS_COLORS[boat.status]}">${boat.statusLabel}</span>`
      );
    } else {
      // Create new marker
      const marker = L.marker([boat.lat, boat.lng], {
        icon: createBoatIcon(boat),
      });

      marker.bindTooltip(
        `<strong>${boat.name}</strong><br/>${boat.speed.toFixed(1)} kts \u00b7 ${Math.round(boat.heading)}\u00b0<br/><span style="color:${STATUS_COLORS[boat.status]}">${boat.statusLabel}</span>`,
        {
          direction: 'top',
          offset: [0, -30],
          className: 'fleet-tooltip',
        }
      );

      marker.bindPopup(createPopupContent(boat), {
        className: 'fleet-popup',
        maxWidth: 280,
      });

      marker.addTo(map);
      markersRef.current.set(boat.mmsi, marker);
    }
  }, []);

  // Process incoming AIS message
  const handleAISMessage = useCallback((msg: AISMessage) => {
    const report = msg.Message.PositionReport;
    if (!report) return;

    const mmsi = report.UserID || msg.MetaData.MMSI;
    const lat = report.Latitude;
    const lng = report.Longitude;
    const speed = report.Sog / 10;
    const heading = report.TrueHeading === 511 ? report.Cog / 10 : report.TrueHeading;
    const cog = report.Cog / 10;
    const now = Date.now();

    if (lat === 0 && lng === 0) return;
    if (lat < 30 || lat > 35 || lng < -120 || lng > -115) return;

    const fleetBoat = getFleetBoat(mmsi);

    const currentBoats = boatsRef.current;
    const existing = currentBoats.get(mmsi);

    const entry: PositionEntry = { lat, lng, speed, heading: heading || cog, timestamp: now };

    const history = pruneHistory(
      existing ? [...existing.history, entry] : [entry],
      now
    );

    const { status, label, detail } = classifyBoatStatus(lat, lng, speed, history, now);

    const tracked: TrackedBoat = {
      mmsi,
      name: fleetBoat?.name || existing?.name || msg.MetaData.ShipName?.trim() || `Vessel ${mmsi}`,
      landing: fleetBoat?.landing || existing?.landing || 'unknown',
      vesselType: fleetBoat?.vesselType || existing?.vesselType,
      lat,
      lng,
      speed,
      heading: heading || cog,
      lastUpdate: now,
      status,
      statusLabel: label,
      statusDetail: detail,
      history,
    };

    const newBoats = new Map(currentBoats);
    newBoats.set(mmsi, tracked);
    boatsRef.current = newBoats;

    setBoats(newBoats);
    setLastUpdate(now);
    updateMarker(tracked);
  }, [updateMarker]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.71, -117.23],
      zoom: 11,
      zoomControl: false,
      maxBounds: [
        [31.0, -120.0],
        [34.5, -115.5],
      ],
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Connect to AIS stream directly via client-side WebSocket
  useEffect(() => {
    const manager = new AISStreamManager({
      apiKey: '',
      knownMmsis: Array.from(KNOWN_MMSIS),
      onMessage: handleAISMessage,
      onStatus: setConnectionStatus,
    });

    manager.connect();

    return () => manager.destroy();
  }, [handleAISMessage]);

  // Handle boat selection from sidebar
  const handleSelectBoat = useCallback((mmsi: number) => {
    setSelectedMmsi(mmsi);
    const boat = boatsRef.current.get(mmsi);
    if (boat && mapRef.current) {
      mapRef.current.flyTo([boat.lat, boat.lng], 14, { duration: 1 });
      const marker = markersRef.current.get(mmsi);
      if (marker) {
        setTimeout(() => marker.openPopup(), 500);
      }
    }
  }, []);

  // Recenter
  const handleRecenter = useCallback(() => {
    mapRef.current?.flyTo([32.71, -117.23], 11, { duration: 1 });
  }, []);

  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const boatList = Array.from(boats.values());

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      {/* CSS for animations and Leaflet overrides */}
      <style jsx global>{`
        @keyframes pulseRing {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        @keyframes spinRing {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .fleet-boat-marker {
          background: none !important;
          border: none !important;
        }
        .fleet-boat-marker > div {
          transition: transform 0.5s ease-out;
        }
        .fleet-tooltip {
          background: #131b2e !important;
          color: #e2e8f0 !important;
          border: 1px solid #1e2a42 !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          font-size: 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .fleet-tooltip .leaflet-tooltip-arrow {
          display: none;
        }
        .fleet-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 8px !important;
          padding: 0 !important;
        }
        .fleet-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .fleet-popup .leaflet-popup-tip {
          background: #131b2e !important;
        }
        .fleet-popup .leaflet-popup-close-button {
          color: #8899aa !important;
          font-size: 18px !important;
          top: 8px !important;
          right: 8px !important;
        }
        .leaflet-control-zoom a {
          background: #131b2e !important;
          color: #e2e8f0 !important;
          border-color: #1e2a42 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1a2540 !important;
        }
      `}</style>

      {/* Sidebar */}
      <Sidebar
        boats={boatList}
        connectionStatus={connectionStatus}
        lastUpdate={lastUpdate}
        onSelectBoat={handleSelectBoat}
        selectedMmsi={selectedMmsi}
      />

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* No API Key overlay */}
        {connectionStatus === 'no_key' && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
            <div className="bg-[#131b2e] border border-[#1e2a42] rounded-xl p-6 max-w-md text-center pointer-events-auto">
              <div className="text-[#f97316] text-lg font-semibold mb-2">No AIS Connection</div>
              <p className="text-[#8899aa] text-sm">
                Fleet tracker requires an AIS data connection. Configure your
                aisstream.io API key in <code className="text-[#00d4ff]">.env.local</code> as{' '}
                <code className="text-[#00d4ff]">NEXT_PUBLIC_AISSTREAM_API_KEY</code> to see
                live boat positions.
              </p>
            </div>
          </div>
        )}

        {/* Map controls */}
        <div className="absolute top-3 right-14 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleRecenter}
            className="w-8 h-8 rounded bg-[#131b2e] border border-[#1e2a42] text-[#e2e8f0] flex items-center justify-center hover:bg-[#1a2540] transition-colors text-sm"
            title="Recenter on San Diego"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
          <button
            onClick={handleFullscreen}
            className="w-8 h-8 rounded bg-[#131b2e] border border-[#1e2a42] text-[#e2e8f0] flex items-center justify-center hover:bg-[#1a2540] transition-colors text-sm"
            title="Toggle fullscreen"
          >
            {isFullscreen ? '⊟' : '⊞'}
          </button>
        </div>

        {/* Legend */}
        <MapLegend />
      </div>
    </div>
  );
}
