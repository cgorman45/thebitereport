'use client';

import { useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface ReportKelpModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: (sighting: { id: string }) => void;
}

interface FilePreview {
  file: File;
  url: string;
}

const MAX_FILES = 5;
const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime'];

export default function ReportKelpModal({ lat, lng, onClose, onSubmit }: ReportKelpModalProps) {
  const [description, setDescription] = useState('');
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: FilePreview[] = [];
    for (const file of arr) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`${file.name} exceeds 10MB limit`);
        continue;
      }
      valid.push({ file, url: URL.createObjectURL(file) });
    }
    setPreviews((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_FILES);
      return combined;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token) {
        setError('You must be signed in to report a sighting.');
        setSubmitting(false);
        return;
      }
      const token = session.access_token;

      // Step 1: Create sighting
      const res = await fetch('/api/kelp-sightings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lat, lng, description: description.trim() || null }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create sighting');
      }

      const sighting: { id: string } = await res.json();

      // Step 2: Upload photos
      for (const { file } of previews) {
        const formData = new FormData();
        formData.append('photo', file);
        const photoRes = await fetch(`/api/kelp-sightings/${sighting.id}/photos`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!photoRes.ok) {
          // Non-fatal: continue uploading rest
          console.warn('Photo upload failed for', file.name);
        }
      }

      onSubmit(sighting);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .rkm-overlay { animation: rkm-fadein 0.15s ease; }
        @keyframes rkm-fadein { from { opacity: 0; } to { opacity: 1; } }
        .rkm-card { animation: rkm-slidein 0.18s ease; }
        @keyframes rkm-slidein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .rkm-close:hover { color: #e2e8f0 !important; }
        .rkm-dropzone-active { border-color: #22c55e !important; background: #22c55e0a !important; }
        .rkm-submit:hover:not(:disabled) { background: #16a34a !important; }
        .rkm-remove:hover { color: #e2e8f0 !important; }
      `}</style>

      {/* Overlay */}
      <div
        className="rkm-overlay"
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
          className="rkm-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(13,19,32,0.98)',
            border: '1px solid #1e2a42',
            borderRadius: 14,
            padding: 24,
            width: '100%',
            maxWidth: 440,
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
                Report Kelp Paddy
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8899aa' }}>
                {lat.toFixed(4)}°N, {Math.abs(lng).toFixed(4)}°{lng < 0 ? 'W' : 'E'}
              </p>
            </div>
            <button
              className="rkm-close"
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

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you see..."
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1e2a42',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#e2e8f0',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Photo upload */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Photos / Videos ({previews.length}/{MAX_FILES})
            </label>

            {/* Drop zone */}
            <div
              className={dragging ? 'rkm-dropzone-active' : ''}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed #1e2a42',
                borderRadius: 8,
                padding: '18px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                color: '#8899aa',
                fontSize: 12,
                transition: 'border-color 0.15s, background 0.15s',
                background: dragging ? '#22c55e0a' : 'transparent',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>📷</div>
              <div>Drag & drop or <span style={{ color: '#00d4ff', textDecoration: 'underline' }}>click to select</span></div>
              <div style={{ fontSize: 11, marginTop: 3 }}>JPEG, PNG, HEIC, MP4, MOV · Max 10MB each</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />

            {/* Thumbnails */}
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {p.file.type.startsWith('video/') ? (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 6,
                          background: '#1e2a42',
                          border: '1px solid #2a3a52',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        🎬
                      </div>
                    ) : (
                      <img
                        src={p.url}
                        alt=""
                        style={{
                          width: 64,
                          height: 64,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid #2a3a52',
                        }}
                      />
                    )}
                    <button
                      className="rkm-remove"
                      onClick={() => removeFile(i)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: '#0a0f1a',
                        border: '1px solid #1e2a42',
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#8899aa',
                        fontSize: 11,
                        lineHeight: 1,
                        padding: 0,
                        transition: 'color 0.15s',
                      }}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 14, padding: '8px 12px', background: '#ef444418', border: '1px solid #ef444433', borderRadius: 6, color: '#fca5a5', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="rkm-submit"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              background: '#22c55e',
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
