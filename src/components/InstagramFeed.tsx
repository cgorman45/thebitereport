'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
  timestamp: string;
  landing: string;
  mediaType: string;
}

// Landing Instagram accounts (for the "Follow the Fleet" pills)
const LANDING_ACCOUNTS = [
  { handle: 'seaforthlanding', name: 'Seaforth' },
  { handle: 'fishermans_landing', name: "Fisherman's" },
  { handle: 'hmlanding', name: 'H&M' },
  { handle: 'pointlomasportfishing', name: 'Pt. Loma' },
  { handle: 'helgrensoceansidesportfishing', name: "Helgren's" },
];

// Fallback shortcodes used when the API is not configured
const FALLBACK_POSTS = [
  { shortcode: 'DLaDMoiRPbn', landing: 'Seaforth' },
  { shortcode: 'DKmllUixnS6', landing: 'Seaforth' },
  { shortcode: 'DJeSI8du_sV', landing: 'Seaforth' },
  { shortcode: 'DKNL91-vMzX', landing: 'Seaforth' },
  { shortcode: 'DKveelIvK7c', landing: "Fisherman's" },
  { shortcode: 'DJHsV_6SxSI', landing: "Fisherman's" },
  { shortcode: 'DVTqWvyEc-7', landing: "Fisherman's" },
  { shortcode: 'DNeLz-7uAHd', landing: 'H&M' },
  { shortcode: 'DO4v_O1iaS5', landing: 'Pt. Loma' },
  { shortcode: 'DNvsQc2Uq1C', landing: 'Pt. Loma' },
  { shortcode: 'DPPlobwkr4L', landing: 'Pt. Loma' },
  { shortcode: 'DVBNo7uEcY3', landing: 'Pt. Loma' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-grad)" />
      <defs>
        <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2">
          <stop stopColor="#feda75" />
          <stop offset="0.25" stopColor="#fa7e1e" />
          <stop offset="0.5" stopColor="#d62976" />
          <stop offset="0.75" stopColor="#962fbf" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Displays a photo from the API as an <img> with overlays */
function PhotoCard({
  post,
  hero = false,
}: {
  post: FeedPost;
  hero?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        position: 'relative',
        borderRadius: hero ? '10px' : '6px',
        overflow: 'hidden',
        aspectRatio: hero ? '4/3' : '1',
        backgroundColor: '#1e2a42',
        textDecoration: 'none',
      }}
    >
      <img
        src={post.imageUrl}
        alt={post.caption?.slice(0, 80) || `${post.landing} catch`}
        onLoad={() => setLoaded(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      {/* Loading placeholder */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1e2a42',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid #8899aa33',
              borderTopColor: '#8899aa',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      {/* Landing badge */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 700,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: '#e2e8f0',
          backdropFilter: 'blur(4px)',
          zIndex: 2,
        }}
      >
        {post.landing}
      </div>

      {/* Instagram icon */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          zIndex: 2,
          opacity: 0.7,
        }}
      >
        <InstagramIcon size={14} />
      </div>

      {/* Caption preview on hero card */}
      {hero && post.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 8px 8px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            fontSize: '10px',
            color: '#e2e8f0',
            lineHeight: 1.3,
            zIndex: 2,
          }}
        >
          {post.caption.length > 100
            ? post.caption.slice(0, 100) + '...'
            : post.caption}
        </div>
      )}
    </a>
  );
}

/** Fallback: embeds an Instagram post via iframe when API is not configured */
function InstaEmbed({
  shortcode,
  landing,
  hero = false,
}: {
  shortcode: string;
  landing: string;
  hero?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <a
      href={`https://www.instagram.com/p/${shortcode}/`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        position: 'relative',
        borderRadius: hero ? '10px' : '6px',
        overflow: 'hidden',
        aspectRatio: hero ? '4/3' : '1',
        backgroundColor: '#1e2a42',
        textDecoration: 'none',
      }}
    >
      <iframe
        src={`https://www.instagram.com/p/${shortcode}/embed/captioned/?cr=1&v=14&wp=320`}
        onLoad={() => setLoaded(true)}
        style={{
          position: 'absolute',
          top: '-64px',
          left: '0',
          width: '100%',
          height: 'calc(100% + 200px)',
          border: 'none',
          pointerEvents: 'none',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        loading="lazy"
        scrolling="no"
        allowTransparency
      />

      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1e2a42',
          }}
        >
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #8899aa33', borderTopColor: '#8899aa', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 700,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: '#e2e8f0',
          backdropFilter: 'blur(4px)',
          zIndex: 2,
        }}
      >
        {landing}
      </div>

      <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2, opacity: 0.7 }}>
        <InstagramIcon size={14} />
      </div>
    </a>
  );
}

function AccountPill({ handle, name }: { handle: string; name: string }) {
  return (
    <a
      href={`https://www.instagram.com/${handle}/`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        borderRadius: '9999px',
        backgroundColor: '#1e2a4280',
        border: '1px solid #1e2a42',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#d6297644';
        e.currentTarget.style.backgroundColor = '#d6297615';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1e2a42';
        e.currentTarget.style.backgroundColor = '#1e2a4280';
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #feda75, #fa7e1e, #d62976, #962fbf)',
        padding: '1.5px', flexShrink: 0,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          backgroundColor: '#131b2e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '7px', fontWeight: 700, color: '#e2e8f0',
        }}>
          {name[0]}
        </div>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InstagramFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/instagram/feed', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
        }
        setConfigured(data.configured !== false);
      })
      .catch(() => {
        // API unavailable — will show fallback
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  // Use iframe fallback when API is not configured or returns no posts
  const useFallback = !loading && posts.length === 0;

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'sticky',
        top: '80px',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <InstagramIcon />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
            From the Docks
          </div>
          <div style={{ fontSize: '11px', color: '#8899aa' }}>
            Latest from the fleet
          </div>
        </div>
        <a
          href="https://www.instagram.com/explore/tags/sandiegofishing/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '11px', fontWeight: 600, color: '#00d4ff', textDecoration: 'none' }}
        >
          See all
        </a>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            aspectRatio: '4/3',
            borderRadius: '10px',
            backgroundColor: '#1e2a42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px solid #8899aa33',
              borderTopColor: '#8899aa',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      {/* API-powered photo feed */}
      {!loading && posts.length > 0 && (
        <>
          {/* Hero photo */}
          <PhotoCard post={posts[0]} hero />

          {/* Grid of smaller photos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            {posts.slice(1, 7).map((post) => (
              <PhotoCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}

      {/* Iframe fallback when API is not configured */}
      {useFallback && (
        <>
          {!configured && (
            <div
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: '#f9731610',
                border: '1px solid #f9731630',
                fontSize: '10px',
                color: '#f97316',
                textAlign: 'center',
              }}
            >
              Set INSTAGRAM_ACCESS_TOKEN for live photos
            </div>
          )}

          <InstaEmbed
            shortcode={FALLBACK_POSTS[0]?.shortcode}
            landing={FALLBACK_POSTS[0]?.landing}
            hero
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            {FALLBACK_POSTS.slice(1, 7).map((post) => (
              <InstaEmbed
                key={post.shortcode}
                shortcode={post.shortcode}
                landing={post.landing}
              />
            ))}
          </div>
        </>
      )}

      {/* Follow the Fleet */}
      <div>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: '#8899aa',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
        }}>
          Follow the Fleet
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {LANDING_ACCOUNTS.map((acc) => (
            <AccountPill key={acc.handle} handle={acc.handle} name={acc.name} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
