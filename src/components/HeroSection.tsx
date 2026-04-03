'use client';

export default function HeroSection() {
  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: '340px' }}>
      {/* Ocean photo background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
        }}
      />

      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,15,26,0.75) 0%, rgba(10,15,26,0.6) 40%, rgba(10,15,26,0.85) 80%, #0a0f1a 100%)',
        }}
      />

      {/* Subtle cyan glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 120%, rgba(0,212,255,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-14 sm:py-16"
        style={{ minHeight: '280px' }}
      >
        {/* Eye-catching tag line above headline */}
        <div
          className="mb-4 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            color: '#00d4ff',
          }}
        >
          SoCal Sportfishing
        </div>

        {/* Main headline */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight mb-4 max-w-3xl"
          style={{ color: '#ffffff' }}
        >
          Make Memories.{' '}
          <span style={{ color: '#00d4ff' }}>Have Fun.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-sm sm:text-base max-w-xl leading-relaxed mb-8"
          style={{ color: '#8899aa' }}
        >
          Real-time scores, live fleet tracking, and AI-powered trip planning for Southern California anglers
        </p>

        {/* Stat badges */}
        <div className="flex flex-wrap justify-center gap-3">
          {/* Badge 1 — Locations */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e2a42',
              color: '#e2e8f0',
            }}
          >
            {/* Map pin SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>42+ Locations</span>
          </div>

          {/* Badge 2 — Data Factors */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e2a42',
              color: '#e2e8f0',
            }}
          >
            {/* Bar chart SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>9 Data Factors</span>
          </div>

          {/* Badge 3 — Fleet Tracking */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e2a42',
              color: '#e2e8f0',
            }}
          >
            {/* Boat SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 20a4 4 0 0 0 4 0 4 4 0 0 0 4 0 4 4 0 0 0 4 0 4 4 0 0 0 4 0" />
              <path d="M4 14 3 8l9-4 9 4-1 6" />
              <path d="M12 4v6" />
            </svg>
            <span>Live Fleet Tracking</span>
          </div>
        </div>
      </div>

      {/* Animated wave SVG divider at the bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ height: '48px' }}>
        <svg
          className="relative block w-full"
          style={{ height: '48px', animation: 'heroWave 8s ease-in-out infinite' }}
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M0,24 C120,40 240,8 360,24 C480,40 600,8 720,24 C840,40 960,8 1080,24 C1200,40 1320,8 1440,24 L1440,48 L0,48 Z"
            fill="#0a0f1a"
          />
        </svg>
        {/* Second wave layer slightly offset for depth */}
        <svg
          className="absolute top-0 left-0 w-full opacity-40"
          style={{ height: '48px', animation: 'heroWave 6s ease-in-out infinite reverse' }}
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M0,32 C180,16 360,40 540,28 C720,16 900,40 1080,28 C1260,16 1360,36 1440,30 L1440,48 L0,48 Z"
            fill="#0a1628"
          />
        </svg>
      </div>

      {/* Keyframes injected via a style tag */}
      <style>{`
        @keyframes heroWave {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(-30px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
