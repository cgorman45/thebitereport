# User Profile Page — Design Spec

## Goal

Add a `/profile` page where authenticated users can choose a pixel-art avatar, view their saved trips and favorited boats, and configure per-alert email/SMS notification preferences.

## Architecture

The profile page is a standalone route (`/profile`) separate from the existing My Boats page. Profile data is stored by extending the existing Supabase `profiles` table with three new columns (`avatar_key`, `phone`, `notification_prefs`). A new API route (`/api/profile`) handles reads and updates. Avatar images are static PNGs served from `/public/avatars/`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Profile page location | Separate `/profile` route | My Boats stays focused on boat content; profile handles settings |
| Avatar system | 14 preset pixel-art PNGs | No upload infrastructure needed; consistent brand aesthetic |
| Avatar style | Detailed pixel art (64-128px) | Retro 80s game feel matching The Bite Report brand |
| Data storage | Extend `profiles` table | Notification prefs, avatar, and phone are always loaded together; JSONB keeps it flexible |
| Notification channels | Email + SMS with per-alert granularity | Users pick which alerts go to which channel |

## Data Model

### Schema Change: `profiles` table

Add three columns via migration:

```sql
ALTER TABLE profiles
  ADD COLUMN avatar_key text DEFAULT 'captain',
  ADD COLUMN phone text,
  ADD COLUMN notification_prefs jsonb DEFAULT '{
    "bluefin_spotted": {"email": false, "sms": false},
    "spots_opening": {"email": false, "sms": false},
    "ideal_weather": {"email": false, "sms": false},
    "new_reports": {"email": false, "sms": false}
  }'::jsonb;
```

- `avatar_key`: references a filename in `/public/avatars/` (e.g., `"captain"` → `/public/avatars/captain.png`)
- `phone`: 10-digit US phone number stored as digits only, nullable. US numbers only (international out of scope). UI displays "+1" prefix and "(555) 555-1234" formatting.
- `notification_prefs`: JSONB object with four alert types, each having `email` and `sms` boolean flags

### Avatar Registry

A static constant maps avatar keys to display metadata:

```typescript
const AVATARS = [
  // Fish species
  { key: 'bluefin', label: 'Bluefin Tuna', category: 'fish' },
  { key: 'yellowtail', label: 'Yellowtail', category: 'fish' },
  { key: 'yellowfin', label: 'Yellowfin Tuna', category: 'fish' },
  { key: 'dorado', label: 'Dorado', category: 'fish' },
  { key: 'rockfish', label: 'Rockfish', category: 'fish' },
  { key: 'barracuda', label: 'Barracuda', category: 'fish' },
  { key: 'seabass', label: 'White Seabass', category: 'fish' },
  { key: 'calico', label: 'Calico Bass', category: 'fish' },
  // Characters
  { key: 'captain', label: 'Captain', category: 'character' },
  { key: 'pirate', label: 'Pirate', category: 'character' },
  { key: 'deckhand', label: 'Deckhand', category: 'character' },
  { key: 'firstmate', label: 'First Mate', category: 'character' },
  { key: 'angler', label: 'Angler', category: 'character' },
  { key: 'oldsalt', label: 'Old Salt', category: 'character' },
];
```

## API

### `GET /api/profile`

Returns the authenticated user's profile.

**Response:**
```json
{
  "displayName": "Captain Colton",
  "email": "colton@thebitereport.com",
  "avatarKey": "captain",
  "phone": "6195551234",
  "notificationPrefs": {
    "bluefin_spotted": { "email": true, "sms": true },
    "spots_opening": { "email": true, "sms": false },
    "ideal_weather": { "email": false, "sms": false },
    "new_reports": { "email": true, "sms": false }
  },
  "createdAt": "2026-04-01T00:00:00Z"
}
```

### `PATCH /api/profile`

Updates profile fields. Accepts any subset of updatable fields.

**Request body (all fields optional):**
```json
{
  "displayName": "Captain Colton",
  "avatarKey": "pirate",
  "phone": "6195551234",
  "notificationPrefs": {
    "bluefin_spotted": { "email": true, "sms": true },
    "spots_opening": { "email": true, "sms": false },
    "ideal_weather": { "email": false, "sms": false },
    "new_reports": { "email": true, "sms": false }
  }
}
```

**Merge semantics:** `notificationPrefs` is a **full replace** — the client always sends all four alert types when saving notification preferences. This avoids deep-merge complexity and ensures the saved state matches what the user sees in the UI.

**Validation:**
- `avatarKey` must be in the AVATARS registry
- `phone` must be exactly 10 digits or null (to clear)
- `displayName` must be 1-50 characters
- `notificationPrefs` must contain all four alert keys, each with boolean `email` and `sms` fields

**Error responses:**
- `401 { "error": "Unauthorized" }` — no valid auth token
- `400 { "error": "<description>" }` — validation failure (e.g., "avatarKey must be in the avatar registry")
- `500 { "error": "Internal server error" }` — unexpected failure

**Note on column naming:** The API returns camelCase keys (`displayName`, `avatarKey`, etc.) mapped from the snake_case database columns (`display_name`, `avatar_key`). This is intentional — the API layer performs the transformation.

## Page Structure

### Route: `/profile`

Protected page — redirects to home and opens auth modal if not logged in (same pattern as My Boats).

### Profile Header

- Pixel-art avatar (96px circle with cyan border)
- "Change Avatar" link opens an avatar picker modal
- Display name (editable inline or via Account tab)
- "Member since" date
- Quick stat badges: boats favorited count, trips watching count, past trips count

### Tab: Saved Trips (default)

Three sections:

1. **Watched Trips** — active trip watches (departure date in the future). The client fetches trips from `/api/trips` and cross-references by `trip_id` to get duration, landing, price, and spots remaining (the `trip_watches` table only stores `trip_id`, `boat_name`, `trip_date`, and `last_known_spots`). Each row shows boat name, duration, date/time, landing, price, and spots remaining. Colored spot count (green if plenty, red if <=5). If the trip is no longer in the API data, show boat name + date from the watch record with "Details unavailable."

2. **Favorited Boats** — compact chip/pill for each favorited boat with a colored dot (using landing colors). Clicking navigates to My Boats page filtered to that boat.

3. **Trip History** — past trip watches where `trip_date < today`. Same card layout as watched trips but visually faded with "Completed" label. Sorted newest first. Note: "past trips" means previously watched trips that have departed, not verified bookings.

### Tab: Notifications

1. **Phone Number** — input field with US formatting `(555) 555-1234`. Shows "Verified" badge if phone is saved (verification deferred to Twilio integration).

2. **Alert Preferences Grid** — four rows, each with the alert name and two toggle switches (Email, SMS). Column headers label the channels.

   Alert types:
   - Bluefin Tuna spotted
   - Spots opening on popular boats
   - Weather conditions ideal for fishing
   - New catch reports available

3. **Save Preferences** button — saves phone + all toggle states in one PATCH call.

### Tab: Account

- **Display Name** — editable text input
- **Email** — read-only (displayed from Supabase auth, changing email is handled via Supabase auth flow)
- **Password** — masked display with "Change" link (triggers Supabase password reset email)
- **Sign Out** — calls signOut from AuthContext

### Avatar Picker Modal

Triggered by "Change Avatar" link. Renders a grid of all 14 avatars organized by category (Fish Species / Characters). Selecting one highlights it with a cyan border. "Save" button persists the choice via PATCH `/api/profile`. The modal follows the same pattern as the existing AuthModal component.

## Files

### Create
- `src/app/profile/page.tsx` — main profile page with tabs
- `src/app/api/profile/route.ts` — GET and PATCH handlers
- `src/components/profile/AvatarPicker.tsx` — modal for choosing avatar
- `src/components/profile/SavedTripsTab.tsx` — watched trips, favorites, history
- `src/components/profile/NotificationsTab.tsx` — phone + alert prefs grid
- `src/components/profile/AccountTab.tsx` — name, email, password, sign out
- `src/lib/avatars.ts` — avatar registry constant
- `supabase/migrations/002_profile_fields.sql` — add columns to profiles table
- `public/avatars/` — 14 pixel-art PNG files (placeholder SVGs until art is created)

### Modify
- `src/components/auth/AuthProvider.tsx` — expand the existing direct Supabase query (`.select('id, display_name')`) to include the new columns (`.select('id, display_name, avatar_key, phone, notification_prefs')`). Add `avatarKey` to context state. No new API call needed — profile data loads in the same query that already runs on auth state change.
- `src/components/auth/UserMenu.tsx` — show avatar image instead of generic icon, add "Profile" link
- `src/components/Header.tsx` — display user avatar in header when logged in

## Navigation

- UserMenu dropdown gets a "Profile" link at the top
- Header shows the user's pixel-art avatar (small, 28px) instead of the current generic user icon
- My Boats page remains unchanged

## Error Handling

- Profile page shows loading skeleton while fetching
- Failed API calls show inline error messages (not modals)
- If profile fetch fails, show "Unable to load profile" with retry button
- Optimistic updates for avatar selection (show immediately, revert on error)
- Phone validation happens client-side before save

## Out of Scope

- Actual Twilio SMS sending (phone is collected and stored; integration deferred)
- Email sending infrastructure (Resend key still placeholder)
- Profile photo uploads (preset avatars only)
- Email change flow (handled by Supabase auth natively)
- Social/public profiles (profile is private to the user)
