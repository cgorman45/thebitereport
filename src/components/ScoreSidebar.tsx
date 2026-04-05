'use client';

import FishingScore from '@/components/FishingScore';
import {
  SPECIES_COLORS,
  DEFAULT_SPECIES_COLOR,
  MOON_SYMBOLS,
  PRO_TIPS,
} from '@/lib/constants';
import { formatHourFull } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoreSidebarProps {
  score: number | null;
  label: string | null;
  location: string;
  bestHour: number | null;
  waterTemp: number | null;
  tideStatus: string;
  moonPhase: string;
  windCondition: string;
  bestSpecies: string[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#8899aa',
        margin: '0 0 10px 0',
      }}
    >
      {children}
    </p>
  );
}

function Skeleton({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: '8px',
        backgroundColor: '#1e2a42',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

// Condition mini-card (1 of 4 in the 2x2 grid)
function ConditionCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        backgroundColor: '#0a0f1a',
        border: '1px solid #1e2a42',
        borderRadius: '8px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {icon}
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>
        {value || '—'}
      </span>
    </div>
  );
}

// SVG icons (inline, no external deps)
function WindIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  );
}

function TempIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

function TideIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2" />
      <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2" />
      <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Desktop layout (vertical stack)
// ---------------------------------------------------------------------------

function DesktopSidebar({
  score,
  label,
  location,
  bestHour,
  waterTemp,
  tideStatus,
  moonPhase,
  windCondition,
  bestSpecies,
}: ScoreSidebarProps) {
  const dayIndex = new Date().getDay();
  const tip = PRO_TIPS[dayIndex] ?? PRO_TIPS[0];
  const moonSymbol = MOON_SYMBOLS[moonPhase] ?? '🌙';

  const displaySpecies =
    bestSpecies && bestSpecies.length > 0 ? bestSpecies.slice(0, 6) : [
      'Yellowtail', 'Bluefin Tuna', 'Calico Bass', 'Rockfish', 'White Seabass', 'Barracuda',
    ];

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'sticky',
        top: '80px',
      }}
    >
      {/* 1. Score circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        {score !== null && label !== null ? (
          <FishingScore score={score} label={label} size="sm" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Skeleton width="100px" height="100px" />
            <Skeleton width="64px" height="14px" />
          </div>
        )}
      </div>

      {/* 2. Location */}
      {location && (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#8899aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </span>
          {bestHour !== null && (
            <span style={{ fontSize: '11px', color: '#8899aa', display: 'block', marginTop: '3px' }}>
              Best hour: <strong style={{ color: '#00d4ff' }}>{formatHourFull(bestHour)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#1e2a42' }} />

      {/* 3. Quick conditions — 2x2 grid */}
      <div>
        <SectionLabel>Conditions</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <ConditionCard icon={<WindIcon />}  label="Wind"  value={windCondition} />
          <ConditionCard icon={<TempIcon />}  label="Water" value={waterTemp !== null ? `${Math.round(waterTemp)}°F` : '—'} />
          <ConditionCard icon={<TideIcon />}  label="Tide"  value={tideStatus} />
          <ConditionCard icon={<MoonIcon />}  label="Moon"  value={`${moonSymbol} ${moonPhase}`} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#1e2a42' }} />

      {/* 4. What's Biting */}
      <div>
        <SectionLabel>What&apos;s Biting</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {displaySpecies.map((sp) => {
            const c = SPECIES_COLORS[sp] ?? DEFAULT_SPECIES_COLOR;
            return (
              <span
                key={sp}
                style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: c.bg,
                  color: c.text,
                  whiteSpace: 'nowrap',
                }}
              >
                {sp}
              </span>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#1e2a42' }} />

      {/* 5. Pro Tip */}
      <div
        style={{
          borderLeft: '3px solid #00d4ff',
          paddingLeft: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <LightbulbIcon />
          <SectionLabel>Pro Tip</SectionLabel>
        </div>
        <p
          style={{
            fontSize: '12px',
            fontStyle: 'italic',
            color: '#e2e8f0',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {tip}
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile layout (horizontal strip)
// ---------------------------------------------------------------------------

function MobileStrip({
  score,
  label,
  location,
  waterTemp,
  tideStatus,
  moonPhase,
  windCondition,
  bestSpecies,
}: ScoreSidebarProps) {
  const moonSymbol = MOON_SYMBOLS[moonPhase] ?? '🌙';
  const displaySpecies =
    bestSpecies && bestSpecies.length > 0 ? bestSpecies.slice(0, 4) : [
      'Yellowtail', 'Bluefin Tuna', 'Calico Bass', 'Rockfish',
    ];

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top row: score + conditions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Score */}
        <div style={{ flexShrink: 0 }}>
          {score !== null && label !== null ? (
            <FishingScore score={score} label={label} size="sm" />
          ) : (
            <Skeleton width="80px" height="80px" />
          )}
        </div>

        {/* Conditions row */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {location && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8899aa' }}>
              {location}
            </span>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {windCondition && (
              <span style={{ fontSize: '11px', color: '#8899aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <WindIcon /> {windCondition}
              </span>
            )}
            {waterTemp !== null && (
              <span style={{ fontSize: '11px', color: '#8899aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TempIcon /> {Math.round(waterTemp)}°F
              </span>
            )}
            {tideStatus && (
              <span style={{ fontSize: '11px', color: '#8899aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TideIcon /> {tideStatus}
              </span>
            )}
            {moonPhase && (
              <span style={{ fontSize: '11px', color: '#8899aa' }}>
                {moonSymbol} {moonPhase}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Species tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {displaySpecies.map((sp) => {
          const c = SPECIES_COLORS[sp] ?? DEFAULT_SPECIES_COLOR;
          return (
            <span
              key={sp}
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: c.bg,
                color: c.text,
              }}
            >
              {sp}
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — switches layout at md breakpoint via CSS class
// ---------------------------------------------------------------------------

export default function ScoreSidebar(props: ScoreSidebarProps) {
  return (
    <>
      {/* Desktop: md and up */}
      <div className="hidden md:block">
        <DesktopSidebar {...props} />
      </div>

      {/* Mobile: below md */}
      <div className="block md:hidden">
        <MobileStrip {...props} />
      </div>
    </>
  );
}
