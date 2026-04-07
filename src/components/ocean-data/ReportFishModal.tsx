'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface ReportFishModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: (report: { id: string }) => void;
}

const SPECIES_LIST = [
  'Yellowtail',
  'Bluefin Tuna',
  'Yellowfin Tuna',
  'Calico Bass',
  'White Seabass',
  'Barracuda',
  'Dorado',
  'Bonito',
  'Rockfish',
  'Halibut',
  'Sheephead',
  'Other',
];

const SPECIES_COLORS: Record<string, string> = {
  'Yellowtail': '#eab308',
  'Bluefin Tuna': '#3b82f6',
  'Yellowfin Tuna': '#f59e0b',
  'Calico Bass': '#22c55e',
  'White Seabass': '#e2e8f0',
  'Barracuda': '#8b5cf6',
  'Dorado': '#22d3ee',
  'Bonito': '#06b6d4',
  'Rockfish': '#ef4444',
  'Halibut': '#84cc16',
  'Sheephead': '#f97316',
  'Other': '#8899aa',
};

const QUANTITY_OPTIONS = [
  { value: 'few', label: 'Few', sublabel: '1–5' },
  { value: 'some', label: 'Some', sublabel: '5–15' },
  { value: 'lots', label: 'Lots', sublabel: '15+' },
  { value: 'wide-open', label: 'Wide Open!', sublabel: 'Non-stop' },
];

export default function ReportFishModal({ lat, lng, onClose, onSubmit }: ReportFishModalProps) {
  const [species, setSpecies] = useState('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [quantity, setQuantity] = useState('');
  const [bait, setBait] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!species) { setError('Please select a species.'); return; }
    if (!quantity) { setError('Please select a quantity.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token) {
        setError('You must be signed in to report fish activity.');
        setSubmitting(false);
        return;
      }

      const finalSpecies = species === 'Other' ? (customSpecies.trim() || 'Other') : species;

      const res = await fetch('/api/fish-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lat,
          lng,
          species: finalSpecies,
          quantity,
          bait: bait.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create report');
      }

      const report: { id: string } = await res.json();
      onSubmit(report);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedColor = species ? (SPECIES_COLORS[species] ?? '#8899aa') : '#8899aa';

  return (
    <>
      <style>{`
        .rfm-overlay { animation: rfm-fadein 0.15s ease; }
        @keyframes rfm-fadein { from { opacity: 0; } to { opacity: 1; } }
        .rfm-card { animation: rfm-slidein 0.18s ease; }
        @keyframes rfm-slidein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .rfm-close:hover { color: #e2e8f0 !important; }
        .rfm-submit:hover:not(:disabled) { background: #ea6a00 !important; }
        .rfm-species-btn:hover { border-color: rgba(255,255,255,0.3) !important; }
        .rfm-qty-btn:hover { border-color: #f97316 !important; }
        .rfm-input:focus { border-color: #f97316 !important; outline: none; }
      `}</style>

      {/* Overlay */}
      <div
        className="rfm-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Card */}
        <div
          className="rfm-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(13,19,32,0.98)',
            border: '1px solid #1e2a42',
            borderRadius: 14,
            padding: 24,
            width: '100%',
            maxWidth: 460,
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                🐟 Report Fish Activity
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8899aa' }}>
                {lat.toFixed(4)}°N, {Math.abs(lng).toFixed(4)}°{lng < 0 ? 'W' : 'E'}
              </p>
            </div>
            <button
              className="rfm-close"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#8899aa',
                cursor: 'pointer',
                padding: 4,
                fontSize: 20,
                lineHeight: 1,
                transition: 'color 0.15s',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Species picker */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Species *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SPECIES_LIST.map((s) => {
                const color = SPECIES_COLORS[s] ?? '#8899aa';
                const selected = species === s;
                return (
                  <button
                    key={s}
                    className="rfm-species-btn"
                    onClick={() => setSpecies(s)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: selected ? `${color}22` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selected ? color : '#2a3a52'}`,
                      borderRadius: 6,
                      padding: '5px 10px',
                      cursor: 'pointer',
                      color: selected ? color : '#c4cfe0',
                      fontSize: 12,
                      fontWeight: selected ? 600 : 400,
                      transition: 'all 0.15s',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {s}
                  </button>
                );
              })}
            </div>
            {species === 'Other' && (
              <input
                className="rfm-input"
                type="text"
                value={customSpecies}
                onChange={(e) => setCustomSpecies(e.target.value)}
                placeholder="Enter species name..."
                style={{
                  marginTop: 8,
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid #1e2a42',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontFamily: 'system-ui, sans-serif',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
            )}
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Quantity *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {QUANTITY_OPTIONS.map((opt) => {
                const selected = quantity === opt.value;
                return (
                  <button
                    key={opt.value}
                    className="rfm-qty-btn"
                    onClick={() => setQuantity(opt.value)}
                    style={{
                      background: selected ? '#f9731622' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selected ? '#f97316' : '#2a3a52'}`,
                      borderRadius: 8,
                      padding: '8px 4px',
                      cursor: 'pointer',
                      color: selected ? '#f97316' : '#c4cfe0',
                      fontFamily: 'system-ui, sans-serif',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: selected ? 700 : 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: selected ? '#f9731688' : '#8899aa', marginTop: 2 }}>{opt.sublabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bait / technique */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Bait / Technique (optional)
            </label>
            <input
              className="rfm-input"
              type="text"
              value={bait}
              onChange={(e) => setBait(e.target.value)}
              placeholder="e.g., Live sardine, Surface iron, Fly-line"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1e2a42',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#e2e8f0',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening out there?"
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1e2a42',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#e2e8f0',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 14, padding: '8px 12px', background: '#ef444418', border: '1px solid #ef444433', borderRadius: 6, color: '#fca5a5', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Species preview indicator */}
          {species && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '8px 12px', background: `${selectedColor}0d`, border: `1px solid ${selectedColor}33`, borderRadius: 6, fontSize: 12, color: selectedColor }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedColor, flexShrink: 0 }} />
              Reporting: {species === 'Other' && customSpecies ? customSpecies : species}
              {quantity && ` · ${QUANTITY_OPTIONS.find((q) => q.value === quantity)?.label}`}
            </div>
          )}

          {/* Submit */}
          <button
            className="rfm-submit"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              background: '#f97316',
              border: 'none',
              borderRadius: 8,
              padding: '11px 0',
              color: '#fff',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'background 0.15s, opacity 0.15s',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </>
  );
}
