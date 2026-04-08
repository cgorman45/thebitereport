'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SatelliteViewerProps {
  thumbnailB64: string;
  sceneId: string;
  captureTime: string;
  /** Meters per pixel at native resolution (Sentinel-2 = 10) */
  metersPerPixel?: number;
}

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.2;

export default function SatelliteViewer({
  thumbnailB64,
  sceneId,
  captureTime,
  metersPerPixel = 10,
}: SatelliteViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [initialZoom, setInitialZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Calculate initial zoom to fill the viewport
  useEffect(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const onLoad = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (iw === 0 || ih === 0) return;

      // Start with the full image visible (fit to contain)
      const fitZoom = Math.min(cw / iw, ch / ih);
      const startZoom = Math.max(MIN_ZOOM, fitZoom);
      setZoom(startZoom);
      setInitialZoom(startZoom);
    };

    if (img.complete) onLoad();
    else img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [thumbnailB64]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  // Pan with mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ ...pan });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: panStart.x + (e.clientX - dragStart.x) / zoom,
      y: panStart.y + (e.clientY - dragStart.y) / zoom,
    });
  }, [dragging, dragStart, panStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      if (e.key === '-') setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
      if (e.key === '0') resetView();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [resetView]);

  // Scale bar calculation
  // At zoom=1, the image is displayed at screen resolution
  // Scale bar shows how many meters a fixed pixel width represents
  const scaleBarWidthPx = 120;
  const scaleBarMeters = Math.round((scaleBarWidthPx * metersPerPixel) / zoom);

  // Format scale nicely
  let scaleLabel: string;
  if (scaleBarMeters >= 1000) {
    scaleLabel = `${(scaleBarMeters / 1000).toFixed(1)} km`;
  } else {
    scaleLabel = `${scaleBarMeters} m`;
  }

  return (
    <div style={{
      background: '#131b2e', border: '1px solid #1e2a42',
      borderRadius: 12, overflow: 'hidden', position: 'relative',
    }}>
      {/* Image viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: '70vh',
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'grab',
          position: 'relative',
          background: '#0d1320',
        }}
      >
        <img
          ref={imgRef}
          src={`data:image/jpeg;base64,${thumbnailB64}`}
          alt="Sentinel-2 satellite imagery"
          draggable={false}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            maxWidth: 'none',
            imageRendering: zoom > 2 ? 'pixelated' : 'auto',
            transition: dragging ? 'none' : 'transform 0.1s ease-out',
            userSelect: 'none',
          }}
        />

        {/* Detection location is marked by red circle drawn on the image itself */}

        {/* Scale bar */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
        }}>
          <div style={{
            fontSize: 11,
            color: '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            fontWeight: 600,
          }}>
            {scaleLabel}
          </div>
          <div style={{
            width: scaleBarWidthPx,
            height: 3,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.8)',
            borderRadius: 1,
          }}>
            {/* End ticks */}
            <div style={{ position: 'absolute', left: 0, top: -3, width: 1, height: 9, background: '#fff' }} />
            <div style={{ position: 'absolute', left: scaleBarWidthPx, top: -3, width: 1, height: 9, background: '#fff' }} />
          </div>
        </div>

        {/* Zoom level indicator */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          fontSize: 12,
          color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          fontWeight: 600,
        }}>
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Controls bar */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #1e2a42',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#667788' }}>
          Sentinel-2 L2A · 10m resolution · {sceneId.split('_').slice(0, 3).join('_')}
        </span>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#667788' }}>{captureTime}</span>
          <div style={{ width: 1, height: 16, background: '#1e2a42', margin: '0 4px' }} />
          <button
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP * 2))}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: '#1e2a42', border: 'none', color: '#e2e8f0',
              fontSize: 16, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            −
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP * 2))}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: '#1e2a42', border: 'none', color: '#e2e8f0',
              fontSize: 16, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            +
          </button>
          <button
            onClick={resetView}
            style={{
              padding: '4px 10px', borderRadius: 6,
              background: '#1e2a42', border: 'none', color: '#8899aa',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
