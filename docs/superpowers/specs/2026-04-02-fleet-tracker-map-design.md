# Fleet Tracker Map — Design Spec

## Context

The Bite Report needs a live fleet tracker map showing real-time positions and fishing activity of San Diego sportfishing boats from Seaforth Landing and Fisherman's Landing. The core value proposition: anglers can see which boats are actively catching fish right now, based on AIS position analysis.

## Architecture

### New page: `/fleet-tracker`

Lives within the existing Next.js app, shares the Header and dark marine theme.

### Files

```
src/app/fleet-tracker/page.tsx          — Page shell (server component, metadata)
src/components/fleet-tracker/
  FleetMap.tsx                           — Main client component: Leaflet map, AIS connection, all state
  Sidebar.tsx                            — Boat list, search, filters
  BoatPopup.tsx                          — Click popup content
  MapLegend.tsx                          — Status icon/color legend
  StatusBadge.tsx                        — Reusable fishing status indicator
src/lib/fleet/
  boats.ts                               — Fleet roster (name, MMSI, landing)
  ais.ts                                  — aisstream.io WebSocket manager
  fishing-detection.ts                    — Position history + status algorithms
  types.ts                                — TypeScript types
```

### Dependencies

- `leaflet` — map rendering
- `@types/leaflet` — TypeScript definitions
- `react-leaflet` — React wrapper for Leaflet

### Data flow

```
aisstream.io WebSocket
  → Parse AIS PositionReport (msg types 1, 2, 3)
  → Match against fleet roster by MMSI OR geo+vessel-type filter
  → Update 15-min rolling position history buffer per boat
  → Run fishing detection algorithm
  → Update React state
  → Leaflet renders markers with status, animations, labels
  → Sidebar re-renders sorted boat list
```

## AIS Data Source

### Provider: aisstream.io (free tier)

- WebSocket endpoint: `wss://stream.aisstream.io/v0/stream`
- Free signup at aisstream.io for API key
- API key stored in `.env.local` as `NEXT_PUBLIC_AISSTREAM_API_KEY`
- Client-side WebSocket (the key is exposed to the browser — aisstream.io expects this)

### Subscription

Send on connect:

```json
{
  "APIKey": "<key>",
  "BoundingBoxes": [[[-118.5, 32.0], [-117.0, 33.5]]],
  "FilterMessageTypes": ["PositionReport"]
}
```

**Important:** aisstream.io uses `[lng, lat]` order (GeoJSON convention), NOT Leaflet's `[lat, lng]`. The bounding box above is SW corner `[-118.5, 32.0]` and NE corner `[-117.0, 33.5]`, covering San Diego coast out to Cortez Bank and up to Dana Point.

**Volume note:** The free tier receives ALL vessel types in the bounding box, not just fishing vessels. Client-side filtering handles this — known MMSIs are matched first, then vessel type 30 as fallback. The volume of non-matching messages is manageable (San Diego is not a major shipping lane like Long Beach). If volume becomes an issue, consider proxying through a Next.js API route that filters server-side.

### Parsed fields from PositionReport

- `UserID` (MMSI)
- `Latitude`, `Longitude`
- `Sog` (speed over ground, knots, 1/10 knot precision)
- `Cog` (course over ground, degrees)
- `TrueHeading` (degrees, 511 = not available)
- `Timestamp` (seconds past the minute)

### Matching logic

1. Check if MMSI is in the known fleet roster → use boat name and metadata
2. Else check if vessel type = 30 (fishing) and position is within the bounding box → add as "Unknown Fishing Vessel (MMSI: XXXXXXXXX)"
3. Else ignore the message

### Reconnection

Auto-reconnect on disconnect with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max. Reset backoff on successful connection.

## Fleet Roster

### Structure

```typescript
interface FleetBoat {
  name: string;
  mmsi: number;
  landing: 'seaforth' | 'fishermans';
  vesselType?: string; // e.g. "3/4 Day", "Full Day", "Overnight", "Multi-Day"
}
```

### Initial roster (~20 boats)

Research and include all publicly known MMSIs for:

**Seaforth Landing:** New Seaforth, Apollo, Aztec, Cortez, El Gato Dos, Highliner, Legacy, San Diego, Sea Watch

**Fisherman's Landing:** Polaris Supreme, Dolphin, Liberty, Fortune, Islander, Pacific Queen, Excel, Constitution, Pegasus

The array is a simple editable list in `boats.ts`. Adding a boat = adding one object.

**MMSI lookup:** Use MarineTraffic.com or VesselFinder.com to search by vessel name. Many sportfishing vessels carry Class B AIS transponders with publicly searchable MMSIs. Boats without findable MMSIs will still appear via the geographic fallback filter. The initial roster will include all MMSIs discoverable at implementation time; the array is designed to be easily updated as more are found.

### Geographic fallback

AIS messages with vessel type 30 (fishing) inside the bounding box that don't match a known MMSI are shown as unknown fishing vessels. This catches unlisted boats and visiting vessels.

## Fishing Activity Detection

### Position history buffer

For each tracked boat, maintain a rolling circular buffer of the last 15 minutes of positions:

```typescript
interface PositionEntry {
  lat: number;
  lng: number;
  speed: number;    // knots (SOG)
  heading: number;  // degrees (COG or TrueHeading)
  timestamp: number; // Unix ms
}
```

Prune entries older than 15 minutes on every new AIS message.

**Classification prerequisites (must ALL be met before any status other than "In Port" is assigned):**
- At least 3 entries in the buffer
- The most recent entry timestamp is within the last 5 minutes (prevents stale-data false positives when AIS signal drops)
- If prerequisites are not met, classify as "Unknown" with a gray marker and "(No recent data)" label

**Sub-window behavior:** When the "Catching Fish" algorithm requires a 10-minute window but the buffer has less than 10 minutes of data (e.g., boat was just detected 6 minutes ago), use all available data. The 10-minute threshold is the minimum continuous stationary duration — if the buffer only covers 6 minutes, the boat cannot qualify as "Catching Fish" yet. It may qualify as "Drifting" instead.

### Status classifications

Evaluated in order on every new position. First match wins.

#### 1. "In Port"

**Condition:** Position is within 1 nautical mile (1852 meters) of either landing:
- Seaforth Landing: 32.7137, -117.2275
- Fisherman's Landing: 32.7131, -117.2315

**Visual:** Gray marker, no fishing indicator. Dimmed in sidebar.

#### 2. "Catching Fish" (ON THE BITE)

**Conditions (all must be true):**
- Not in port
- Classification prerequisites met (3+ entries, most recent < 5 min old)
- Buffer spans at least 10 minutes (oldest entry is 10+ min before newest)
- Every position in the trailing 10-minute window has speed < 1 knot
- The 10-minute window has at least 3 data points

**Visual:** Pulsing green fish icon. "ON THE BITE" label. Green glow animation on marker.

#### 3. "Circling / Chumming" (THROWING BAIT)

**Conditions (all must be true):**
- Not in port
- Not classified as "Catching Fish"
- Classification prerequisites met
- At least 3 positions in the trailing 3-minute window
- All speeds in window are >= 0.5 and <= 3 knots (inclusive both ends)
- All positions fit within a 500-meter bounding radius from their centroid (Haversine)
- Cumulative heading change exceeds 180 degrees (see algorithm below)

**Heading change algorithm (cumulative delta only — no circular standard deviation):**
1. Collect all headings in the 3-minute window, ordered by timestamp
2. For each consecutive pair, compute the smallest angle between them: `delta = min(|h2 - h1|, 360 - |h2 - h1|)`
3. Sum all deltas
4. If sum >= 180 degrees → boat is circling (a full circle = 360, half circle = 180). This threshold avoids false positives from a single course change while catching boats that are making sustained turns.

**Bounding radius algorithm:**
1. Compute centroid (average lat, average lng)
2. For each position, compute Haversine distance to centroid
3. If max distance < 500 meters → boat is staying in a small area

**Visual:** Orange dashed circle ring around boat marker. "THROWING BAIT" label. Orange pulse animation.

#### 4. "Transit"

**Condition:** Not in port, most recent speed > 3 knots (exclusive — 3.0 knots is NOT transit).

**Visual:** Blue marker with heading arrow (rotated to COG). No special indicator.

#### 5. "Drifting / Slow"

**Condition:** Fallback for any boat that is not in port and did not match statuses 2-4. Covers speeds from 1.0 to 3.0 knots inclusive, and any edge cases.

**Boundary clarification for all statuses:**
- Speed < 1.0: eligible for "Catching Fish" (if sustained 10 min) or falls to "Drifting"
- Speed >= 0.5 and <= 3.0: eligible for "Circling" (if heading/radius criteria met)
- Speed > 3.0: "Transit"
- Speed 1.0 to 3.0, not circling: "Drifting"
- Speed < 0.5, not sustained 10 min: "Drifting"

**Visual:** Cyan marker. Could be slow-trolling or repositioning.

## Map UI

### Map setup

- Library: Leaflet via `react-leaflet`
- Tiles: CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) — free, no key, matches dark theme
- Center: 32.71, -117.23 (Point Loma / Seaforth area)
- Initial zoom: 11 (shows local fishing grounds)
- Max bounds: roughly SoCal coast (prevent scrolling to irrelevant areas)

### Boat markers

Custom Leaflet `DivIcon` (HTML/CSS, not image files). Each marker contains:
- Boat icon (SVG boat shape), rotated to heading via CSS transform
- Color-coded by status (gray/green/orange/blue/cyan)
- Boat name label below the icon
- Status indicator overlay (pulsing glow for catching fish, dashed ring for circling)
- For smooth position updates: use Leaflet's `marker.setLatLng()` on existing marker instances (do NOT recreate the DivIcon on each update). Store marker refs in a `Map<mmsi, L.Marker>` and mutate them in place. CSS transition on the marker's container element handles the animation automatically when Leaflet updates the transform.

### Hover tooltip

Lightweight Leaflet tooltip (appears instantly on hover):
- Boat name
- Speed and course
- Current status badge (colored pill with status text)

### Click popup

Rich Leaflet popup or custom overlay:
- Boat name (large)
- Landing: Seaforth / Fisherman's
- Position: lat, lng (formatted)
- Speed: X.X knots
- Course: XXX degrees
- Last updated: timestamp
- Fishing status: status badge + explanation text ("Stationary > 10 min — likely catching fish")
- Trip type (if known from roster)
- Toggle: "Show track" to display position history polyline

### Track lines

When toggled per-boat:
- Render as multiple Leaflet Polyline segments (one per consecutive pair of positions), each with decreasing opacity from newest (1.0) to oldest (0.2). Leaflet does not support per-vertex opacity on a single Polyline, so N-1 segments are needed for N points.
- Use the boat's status color for all segments
- Cleared when boat returns to port or user toggles off

## Sidebar

### Layout

Left panel, 320px wide on desktop. Collapsible to icon-only on mobile (slide-out drawer).

### Contents (top to bottom)

1. **Connection status:** Green dot + "Live" or red dot + "Reconnecting..."
2. **"Last updated: X seconds ago"** — live counter, updates every second
3. **Search input:** Filters boat list by name
4. **Filter pills:** All | Seaforth | Fisherman's | Catching Fish | Circling — toggleable, multiple can be active
5. **Boat count:** "Showing X of Y boats"
6. **Boat list:** Scrollable list, each row shows:
   - Status color indicator (dot)
   - Boat name (bold)
   - Status badge text
   - Speed
   - Landing name (subtle)
   - Click → fly-to boat on map + open popup

### Sort order

1. Catching Fish (green) — most interesting, top
2. Circling/Chumming (orange)
3. Transit (blue)
4. Drifting (cyan)
5. In Port (gray) — least interesting, bottom

Within each group, alphabetical by name.

## Map Controls

- **Fullscreen button** — top-right, toggles browser fullscreen
- **Recenter button** — returns to initial San Diego view (32.71, -117.23, zoom 11)
- **Zoom controls** — Leaflet default, styled to match dark theme
- **Legend** — bottom-right overlay, shows all 5 status icons with labels and colors

## Error & Empty States

**No API key configured:** Map renders with dark tiles but no boats. Centered overlay message: "Fleet tracker requires an AIS data connection. Configure your aisstream.io API key to see live boat positions." No crash, no console errors beyond a warning.

**WebSocket disconnected:** Red dot in sidebar header + "Reconnecting..." text. Existing boat markers remain on map at their last known positions with a subtle dimming effect. Reconnection happens automatically with exponential backoff.

**No boats visible:** Map renders normally. Sidebar shows "No boats currently tracked" with a brief explanation: "Boats appear when they transmit AIS positions. Fleet may be in port or out of AIS range."

**AIS data but no fleet matches:** If the WebSocket streams data but no MMSIs match the roster and no type-30 vessels are in the box, show the same "No boats currently tracked" state.

## Styling

Inherits the existing Bite Report dark theme:
- Background: `#0a0f1a`
- Surface: `#131b2e`
- Border: `#1e2a42`
- Primary accent: `#00d4ff`
- Status colors: green `#22c55e` (catching), orange `#f97316` (circling), blue `#3b82f6` (transit), cyan `#06b6d4` (drifting), gray `#6b7280` (port)

## Known Limitations

1. **AIS coverage near shore:** Land interference causes gaps within 1-2 miles of shore. Boats may "disappear" briefly when departing/returning to port.
2. **Free tier delays:** aisstream.io free tier may have 1-2 minute latency on position reports.
3. **Small vessel coverage:** Boats under 65ft may not carry Class A AIS transponders (only Class B, which reports less frequently, or none at all).
4. **Stale data false positives:** If AIS signal drops, the last known position stays stationary. The 3-position minimum in the detection window mitigates this, but extended outages could still trigger false "catching fish" status.
5. **API key exposure:** The `NEXT_PUBLIC_` prefixed key is baked into the JS bundle at build time and visible in `_next/static/` chunks to anyone inspecting page source. The aisstream.io free tier key has no IP/domain restrictions, so anyone could extract and reuse it against your connection quota. Accepted risk for MVP. To mitigate later: proxy the WebSocket through a Next.js API route (`/api/fleet/ws`) that holds the key server-side and relays messages to the client.
6. **Rate limits:** Free tier allows approximately 1 concurrent WebSocket connection.
7. **False positives from stale data:** If AIS signal drops for an extended period, the last known position appears stationary. Mitigated by requiring the most recent position timestamp to be within 5 minutes for any fishing status classification. Boats with stale data show "Unknown" status with "(No recent data)" label.

## Verification

1. Start dev server, navigate to `/fleet-tracker`
2. Verify map renders with dark tiles, centered on San Diego
3. With a valid aisstream.io API key, verify WebSocket connects and boats appear
4. Without API key, verify graceful error state (not a crash)
5. Test sidebar search and filter functionality
6. Test hover tooltips and click popups
7. Test mobile responsive layout (sidebar collapses)
8. Verify fishing detection: if a tracked boat is stationary for 10+ min, status should change to "Catching Fish" with green pulsing marker
