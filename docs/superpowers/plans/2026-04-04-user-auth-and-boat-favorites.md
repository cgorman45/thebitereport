# User Auth & Boat Favorites Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user authentication (Supabase Auth) and a boat favorites/trip watch system with email alerts and a My Boats dashboard.

**Architecture:** Supabase provides auth + Postgres database. An `AuthProvider` React context wraps the app, exposing user state, favorites set, and trip watches to all components. API routes handle CRUD for favorites/watches with auth guards. The existing daily cron job is extended with Resend email notifications for watched trips.

**Tech Stack:** Next.js 15 (App Router), Supabase Auth + Postgres, Resend (email), TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-04-user-auth-and-boat-favorites-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/supabase/client.ts` | Browser-side Supabase client singleton |
| `src/lib/supabase/server.ts` | Server-side Supabase client (service role) for API routes |
| `src/lib/supabase/middleware.ts` | Auth helper to extract user from request headers |
| `supabase/migrations/001_schema.sql` | SQL migration: profiles, boat_favorites, trip_watches tables + RLS + trigger |
| `src/components/auth/AuthProvider.tsx` | React context: user, favorites, trip watches, auth actions |
| `src/components/auth/AuthModal.tsx` | Sign In / Sign Up modal overlay |
| `src/components/auth/UserMenu.tsx` | Avatar + dropdown (My Boats, Sign Out) |
| `src/components/auth/FavoriteButton.tsx` | ★/☆ toggle for boat following |
| `src/components/auth/WatchTripButton.tsx` | "Watch Trip" / "Watching" toggle |
| `src/app/api/favorites/route.ts` | GET + POST favorites |
| `src/app/api/favorites/[mmsi]/route.ts` | DELETE favorite by MMSI |
| `src/app/api/trip-watches/route.ts` | GET + POST trip watches |
| `src/app/api/trip-watches/[tripId]/route.ts` | DELETE trip watch by ID |
| `src/app/my-boats/page.tsx` | My Boats dashboard page |
| `src/components/my-boats/BoatCard.tsx` | Boat card with reports + trips columns |
| `src/lib/notifications/trip-alerts.ts` | Trip watch notification logic (cron helper) |
| `src/lib/notifications/email.ts` | Resend email sender |

### Modified Files

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Wrap children in `AuthProvider` |
| `src/components/Header.tsx` | Add Sign In button / UserMenu + My Boats nav link |
| `src/components/trip-planner/TripResults.tsx` | Add FavoriteButton + WatchTripButton to trip cards |
| `src/components/CatchReportsPanel.tsx` | Sort favorited boats to top, add star + gold accent |
| `src/components/fleet-tracker/BoatPopup.tsx` | Add gold star + FOLLOWING badge |
| `src/app/api/cron/scrape/route.ts` | Add notification step after scrape |
| `package.json` | Add `resend` dependency |
| `.env.local` | Add Supabase + Resend env vars |

---

## Chunk 1: Foundation

### Task 1: Install Dependencies & Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install resend package**

```bash
npm install resend
```

- [ ] **Step 2: Add environment variables to `.env.local`**

Add these lines (values must be filled from Supabase dashboard and Resend dashboard):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install resend for trip watch email notifications"
```

> **Note:** `.env.local` is gitignored. The Supabase project must be created at supabase.com before proceeding. You need the project URL and anon key from Settings > API in the Supabase dashboard.

---

### Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 001_schema.sql
-- Creates profiles, boat_favorites, and trip_watches tables
-- with Row Level Security policies and auto-profile trigger.

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- BOAT FAVORITES
-- ============================================================
create table if not exists public.boat_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  boat_mmsi int not null,
  created_at timestamptz default now(),
  unique(user_id, boat_mmsi)
);

alter table public.boat_favorites enable row level security;

create policy "Users can read own favorites"
  on public.boat_favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.boat_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.boat_favorites for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TRIP WATCHES
-- ============================================================
create table if not exists public.trip_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id text not null,
  boat_name text not null,
  trip_date date not null,
  last_known_spots int,
  notified_selling_out_at timestamptz,
  notified_spots_opened_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, trip_id)
);

alter table public.trip_watches enable row level security;

create policy "Users can read own watches"
  on public.trip_watches for select
  using (auth.uid() = user_id);

create policy "Users can insert own watches"
  on public.trip_watches for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watches"
  on public.trip_watches for delete
  using (auth.uid() = user_id);

-- Service role needs to update last_known_spots and notified_* columns
-- (cron job runs server-side with service role key, bypasses RLS)
```

- [ ] **Step 2: Run the migration against your Supabase project**

Go to Supabase Dashboard > SQL Editor, paste the contents of `001_schema.sql`, and run it.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add database schema for profiles, favorites, and trip watches"
```

---

### Task 3: Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Create browser-side client**

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Create server-side client**

```typescript
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role — bypasses RLS.
// Only use in API routes and cron jobs, never in client code.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
```

- [ ] **Step 3: Create auth middleware helper**

```typescript
// src/lib/supabase/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Extract authenticated user from request.
// Returns user object or a 401 NextResponse.
export async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null, supabase };
}
```

- [ ] **Step 4: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase client, server, and auth middleware utilities"
```

---

### Task 4: AuthProvider Context

**Files:**
- Create: `src/components/auth/AuthProvider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create AuthProvider**

```typescript
// src/components/auth/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
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
        supabase.from('profiles').select('id, display_name').single(),
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.access_token);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) setAuthModalOpen(false);
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) setAuthModalOpen(false);
    return { error };
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
```

- [ ] **Step 2: Wrap app in AuthProvider**

Modify `src/app/layout.tsx`. Add import and wrap children:

```typescript
// At top of file, add import:
import AuthProvider from '@/components/auth/AuthProvider';

// In the return JSX, wrap the body contents with AuthProvider.
// Do NOT change the existing <body> or <html> attributes — only add the wrapper:
<AuthProvider>
  {children}
  <GlobalSideTabs />
</AuthProvider>
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AuthProvider.tsx src/app/layout.tsx
git commit -m "feat: add AuthProvider context with favorites and trip watch state"
```

---

## Chunk 2: Auth UI

### Task 5: AuthModal Component

**Files:**
- Create: `src/components/auth/AuthModal.tsx`

- [ ] **Step 1: Create the auth modal**

```typescript
// src/components/auth/AuthModal.tsx
'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setError(result.error.message);
    } else {
      setEmail('');
      setPassword('');
    }
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10, 15, 26, 0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
    >
      <div
        className="relative w-full max-w-[400px] mx-4 rounded-xl p-8"
        style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[#8899aa] hover:text-[#e2e8f0] transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-lg font-black text-white mb-1">
            THE <span style={{ color: '#00d4ff' }}>BITE</span> REPORT
          </div>
          <div className="text-sm" style={{ color: '#8899aa' }}>
            {mode === 'signin' ? 'Sign in to track your favorite boats' : 'Create an account to get started'}
          </div>
        </div>

        {/* Social login */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={() => signInWithProvider('google')}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium bg-white text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button
            onClick={() => signInWithProvider('apple')}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e2a42' }} />
          <span className="text-xs" style={{ color: '#556677' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e2a42' }} />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ backgroundColor: '#0a0f1a', border: '1px solid #1e2a42', color: '#e2e8f0' }}
            onFocus={(e) => (e.target.style.borderColor = '#00d4ff')}
            onBlur={(e) => (e.target.style.borderColor = '#1e2a42')}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ backgroundColor: '#0a0f1a', border: '1px solid #1e2a42', color: '#e2e8f0' }}
            onFocus={(e) => (e.target.style.borderColor = '#00d4ff')}
            onBlur={(e) => (e.target.style.borderColor = '#1e2a42')}
          />

          {error && (
            <div className="text-sm text-red-400 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
          >
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-4 text-sm" style={{ color: '#8899aa' }}>
          {mode === 'signin' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} style={{ color: '#00d4ff' }}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(''); }} style={{ color: '#00d4ff' }}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthModal.tsx
git commit -m "feat: add AuthModal with email/password and social login"
```

---

### Task 6: UserMenu Component

**Files:**
- Create: `src/components/auth/UserMenu.tsx`

- [ ] **Step 1: Create UserMenu**

```typescript
// src/components/auth/UserMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

function getInitials(displayName: string | null, email: string | undefined): string {
  const source = displayName || email || '?';
  const parts = source.split(/[\s@]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const initials = getInitials(profile?.display_name ?? null, user.email);
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 cursor-pointer"
        aria-label="User menu"
      >
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: '#1e2a42', border: '2px solid #00d4ff', color: '#00d4ff' }}
        >
          {initials}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#8899aa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[40px] rounded-lg py-1 min-w-[200px] z-50"
          style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {/* User info */}
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #1e2a42' }}>
            <div className="text-sm font-medium text-[#e2e8f0]">{displayName}</div>
            <div className="text-xs" style={{ color: '#556677' }}>{user.email}</div>
          </div>

          {/* Nav links */}
          <div className="py-1">
            <Link
              href="/my-boats"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#e2e8f0] hover:bg-[#1e2a4233] transition-colors"
            >
              <span style={{ color: '#f0c040' }}>★</span> My Boats
            </Link>
          </div>

          {/* Sign out */}
          <div style={{ borderTop: '1px solid #1e2a42' }} className="py-1">
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[#1e2a4233] transition-colors"
              style={{ color: '#8899aa' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/UserMenu.tsx
git commit -m "feat: add UserMenu avatar dropdown component"
```

---

### Task 7: Header Integration

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Add auth imports and UI to Header**

At the top of `src/components/Header.tsx`, add imports:

```typescript
import { useOptionalAuth } from './auth/AuthProvider';
import AuthModal from './auth/AuthModal';
import UserMenu from './auth/UserMenu';
```

Inside the component function, add:

```typescript
const auth = useOptionalAuth();
```

In the NAV_LINKS array, the "My Boats" link will be rendered conditionally (not added to the static array).

In the JSX, find the right side of the header (after the nav links, where the Live status indicator is). Replace or extend it to include:

1. Conditionally render "My Boats" nav link when user is logged in (after other nav links)
2. Replace the Live status indicator area with: Sign In button (logged out) or UserMenu (logged in)
3. Render `<AuthModal />` at the end of the header component

The Sign In button:
```tsx
<button
  onClick={() => auth?.openAuthModal()}
  className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
  style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
>
  Sign In
</button>
```

The conditional rendering:
```tsx
{auth?.user ? <UserMenu /> : (
  <button onClick={() => auth?.openAuthModal()} ...>Sign In</button>
)}
<AuthModal />
```

Add "My Boats" link after existing nav links when logged in:
```tsx
{auth?.user && (
  <Link href="/my-boats" style={{ color: '#f0c040' }} className="text-sm font-medium">
    My Boats
  </Link>
)}
```

The right side of the Header currently shows a green "Live" status dot. Replace that status indicator section with the auth UI. Keep the status indicator but place it before the auth button/menu:

```tsx
{/* Status indicator — keep existing */}
<div className="flex items-center gap-1.5 shrink-0">
  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
  <span className="text-xs" style={{ color: '#8899aa' }}>Live</span>
</div>

{/* Auth: Sign In or UserMenu */}
{auth?.user ? <UserMenu /> : (
  <button
    onClick={() => auth?.openAuthModal()}
    className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
    style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
  >
    Sign In
  </button>
)}

{/* Auth modal — rendered at end, portals to overlay */}
<AuthModal />
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Test manually in browser**

Navigate to `http://localhost:3000`. Verify:
- "Sign In" button appears in header (top right, after Live indicator)
- Clicking it opens the auth modal
- Modal can be closed with X button or clicking backdrop
- Nav bar shows standard links without "My Boats"

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add Sign In button and UserMenu to header"
```

---

## Chunk 3: API Routes

### Task 8: Favorites API Routes

**Files:**
- Create: `src/app/api/favorites/route.ts`
- Create: `src/app/api/favorites/[mmsi]/route.ts`

- [ ] **Step 1: Create GET + POST route**

```typescript
// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// GET /api/favorites — list user's boat favorites
export async function GET(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('boat_favorites')
    .select('id, boat_mmsi, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/favorites — add a boat to favorites
export async function POST(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { mmsi } = await req.json();
  if (typeof mmsi !== 'number') {
    return NextResponse.json({ error: 'mmsi must be a number' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('boat_favorites')
    .insert({ user_id: user!.id, boat_mmsi: mmsi })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === '23505') { // unique violation
      return NextResponse.json({ error: 'Already favorited' }, { status: 409 });
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Create DELETE route**

```typescript
// src/app/api/favorites/[mmsi]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// DELETE /api/favorites/[mmsi] — remove a boat from favorites
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mmsi: string }> }
) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { mmsi } = await params;
  const mmsiNum = parseInt(mmsi, 10);
  if (isNaN(mmsiNum)) {
    return NextResponse.json({ error: 'Invalid MMSI' }, { status: 400 });
  }

  const { error: dbError } = await supabase!
    .from('boat_favorites')
    .delete()
    .eq('user_id', user!.id)
    .eq('boat_mmsi', mmsiNum);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/favorites/
git commit -m "feat: add favorites API routes (GET, POST, DELETE)"
```

---

### Task 9: Trip Watches API Routes

**Files:**
- Create: `src/app/api/trip-watches/route.ts`
- Create: `src/app/api/trip-watches/[tripId]/route.ts`

- [ ] **Step 1: Create GET + POST route**

```typescript
// src/app/api/trip-watches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// GET /api/trip-watches — list user's watched trips
export async function GET(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('trip_watches')
    .select('id, trip_id, boat_name, trip_date, created_at')
    .eq('user_id', user!.id)
    .order('trip_date', { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/trip-watches — watch a trip
export async function POST(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { tripId, boatName, tripDate } = await req.json();
  if (!tripId || !boatName || !tripDate) {
    return NextResponse.json({ error: 'tripId, boatName, and tripDate are required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('trip_watches')
    .insert({ user_id: user!.id, trip_id: tripId, boat_name: boatName, trip_date: tripDate })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'Already watching this trip' }, { status: 409 });
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Create DELETE route**

```typescript
// src/app/api/trip-watches/[tripId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// DELETE /api/trip-watches/[tripId] — stop watching a trip
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { tripId } = await params;
  const decodedId = decodeURIComponent(tripId);

  const { error: dbError } = await supabase!
    .from('trip_watches')
    .delete()
    .eq('user_id', user!.id)
    .eq('trip_id', decodedId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trip-watches/
git commit -m "feat: add trip watches API routes (GET, POST, DELETE)"
```

---

## Chunk 4: Favorite & Watch UI Components

### Task 10: FavoriteButton Component

**Files:**
- Create: `src/components/auth/FavoriteButton.tsx`

- [ ] **Step 1: Create FavoriteButton**

```typescript
// src/components/auth/FavoriteButton.tsx
'use client';

import { useOptionalAuth } from './AuthProvider';

interface FavoriteButtonProps {
  mmsi: number;
  size?: number;  // icon size in px, default 16
}

export default function FavoriteButton({ mmsi, size = 16 }: FavoriteButtonProps) {
  const auth = useOptionalAuth();
  const isFav = auth?.favorites.has(mmsi) ?? false;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        auth?.toggleFavorite(mmsi);
      }}
      className="transition-colors shrink-0"
      style={{ color: isFav ? '#f0c040' : '#334455', fontSize: size, lineHeight: 1 }}
      aria-label={isFav ? 'Unfollow boat' : 'Follow boat'}
      title={isFav ? 'Unfollow boat' : 'Follow boat'}
    >
      {isFav ? '★' : '☆'}
    </button>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/FavoriteButton.tsx
git commit -m "feat: add FavoriteButton star toggle component"
```

---

### Task 11: WatchTripButton Component

**Files:**
- Create: `src/components/auth/WatchTripButton.tsx`

- [ ] **Step 1: Create WatchTripButton**

```typescript
// src/components/auth/WatchTripButton.tsx
'use client';

import { useOptionalAuth } from './AuthProvider';

interface WatchTripButtonProps {
  tripId: string;
  boatName: string;
  tripDate: string;  // ISO date string
}

export default function WatchTripButton({ tripId, boatName, tripDate }: WatchTripButtonProps) {
  const auth = useOptionalAuth();
  const isWatched = auth?.tripWatches.has(tripId) ?? false;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        auth?.toggleTripWatch(tripId, boatName, tripDate);
      }}
      className="text-xs rounded px-2.5 py-1 transition-colors font-medium"
      style={isWatched ? {
        backgroundColor: '#00d4ff15',
        color: '#00d4ff',
        border: '1px solid #00d4ff33',
      } : {
        backgroundColor: '#1e2a4233',
        color: '#556677',
        border: '1px solid #1e2a42',
      }}
    >
      {isWatched ? 'Watching' : 'Watch Trip'}
    </button>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/WatchTripButton.tsx
git commit -m "feat: add WatchTripButton toggle component"
```

---

## Chunk 5: Page Integrations

### Task 12: Plan Trip — TripResults Integration

**Files:**
- Modify: `src/components/trip-planner/TripResults.tsx`

- [ ] **Step 1: Add imports at the top of TripResults.tsx**

```typescript
import FavoriteButton from '@/components/auth/FavoriteButton';
import WatchTripButton from '@/components/auth/WatchTripButton';
import { useOptionalAuth } from '@/components/auth/AuthProvider';
```

- [ ] **Step 2: Add auth context inside the TripResultCard component**

Inside the `TripResultCard` function, near the top:

```typescript
const auth = useOptionalAuth();
const isFav = auth?.favorites.has(trip.mmsi ?? 0) ?? false;
```

- [ ] **Step 3: Add FavoriteButton next to boat name**

Find the boat name element (line ~106, the `<span>` or `<div>` showing `trip.boatName`). Add the FavoriteButton and FOLLOWING badge right after it:

```tsx
<span className="font-bold text-[#e2e8f0]">{trip.boatName}</span>
{trip.mmsi && <FavoriteButton mmsi={trip.mmsi} />}
{isFav && (
  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
    style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
    FOLLOWING
  </span>
)}
```

- [ ] **Step 4: Add WatchTripButton to the action buttons area**

Find the action buttons section (around line ~245, where "Book Now" and "View on Map" buttons are). Add before or after the existing buttons:

```tsx
<WatchTripButton tripId={trip.id} boatName={trip.boatName} tripDate={trip.departureDate} />
```

- [ ] **Step 5: Test manually**

Navigate to `http://localhost:3000/plan-your-trip`, search for trips, and verify:
- Star icon appears next to each boat name (with MMSI)
- "Watch Trip" button appears on each trip card
- Clicking star without login opens auth modal
- Clicking "Watch Trip" without login opens auth modal

- [ ] **Step 6: Commit**

```bash
git add src/components/trip-planner/TripResults.tsx
git commit -m "feat: add FavoriteButton and WatchTripButton to trip cards"
```

---

### Task 13: Catch Reports Panel Integration

**Files:**
- Modify: `src/components/CatchReportsPanel.tsx`

- [ ] **Step 1: Add imports**

```typescript
import FavoriteButton from '@/components/auth/FavoriteButton';
import { useOptionalAuth } from '@/components/auth/AuthProvider';
```

- [ ] **Step 2: Add auth context and sort logic**

Inside the component function, add:

```typescript
const auth = useOptionalAuth();
```

Before the `.map()` that renders reports, sort favorited boats to the top. The reports are scraped and may not have MMSI. Use boat name to match against the fleet roster. Add a helper to look up MMSI by boat name:

```typescript
import { FLEET_ROSTER } from '@/lib/fleet/boats';

// Look up MMSI by boat name for favorite matching
const boatMmsiMap = new Map(FLEET_ROSTER.map(b => [b.name.toLowerCase(), b.mmsi]));

// Sort: favorited boats first
const sortedReports = [...reports].sort((a, b) => {
  const aFav = auth?.favorites.has(boatMmsiMap.get(a.boat.toLowerCase()) ?? 0) ? 0 : 1;
  const bFav = auth?.favorites.has(boatMmsiMap.get(b.boat.toLowerCase()) ?? 0) ? 0 : 1;
  return aFav - bFav;
});
```

Then use `sortedReports` instead of `reports` in the `.map()`.

- [ ] **Step 3: Add star and gold accent to report cards**

In the report card JSX, modify the card container to add gold left border when favorited:

```tsx
const mmsi = boatMmsiMap.get(report.boat.toLowerCase());
const isFav = mmsi ? (auth?.favorites.has(mmsi) ?? false) : false;

// Card container — add conditional gold border
style={{
  backgroundColor: '#131b2e',
  border: isFav ? '1px solid #f0c04033' : '1px solid #1e2a42',
  borderLeft: isFav ? '3px solid #f0c040' : undefined,
}}
```

Add star next to boat name in each card:

```tsx
<span>{report.boat}</span>
{mmsi && <FavoriteButton mmsi={mmsi} size={13} />}
```

- [ ] **Step 4: Test manually**

Open the side panel catch reports and verify favorited boats sort to top with gold accent.

- [ ] **Step 5: Commit**

```bash
git add src/components/CatchReportsPanel.tsx
git commit -m "feat: add favorites integration to catch reports panel"
```

---

### Task 14: Fleet Map — BoatPopup Integration

**Files:**
- Modify: `src/components/fleet-tracker/BoatPopup.tsx`

- [ ] **Step 1: Add imports**

```typescript
import FavoriteButton from '@/components/auth/FavoriteButton';
import { useOptionalAuth } from '@/components/auth/AuthProvider';
```

- [ ] **Step 2: Add auth context inside BoatPopup**

```typescript
const auth = useOptionalAuth();
const isFav = auth?.favorites.has(boat.mmsi) ?? false;
```

- [ ] **Step 3: Add star next to boat name (around line 82-91)**

After the boat name text, add:

```tsx
<FavoriteButton mmsi={boat.mmsi} size={14} />
```

- [ ] **Step 4: Add FOLLOWING badge before the close of the popup (around line 185)**

After the "Updated X ago" section, add:

```tsx
{isFav && (
  <div style={{ marginTop: 6, textAlign: 'right' }}>
    <span style={{
      backgroundColor: '#22c55e20', color: '#22c55e',
      fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
    }}>FOLLOWING</span>
  </div>
)}
```

- [ ] **Step 5: Test manually**

Open Fleet Map, click on a boat marker, verify star and FOLLOWING badge appear.

- [ ] **Step 6: Commit**

```bash
git add src/components/fleet-tracker/BoatPopup.tsx
git commit -m "feat: add favorites star and FOLLOWING badge to fleet map popups"
```

---

### Task 15: My Boats Page

**Files:**
- Create: `src/app/my-boats/page.tsx`
- Create: `src/components/my-boats/BoatCard.tsx`

- [ ] **Step 1: Create BoatCard component**

```typescript
// src/components/my-boats/BoatCard.tsx
'use client';

import { useMemo } from 'react';
import FavoriteButton from '@/components/auth/FavoriteButton';
import WatchTripButton from '@/components/auth/WatchTripButton';
import type { ScheduledTrip } from '@/lib/trips/types';

// Matches the shape returned by /api/catch-reports (from tuna976 scraper)
interface CatchReport {
  boat: string;
  date: string;
  species: string;
  count: number;
  anglers: number;
  tripType: string;
  also?: { species: string; count: number }[];
  [key: string]: unknown;  // allow extra fields from scraper
}

interface BoatCardProps {
  boatName: string;
  mmsi: number;
  landing: string;
  vesselType?: string;
  reports: CatchReport[];
  trips: ScheduledTrip[];
}

export default function BoatCard({ boatName, mmsi, landing, vesselType, reports, trips }: BoatCardProps) {
  const landingLabel: Record<string, string> = {
    seaforth: 'Seaforth Landing',
    fishermans: "Fisherman's Landing",
    hm_landing: 'H&M Landing',
    point_loma: 'Point Loma Sportfishing',
    helgrens: "Helgren's Sportfishing",
  };

  const recentReports = useMemo(() => reports.slice(0, 3), [reports]);
  const upcomingTrips = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return trips
      .filter(t => t.departureDate >= today)
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .slice(0, 3);
  }, [trips]);

  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
      {/* Header */}
      <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid #1e2a42' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#e2e8f0]">{boatName}</span>
            <FavoriteButton mmsi={mmsi} size={16} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8899aa' }}>
            {landingLabel[landing] || landing}{vesselType ? ` · ${vesselType}` : ''}
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Latest Reports */}
        <div className="p-4" style={{ borderRight: '1px solid #1e2a42' }}>
          <div className="text-[10px] uppercase font-semibold tracking-wide mb-3" style={{ color: '#556677' }}>
            Latest Reports
          </div>
          {recentReports.length === 0 ? (
            <div className="text-xs" style={{ color: '#556677' }}>No recent reports</div>
          ) : (
            recentReports.map((r, i) => (
              <div key={i} className="mb-3">
                <div className="text-[10px]" style={{ color: '#8899aa' }}>{r.date}</div>
                <div className="text-sm font-medium" style={{ color: '#22c55e' }}>
                  {r.count} {r.species}
                </div>
                {r.also && r.also.length > 0 && (
                  <div className="text-xs text-[#e2e8f0]">
                    {r.also.map(a => `${a.count} ${a.species}`).join(' · ')}
                  </div>
                )}
                <div className="text-[11px]" style={{ color: '#556677' }}>{r.anglers} anglers</div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Trips */}
        <div className="p-4">
          <div className="text-[10px] uppercase font-semibold tracking-wide mb-3" style={{ color: '#556677' }}>
            Upcoming Trips
          </div>
          {upcomingTrips.length === 0 ? (
            <div className="text-xs" style={{ color: '#556677' }}>No upcoming trips</div>
          ) : (
            upcomingTrips.map((t) => (
              <div key={t.id} className="mb-2.5 p-2 rounded-md" style={{ backgroundColor: '#0a0f1a' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#e2e8f0]">
                    {new Date(t.departureDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#00d4ff' }}>${t.pricePerPerson}</span>
                </div>
                <div className="text-[11px]" style={{ color: '#8899aa' }}>{t.duration} · {t.departureTime}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px]" style={{ color: t.spotsLeft <= 5 ? '#f97316' : '#e2e8f0' }}>
                    {t.spotsLeft} spots left
                  </span>
                  <WatchTripButton tripId={t.id} boatName={t.boatName} tripDate={t.departureDate} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create My Boats page**

```typescript
// src/app/my-boats/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Header from '@/components/Header';
import BoatCard from '@/components/my-boats/BoatCard';
import { FLEET_ROSTER } from '@/lib/fleet/boats';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
import type { ScheduledTrip } from '@/lib/trips/types';
import Link from 'next/link';

export default function MyBoatsPage() {
  const { user, loading, favorites, openAuthModal } = useAuth();
  const router = useRouter();
  const [liveTrips, setLiveTrips] = useState<ScheduledTrip[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [catchReports, setCatchReports] = useState<Record<string, any[]>>({});

  // Redirect to home if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      openAuthModal();
    }
  }, [loading, user, router, openAuthModal]);

  // Fetch live trips
  useEffect(() => {
    fetch('/api/trips')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLiveTrips(data); })
      .catch(() => {});
  }, []);

  // Fetch catch reports
  useEffect(() => {
    fetch('/api/catch-reports')
      .then(r => r.json())
      .then((data: { boat: string }[]) => {
        if (!Array.isArray(data)) return;
        const grouped: Record<string, unknown[]> = {};
        for (const report of data) {
          const key = report.boat.toLowerCase();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(report);
        }
        setCatchReports(grouped);
      })
      .catch(() => {});
  }, []);

  // Build boat data for favorites
  const favBoats = useMemo(() => {
    return FLEET_ROSTER
      .filter(b => favorites.has(b.mmsi))
      .map(b => {
        const allTrips = [...TRIP_SCHEDULE, ...liveTrips];
        const boatTrips = allTrips.filter(t =>
          t.boatName.toLowerCase() === b.name.toLowerCase()
        );
        const boatReports = catchReports[b.name.toLowerCase()] || [];
        return { ...b, trips: boatTrips, reports: boatReports };
      });
  }, [favorites, liveTrips, catchReports]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm" style={{ color: '#8899aa' }}>Loading...</div>
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(180deg, #131b2e 0%, #0a0f1a 100%)' }} className="px-6 pt-8 pb-5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#f0c040', fontSize: 20 }}>★</span>
              <h1 className="text-2xl font-extrabold text-[#e2e8f0]">My Boats</h1>
            </div>
            <p className="text-sm" style={{ color: '#8899aa' }}>
              Tracking {favorites.size} boat{favorites.size !== 1 ? 's' : ''} across San Diego landings
            </p>
          </div>
        </div>

        {/* Boat Cards */}
        <div className="max-w-3xl mx-auto px-6 pb-8">
          {favBoats.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-lg font-semibold text-[#e2e8f0] mb-2">No boats followed yet</div>
              <p className="text-sm mb-4" style={{ color: '#8899aa' }}>
                Follow boats to see their latest reports and upcoming trips here.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/plan-your-trip" className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}>
                  Plan a Trip
                </Link>
                <Link href="/fleet-tracker" className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#1e2a42', color: '#e2e8f0', border: '1px solid #1e2a42' }}>
                  Fleet Map
                </Link>
              </div>
            </div>
          ) : (
            <>
              {favBoats.map(b => (
                <BoatCard
                  key={b.mmsi}
                  boatName={b.name}
                  mmsi={b.mmsi}
                  landing={b.landing}
                  vesselType={b.vesselType}
                  reports={b.reports}
                  trips={b.trips}
                />
              ))}
              <div className="text-center text-sm mt-4" style={{ color: '#556677' }}>
                Follow more boats from{' '}
                <Link href="/plan-your-trip" style={{ color: '#00d4ff' }}>Plan Trip</Link>
                {' '}or{' '}
                <Link href="/fleet-tracker" style={{ color: '#00d4ff' }}>Fleet Map</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 4: Test manually**

Navigate to `/my-boats` while logged out — should redirect to home and open auth modal. Log in, follow some boats, then navigate to `/my-boats` — should show boat cards with reports and trips.

- [ ] **Step 5: Commit**

```bash
git add src/app/my-boats/ src/components/my-boats/
git commit -m "feat: add My Boats dashboard page with BoatCard component"
```

---

## Chunk 6: Email Notifications

### Task 16: Email Sender Utility

**Files:**
- Create: `src/lib/notifications/email.ts`

- [ ] **Step 1: Create Resend email sender**

```typescript
// src/lib/notifications/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TripAlertEmail {
  to: string;
  boatName: string;
  tripDate: string;
  duration: string;
  spotsLeft: number;
  type: 'selling_out' | 'spots_opened';
}

export async function sendTripAlert({ to, boatName, tripDate, duration, spotsLeft, type }: TripAlertEmail) {
  const dateStr = new Date(tripDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const subject = type === 'selling_out'
    ? `🎣 ${boatName} — ${dateStr} is almost full!`
    : `🎣 ${boatName} — Spots opened on ${dateStr}!`;

  const body = type === 'selling_out'
    ? `<p>The <strong>${boatName}</strong> ${duration} trip on <strong>${dateStr}</strong> is down to <strong>${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}</strong>.</p>
       <p>Book soon before it sells out!</p>`
    : `<p>Great news! Spots have opened up on the <strong>${boatName}</strong> ${duration} trip on <strong>${dateStr}</strong>.</p>
       <p>There are now <strong>${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}</strong> available.</p>`;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">
        THE <span style="color: #00d4ff;">BITE</span> REPORT
      </div>
      ${body}
      <p style="margin-top: 24px;">
        <a href="https://thebitereport.com/plan-your-trip"
           style="background: #00d4ff; color: #0a0f1a; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          View Trips
        </a>
      </p>
      <p style="margin-top: 32px; font-size: 12px; color: #888;">
        You're receiving this because you're watching this trip on The Bite Report.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: 'The Bite Report <alerts@thebitereport.com>',
    to,
    subject,
    html,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifications/email.ts
git commit -m "feat: add Resend email sender for trip alerts"
```

---

### Task 17: Trip Alert Notification Logic

**Files:**
- Create: `src/lib/notifications/trip-alerts.ts`

- [ ] **Step 1: Create the notification processor**

```typescript
// src/lib/notifications/trip-alerts.ts
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendTripAlert } from './email';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';

// Minimal trip shape needed for alert processing — works with both
// ScheduledTrip (static schedule) and scraped trip data (different duration type).
interface AlertTrip {
  id: string;
  boatName: string;
  duration: string;
  spotsLeft: number;
}

export async function processTripWatchAlerts(liveTrips: AlertTrip[]) {
  const today = new Date().toISOString().split('T')[0];

  // All available trips (static + scraped)
  const allTrips = [...TRIP_SCHEDULE, ...liveTrips];
  const tripMap = new Map(allTrips.map(t => [t.id, t]));

  // Get all active watches with user emails
  const { data: watches, error } = await supabaseAdmin
    .from('trip_watches')
    .select('*, profiles!inner(id)')
    .gte('trip_date', today);

  if (error || !watches?.length) return { processed: 0, alerts: 0 };

  let alertsSent = 0;

  for (const watch of watches) {
    const trip = tripMap.get(watch.trip_id);
    if (!trip) continue;

    const spotsLeft = trip.spotsLeft;
    const prevSpots = watch.last_known_spots;

    // Update last_known_spots
    await supabaseAdmin
      .from('trip_watches')
      .update({ last_known_spots: spotsLeft })
      .eq('id', watch.id);

    // Get user email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(watch.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    // Selling out alert: spots <= 5, not yet notified
    if (spotsLeft <= 5 && spotsLeft > 0 && !watch.notified_selling_out_at) {
      try {
        await sendTripAlert({
          to: email,
          boatName: watch.boat_name,
          tripDate: watch.trip_date,
          duration: trip.duration,
          spotsLeft,
          type: 'selling_out',
        });
        await supabaseAdmin
          .from('trip_watches')
          .update({ notified_selling_out_at: new Date().toISOString() })
          .eq('id', watch.id);
        alertsSent++;
      } catch {
        // Log but don't fail the whole batch
        console.error(`Failed to send selling-out alert for watch ${watch.id}`);
      }
    }

    // Spots opened alert: was 0, now > 0, not yet notified
    if (prevSpots === 0 && spotsLeft > 0 && !watch.notified_spots_opened_at) {
      try {
        await sendTripAlert({
          to: email,
          boatName: watch.boat_name,
          tripDate: watch.trip_date,
          duration: trip.duration,
          spotsLeft,
          type: 'spots_opened',
        });
        await supabaseAdmin
          .from('trip_watches')
          .update({ notified_spots_opened_at: new Date().toISOString() })
          .eq('id', watch.id);
        alertsSent++;
      } catch {
        console.error(`Failed to send spots-opened alert for watch ${watch.id}`);
      }
    }
  }

  // Cleanup: remove watches for past trips
  await supabaseAdmin
    .from('trip_watches')
    .delete()
    .lt('trip_date', today);

  return { processed: watches.length, alerts: alertsSent };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifications/trip-alerts.ts
git commit -m "feat: add trip watch notification processor with selling-out and spots-opened alerts"
```

---

### Task 18: Extend Cron Job with Notifications

**Files:**
- Modify: `src/app/api/cron/scrape/route.ts`

- [ ] **Step 1: Add notification step to the cron route**

At the top, add import:

```typescript
import { processTripWatchAlerts } from '@/lib/notifications/trip-alerts';
```

After the scrape completes and before returning the response (around line 40), add:

```typescript
// Process trip watch notifications
let alertResult = { processed: 0, alerts: 0 };
try {
  // Fetch latest trip data for spot counts
  const { scrapeFishingReservations } = await import('@/lib/scraper/parsers/fishing-reservations');
  const liveTrips = await scrapeFishingReservations();
  alertResult = await processTripWatchAlerts(liveTrips);
} catch (e) {
  console.error('Trip alert processing failed:', e);
}
```

Update the response JSON to include alert stats (preserve the existing `count` key name):

```typescript
return NextResponse.json({
  ok: true,
  count: reports.length,  // keep existing key name
  alerts: alertResult.alerts,
  watchesProcessed: alertResult.processed,
  elapsedMs,
});
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/scrape/route.ts
git commit -m "feat: extend daily cron with trip watch email notifications"
```

---

### Task 19: Final Build & Deploy

- [ ] **Step 1: Full build check**

```bash
npx next build
```

Expected: Clean build with no errors.

- [ ] **Step 2: Add Supabase + Resend env vars to Vercel**

In the Vercel dashboard (Settings > Environment Variables), add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

- [ ] **Step 3: Deploy to production**

```bash
npx vercel --prod
```

- [ ] **Step 4: Verify on production**

1. Visit thebitereport.com — "Sign In" button should appear in header
2. Sign up with email/password — should work
3. Follow a boat on Plan Trip — star turns gold
4. Navigate to /my-boats — boat card appears with reports and trips
5. Watch a trip — "Watching" button turns cyan

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: final polish for auth and favorites launch"
```
