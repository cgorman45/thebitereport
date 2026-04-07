'use client';

import VerifyButton from './VerifyButton';

interface FishReportPopupProps {
  id: string;
  species: string;
  quantity: string;
  bait: string | null;
  technique: string | null;
  description: string | null;
  status: 'active' | 'verified' | 'expired';
  verification_count: number;
  display_name: string;
  avatar_key: string;
  created_at: string;
  onVerify: (id: string) => void;
}

const SPECIES_COLORS: Record<string, string> = {
  'yellowtail': '#eab308',
  'bluefin tuna': '#3b82f6',
  'yellowfin tuna': '#f59e0b',
  'calico bass': '#22c55e',
  'white seabass': '#e2e8f0',
  'barracuda': '#8b5cf6',
  'dorado': '#22d3ee',
  'bonito': '#06b6d4',
  'rockfish': '#ef4444',
  'halibut': '#84cc16',
  'sheephead': '#f97316',
};

function getSpeciesColor(species: string): string {
  return SPECIES_COLORS[species.toLowerCase()] ?? '#f97316';
}

const QUANTITY_LABELS: Record<string, string> = {
  'few': 'Few',
  'some': 'Some',
  'lots': 'Lots',
  'wide-open': 'Wide Open!',
};

const QUANTITY_COLORS: Record<string, string> = {
  'few': '#8899aa',
  'some': '#eab308',
  'lots': '#f97316',
  'wide-open': '#22c55e',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function FishReportPopup({
  id,
  species,
  quantity,
  bait,
  technique,
  description,
  status,
  verification_count,
  display_name,
  avatar_key,
  created_at,
  onVerify,
}: FishReportPopupProps) {
  const speciesColor = getSpeciesColor(species);
  const quantityLabel = QUANTITY_LABELS[quantity] ?? quantity;
  const quantityColor = QUANTITY_COLORS[quantity] ?? '#8899aa';
  const isWideOpen = quantity === 'wide-open';

  const statusColor = status === 'verified' ? '#22c55e' : status === 'expired' ? '#8899aa' : '#eab308';
  const statusLabel = status === 'verified' ? 'Verified ✓' : status === 'expired' ? 'Expired' : 'Active';

  const baitDisplay = bait || technique || null;

  return (
    <>
      <style>{`
        @keyframes wide-open-pulse {
          0%, 100% { box-shadow: 0 0 0 0 #22c55e44; }
          50% { box-shadow: 0 0 0 4px #22c55e22; }
        }
      `}</style>
      <div
        style={{
          background: 'rgba(13,19,32,0.97)',
          border: `1px solid ${speciesColor}44`,
          borderRadius: 10,
          padding: 12,
          maxWidth: 280,
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
        }}
      >
        {/* Species name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: speciesColor, flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: speciesColor, flex: 1 }}>{species}</span>
          {/* Quantity badge */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: quantityColor,
              background: `${quantityColor}18`,
              border: `1px solid ${quantityColor}44`,
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
              animation: isWideOpen ? 'wide-open-pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {quantityLabel}
          </span>
        </div>

        {/* Bait / technique */}
        {baitDisplay && (
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M2 12C2 6.48 6.48 2 12 2" />
              <path d="M12 22C6.48 22 2 17.52 2 12" />
              <path d="M22 12c0 5.52-4.48 10-10 10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span style={{ fontSize: 11, color: '#c4cfe0' }}>{baitDisplay}</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p style={{ margin: '0 0 8px', color: '#c4cfe0', fontSize: 11, lineHeight: 1.4 }}>
            {description}
          </p>
        )}

        {/* User + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <img
            src={`/avatars/${avatar_key}.svg`}
            alt={display_name}
            width={20}
            height={20}
            style={{ borderRadius: '50%', border: '1px solid #1e2a42', flexShrink: 0 }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/avatars/default.svg';
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 11, color: '#c4cfe0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {display_name}
          </span>
          <span style={{ fontSize: 10, color: '#8899aa', flexShrink: 0 }}>
            {relativeTime(created_at)}
          </span>
        </div>

        {/* Status + verify row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: statusColor,
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}44`,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            {statusLabel}
          </span>
          <VerifyButton
            verified={false}
            count={verification_count}
            onToggle={() => onVerify(id)}
          />
        </div>
      </div>
    </>
  );
}
