'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Sighting {
  id: string;
  lat: number;
  lng: number;
  description: string | null;
  status: 'pending' | 'verified' | 'expired';
  verification_count: number;
  display_name: string;
  avatar_key: string;
  photo_url: string | null;
  created_at: string;
}

interface CommunityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  onSightingClick: (lat: number, lng: number) => void;
}

type FilterTab = 'all' | 'verified' | 'recent';

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

export default function CommunityFeed({ isOpen, onClose, onSightingClick }: CommunityFeedProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kelp-sightings/feed?page=${pageNum}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Sighting[] = await res.json();
      setSightings((prev) => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchPage(1, true);
    }
  }, [isOpen, fetchPage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage);
    }
  }, [loading, hasMore, page, fetchPage]);

  const filtered = sightings.filter((s) => {
    if (filter === 'verified') return s.status === 'verified';
    if (filter === 'recent') {
      const diff = Date.now() - new Date(s.created_at).getTime();
      return diff < 24 * 3600 * 1000; // last 24h
    }
    return true;
  });

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'verified', label: 'Verified' },
    { id: 'recent', label: 'Recent' },
  ];

  return (
    <>
      <style>{`
        .cf-panel {
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .cf-card:hover {
          background: rgba(255,255,255,0.04) !important;
          border-color: #2a3a52 !important;
        }
      `}</style>
      <div
        className="cf-panel"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 350,
          height: '100%',
          background: 'rgba(13,19,32,0.96)',
          borderLeft: '1px solid #1e2a42',
          zIndex: 9,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #1e2a42',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🌿</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Community Sightings</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8899aa',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '10px 16px',
            borderBottom: '1px solid #1e2a42',
            flexShrink: 0,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                background: filter === tab.id ? '#22c55e22' : 'transparent',
                border: `1px solid ${filter === tab.id ? '#22c55e' : '#1e2a42'}`,
                borderRadius: 6,
                padding: '4px 12px',
                color: filter === tab.id ? '#22c55e' : '#8899aa',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: filter === tab.id ? 600 : 400,
                transition: 'all 0.15s',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {filtered.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                color: '#8899aa',
                fontSize: 13,
                marginTop: 40,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🌊</div>
              No sightings yet. Be the first to report a kelp paddy!
            </div>
          )}

          {filtered.map((s) => {
            const statusColor = s.status === 'verified' ? '#22c55e' : s.status === 'expired' ? '#8899aa' : '#eab308';
            const statusLabel = s.status === 'verified' ? 'Verified' : s.status === 'expired' ? 'Expired' : 'Pending';

            return (
              <div
                key={s.id}
                className="cf-card"
                onClick={() => onSightingClick(s.lat, s.lng)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid #1e2a42',
                  borderRadius: 8,
                  padding: 10,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                  display: 'flex',
                  gap: 10,
                }}
              >
                {/* Photo or placeholder */}
                <div style={{ flexShrink: 0 }}>
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt=""
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #1e2a42',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 6,
                        background: '#0f1a2e',
                        border: '1px solid #1e2a42',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        color: '#2a3a52',
                      }}
                    >
                      🌿
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* User + time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <img
                      src={`/avatars/${s.avatar_key}.svg`}
                      alt={s.display_name}
                      width={18}
                      height={18}
                      style={{ borderRadius: '50%', flexShrink: 0 }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.svg'; }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#c4cfe0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.display_name}
                    </span>
                    <span style={{ fontSize: 10, color: '#8899aa', flexShrink: 0 }}>
                      · {relativeTime(s.created_at)}
                    </span>
                  </div>

                  {/* Description */}
                  {s.description && (
                    <p
                      style={{
                        margin: '0 0 5px',
                        fontSize: 11,
                        color: '#8899aa',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
                        lineHeight: 1.4,
                      }}
                    >
                      {s.description}
                    </p>
                  )}

                  {/* Footer: verifications + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#8899aa', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                      </svg>
                      {s.verification_count}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: statusColor,
                        background: `${statusColor}18`,
                        border: `1px solid ${statusColor}44`,
                        borderRadius: 3,
                        padding: '1px 5px',
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#8899aa', fontSize: 12 }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
