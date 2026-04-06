'use client';

interface ColorScaleProps {
  activeLayer: 'sst' | 'chlorophyll' | 'kelp-heatmap' | null;
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
  display: 'inline-block',
};

const SCALES = {
  sst: {
    gradient: 'linear-gradient(to right, #3b82f6, #06b6d4, #facc15, #f97316, #ef4444)',
    minLabel: '55°F',
    maxLabel: '72°F',
    title: 'Sea Surface Temp',
  },
  chlorophyll: {
    gradient: 'linear-gradient(to right, transparent, #22c55e)',
    minLabel: '0 mg/m³',
    maxLabel: '10 mg/m³',
    title: 'Chlorophyll-a',
  },
  'kelp-heatmap': {
    gradient: 'linear-gradient(to right, transparent, #eab308, #f97316, #ef4444)',
    minLabel: 'Low',
    maxLabel: 'High',
    title: 'Kelp Density',
  },
};

export default function ColorScale({ activeLayer }: ColorScaleProps) {
  if (!activeLayer) return null;

  const scale = SCALES[activeLayer];

  return (
    <div style={PANEL_STYLE}>
      <div style={{ fontSize: 10, color: '#8899aa', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {scale.title}
      </div>
      <div
        style={{
          width: 140,
          height: 8,
          borderRadius: 4,
          background: scale.gradient,
          border: '1px solid #1e2a42',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: '#8899aa' }}>{scale.minLabel}</span>
        <span style={{ fontSize: 10, color: '#8899aa' }}>{scale.maxLabel}</span>
      </div>
    </div>
  );
}
