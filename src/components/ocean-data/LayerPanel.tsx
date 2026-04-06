'use client';

interface LayerPanelProps {
  layers: Record<string, boolean>;
  loading: Record<string, boolean>;
  onToggle: (layerId: string) => void;
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(13,19,32,0.92)',
  border: '1px solid #1e2a42',
  borderRadius: 10,
  padding: 14,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  width: 210,
  color: '#e2e8f0',
  fontFamily: 'system-ui, sans-serif',
};

interface LiveLayer {
  id: string;
  color: string;
  label: string;
}

const LIVE_LAYERS: LiveLayer[] = [
  { id: 'sst', color: '#22c55e', label: 'SST Heatmap' },
  { id: 'chlorophyll', color: '#3b82f6', label: 'Chlorophyll-a' },
  { id: 'breaks', color: '#ff6b35', label: 'Current Breaks' },
  { id: 'goes-sst', color: '#8b5cf6', label: 'GOES Hourly SST' },
];

function Spinner({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: `2px solid ${color}33`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'ocean-spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

function Checkbox({ checked, color }: { checked: boolean; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: 3,
        border: checked ? `2px solid ${color}` : '2px solid #3a4a6a',
        background: checked ? color : 'transparent',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: 3,
        padding: '1px 4px',
        letterSpacing: '0.04em',
        marginLeft: 4,
      }}
    >
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#8899aa',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#1e2a42', margin: '12px 0' }} />;
}

export default function LayerPanel({ layers, loading, onToggle }: LayerPanelProps) {
  return (
    <>
      <style>{`@keyframes ocean-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={PANEL_STYLE}>
        {/* Section 1: Ocean Data */}
        <SectionLabel>Ocean Data</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LIVE_LAYERS.map(({ id, color, label }) => (
            <button
              key={id}
              onClick={() => onToggle(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#e2e8f0',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {loading[id] ? (
                <Spinner color={color} />
              ) : (
                <Checkbox checked={!!layers[id]} color={color} />
              )}
              <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
              <Badge label="LIVE" color="#22c55e" bg="#22c55e15" />
            </button>
          ))}
        </div>

        <Divider />

        {/* Section 2: Kelp Detection */}
        <SectionLabel>Kelp Detection</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
          {['Kelp Mat Markers', 'Satellite Imagery'].map((label) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Checkbox checked={false} color="#3a4a6a" />
              <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
              <Badge label="PRO" color="#f97316" bg="#f9731615" />
            </div>
          ))}
        </div>

        <Divider />

        {/* Section 3: Drift Prediction */}
        <SectionLabel>Drift Prediction</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
          {['Drift Heatmap', 'Current Vectors'].map((label) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Checkbox checked={false} color="#3a4a6a" />
              <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
              <Badge label="CAPTAIN" color="#a855f7" bg="#a855f715" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
