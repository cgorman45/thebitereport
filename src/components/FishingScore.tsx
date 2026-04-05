'use client';

import { useEffect, useState } from 'react';
import { getScoreColor } from '@/lib/utils';

interface FishingScoreProps {
  score: number;
  label: string;
  size?: 'lg' | 'sm';
}

export default function FishingScore({ score, label, size = 'lg' }: FishingScoreProps) {
  const [animated, setAnimated] = useState(false);

  const isLg = size === 'lg';
  const diameter = isLg ? 200 : 100;
  const strokeWidth = isLg ? 10 : 6;
  const radius = (diameter - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = diameter / 2;

  const clampedScore = Math.max(0, Math.min(10, score));
  const fillFraction = animated ? clampedScore / 10 : 0;
  const strokeDashoffset = circumference * (1 - fillFraction);

  const color = getScoreColor(clampedScore);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1e2a42"
            strokeWidth={strokeWidth}
          />
          {/* Score ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 ${isLg ? 8 : 4}px ${color}80)`,
            }}
          />
        </svg>

        {/* Score number centered in ring */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color }}
        >
          <span
            className={`font-black leading-none tabular-nums ${isLg ? 'text-5xl' : 'text-2xl'}`}
          >
            {clampedScore % 1 === 0 ? clampedScore.toFixed(0) : clampedScore.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Label below */}
      <span
        className={`font-semibold uppercase tracking-widest ${isLg ? 'text-base' : 'text-xs'}`}
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
