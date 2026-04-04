# User Auth & Boat Favorites

## Overview

Add user authentication and a boat favorites system to The Bite Report. Users can sign in, follow boats, watch specific trips for availability alerts, and view a personalized "My Boats" dashboard.

## Auth

**Provider**: Supabase Auth (already installed as `@supabase/supabase-js`).

**Login methods**: Email/password and social login (Google, Apple).

**UI pattern**: Modal overlay triggered by a "Sign In" button in the header — not a separate page. The modal shows social login buttons at top, email/password form below, with a toggle between Sign In and Sign Up.

**Logged-in state**: The header "Sign In" button is replaced by an avatar circle showing user initials (derived from `display_name`, falling back to email). A "My Boats" nav link appears in the navigation bar. Clicking the avatar opens a dropdown with: display name/email, My Boats link, and Sign Out. (Settings page is out of scope for this iteration — no dead link in the dropdown.)

## Database Schema

Three tables in Supabase Postgres. All have Row Level Security (RLS) so users can only access their own data.

### `profiles`

Extends Supabase's built-in `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, FK to `auth.users.id` |
| `display_name` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

RLS: SELECT and UPDATE where `auth.uid() = id`.

**Row creation**: A Supabase database trigger (`on auth.users INSERT`) automatically creates a `profiles` row for each new user, setting `display_name` from the user's email prefix or OAuth display name.

### `boat_favorites`

Tracks which boats a user follows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, `gen_random_uuid()` |
| `user_id` | UUID | FK to `profiles.id`, NOT NULL |
| `boat_mmsi` | INT | NOT NULL, matches fleet roster MMSI |
| `created_at` | TIMESTAMPTZ | |

Constraints: `UNIQUE(user_id, boat_mmsi)`.

RLS: SELECT, INSERT, DELETE where `auth.uid() = user_id`.

### `trip_watches`

Tracks specific trips a user is watching for availability alerts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, `gen_random_uuid()` |
| `user_id` | UUID | FK to `profiles.id`, NOT NULL |
| `trip_id` | TEXT | Matches `ScheduledTrip.id` |
| `boat_name` | TEXT | Denormalized for display |
| `trip_date` | DATE | |
| `last_known_spots` | INT | NULL initially, updated by cron to track availability changes |
| `notified_selling_out_at` | TIMESTAMPTZ | NULL until "selling out" alert sent |
| `notified_spots_opened_at` | TIMESTAMPTZ | NULL until "spots opened" alert sent |
| `created_at` | TIMESTAMPTZ | |

Constraints: `UNIQUE(user_id, trip_id)`.

RLS: SELECT, INSERT, DELETE where `auth.uid() = user_id`.

## API Routes

### Auth

Supabase client handles auth directly — no custom API routes needed for login/signup/logout. A Supabase client is initialized once and shared via a provider context.

### Favorites

**`GET /api/favorites`** — Returns the current user's boat favorites list. Requires auth.

**`POST /api/favorites`** — Body: `{ mmsi: number }`. Adds a boat to favorites. Returns the new favorite row. Requires auth.

**`DELETE /api/favorites/[mmsi]`** — Removes a boat from favorites. Requires auth.

### Trip Watches

**`GET /api/trip-watches`** — Returns the current user's watched trips. Requires auth.

**`POST /api/trip-watches`** — Body: `{ tripId: string, boatName: string, tripDate: string }`. Adds a trip watch. Requires auth.

**`DELETE /api/trip-watches/[tripId]`** — Removes a trip watch. Requires auth. Trip IDs may contain special characters (e.g., `gen-newsea-0418-12dayam`) — URL-encode when constructing the request path.

## Client-Side State

An `AuthProvider` React context wraps the app in `layout.tsx`. It provides:

- `user` — current Supabase user or null
- `profile` — user's profile row or null
- `favorites` — Set of MMSI numbers the user follows (fetched on login)
- `tripWatches` — Set of trip IDs the user is watching (fetched on login)
- `toggleFavorite(mmsi)` — Add/remove a boat favorite
- `toggleTripWatch(tripId, boatName, tripDate)` — Add/remove a trip watch
- `signIn()` / `signUp()` / `signOut()` — Auth actions
- `openAuthModal()` / `closeAuthModal()` — Modal visibility

The favorites and trip watches sets are fetched once on login and kept in memory. Mutations optimistically update the local set and fire the API call.

## Components

### New Components

**`AuthProvider`** (`src/components/auth/AuthProvider.tsx`) — Context provider wrapping the app. Initializes Supabase client, listens for auth state changes, fetches favorites and trip watches on login.

**`AuthModal`** (`src/components/auth/AuthModal.tsx`) — Full-screen modal overlay with Sign In / Sign Up form. Social login buttons (Google, Apple) at top, email/password below. Dark marine theme matching site.

**`UserMenu`** (`src/components/auth/UserMenu.tsx`) — Avatar circle with initials dropdown (initials derived from `display_name`, falling back to email). Shows display name, email, link to My Boats, and Sign Out button.

**`FavoriteButton`** (`src/components/auth/FavoriteButton.tsx`) — Star toggle (★/☆) for boat following. Takes `mmsi` prop. Shows filled gold star when favorited, hollow gray when not. If user is not logged in, clicking opens the auth modal.

**`WatchTripButton`** (`src/components/auth/WatchTripButton.tsx`) — "Watch Trip" / "Watching" toggle button. Takes `tripId`, `boatName`, `tripDate` props. Text only, no emoji. If user is not logged in, clicking opens the auth modal.

**`MyBoatsPage`** (`src/app/my-boats/page.tsx`) — Dedicated page at `/my-boats`. Redirects to home if not logged in. Shows boat cards for each favorited boat.

**`BoatCard`** (`src/components/my-boats/BoatCard.tsx`) — Card for a single favorited boat on the My Boats page. Two columns: Latest Reports (recent catches) and Upcoming Trips (next departures with Watch toggle).

### Modified Components

**`Header`** (`src/components/Header.tsx`) — Add "Sign In" button (logged out) or `UserMenu` avatar (logged in). Show "My Boats" nav link when logged in.

**`TripResults`** (`src/components/trip-planner/TripResults.tsx`) — Add `FavoriteButton` next to boat name. Add `WatchTripButton` in trip details row. Show green "FOLLOWING" badge on favorited boats.

**`CatchReportsPanel`** (`src/components/CatchReportsPanel.tsx`) — Sort favorited boat reports to top. Add gold left-border accent and filled star on favorited boats. Add hollow star on unfavorited boats. Note: this panel currently uses sample/scraped data from the in-memory cache — favorites integration works on whatever data the panel displays.

**Fleet Map popups** (`src/components/fleet-tracker/BoatPopup.tsx`) — Add gold star and "FOLLOWING" badge on favorited boats in map popups. `BoatPopup` needs access to the favorites set via the `AuthProvider` context. The fleet-tracker page components that render `BoatPopup` must be client components to access context.

## My Boats Page

Route: `/my-boats`. Only accessible when logged in — redirects to home with auth modal if not.

**Header**: "★ My Boats" title with subtitle "Tracking N boats across San Diego landings".

**Boat cards** (one per favorited boat, stacked vertically):

Each card has a header row showing boat name, gold star, landing name, and vessel type.

Two data columns:

1. **Latest Reports** — Most recent catch reports for that boat. Shows date, species with counts, and angler count. Pulled from the catch reports API filtered by boat name.

2. **Upcoming Trips** — Next scheduled departures for that boat. Shows date, duration, departure time, price, spots remaining, and Watch/Watching toggle. Pulled from the trips API filtered by boat name.

**Empty state**: If the user has no favorites, show a message with links to Plan Trip and Fleet Map to discover boats.

**Footer tip**: "Follow more boats from the Plan Trip or Fleet Map pages."

## Inline Integration

### Plan Trip Page

- `FavoriteButton` (★/☆) appears next to boat name on each trip result card
- Green "FOLLOWING" badge shown next to star when boat is favorited
- `WatchTripButton` ("Watch Trip" / "Watching") at the end of the trip details row

### Fleet Map

- Favorited boats show a gold star in their popup
- "FOLLOWING" badge in popup footer

### Catch Reports Panel

- Favorited boat reports sort to the top of the list
- Gold left-border accent (`border-left: 3px solid #f0c040`) on favorited boat reports
- Filled gold star next to favorited boat names, hollow star on unfavorited

## Email Notifications

### Trigger

The existing daily cron job (`/api/cron/scrape`) is extended with a notification step after scraping completes.

### Logic

For each row in `trip_watches` where `trip_date >= today`:

1. Look up the matching trip from the scraper/schedule data
2. Update `last_known_spots` with the current `spotsLeft` value
3. **Selling out alert**: If `spotsLeft <= 5` and `notified_selling_out_at IS NULL`, send "selling out" email and set `notified_selling_out_at`
4. **Spots opened alert**: If `last_known_spots` was 0 (previous cron run) and now `spotsLeft > 0` and `notified_spots_opened_at IS NULL`, send "spots opened" email and set `notified_spots_opened_at`

This gives users up to two notifications per watched trip: one when it's almost full, and one if spots reopen after selling out.

### Email Delivery

Use Resend (`resend` npm package, free tier: 100 emails/day). Resend is called directly from the cron API route — no Supabase Edge Functions needed. Requires a `RESEND_API_KEY` environment variable. Simple HTML email with:

- Subject: "🎣 [Boat Name] — [Trip Date] is almost full!"
- Body: Boat name, trip date, duration, spots remaining, link to Plan Trip page

### Cleanup

A separate step in the cron job deletes `trip_watches` rows where `trip_date < today` to prevent stale data accumulation.

## Out of Scope

These items are explicitly excluded from this iteration:

- Live boat position on My Boats page (can add later)
- In-app notification bell / dropdown
- Push notifications (browser or mobile)
- Favoriting individual catch reports
- Social features (sharing favorites, public profiles)
- Settings page beyond basic profile editing
