'use client';

import { useState } from 'react';
import { useOptionalAuth } from '@/components/auth/AuthProvider';

interface ReportFishButtonProps {
  onReport: () => void;
}

export default function ReportFishButton({ onReport }: ReportFishButtonProps) {
  const auth = useOptionalAuth();
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (!auth?.user) {
      auth?.openAuthModal();
    } else {
      onReport();
    }
  };

  return (
    <>
      <style>{`
        @keyframes fish-glow {
          0%, 100% { box-shadow: 0 0 8px #f9731644; }
          50% { box-shadow: 0 0 18px #f9731688; }
        }
      `}</style>
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(13,19,32,0.92)',
          border: `1px solid ${hovered ? '#f97316' : '#1e2a42'}`,
          borderRadius: 10,
          padding: '10px 14px',
          cursor: 'pointer',
          color: '#f97316',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: hovered ? '0 0 18px #f9731666' : '0 0 8px #f9731622',
          whiteSpace: 'nowrap',
        }}
        title="Report fish activity"
      >
        {/* Fish icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 12C6.5 12 3 9 2 5c3 0 5.5 2 7.5 4" fill="#f9731633" />
          <path d="M6.5 12C6.5 12 3 15 2 19c3 0 5.5-2 7.5-4" fill="#f9731633" />
          <path d="M6.5 12h9" />
          <circle cx="18" cy="12" r="3" fill="#f9731644" />
          <circle cx="16.5" cy="10.5" r="0.75" fill="#f97316" />
        </svg>
        Report Fish
      </button>
    </>
  );
}
