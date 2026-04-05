'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Header from '@/components/Header';
import AvatarPicker from '@/components/profile/AvatarPicker';
import SavedTripsTab from '@/components/profile/SavedTripsTab';
import NotificationsTab from '@/components/profile/NotificationsTab';
import AccountTab from '@/components/profile/AccountTab';
import { getAvatarUrl } from '@/lib/avatars';
import { getSupabase } from '@/lib/supabase/client';
import type { ScheduledTrip } from '@/lib/trips/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPrefs {
  bluefin_spotted: { email: boolean; sms: boolean };
  spots_opening: { email: boolean; sms: boolean };
  ideal_weather: { email: boolean; sms: boolean };
  new_reports: { email: boolean; sms: boolean };
}

interface ProfileData {
  displayName: string;
  email: string;
  avatarKey: string;
  phone: string | null;
  notificationPrefs: NotificationPrefs;
  createdAt: string;
}

interface TripWatch {
  id: string;
  trip_id: string;
  boat_name: string;
  trip_date: string;
  created_at: string;
}

type ActiveTab = 'trips' | 'notifications' | 'account';

// ─── Default notification prefs ───────────────────────────────────────────────

const DEFAULT_PREFS: NotificationPrefs = {
  bluefin_spotted: { email: false, sms: false },
  spots_opening: { email: false, sms: false },
  ideal_weather: { email: false, sms: false },
  new_reports: { email: false, sms: false },
};

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session) return null;
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function formatMemberSince(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────

function StatBadge({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderRadius: 10,
        padding: '10px 20px',
        minWidth: 70,
      }}
    >
      <span style={{ color: '#00d4ff', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ color: '#8899aa', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        color: active ? '#00d4ff' : '#8899aa',
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid #00d4ff' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, loading, favorites, tripWatches, openAuthModal, signOut } = useAuth();
  const router = useRouter();

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [avatarKey, setAvatarKey] = useState<string>('captain');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('trips');
  const [tripWatchData, setTripWatchData] = useState<TripWatch[]>([]);
  const [allTrips, setAllTrips] = useState<ScheduledTrip[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      openAuthModal();
    }
  }, [loading, user, router, openAuthModal]);

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);

    try {
      const [profileRes, watchesRes, tripsRes] = await Promise.all([
        fetchWithAuth('/api/profile'),
        fetchWithAuth('/api/trip-watches'),
        fetchWithAuth('/api/trips'),
      ]);

      if (!profileRes || !watchesRes || !tripsRes) {
        throw new Error('Session expired. Please sign in again.');
      }

      if (!profileRes.ok) {
        throw new Error('Failed to load profile');
      }

      const [profile, watches, trips] = await Promise.all([
        profileRes.json(),
        watchesRes.ok ? watchesRes.json() : [],
        tripsRes.ok ? tripsRes.json() : [],
      ]);

      setProfileData(profile);
      setAvatarKey(profile.avatarKey ?? 'captain');
      setTripWatchData(Array.isArray(watches) ? watches : []);
      setAllTrips(Array.isArray(trips) ? trips : []);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to load profile');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
      fetchProfileData();
    }
  }, [user, loading, fetchProfileData]);

  // ── Avatar update ──────────────────────────────────────────────────────────

  async function handleAvatarSelect(newKey: string) {
    const prevKey = avatarKey;
    setAvatarKey(newKey); // optimistic
    setShowAvatarPicker(false);

    const res = await fetchWithAuth('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ avatarKey: newKey }),
    });

    if (!res || !res.ok) {
      setAvatarKey(prevKey); // revert on error
    } else if (profileData) {
      setProfileData({ ...profileData, avatarKey: newKey });
    }
  }

  // ── Notification save ──────────────────────────────────────────────────────

  async function handleNotificationSave(data: { phone: string | null; notificationPrefs: NotificationPrefs }) {
    const res = await fetchWithAuth('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {};
      throw new Error(body?.error ?? 'Failed to save preferences');
    }

    if (profileData) {
      setProfileData({ ...profileData, phone: data.phone, notificationPrefs: data.notificationPrefs });
    }
  }

  // ── Name save ─────────────────────────────────────────────────────────────

  async function handleSaveName(newName: string) {
    const res = await fetchWithAuth('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: newName }),
    });

    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {};
      throw new Error(body?.error ?? 'Failed to save display name');
    }

    if (profileData) {
      setProfileData({ ...profileData, displayName: newName });
    }
  }

  // ── Computed stats ─────────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeWatchCount = tripWatchData.filter((w) => {
    const [y, m, d] = w.trip_date.split('-').map(Number);
    return new Date(y, m - 1, d) >= today;
  }).length;

  const pastWatchCount = tripWatchData.filter((w) => {
    const [y, m, d] = w.trip_date.split('-').map(Number);
    return new Date(y, m - 1, d) < today;
  }).length;

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#8899aa' }}>Loading profile...</p>
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main style={{ backgroundColor: '#0a0f1a', minHeight: '100vh' }}>
        <div className="max-w-[900px] mx-auto px-4 py-8">

          {/* ── Profile Header ─────────────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e2a42',
              borderRadius: 16,
              padding: '28px 32px',
              marginBottom: 24,
            }}
          >
            {/* Avatar + Name row */}
            <div className="flex items-start gap-6 flex-wrap">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    border: '3px solid #00d4ff',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#0a0f1a',
                  }}
                >
                  <img
                    src={getAvatarUrl(avatarKey)}
                    alt="Avatar"
                    width={96}
                    height={96}
                    style={{ imageRendering: 'pixelated', display: 'block' }}
                  />
                </div>
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00d4ff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Change Avatar
                </button>
              </div>

              {/* Name + member since */}
              <div className="flex flex-col justify-center gap-1 flex-1 min-w-0">
                {loadingProfile ? (
                  <div
                    style={{
                      height: 28,
                      width: 160,
                      backgroundColor: '#1e2a42',
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />
                ) : profileError ? (
                  <div>
                    <p style={{ color: '#ff4466', fontSize: 14, margin: '0 0 8px' }}>
                      {profileError}
                    </p>
                    <button
                      onClick={fetchProfileData}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#00d4ff',
                        background: 'none',
                        border: '1px solid #00d4ff',
                        borderRadius: 6,
                        padding: '5px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <h1
                      style={{
                        color: '#e2e8f0',
                        fontSize: 24,
                        fontWeight: 800,
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {profileData?.displayName ?? user.email?.split('@')[0] ?? 'Angler'}
                    </h1>
                    <p style={{ color: '#8899aa', fontSize: 13, margin: 0 }}>
                      Member since {profileData?.createdAt ? formatMemberSince(profileData.createdAt) : '—'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Stat badges */}
            <div className="flex gap-3 flex-wrap mt-6">
              <StatBadge value={favorites.size} label="Boats" />
              <StatBadge value={activeWatchCount} label="Watching" />
              <StatBadge value={pastWatchCount} label="Past" />
            </div>

            {/* Tabs */}
            <div
              className="flex gap-0 mt-6"
              style={{
                borderBottom: '1px solid #1e2a42',
                marginLeft: -2,
              }}
            >
              <TabButton
                label="Saved Trips"
                active={activeTab === 'trips'}
                onClick={() => setActiveTab('trips')}
              />
              <TabButton
                label="Notifications"
                active={activeTab === 'notifications'}
                onClick={() => setActiveTab('notifications')}
              />
              <TabButton
                label="Account"
                active={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
              />
            </div>
          </div>

          {/* ── Tab Content ────────────────────────────────────────────────── */}
          {loadingProfile ? (
            <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#8899aa' }}>Loading profile...</p>
            </div>
          ) : profileError && !profileData ? (
            <div
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e2a42',
                borderRadius: 12,
                padding: 32,
                textAlign: 'center',
              }}
            >
              <p style={{ color: '#ff4466', marginBottom: 12 }}>Unable to load profile</p>
              <button
                onClick={fetchProfileData}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0a0f1a',
                  backgroundColor: '#00d4ff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'trips' ? (
            <SavedTripsTab
              tripWatches={tripWatchData}
              favorites={favorites}
              allTrips={allTrips}
            />
          ) : activeTab === 'notifications' ? (
            <NotificationsTab
              phone={profileData?.phone ?? null}
              notificationPrefs={profileData?.notificationPrefs ?? DEFAULT_PREFS}
              onSave={handleNotificationSave}
            />
          ) : (
            <AccountTab
              displayName={profileData?.displayName ?? ''}
              email={profileData?.email ?? user.email ?? ''}
              onSaveName={handleSaveName}
              onSignOut={signOut}
            />
          )}
        </div>
      </main>

      {/* ── Avatar Picker Modal ───────────────────────────────────────────── */}
      {showAvatarPicker && (
        <AvatarPicker
          currentKey={avatarKey}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </>
  );
}
