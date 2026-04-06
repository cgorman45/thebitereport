'use client';

interface ContributionBadgeProps {
  score: number;
  sightings: number;
  verifications: number;
  photos: number;
}

interface Level {
  label: string;
  color: string;
  bg: string;
  border: string;
}

function getLevel(score: number): Level {
  if (score >= 100) return { label: 'Ranger', color: '#00d4ff', bg: '#00d4ff12', border: '#00d4ff33' };
  if (score >= 50) return { label: 'Scout', color: '#22c55e', bg: '#22c55e12', border: '#22c55e33' };
  if (score >= 25) return { label: 'Spotter', color: '#eab308', bg: '#eab30812', border: '#eab30833' };
  return { label: 'Observer', color: '#8899aa', bg: '#8899aa12', border: '#8899aa33' };
}

export default function ContributionBadge({ score, sightings, verifications, photos }: ContributionBadgeProps) {
  const level = getLevel(score);

  return (
    <div
      style={{
        background: level.bg,
        border: `1px solid ${level.border}`,
        borderRadius: 10,
        padding: '12px 16px',
        fontFamily: 'system-ui, sans-serif',
        color: '#e2e8f0',
      }}
    >
      {/* Level + score row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌿</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: level.color,
              letterSpacing: '0.02em',
            }}
          >
            {level.label}
          </span>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: level.color,
            background: `${level.color}18`,
            border: `1px solid ${level.border}`,
            borderRadius: 6,
            padding: '2px 8px',
          }}
        >
          {score} pts
        </span>
      </div>

      {/* Breakdown */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: '#8899aa',
        }}
      >
        <span>
          <span style={{ fontWeight: 600, color: '#c4cfe0' }}>{sightings}</span> sighting{sightings !== 1 ? 's' : ''}
        </span>
        <span>
          <span style={{ fontWeight: 600, color: '#c4cfe0' }}>{verifications}</span> verification{verifications !== 1 ? 's' : ''}
        </span>
        <span>
          <span style={{ fontWeight: 600, color: '#c4cfe0' }}>{photos}</span> photo{photos !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
