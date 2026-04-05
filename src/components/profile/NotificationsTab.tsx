'use client';

import { useState } from 'react';

interface NotificationPrefs {
  bluefin_spotted: { email: boolean; sms: boolean };
  spots_opening: { email: boolean; sms: boolean };
  ideal_weather: { email: boolean; sms: boolean };
  new_reports: { email: boolean; sms: boolean };
}

interface NotificationsTabProps {
  phone: string | null;
  notificationPrefs: NotificationPrefs;
  onSave: (data: { phone: string | null; notificationPrefs: NotificationPrefs }) => Promise<void>;
}

const ALERT_TYPES: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'bluefin_spotted', label: 'Bluefin Tuna spotted' },
  { key: 'spots_opening', label: 'Spots opening on popular boats' },
  { key: 'ideal_weather', label: 'Weather conditions ideal for fishing' },
  { key: 'new_reports', label: 'New catch reports available' },
];

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative shrink-0"
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        backgroundColor: checked ? '#00d4ff' : '#1e2a42',
        transition: 'background-color 0.15s ease',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: checked ? '#0a0f1a' : '#8899aa',
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          transition: 'left 0.15s ease, background-color 0.15s ease',
        }}
      />
    </button>
  );
}

export default function NotificationsTab({ phone, notificationPrefs, onSave }: NotificationsTabProps) {
  const initialPhone = phone ? formatPhoneNumber(phone) : '';
  const [phoneValue, setPhoneValue] = useState(initialPhone);
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...notificationPrefs });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const digits = extractDigits(phoneValue);
  const isPhoneEmpty = digits.length === 0;
  const isPhoneSaved = phone !== null && phone.length > 0;

  function togglePref(key: keyof NotificationPrefs, channel: 'email' | 'sms') {
    setPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      },
    }));
  }

  async function handleSave() {
    setPhoneError('');
    setErrorMsg('');

    if (!isPhoneEmpty && digits.length !== 10) {
      setPhoneError('Please enter a valid 10-digit US phone number.');
      return;
    }

    setStatus('loading');

    try {
      await onSave({
        phone: isPhoneEmpty ? null : digits,
        notificationPrefs: prefs,
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrorMsg(message);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Phone Number section */}
      <section
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2
            style={{
              color: '#e2e8f0',
              fontSize: 15,
              fontWeight: 700,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Phone Number
          </h2>
          {isPhoneSaved && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 20,
                padding: '2px 8px',
              }}
            >
              Verified
            </span>
          )}
        </div>

        <p style={{ color: '#8899aa', fontSize: 13, margin: '0 0 16px' }}>
          Used for SMS alerts. US numbers only.
        </p>

        <div className="flex items-center gap-2">
          <span
            style={{
              color: '#8899aa',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: '#0a0f1a',
              border: '1px solid #1e2a42',
              borderRadius: 8,
              padding: '9px 12px',
              whiteSpace: 'nowrap',
            }}
          >
            +1
          </span>
          <input
            type="tel"
            placeholder="(555) 555-1234"
            value={phoneValue}
            onChange={(e) => {
              setPhoneValue(formatPhoneNumber(e.target.value));
              setPhoneError('');
              if (status === 'error') setStatus('idle');
            }}
            style={{
              flex: 1,
              padding: '9px 14px',
              fontSize: 15,
              backgroundColor: '#0a0f1a',
              border: `1px solid ${phoneError ? '#ff4466' : '#1e2a42'}`,
              borderRadius: 8,
              color: '#e2e8f0',
              outline: 'none',
            }}
          />
        </div>

        {phoneError && (
          <p style={{ color: '#ff4466', fontSize: 13, margin: '8px 0 0' }}>
            {phoneError}
          </p>
        )}
      </section>

      {/* Alert Preferences Grid */}
      <section
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2
          style={{
            color: '#e2e8f0',
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Alert Preferences
        </h2>

        {/* Column headers */}
        <div className="flex items-center gap-3 mb-3">
          <div style={{ flex: 1 }} />
          <div
            style={{
              width: 48,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#8899aa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Email
          </div>
          <div
            style={{
              width: 48,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#8899aa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            SMS
          </div>
        </div>

        {/* Alert rows */}
        <div className="flex flex-col" style={{ gap: 0 }}>
          {ALERT_TYPES.map((alert, index) => (
            <div
              key={alert.key}
              className="flex items-center gap-3"
              style={{
                padding: '12px 0',
                borderTop: index > 0 ? '1px solid #1e2a42' : 'none',
              }}
            >
              <span style={{ flex: 1, color: '#e2e8f0', fontSize: 14 }}>
                {alert.label}
              </span>
              <div style={{ width: 48, display: 'flex', justifyContent: 'center' }}>
                <Toggle
                  checked={prefs[alert.key].email}
                  onChange={() => togglePref(alert.key, 'email')}
                />
              </div>
              <div style={{ width: 48, display: 'flex', justifyContent: 'center' }}>
                <Toggle
                  checked={prefs[alert.key].sms}
                  onChange={() => togglePref(alert.key, 'sms')}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save button + feedback */}
      <div>
        <button
          onClick={handleSave}
          disabled={status === 'loading'}
          style={{
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#0a0f1a',
            backgroundColor: status === 'loading' ? '#0099b3' : '#00d4ff',
            border: 'none',
            borderRadius: 8,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
            transition: 'opacity 0.15s ease, background-color 0.15s ease',
          }}
        >
          {status === 'loading' ? 'Saving...' : 'Save Preferences'}
        </button>

        {status === 'success' && (
          <p style={{ color: '#22c55e', fontSize: 14, margin: '10px 0 0' }}>
            Preferences saved successfully.
          </p>
        )}

        {status === 'error' && errorMsg && (
          <p style={{ color: '#ff4466', fontSize: 14, margin: '10px 0 0' }}>
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
