'use client';

interface DataInfoProps {
  timestamp: string | null;
  error: boolean;
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(13,19,32,0.92)',
  border: '1px solid #1e2a42',
  borderRadius: 10,
  padding: '10px 14px',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#e2e8f0',
  fontFamily: 'system-ui, sans-serif',
  minWidth: 160,
};

function getRelativeTime(timestamp: string): string {
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Updated just now';
  if (diffMin < 60) return `Updated ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `Updated ${diffHr}h ago`;
}

function isStale(timestamp: string): boolean {
  const then = new Date(timestamp).getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return Date.now() - then > twoHoursMs;
}

export default function DataInfo({ timestamp, error }: DataInfoProps) {
  let dot: string;
  let statusText: string;
  let subText: string | null = null;

  if (error) {
    dot = '#f97316';
    statusText = 'Unavailable';
  } else if (timestamp) {
    const stale = isStale(timestamp);
    const relTime = getRelativeTime(timestamp);
    if (!stale) {
      dot = '#22c55e';
      statusText = 'Live';
      subText = relTime;
    } else {
      dot = '#f97316';
      statusText = relTime;
    }
  } else {
    dot = '#8899aa';
    statusText = 'Loading...';
  }

  return (
    <div style={PANEL_STYLE}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Ocean Data</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: dot,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, color: '#e2e8f0' }}>{statusText}</span>
      </div>
      {subText && (
        <div style={{ fontSize: 11, color: '#8899aa', marginTop: 3, paddingLeft: 13 }}>
          {subText}
        </div>
      )}
    </div>
  );
}
