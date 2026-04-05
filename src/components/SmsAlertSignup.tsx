'use client';

import { useState } from 'react';

interface AlertPreference {
  id: string;
  label: string;
}

const ALERT_PREFERENCES: AlertPreference[] = [
  { id: 'bluefin_spotted', label: 'Bluefin Tuna spotted' },
  { id: 'spots_opening', label: 'Spots opening on popular boats' },
  { id: 'ideal_weather', label: 'Weather conditions ideal for fishing' },
  { id: 'new_reports', label: 'New catch reports available' },
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

export default function SmsAlertSignup() {
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const digits = extractDigits(phone);
  const isValidPhone = digits.length === 10;

  function togglePreference(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit US phone number.');
      setStatus('error');
      return;
    }

    if (selected.size === 0) {
      setErrorMsg('Please select at least one alert preference.');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          preferences: Array.from(selected),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 212, 255, 0.12)',
            border: '2px solid #00d4ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#00d4ff" />
          </svg>
        </div>
        <h3
          style={{
            color: '#e2e8f0',
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 8px',
          }}
        >
          You&apos;re all set!
        </h3>
        <p style={{ color: '#8899aa', fontSize: 14, margin: 0 }}>
          Watch for texts from The Bite Report
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderRadius: 12,
        padding: 32,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
              fill="#00d4ff"
            />
            <path d="M7 9h10v2H7V9zm0-3h10v2H7V6z" fill="#00d4ff" />
          </svg>
          <h3
            style={{
              color: '#e2e8f0',
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Text <span style={{ color: '#00d4ff' }}>Alerts</span>
          </h3>
        </div>
        <p style={{ color: '#8899aa', fontSize: 14, margin: 0 }}>
          Get real-time fishing updates sent straight to your phone.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Phone number input */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="sms-phone"
            style={{
              display: 'block',
              color: '#8899aa',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Phone Number
          </label>
          <input
            id="sms-phone"
            type="tel"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhoneNumber(e.target.value));
              if (status === 'error') setStatus('idle');
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 15,
              backgroundColor: '#0a0f1a',
              border: `1px solid ${status === 'error' && !isValidPhone && digits.length > 0 ? '#ff4466' : '#1e2a42'}`,
              borderRadius: 8,
              color: '#e2e8f0',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Alert preferences */}
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              color: '#8899aa',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
              marginTop: 0,
            }}
          >
            Alert Preferences
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ALERT_PREFERENCES.map((pref) => {
              const isChecked = selected.has(pref.id);
              return (
                <label
                  key={pref.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: isChecked ? 'rgba(0, 212, 255, 0.06)' : 'transparent',
                    border: `1px solid ${isChecked ? 'rgba(0, 212, 255, 0.25)' : '#1e2a42'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${isChecked ? '#00d4ff' : '#3a4a5e'}`,
                      backgroundColor: isChecked ? '#00d4ff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isChecked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#0a0f1a" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => togglePreference(pref.id)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ color: '#e2e8f0', fontSize: 14 }}>{pref.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {status === 'error' && errorMsg && (
          <p
            style={{
              color: '#ff4466',
              fontSize: 13,
              margin: '0 0 16px',
            }}
          >
            {errorMsg}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            width: '100%',
            padding: '12px 20px',
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
            transition: 'opacity 0.15s ease',
          }}
        >
          {status === 'loading' ? 'Subscribing...' : 'Get Alerts'}
        </button>

        <p
          style={{
            color: '#556677',
            fontSize: 11,
            textAlign: 'center',
            margin: '12px 0 0',
          }}
        >
          Standard message rates apply. Text STOP to unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}
