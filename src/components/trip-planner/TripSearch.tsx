'use client';

interface TripSearchProps {
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  selectedDuration: string | null;
  onDurationChange: (dur: string | null) => void;
  anglers: number;
  onAnglersChange: (n: number) => void;
}

const DURATION_OPTIONS = [
  { label: 'Any Duration', value: null },
  { label: 'Half Day',          value: 'Half Day' },
  { label: '3/4 Day',           value: '3/4 Day' },
  { label: 'Full Day',          value: 'Full Day' },
  { label: 'Overnight',         value: 'Overnight' },
  { label: 'Multi-Day (2-3 Day)', value: 'Multi-Day (2-3 Day)' },
  { label: 'Long Range',        value: 'Long Range' },
] as const;

/** Build the next 7 days starting from today (2026-04-02). */
function buildDatePills(): { iso: string; dayAbbr: string; dateNum: string }[] {
  const today = new Date('2026-04-02T12:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Thu"
    const dateNum = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Apr 3"
    return { iso, dayAbbr, dateNum };
  });
}

const DATE_PILLS = buildDatePills();

export default function TripSearch({
  selectedDate,
  onDateChange,
  selectedDuration,
  onDurationChange,
  anglers,
  onAnglersChange,
}: TripSearchProps) {
  function handleDateClick(iso: string) {
    // Clicking the already-selected date deselects it
    onDateChange(selectedDate === iso ? null : iso);
  }

  function handleAnglersMinus() {
    if (anglers > 1) onAnglersChange(anglers - 1);
  }

  function handleAnglersPlus() {
    if (anglers < 20) onAnglersChange(anglers + 1);
  }

  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        padding: '20px 24px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Responsive grid: 2x2 on mobile, single row on desktop */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
      >
        {/* ── 1. Date Picker ── */}
        <div
          className="col-span-2 md:col-span-1 flex flex-col gap-2"
          style={{ minWidth: 0 }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#8899aa' }}
          >
            Date
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DATE_PILLS.map(({ iso, dayAbbr, dateNum }) => {
              const isSelected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  onClick={() => handleDateClick(iso)}
                  className="flex flex-col items-center rounded-lg px-2.5 py-1.5 text-center transition-all duration-150 hover:brightness-110 active:scale-95"
                  style={
                    isSelected
                      ? {
                          backgroundColor: 'rgba(0, 212, 255, 0.15)',
                          border: '1px solid #00d4ff',
                          color: '#00d4ff',
                        }
                      : {
                          backgroundColor: 'rgba(30, 42, 66, 0.6)',
                          border: '1px solid #1e2a42',
                          color: '#8899aa',
                        }
                  }
                >
                  <span className="text-xs font-bold leading-none">{dayAbbr}</span>
                  <span className="text-xs leading-none mt-0.5" style={{ fontSize: '10px' }}>
                    {dateNum}
                  </span>
                </button>
              );
            })}
            {/* "Any Date" pill — shown highlighted when nothing is selected */}
            {selectedDate === null && (
              <span
                className="flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: 'rgba(0, 212, 255, 0.08)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  color: '#00d4ff',
                }}
              >
                Any Date
              </span>
            )}
          </div>
        </div>

        {/* ── 2. Duration Dropdown ── */}
        <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#8899aa' }}
          >
            Duration
          </span>
          <div className="relative">
            <select
              value={selectedDuration ?? ''}
              onChange={e => onDurationChange(e.target.value === '' ? null : e.target.value)}
              className="w-full appearance-none rounded-lg px-3 py-2 text-sm font-medium pr-8 cursor-pointer focus:outline-none transition-colors duration-150"
              style={{
                backgroundColor: 'rgba(30, 42, 66, 0.6)',
                border: `1px solid ${selectedDuration ? '#00d4ff' : '#1e2a42'}`,
                color: selectedDuration ? '#e2e8f0' : '#8899aa',
              }}
            >
              {DURATION_OPTIONS.map(opt => (
                <option
                  key={opt.label}
                  value={opt.value ?? ''}
                  style={{ backgroundColor: '#131b2e', color: '#e2e8f0' }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Custom caret */}
            <div
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: '#8899aa' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── 3. Anglers Stepper ── */}
        <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#8899aa' }}
          >
            Anglers
          </span>
          <div
            className="inline-flex items-center rounded-lg overflow-hidden self-start"
            style={{
              border: '1px solid #1e2a42',
              backgroundColor: 'rgba(30, 42, 66, 0.6)',
            }}
          >
            <button
              onClick={handleAnglersMinus}
              disabled={anglers <= 1}
              className="flex items-center justify-center transition-all duration-150 hover:brightness-125 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                width: '32px',
                height: '36px',
                color: '#00d4ff',
                borderRight: '1px solid #1e2a42',
                background: 'transparent',
              }}
              aria-label="Decrease anglers"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <span
              className="text-sm font-bold tabular-nums select-none"
              style={{
                minWidth: '36px',
                textAlign: 'center',
                color: '#e2e8f0',
                padding: '0 6px',
              }}
            >
              {anglers}
            </span>

            <button
              onClick={handleAnglersPlus}
              disabled={anglers >= 20}
              className="flex items-center justify-center transition-all duration-150 hover:brightness-125 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                width: '32px',
                height: '36px',
                color: '#00d4ff',
                borderLeft: '1px solid #1e2a42',
                background: 'transparent',
              }}
              aria-label="Increase anglers"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
