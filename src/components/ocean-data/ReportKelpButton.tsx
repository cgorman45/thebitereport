'use client';

import { useState } from 'react';
import { useOptionalAuth } from '@/components/auth/AuthProvider';

interface ReportKelpButtonProps {
  onReport: () => void;
}

export default function ReportKelpButton({ onReport }: ReportKelpButtonProps) {
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
        @keyframes kelp-glow {
          0%, 100% { box-shadow: 0 0 8px #22c55e44; }
          50% { box-shadow: 0 0 18px #22c55e88; }
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
          border: `1px solid ${hovered ? '#22c55e' : '#1e2a42'}`,
          borderRadius: 10,
          padding: '10px 14px',
          cursor: 'pointer',
          color: '#22c55e',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: hovered ? '0 0 18px #22c55e66' : '0 0 8px #22c55e22',
          animation: hovered ? 'none' : undefined,
          whiteSpace: 'nowrap',
        }}
        title="Report a kelp paddy sighting"
      >
        {/* Kelp/seaweed icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12" />
          <path d="M12 12C12 12 8 10 7 6c2 0 4 2 5 6z" fill="#22c55e44" />
          <path d="M12 12C12 12 16 10 17 6c-2 0-4 2-5 6z" fill="#22c55e44" />
          <path d="M12 17C12 17 9 15.5 8 12c1.5 0 3 1.5 4 5z" fill="#22c55e33" />
          <path d="M12 17C12 17 15 15.5 16 12c-1.5 0-3 1.5-4 5z" fill="#22c55e33" />
        </svg>
        Report Kelp
      </button>
    </>
  );
}
