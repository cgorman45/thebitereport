'use client';

import { useState } from 'react';

interface VerifyButtonProps {
  verified: boolean;
  count: number;
  onToggle: () => void;
  loading?: boolean;
}

export default function VerifyButton({ verified, count, onToggle, loading = false }: VerifyButtonProps) {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    if (loading) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    onToggle();
  };

  return (
    <>
      <style>{`
        @keyframes verify-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: verified ? '#22c55e22' : 'transparent',
          border: `1px solid ${verified ? '#22c55e' : '#3a4a6a'}`,
          borderRadius: 6,
          padding: '4px 10px',
          cursor: loading ? 'not-allowed' : 'pointer',
          color: verified ? '#22c55e' : '#8899aa',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          transition: 'all 0.15s',
          opacity: loading ? 0.6 : 1,
        }}
        title={verified ? 'Remove verification' : 'Verify this sighting'}
      >
        <span
          style={{
            display: 'inline-block',
            animation: pressed ? 'verify-pop 0.2s ease-out' : 'none',
          }}
        >
          {verified ? (
            // Filled checkmark
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            // Outline thumbs up
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          )}
        </span>
        <span>{count}</span>
      </button>
    </>
  );
}
