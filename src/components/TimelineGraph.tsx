'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
  Dot,
} from 'recharts';
import type { HourlyScore, FishingEvent, FactorScore } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineGraphProps {
  hourlyScores: HourlyScore[];
  events: FishingEvent[];
  onTripWindowSelect?: (startHour: number, endHour: number) => void;
}

interface DragState {
  isDragging: boolean;
  startHour: number | null;
  currentHour: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { getScoreColor, formatHour } from '@/lib/utils';

function getEventColor(type: string): string {
  if (type === 'tide_high' || type === 'tide_low') return '#4fc3f7';
  if (type === 'sunrise' || type === 'sunset') return '#ffa726';
  if (type === 'moonrise' || type === 'moonset') return '#b0bec5';
  if (type === 'pressure_drop') return '#ef5350';
  return '#8899aa';
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  value: number;
  dataKey: string;
  payload: HourlyScore & { overall: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as HourlyScore | undefined;
  if (!data) return null;

  const overall = data.overall ?? 0;
  const scoreColor = getScoreColor(overall);

  // Top 3 contributing factors by score descending
  const topFactors: FactorScore[] = data.factors
    ? [...data.factors].sort((a, b) => b.score - a.score).slice(0, 3)
    : [];

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        minWidth: 200,
      }}
    >
      {/* Hour header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold" style={{ color: '#e2e8f0' }}>
          {label !== undefined ? formatHour(label as number) : ''}
        </span>
        <span
          className="text-lg font-black tabular-nums"
          style={{ color: scoreColor }}
        >
          {overall % 1 === 0 ? overall.toFixed(0) : overall.toFixed(1)}
        </span>
      </div>

      {/* Factor bars */}
      {topFactors.length > 0 && (
        <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid #1e2a42' }}>
          {topFactors.map((f) => {
            const fc = getScoreColor(f.score);
            const pct = Math.max(0, Math.min(100, (f.score / 10) * 100));
            return (
              <div key={f.name} className="flex items-center gap-2">
                <span className="w-24 truncate text-xs" style={{ color: '#8899aa' }}>
                  {f.label || f.name}
                </span>
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: 4, backgroundColor: '#1e2a42' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: fc }}
                  />
                </div>
                <span className="w-5 text-right text-xs font-bold tabular-nums" style={{ color: fc }}>
                  {f.score % 1 === 0 ? f.score.toFixed(0) : f.score.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event label rendered as a Recharts label via the `label` prop
// ---------------------------------------------------------------------------

interface EventLabelProps {
  viewBox?: { x?: number; y?: number };
  color: string;
  text: string;
  index: number;
}

function shortenLabel(text: string): string {
  return text
    .replace('Rapid pressure drop', 'P. Drop')
    .replace('High tide', 'Hi')
    .replace('Low tide', 'Lo')
    .replace(/\s+\d+\.\d+ft/, '');
}

function EventLabel({ viewBox, color, text, index }: EventLabelProps) {
  const x = (viewBox?.x ?? 0) + 2;
  // Stagger labels vertically so nearby events don't overlap
  const yOffset = 10 + (index % 3) * 12;
  const y = (viewBox?.y ?? 0) + yOffset;
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={8}
      fontWeight={600}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {shortenLabel(text)}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Peak glow dot rendered on high-score hours
// ---------------------------------------------------------------------------

interface GlowDotProps {
  cx?: number;
  cy?: number;
  payload?: HourlyScore;
}

function GlowDot({ cx, cy, payload }: GlowDotProps) {
  if (!payload || payload.overall < 8) return null;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill="#00d4ff"
      stroke="#00d4ff"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 0 6px #00d4ff)' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TimelineGraph({
  hourlyScores,
  events,
  onTripWindowSelect,
}: TimelineGraphProps) {
  const [drag, setDrag] = useState<DragState>({
    isDragging: false,
    startHour: null,
    currentHour: null,
  });
  const [selectedWindow, setSelectedWindow] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  // Build chart data: one point per hour 0-23
  const data: (HourlyScore & { hour: number })[] = Array.from({ length: 24 }, (_, h) => {
    const found = hourlyScores.find((s) => s.hour === h);
    return found ?? { hour: h, overall: 0, factors: [], events: [] };
  });

  // ---------------------------------------------------------------------------
  // Drag interaction helpers
  // ---------------------------------------------------------------------------

  // Map a clientX to the nearest chart hour using the chart's bounding rect.
  // We approximate by normalising over the chart plot area (roughly 60px left
  // margin, 20px right margin — Recharts defaults).
  const clientXToHour = useCallback((clientX: number): number => {
    const el = chartRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const leftMargin = 50; // approx YAxis width
    const rightMargin = 20;
    const plotWidth = rect.width - leftMargin - rightMargin;
    const relX = clientX - rect.left - leftMargin;
    const fraction = Math.max(0, Math.min(1, relX / plotWidth));
    return Math.round(fraction * 23);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const hour = clientXToHour(e.clientX);
      setDrag({ isDragging: true, startHour: hour, currentHour: hour });
      setSelectedWindow(null);
    },
    [clientXToHour]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!drag.isDragging) return;
      const hour = clientXToHour(e.clientX);
      setDrag((prev) => ({ ...prev, currentHour: hour }));
    },
    [drag.isDragging, clientXToHour]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!drag.isDragging || drag.startHour === null) return;
      const endHour = clientXToHour(e.clientX);
      const start = Math.min(drag.startHour, endHour);
      const end = Math.max(drag.startHour, endHour);

      if (start !== end) {
        setSelectedWindow({ start, end });
        onTripWindowSelect?.(start, end);
      }

      setDrag({ isDragging: false, startHour: null, currentHour: null });
    },
    [drag, clientXToHour, onTripWindowSelect]
  );

  const handleMouseLeave = useCallback(() => {
    if (drag.isDragging) {
      setDrag({ isDragging: false, startHour: null, currentHour: null });
    }
  }, [drag.isDragging]);

  // Drag preview window extents
  const dragStart =
    drag.isDragging && drag.startHour !== null && drag.currentHour !== null
      ? Math.min(drag.startHour, drag.currentHour)
      : null;
  const dragEnd =
    drag.isDragging && drag.startHour !== null && drag.currentHour !== null
      ? Math.max(drag.startHour, drag.currentHour)
      : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="rounded-2xl p-4 md:p-6"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#8899aa' }}
        >
          24-Hour Fishing Timeline
        </h3>
        <span className="text-xs" style={{ color: '#8899aa' }}>
          Click &amp; drag to plan a trip window
        </span>
      </div>

      {/* Chart wrapper — mouse handlers live here */}
      <div
        ref={chartRef}
        className="w-full select-none"
        style={{ height: 260, cursor: drag.isDragging ? 'col-resize' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 20, bottom: 0, left: 0 }}
          >
            <defs>
              {/* Cyan area gradient */}
              <linearGradient id="tlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e2a42"
              vertical={false}
            />

            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 23]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tickFormatter={formatHour}
              tick={{ fill: '#8899aa', fontSize: 11 }}
              axisLine={{ stroke: '#1e2a42' }}
              tickLine={false}
            />

            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: '#8899aa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#1e2a42', strokeWidth: 1 }}
            />

            {/* Main score area */}
            <Area
              type="monotone"
              dataKey="overall"
              stroke="#00d4ff"
              strokeWidth={2}
              fill="url(#tlGradient)"
              dot={<GlowDot />}
              activeDot={{
                r: 5,
                fill: '#00d4ff',
                stroke: '#00d4ff',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 6px #00d4ff)' },
              }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Event reference lines */}
            {events.map((ev, i) => {
              const color = getEventColor(ev.type);
              return (
                <ReferenceLine
                  key={`ev-${i}`}
                  x={ev.hour}
                  stroke={color}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.8}
                  label={(props: { viewBox?: { x?: number; y?: number } }) => (
                    <EventLabel viewBox={props.viewBox} color={color} text={ev.label} index={i} />
                  )}
                />
              );
            })}

            {/* Live drag preview */}
            {drag.isDragging && dragStart !== null && dragEnd !== null && dragStart !== dragEnd && (
              <ReferenceArea
                x1={dragStart}
                x2={dragEnd}
                fill="#00d4ff"
                fillOpacity={0.12}
                stroke="#00d4ff"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            )}

            {/* Committed selection */}
            {!drag.isDragging && selectedWindow && (
              <ReferenceArea
                x1={selectedWindow.start}
                x2={selectedWindow.end}
                fill="#00d4ff"
                fillOpacity={0.1}
                stroke="#00d4ff"
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeDasharray="5 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          { label: 'Tide', color: '#4fc3f7' },
          { label: 'Sun', color: '#ffa726' },
          { label: 'Moon', color: '#b0bec5' },
          { label: 'Pressure', color: '#ef5350' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-5 border-t-2 border-dashed"
              style={{ borderColor: color }}
            />
            <span className="text-xs" style={{ color: '#8899aa' }}>
              {label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: '#00d4ff', boxShadow: '0 0 4px #00d4ff' }}
          />
          <span className="text-xs" style={{ color: '#8899aa' }}>
            Peak hour (8+)
          </span>
        </div>
      </div>
    </div>
  );
}
