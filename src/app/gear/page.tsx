'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'gear-guide' | 'trip-checklist' | 'tackle-shops';
type TripType = 'Half Day' | 'Full Day' | 'Overnight' | 'Multi-Day';
type Tier = 'bronze' | 'silver' | 'gold';
type SetupWeight = '25lb' | '30lb' | '40lb' | '50lb' | '80lb' | '100lb' | '130lb';

interface SetupItem {
  role: string; // 'Rod', 'Reel', 'Line', 'Leader', 'Hooks', 'Jig/Lure'
  name: string;
  description: string;
  price: string;
  link?: string;
}

interface TierSetup {
  tier: Tier;
  items: SetupItem[];
  totalEstimate: string;
}

interface WeightSetup {
  weight: SetupWeight;
  label: string;
  description: string;
  bestFor: string;
  targetSpecies: string[];
  tiers: Record<Tier, TierSetup>;
}

interface TackleShop {
  name: string;
  address: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// ============================================================================
// GEAR SETUPS — organized by line class, each with Bronze/Silver/Gold tiers
//
// TODO: Fill in Silver and Gold tiers with your preferred recommendations.
// Bronze = budget-friendly, great starting point
// Silver = mid-range, best value for serious anglers
// Gold = premium, top-of-the-line performance
// ============================================================================

const PLACEHOLDER_ITEM: SetupItem = {
  role: 'TBD',
  name: 'Coming Soon',
  description: 'Recommendation pending — check back soon!',
  price: 'TBD',
};

function placeholderTier(tier: Tier, count: number, estimate: string): TierSetup {
  return { tier, items: Array(count).fill(null).map((_, i) => ({
    ...PLACEHOLDER_ITEM,
    role: ['Rod', 'Reel', 'Line', 'Leader', 'Hooks', 'Jig/Lure'][i] || 'Accessory',
  })), totalEstimate: estimate };
}

const SETUPS: WeightSetup[] = [
  {
    weight: '25lb',
    label: '25lb Setup',
    description: 'Light tackle for half-day and inshore trips. Perfect for kelp bass, calico, and yellowtail on light gear.',
    bestFor: 'Half Day, 3/4 Day inshore trips',
    targetSpecies: ['Calico Bass', 'Sand Bass', 'Yellowtail', 'Barracuda', 'Bonito'],
    tiers: {
      bronze: {
        tier: 'bronze',
        totalEstimate: '~$450',
        items: [
          { role: 'Reel', name: 'Penn Fathom II Star Drag (Size 12)', description: 'Reliable star drag conventional reel. Full metal body, 30lb max drag, 6.1:1 gear ratio. Holds 430yds of 10lb mono. Great feel and smooth operation for the price.', price: '$300', link: 'https://www.pennfishing.com/products/penn-fathom-ii-star-drag-conventional-reel' },
          { role: 'Rod', name: 'Penn Carnage III Boat Rod 7\' MH', description: 'Versatile medium-heavy boat rod. Great sensitivity for detecting light bites on calico and bass. Fuji guides, durable composite blank.', price: '$130' },
          { role: 'Line', name: 'Izorline First String 25lb Mono', description: 'SoCal favorite monofilament. Excellent abrasion resistance for fishing around kelp. Clear color.', price: '$12' },
          { role: 'Leader', name: 'Seaguar Blue Label 20lb Fluorocarbon', description: '25 yards of invisible fluorocarbon leader. Virtually invisible to finicky bass in clear water.', price: '$10' },
          { role: 'Hooks', name: 'Mustad Ringed Live Bait #2', description: 'Classic live bait hooks for sardine and anchovy. Ringed eye for easy snelling. Must-have for party boats.', price: '$5' },
          { role: 'Jig', name: 'Tady 45 Surface Iron (blue/white)', description: 'The iconic SoCal surface iron. Cast and retrieve for yellowtail and barracuda. Every angler needs one.', price: '$12' },
        ],
      },
      silver: placeholderTier('silver', 6, '~$700'),
      gold: placeholderTier('gold', 6, '~$1,200'),
    },
  },
  {
    weight: '30lb',
    label: '30lb Setup',
    description: 'Versatile all-around setup. Handles everything from big calico to medium yellowtail. The workhorse of SoCal fishing.',
    bestFor: '3/4 Day, Full Day trips',
    targetSpecies: ['Yellowtail', 'Calico Bass', 'White Seabass', 'Barracuda', 'Bonito'],
    tiers: {
      bronze: placeholderTier('bronze', 6, '~$500'),
      silver: placeholderTier('silver', 6, '~$850'),
      gold: placeholderTier('gold', 6, '~$1,500'),
    },
  },
  {
    weight: '40lb',
    label: '40lb Setup',
    description: 'Stepping up for bigger yellowtail and small tuna. Enough backbone to stop a fish running into structure.',
    bestFor: 'Full Day offshore, Coronado Islands trips',
    targetSpecies: ['Yellowtail', 'Bluefin Tuna (school)', 'White Seabass', 'Dorado'],
    tiers: {
      bronze: placeholderTier('bronze', 6, '~$550'),
      silver: placeholderTier('silver', 6, '~$950'),
      gold: placeholderTier('gold', 6, '~$1,800'),
    },
  },
  {
    weight: '50lb',
    label: '50lb Setup',
    description: 'The gateway to big game. Handles 30-80lb class tuna on fly-lined bait. Essential for offshore full-day trips targeting bluefin.',
    bestFor: 'Offshore tuna trips, overnight trips',
    targetSpecies: ['Bluefin Tuna', 'Yellowfin Tuna', 'Yellowtail', 'Dorado'],
    tiers: {
      bronze: placeholderTier('bronze', 6, '~$650'),
      silver: placeholderTier('silver', 6, '~$1,100'),
      gold: placeholderTier('gold', 6, '~$2,200'),
    },
  },
  {
    weight: '80lb',
    label: '80lb Setup',
    description: 'Heavy tackle for big tuna. 2-speed reels are a must at this class. Built to handle 80-150lb bluefin on braid.',
    bestFor: 'Tuna trips, 1.5 day and 2-day trips',
    targetSpecies: ['Bluefin Tuna', 'Yellowfin Tuna', 'Wahoo'],
    tiers: {
      bronze: placeholderTier('bronze', 6, '~$800'),
      silver: placeholderTier('silver', 6, '~$1,400'),
      gold: placeholderTier('gold', 6, '~$2,800'),
    },
  },
  {
    weight: '100lb',
    label: '100lb Setup',
    description: 'Serious big game tackle. For cow-class bluefin, kite fishing, and long-range trips targeting 100lb+ fish.',
    bestFor: 'Long range, multi-day trips, cow tuna',
    targetSpecies: ['Bluefin Tuna (cow)', 'Yellowfin Tuna', 'Wahoo', 'Bigeye Tuna'],
    tiers: {
      bronze: placeholderTier('bronze', 6, '~$1,000'),
      silver: placeholderTier('silver', 6, '~$1,800'),
      gold: placeholderTier('gold', 6, '~$3,500'),
    },
  },
  {
    weight: '130lb',
    label: '130lb Setup',
    description: 'Max class tackle. Stand-up or chair gear for the biggest fish in the Pacific. This is the end game.',
    bestFor: 'Long range, multi-day, 200lb+ tuna',
    targetSpecies: ['Bluefin Tuna (giant)', 'Bigeye Tuna', 'Marlin', 'Swordfish'],
    tiers: {
      bronze: placeholderTier('bronze', 6, '~$1,200'),
      silver: placeholderTier('silver', 6, '~$2,200'),
      gold: placeholderTier('gold', 6, '~$4,500'),
    },
  },
];

const SETUP_WEIGHTS: SetupWeight[] = ['25lb', '30lb', '40lb', '50lb', '80lb', '100lb', '130lb'];

const CHECKLIST_BASE = [
  'Fishing license (CA)',
  'Photo ID',
  'Sunscreen SPF 50+',
  'Sunglasses (polarized)',
  'Hat / visor',
  'Closed-toe shoes (non-marking)',
  'Cash for tips & galley',
  'Motion sickness medication (if needed)',
];

const CHECKLIST_ADDITIONS: Record<TripType, string[]> = {
  'Half Day': ['Light jacket', 'Snacks', 'Water bottle'],
  'Full Day': ['Light jacket', 'Snacks', 'Water bottle', 'Lunch / cooler', 'Extra layers', 'Rod belt'],
  'Overnight': [
    'Light jacket', 'Snacks', 'Water bottle', 'Lunch / cooler', 'Extra layers', 'Rod belt',
    'Sleeping bag', 'Headlamp', 'Extra clothes', 'Toiletries', 'Warm jacket',
  ],
  'Multi-Day': [
    'Light jacket', 'Snacks', 'Water bottle', 'Lunch / cooler', 'Extra layers', 'Rod belt',
    'Sleeping bag', 'Headlamp', 'Extra clothes', 'Toiletries', 'Warm jacket',
    'Multiple changes of clothes', 'Tackle bag', 'Fish bags', 'Passport (if going to Mexico)',
  ],
};

const TRIP_TYPES: TripType[] = ['Half Day', 'Full Day', 'Overnight', 'Multi-Day'];

const TACKLE_SHOPS: TackleShop[] = [
  { name: 'Squidco', address: '619 W Beech St, San Diego, CA', description: 'Online + local pickup, premium tackle. Huge selection of jigs, lures, and high-end rods & reels.' },
  { name: "Fisherman's Landing Tackle Shop", address: '2838 Garrison St, San Diego, CA', description: 'Full service tackle shop right at the landing. Bait, tackle, rentals, and expert advice for your trip.' },
  { name: 'Dana Landing Market & Fuel', address: '2580 Ingraham St, San Diego, CA', description: 'Mission Bay location with bait, basic tackle, snacks, and fuel. Convenient stop before bay fishing.' },
  { name: 'Oceanside Bait & Tackle', address: '256 Harbor Dr S, Oceanside, CA', description: "Near Helgren's Sportfishing. Good selection of live bait, tackle, and local knowledge for the area." },
  { name: 'Tackle Station', address: '3901 Voltaire St, San Diego, CA', description: 'Ocean Beach shop with knowledgeable staff. Great for local inshore and kayak fishing gear.' },
  { name: 'Walmart Supercenter (Sports Dept)', address: 'Multiple San Diego locations', description: 'Budget basics and last-minute essentials. Fishing licenses available at the sports counter.' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageKey(tripType: TripType) {
  return `bite-report-checklist-${tripType.toLowerCase().replace(/\s+/g, '-')}`;
}

function getChecklistItems(tripType: TripType): string[] {
  return [...CHECKLIST_BASE, ...CHECKLIST_ADDITIONS[tripType]];
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TIER_META: Record<Tier, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  bronze: { label: 'Bronze', color: '#cd7f32', bgColor: '#cd7f3218', borderColor: '#cd7f3244', icon: '🥉' },
  silver: { label: 'Silver', color: '#c0c0c0', bgColor: '#c0c0c018', borderColor: '#c0c0c044', icon: '🥈' },
  gold: { label: 'Gold', color: '#ffd700', bgColor: '#ffd70018', borderColor: '#ffd70044', icon: '🥇' },
};

function GearGuide() {
  const [activeWeight, setActiveWeight] = useState<SetupWeight>('25lb');
  const [activeTier, setActiveTier] = useState<Tier>('bronze');

  const setup = SETUPS.find((s) => s.weight === activeWeight)!;
  const tierSetup = setup.tiers[activeTier];
  const tierMeta = TIER_META[activeTier];

  return (
    <div>
      {/* Weight class selector */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8899aa' }}>Line Class</p>
        <div className="flex flex-wrap gap-2">
          {SETUP_WEIGHTS.map((w) => {
            const isActive = w === activeWeight;
            return (
              <button
                key={w}
                onClick={() => setActiveWeight(w)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
                style={{
                  backgroundColor: isActive ? '#00d4ff' : '#131b2e',
                  color: isActive ? '#0a0f1a' : '#8899aa',
                  border: `1px solid ${isActive ? '#00d4ff' : '#1e2a42'}`,
                  boxShadow: isActive ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>

      {/* Setup header card */}
      <div
        className="rounded-xl p-5 mb-5"
        style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
      >
        <h3 className="text-xl font-black mb-1" style={{ color: '#e2e8f0' }}>
          {setup.label}
        </h3>
        <p className="text-sm mb-3" style={{ color: '#8899aa' }}>{setup.description}</p>
        <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#8899aa' }}>
          <span><strong style={{ color: '#e2e8f0' }}>Best for:</strong> {setup.bestFor}</span>
          <span><strong style={{ color: '#e2e8f0' }}>Target:</strong> {setup.targetSpecies.join(', ')}</span>
        </div>
      </div>

      {/* Tier selector */}
      <div className="flex gap-3 mb-5">
        {(['bronze', 'silver', 'gold'] as Tier[]).map((tier) => {
          const meta = TIER_META[tier];
          const isActive = tier === activeTier;
          const tierData = setup.tiers[tier];
          return (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className="flex-1 rounded-xl p-3 text-center transition-all cursor-pointer"
              style={{
                backgroundColor: isActive ? meta.bgColor : '#0d1320',
                border: `2px solid ${isActive ? meta.color : '#1e2a42'}`,
                boxShadow: isActive ? `0 0 16px ${meta.color}33` : 'none',
              }}
            >
              <div className="text-lg mb-0.5">{meta.icon}</div>
              <div className="text-sm font-bold" style={{ color: isActive ? meta.color : '#8899aa' }}>
                {meta.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#8899aa' }}>
                {tierData.totalEstimate}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tier items */}
      <div className="space-y-3">
        {tierSetup.items.map((item, idx) => {
          const isPlaceholder = item.name === 'Coming Soon';
          return (
            <div
              key={`${item.role}-${idx}`}
              className="rounded-xl p-4 flex items-start gap-4"
              style={{
                backgroundColor: isPlaceholder ? '#0d1320' : '#131b2e',
                border: `1px solid ${isPlaceholder ? '#1e2a4266' : '#1e2a42'}`,
                opacity: isPlaceholder ? 0.6 : 1,
              }}
            >
              {/* Role badge */}
              <div
                className="flex-shrink-0 w-16 text-center rounded-lg py-1.5 text-xs font-bold uppercase"
                style={{
                  backgroundColor: tierMeta.bgColor,
                  color: tierMeta.color,
                  border: `1px solid ${tierMeta.borderColor}`,
                }}
              >
                {item.role}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm" style={{ color: isPlaceholder ? '#8899aa' : '#e2e8f0' }}>
                    {item.name}
                  </h4>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#00d4ff18', color: '#00d4ff', border: '1px solid #00d4ff33' }}
                    >
                      View
                    </a>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#8899aa' }}>
                  {item.description}
                </p>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-bold" style={{ color: isPlaceholder ? '#8899aa' : '#e2e8f0' }}>
                  {item.price}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total estimate */}
      <div
        className="mt-4 rounded-xl p-4 flex items-center justify-between"
        style={{ backgroundColor: tierMeta.bgColor, border: `1px solid ${tierMeta.borderColor}` }}
      >
        <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
          {tierMeta.icon} {tierMeta.label} Setup Total Estimate
        </span>
        <span className="text-lg font-black" style={{ color: tierMeta.color }}>
          {tierSetup.totalEstimate}
        </span>
      </div>
    </div>
  );
}

function TripChecklist() {
  const [tripType, setTripType] = useState<TripType>('Half Day');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Load from localStorage on mount and trip type change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(tripType));
      if (stored) {
        setTimeout(() => setChecked(JSON.parse(stored)), 0);
      } else {
        setTimeout(() => setChecked({}), 0);
      }
    } catch {
      setTimeout(() => setChecked({}), 0);
    }
  }, [tripType]);

  // Persist to localStorage
  const persist = useCallback(
    (next: Record<string, boolean>) => {
      try {
        localStorage.setItem(storageKey(tripType), JSON.stringify(next));
      } catch {
        // storage full or unavailable
      }
    },
    [tripType],
  );

  const items = getChecklistItems(tripType);
  const checkedCount = items.filter((i) => checked[i]).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  function toggle(item: string) {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    persist(next);
  }

  function reset() {
    setChecked({});
    try {
      localStorage.removeItem(storageKey(tripType));
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Trip type selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TRIP_TYPES.map((t) => {
          const isActive = t === tripType;
          return (
            <button
              key={t}
              onClick={() => setTripType(t)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: isActive ? '#00d4ff' : '#131b2e',
                color: isActive ? '#0a0f1a' : '#8899aa',
                border: `1px solid ${isActive ? '#00d4ff' : '#1e2a42'}`,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Checklist card */}
      <div className="rounded-xl p-5 sm:p-6" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
        {/* Progress header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
            {checkedCount} of {items.length} items packed
          </p>
          <button
            onClick={reset}
            className="text-xs font-medium px-3 py-1 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}
          >
            Reset
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full mb-5" style={{ backgroundColor: '#1e2a42' }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#22c55e' : '#00d4ff' }}
          />
        </div>

        {/* Items */}
        <ul className="space-y-1">
          {items.map((item) => {
            const isChecked = !!checked[item];
            return (
              <li key={item}>
                <label className="flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(item)}
                    className="sr-only peer"
                  />
                  {/* Custom checkbox */}
                  <span
                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: isChecked ? '#22c55e' : 'transparent',
                      border: isChecked ? '2px solid #22c55e' : '2px solid #1e2a42',
                    }}
                  >
                    {isChecked && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#0a0f1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="text-sm transition-colors"
                    style={{
                      color: isChecked ? '#8899aa' : '#e2e8f0',
                      textDecoration: isChecked ? 'line-through' : 'none',
                    }}
                  >
                    {item}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TackleShops() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {TACKLE_SHOPS.map((shop) => (
        <div
          key={shop.name}
          className="rounded-xl p-5 flex flex-col gap-3"
          style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
        >
          <h3 className="font-bold" style={{ color: '#e2e8f0' }}>{shop.name}</h3>
          <p className="text-sm" style={{ color: '#8899aa' }}>{shop.address}</p>
          <p className="text-sm leading-relaxed flex-1" style={{ color: '#8899aa' }}>{shop.description}</p>
          <a
            href={mapsUrl(shop.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium mt-1 transition-colors"
            style={{ color: '#00d4ff' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Get Directions
          </a>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS: { key: Tab; label: string }[] = [
  { key: 'gear-guide', label: 'Gear Guide' },
  { key: 'trip-checklist', label: 'Trip Checklist' },
  { key: 'tackle-shops', label: 'Tackle Shops' },
];

export default function GearPage() {
  const [activeTab, setActiveTab] = useState<Tab>('gear-guide');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0f1a' }}>
      <Header />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-black tracking-tight mb-6"
          style={{ color: '#e2e8f0' }}
        >
          Gear &amp; Tackle
        </h1>

        {/* Tab selector */}
        <div
          className="inline-flex rounded-lg p-1 mb-8"
          style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? '#00d4ff' : 'transparent',
                  color: isActive ? '#0a0f1a' : '#8899aa',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {activeTab === 'gear-guide' && <GearGuide />}
        {activeTab === 'trip-checklist' && <TripChecklist />}
        {activeTab === 'tackle-shops' && <TackleShops />}
      </main>

      {/* Footer */}
      <footer
        className="w-full py-6 mt-auto text-center text-xs"
        style={{ color: '#8899aa', borderTop: '1px solid #1e2a42' }}
      >
        The Bite Report &mdash; San Diego Sportfishing
      </footer>
    </div>
  );
}
