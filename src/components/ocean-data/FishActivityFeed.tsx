'use client';

export interface FishReport {
  id: string;
  lat: number;
  lng: number;
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
}

interface FishActivityFeedProps {
  reports: FishReport[];
  onReportClick: (lat: number, lng: number) => void;
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

export default function FishActivityFeed({ reports, onReportClick }: FishActivityFeedProps) {
  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#8899aa', fontSize: 13, padding: '24px 0', lineHeight: 1.6 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🐟</div>
        No fish reports yet. Be first to report!
      </div>
    );
  }

  return (
    <>
      <style>{`
        .faf-card:hover { background: rgba(249,115,22,0.06) !important; border-color: #f9731633 !important; }
        @keyframes faf-wide-open {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reports.map((r) => {
          const color = getSpeciesColor(r.species);
          const qColor = QUANTITY_COLORS[r.quantity] ?? '#8899aa';
          const qLabel = QUANTITY_LABELS[r.quantity] ?? r.quantity;
          const isWideOpen = r.quantity === 'wide-open';

          return (
            <div
              key={r.id}
              className="faf-card"
              onClick={() => onReportClick(r.lat, r.lng)}
              style={{
                background: 'rgba(249,115,22,0.03)',
                border: '1px solid #1e2a42',
                borderRadius: 8,
                padding: '9px 10px',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {/* Species color dot */}
              <div style={{ paddingTop: 3, flexShrink: 0 }}>
                <span style={{
                  display: 'block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 4px ${color}66`,
                }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color }}>
                    {r.species}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: qColor,
                      background: `${qColor}18`,
                      border: `1px solid ${qColor}44`,
                      borderRadius: 3,
                      padding: '1px 5px',
                      animation: isWideOpen ? 'faf-wide-open 1.5s ease-in-out infinite' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    {qLabel}
                  </span>
                  <span style={{ fontSize: 10, color: '#8899aa', marginLeft: 'auto', flexShrink: 0 }}>
                    {relativeTime(r.created_at)}
                  </span>
                </div>

                {r.bait && (
                  <div style={{ fontSize: 11, color: '#8899aa', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🪝 {r.bait}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#8899aa', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    {r.verification_count}
                  </span>
                  {r.status === 'verified' && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: '#22c55e18', border: '1px solid #22c55e44', borderRadius: 3, padding: '1px 5px' }}>
                      Verified ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
