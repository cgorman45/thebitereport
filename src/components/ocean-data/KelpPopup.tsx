'use client';

interface KelpPopupProps {
  confidence: number;
  area_m2: number;
  method: string;
  detected_at: string;
  indices: { ndvi: number; fai: number; fdi: number } | null;
  thumbnail_b64: string | null;
  lat: number;
  lng: number;
}

function relativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

function formatArea(area_m2: number): string {
  if (area_m2 > 10000) {
    return `${(area_m2 / 10000).toFixed(2)} ha`;
  }
  return `${area_m2.toLocaleString()} m²`;
}

function confidenceColor(confidence: number): string {
  if (confidence > 0.7) return '#22c55e';
  if (confidence >= 0.4) return '#eab308';
  return '#ef4444';
}

function formatMethod(method: string): string {
  if (method === 'yolov8') return 'AI (YOLOv8)';
  return 'Threshold';
}

const POPUP_STYLE: React.CSSProperties = {
  background: 'rgba(13,19,32,0.95)',
  border: '1px solid #1e2a42',
  borderRadius: 10,
  padding: 12,
  minWidth: 200,
  color: '#e2e8f0',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
};

const LABEL_STYLE: React.CSSProperties = {
  color: '#8899aa',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: 2,
};

const ROW_STYLE: React.CSSProperties = {
  marginBottom: 8,
};

export default function KelpPopup({
  confidence,
  area_m2,
  method,
  detected_at,
  indices,
  thumbnail_b64,
  lat,
  lng,
}: KelpPopupProps) {
  return (
    <div style={POPUP_STYLE}>
      {thumbnail_b64 && (
        <div style={{ marginBottom: 8, borderRadius: 6, overflow: 'hidden' }}>
          <img
            src={`data:image/jpeg;base64,${thumbnail_b64}`}
            alt="Satellite imagery of kelp detection"
            style={{
              width: '100%',
              height: 128,
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div style={{ fontSize: 9, color: '#667788', textAlign: 'center', marginTop: 2 }}>
            Sentinel-2 satellite imagery
          </div>
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 10,
          color: '#e2e8f0',
          borderBottom: '1px solid #1e2a42',
          paddingBottom: 8,
        }}
      >
        Kelp Detection
      </div>

      <div style={ROW_STYLE}>
        <div style={LABEL_STYLE}>Confidence</div>
        <div style={{ color: confidenceColor(confidence), fontWeight: 600 }}>
          {Math.round(confidence * 100)}%
        </div>
      </div>

      <div style={ROW_STYLE}>
        <div style={LABEL_STYLE}>Area</div>
        <div>{formatArea(area_m2)}</div>
      </div>

      <div style={ROW_STYLE}>
        <div style={LABEL_STYLE}>Method</div>
        <div>{formatMethod(method)}</div>
      </div>

      <div style={ROW_STYLE}>
        <div style={LABEL_STYLE}>Detected</div>
        <div>{relativeTime(detected_at)}</div>
      </div>

      {indices && (
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              ...LABEL_STYLE,
              marginBottom: 6,
              borderTop: '1px solid #1e2a42',
              paddingTop: 8,
            }}
          >
            Spectral Indices
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8899aa' }}>NDVI</span>
              <span>{indices.ndvi.toFixed(3)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8899aa' }}>FAI</span>
              <span>{indices.fai.toFixed(3)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8899aa' }}>FDI</span>
              <span>{indices.fdi.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid #1e2a42', paddingTop: 8, color: '#8899aa', fontSize: 10 }}>
        {lat.toFixed(4)}°, {lng.toFixed(4)}°
      </div>
    </div>
  );
}
