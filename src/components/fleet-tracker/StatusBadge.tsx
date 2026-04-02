'use client';

import type { BoatStatus } from '@/lib/fleet/types';

interface StatusBadgeProps {
  status: BoatStatus;
  label: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<BoatStatus, { color: string; bg: string; border: string }> = {
  catching_fish: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
  },
  circling: {
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
  },
  transit: {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  drifting: {
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.35)',
  },
  in_port: {
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.12)',
    border: 'rgba(107,114,128,0.35)',
  },
  unknown: {
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.12)',
    border: 'rgba(107,114,128,0.35)',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
};

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <>
      {status === 'catching_fish' && (
        <style>{`
          @keyframes biteGlow {
            0%, 100% { box-shadow: 0 0 4px 1px rgba(34,197,94,0.4); }
            50%       { box-shadow: 0 0 10px 3px rgba(34,197,94,0.75); }
          }
          .status-badge-catching {
            animation: biteGlow 2s ease-in-out infinite;
          }
        `}</style>
      )}
      {status === 'circling' && (
        <style>{`
          @keyframes circleBorder {
            0%, 100% { border-color: rgba(249,115,22,0.35); }
            50%       { border-color: rgba(249,115,22,0.85); }
          }
          .status-badge-circling {
            animation: circleBorder 1.6s ease-in-out infinite;
          }
        `}</style>
      )}
      <span
        className={[
          'inline-flex items-center font-semibold rounded-full border leading-none',
          sizeClass,
          status === 'catching_fish' ? 'status-badge-catching' : '',
          status === 'circling' ? 'status-badge-circling' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          color: config.color,
          backgroundColor: config.bg,
          borderColor: config.border,
        }}
      >
        {label}
      </span>
    </>
  );
}
