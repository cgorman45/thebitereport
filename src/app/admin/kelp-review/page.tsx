'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import DetectionCard from '@/components/admin/DetectionCard';
import type { Detection } from '@/components/admin/DetectionCard';
import { useOptionalAuth } from '@/components/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase/client';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortBy = 'date' | 'confidence';

const TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function KelpReviewPage() {
  const auth = useOptionalAuth();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [sortBy, setSortBy] = useState<SortBy>('confidence');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin access (bypassed for testing)
  useEffect(() => {
    setIsAdmin(true);
  }, []);

  const fetchDetections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        sort: sortBy,
        limit: '100',
      });

      const headers: Record<string, string> = {};
      if (auth?.session?.access_token) {
        headers.Authorization = `Bearer ${auth.session.access_token}`;
      }

      const res = await fetch(`/api/admin/kelp-detections?${params}`, { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setDetections(data.detections);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load detections');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, auth?.session?.access_token]);

  useEffect(() => {
    if (isAdmin) fetchDetections();
  }, [isAdmin, fetchDetections]);

  const handleReview = async (id: string, status: 'approved' | 'rejected', notes: string) => {
    if (!auth?.session?.access_token) return;

    const res = await fetch(`/api/admin/kelp-detections/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.session.access_token}`,
      },
      body: JSON.stringify({ status, notes }),
    });

    if (res.ok) {
      setDetections((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status, reviewed_at: new Date().toISOString(), review_notes: notes || null } : d)),
      );
    }
  };

  const handleBulkReview = async (status: 'approved' | 'rejected') => {
    if (!auth?.session?.access_token || selected.size === 0) return;
    setBulkLoading(true);

    const promises = Array.from(selected).map((id) =>
      fetch(`/api/admin/kelp-detections/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.session.access_token}`,
        },
        body: JSON.stringify({ status }),
      }),
    );

    await Promise.all(promises);
    setSelected(new Set());
    setBulkLoading(false);
    fetchDetections();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === detections.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(detections.map((d) => d.id)));
    }
  };

  // Auth loading
  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#8899aa' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#ef4444', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Access Denied</div>
          <div style={{ color: '#8899aa', fontSize: 14 }}>Admin access required to review kelp detections.</div>
        </div>
      </div>
    );
  }

  const pendingCount = detections.filter((d) => d.status === 'pending').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, margin: 0 }}>
            Kelp Detection Review
          </h1>
          <p style={{ color: '#8899aa', fontSize: 14, marginTop: 4 }}>
            {total} detections total{pendingCount > 0 && ` \u2022 ${pendingCount} pending review`}
          </p>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setSelected(new Set()); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: statusFilter === tab.id ? '#00d4ff22' : 'transparent',
                  color: statusFilter === tab.id ? '#00d4ff' : '#8899aa',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              style={{
                background: '#131b2e',
                color: '#e2e8f0',
                border: '1px solid #1e2a42',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
              }}
            >
              <option value="date">Newest first</option>
              <option value="confidence">Highest confidence</option>
            </select>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: '#131b2e',
            border: '1px solid #1e2a42',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
              {selected.size} selected
            </span>
            <button onClick={selectAll} style={{ color: '#00d4ff', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer' }}>
              {selected.size === detections.length ? 'Deselect all' : 'Select all'}
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => handleBulkReview('approved')}
              disabled={bulkLoading}
              style={{
                padding: '6px 16px',
                background: '#22c55e22',
                color: '#22c55e',
                border: '1px solid #22c55e44',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: bulkLoading ? 'wait' : 'pointer',
              }}
            >
              Approve all
            </button>
            <button
              onClick={() => handleBulkReview('rejected')}
              disabled={bulkLoading}
              style={{
                padding: '6px 16px',
                background: '#ef444422',
                color: '#ef4444',
                border: '1px solid #ef444444',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: bulkLoading ? 'wait' : 'pointer',
              }}
            >
              Reject all
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: '#ef4444', background: '#ef444422', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: '#8899aa' }}>
            Loading detections...
          </div>
        )}

        {/* Grid */}
        {!loading && detections.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: '#8899aa', fontSize: 14 }}>
            No detections found for this filter.
          </div>
        )}

        {!loading && detections.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {detections.map((d) => (
              <DetectionCard
                key={d.id}
                detection={d}
                selected={selected.has(d.id)}
                onToggleSelect={toggleSelect}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
