'use client';

interface CurrentConditionsProps {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  waterTemp: number | null;
  tideStatus: string;
  moonPhase: number;
  pressure: number;
}

/** Convert degrees to 16-point compass label */
function degreesToCompass(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round(((deg % 360) + 360) / 22.5) % 16;
  return directions[idx];
}

/** Convert 0–1 moon phase fraction to a human name */
function moonPhaseName(phase: number): string {
  // phase: 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  if (phase < 0.0625 || phase >= 0.9375) return 'New Moon';
  if (phase < 0.1875) return 'Waxing Crescent';
  if (phase < 0.3125) return 'First Quarter';
  if (phase < 0.4375) return 'Waxing Gibbous';
  if (phase < 0.5625) return 'Full Moon';
  if (phase < 0.6875) return 'Waning Gibbous';
  if (phase < 0.8125) return 'Last Quarter';
  return 'Waning Crescent';
}

/** Convert hPa to inHg */
function hPaToInHg(hpa: number): string {
  return (hpa * 0.02953).toFixed(2);
}

interface ConditionCardProps {
  label: string;
  value: string;
  sub?: string;
}

function ConditionCard({ label, value, sub }: ConditionCardProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl px-4 py-3 min-w-[110px] flex-1"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#8899aa' }}
      >
        {label}
      </span>
      <span
        className="text-lg font-bold leading-tight tabular-nums"
        style={{ color: '#e2e8f0' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: '#8899aa' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

export default function CurrentConditions({
  temperature,
  windSpeed,
  windDirection,
  waterTemp,
  tideStatus,
  moonPhase,
  pressure,
}: CurrentConditionsProps) {
  const compassDir = degreesToCompass(windDirection);
  const phaseName = moonPhaseName(moonPhase);
  const illuminationPct = Math.round(
    (1 - Math.abs(moonPhase * 2 - 1)) * 100
  );

  return (
    <div className="w-full">
      <h3
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: '#8899aa' }}
      >
        Current Conditions
      </h3>
      <div className="flex flex-wrap gap-3">
        <ConditionCard
          label="Air Temp"
          value={`${Math.round(temperature)}°F`}
        />
        <ConditionCard
          label="Wind"
          value={`${Math.round(windSpeed)} mph`}
          sub={compassDir}
        />
        {waterTemp !== null && (
          <ConditionCard
            label="Water Temp"
            value={`${Math.round(waterTemp)}°F`}
          />
        )}
        <ConditionCard
          label="Tide"
          value={tideStatus}
        />
        <ConditionCard
          label="Moon"
          value={phaseName}
          sub={`${illuminationPct}% illuminated`}
        />
        <ConditionCard
          label="Barometric"
          value={`${hPaToInHg(pressure)} inHg`}
          sub={`${Math.round(pressure)} hPa`}
        />
      </div>
    </div>
  );
}
