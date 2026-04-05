'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

interface Profile {
  id: string;
  display_name: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  favorites: Set<number>;       // MMSI numbers
  tripWatches: Set<string>;     // trip IDs
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavorite: (mmsi: number) => Promise<void>;
  toggleTripWatch: (tripId: string, boatName: string, tripDate: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Optional hook that doesn't throw — for components that work with or without auth
export function useOptionalAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [tripWatches, setTripWatches] = useState<Set<string>>(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Fetch user's favorites and watches
  const fetchUserData = useCallback(async (accessToken: string) => {
    try {
      const [favRes, watchRes, profileRes] = await Promise.all([
        fetch('/api/favorites', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/trip-watches', { headers: { Authorization: `Bearer ${accessToken}` } }),
        getSupabase().from('profiles').select('id, display_name').single(),
      ]);

      if (favRes.ok) {
        const favData = await favRes.json();
        setFavorites(new Set(favData.map((f: { boat_mmsi: number }) => f.boat_mmsi)));
      }
      if (watchRes.ok) {
        const watchData = await watchRes.json();
        setTripWatches(new Set(watchData.map((w: { trip_id: string }) => w.trip_id)));
      }
      if (profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch {
      // Silently fail — user can still browse without personalization
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchUserData(session.access_token);
        } else {
          setUser(null);
          setProfile(null);
          setFavorites(new Set());
          setTripWatches(new Set());
        }
        setLoading(false);
      }
    );

    // Check initial session
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.access_token);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession();
    return session?.access_token ?? '';
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (!error) setAuthModalOpen(false);
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (!error) setAuthModalOpen(false);
    return { error };
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setAuthModalOpen(false);
  }, []);

  const toggleFavorite = useCallback(async (mmsi: number) => {
    if (!user) { setAuthModalOpen(true); return; }
    const token = await getAccessToken();
    const isFav = favorites.has(mmsi);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(mmsi); else next.add(mmsi);
      return next;
    });

    try {
      if (isFav) {
        await fetch(`/api/favorites/${mmsi}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mmsi }),
        });
      }
    } catch {
      // Revert on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFav) next.add(mmsi); else next.delete(mmsi);
        return next;
      });
    }
  }, [user, favorites, getAccessToken]);

  const toggleTripWatch = useCallback(async (tripId: string, boatName: string, tripDate: string) => {
    if (!user) { setAuthModalOpen(true); return; }
    const token = await getAccessToken();
    const isWatched = tripWatches.has(tripId);

    // Optimistic update
    setTripWatches(prev => {
      const next = new Set(prev);
      if (isWatched) next.delete(tripId); else next.add(tripId);
      return next;
    });

    try {
      if (isWatched) {
        await fetch(`/api/trip-watches/${encodeURIComponent(tripId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch('/api/trip-watches', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, boatName, tripDate }),
        });
      }
    } catch {
      // Revert on error
      setTripWatches(prev => {
        const next = new Set(prev);
        if (isWatched) next.add(tripId); else next.delete(tripId);
        return next;
      });
    }
  }, [user, tripWatches, getAccessToken]);

  const value = useMemo<AuthContextType>(() => ({
    user, profile, loading, favorites, tripWatches, authModalOpen,
    openAuthModal: () => setAuthModalOpen(true),
    closeAuthModal: () => setAuthModalOpen(false),
    signIn, signUp, signInWithProvider, signOut,
    toggleFavorite, toggleTripWatch,
  }), [user, profile, loading, favorites, tripWatches, authModalOpen,
       signIn, signUp, signInWithProvider, signOut, toggleFavorite, toggleTripWatch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
