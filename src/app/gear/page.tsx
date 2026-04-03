'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'gear-guide' | 'trip-checklist' | 'tackle-shops';
type Importance = 'essential' | 'recommended' | 'nice-to-have';
type GearCategory = 'All' | 'Half Day / Inshore' | 'Full Day / Offshore' | 'Tuna Trips' | 'Long Range';
type TripType = 'Half Day' | 'Full Day' | 'Overnight' | 'Multi-Day';

interface GearItem {
  name: string;
  category: GearCategory;
  description: string;
  priceRange: string;
  importance: Importance;
}

interface TackleShop {
  name: string;
  address: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const GEAR_ITEMS: GearItem[] = [
  // Rods
  { name: 'Penn Carnage III Boat Rod', category: 'Half Day / Inshore', description: 'Versatile inshore rod, great sensitivity for bass and calico. 7\' medium action.', priceRange: '$120 - $160', importance: 'essential' },
  { name: 'Shimano Terez Conventional', category: 'Full Day / Offshore', description: 'Strong offshore rod for yellowtail and dorado. Fast action blank with Fuji guides.', priceRange: '$200 - $280', importance: 'essential' },
  { name: 'Calstar Grafighter 700XL', category: 'Tuna Trips', description: 'The SoCal tuna stick. Heavy power for 50-200lb class tuna on the kite or flyline.', priceRange: '$250 - $350', importance: 'essential' },
  { name: 'Seeker Hercules Long Range Rod', category: 'Long Range', description: 'Built for multi-day trips targeting wahoo, yellowfin, and cow tuna south of the border.', priceRange: '$300 - $400', importance: 'recommended' },
  // Reels
  { name: 'Penn Squall II Lever Drag', category: 'Half Day / Inshore', description: 'Reliable lever drag reel for half day boats. Smooth drag, holds plenty of 20lb mono.', priceRange: '$100 - $140', importance: 'essential' },
  { name: 'Shimano Saragosa SW 5000', category: 'Full Day / Offshore', description: 'Saltwater spinning reel with incredible drag. Handles yellowtail and small tuna.', priceRange: '$220 - $280', importance: 'essential' },
  { name: 'Accurate Boss Valiant 500N', category: 'Tuna Trips', description: 'Premium 2-speed reel machined in the USA. The gold standard for SoCal tuna fishing.', priceRange: '$500 - $650', importance: 'essential' },
  { name: 'Avet HXJ Raptor 2-Speed', category: 'Long Range', description: 'High-capacity 2-speed for long range. Holds 500+ yds of 80lb braid.', priceRange: '$450 - $600', importance: 'recommended' },
  // Line
  { name: '20lb Monofilament', category: 'Half Day / Inshore', description: 'Standard line for half day trips. Berkley Trilene or Izorline First String are popular choices.', priceRange: '$8 - $15', importance: 'essential' },
  { name: '50-80lb Braided Line', category: 'Full Day / Offshore', description: 'Braid for offshore work. PowerPro or Suffix 832. Pair with a fluorocarbon leader.', priceRange: '$25 - $40', importance: 'essential' },
  { name: '100lb Spectra / Braid', category: 'Tuna Trips', description: 'Heavy spectra for tuna. Jerry Brown or Izorline Spectra in 100-130lb test.', priceRange: '$40 - $80', importance: 'essential' },
  // Terminal Tackle
  { name: 'Owner Mutu Circle Hooks', category: 'Full Day / Offshore', description: 'Best circle hooks in the game. Sizes 1/0 - 5/0 for live bait fishing.', priceRange: '$6 - $12', importance: 'essential' },
  { name: 'Mustad Live Bait Hooks', category: 'Half Day / Inshore', description: 'Classic ringed live bait hooks. Sizes 4 - 2/0 for sardine and anchovy.', priceRange: '$4 - $8', importance: 'essential' },
  { name: 'Torpedo Sinkers (assorted)', category: 'Full Day / Offshore', description: 'Sliding sinkers in 1/2oz - 4oz. Essential for dropper loop and bottom fishing.', priceRange: '$5 - $10', importance: 'recommended' },
  // Jigs & Lures
  { name: 'Tady 45 Surface Iron', category: 'Full Day / Offshore', description: 'Iconic SoCal surface iron jig. Blue & white or scrambled egg. Deadly on yellows and barracuda.', priceRange: '$10 - $15', importance: 'recommended' },
  { name: 'Salas 6X Jr Jig', category: 'Tuna Trips', description: 'Yo-yo style iron jig for deep structure. Must-have for yellowfin tuna and yellowtail.', priceRange: '$10 - $14', importance: 'recommended' },
  { name: 'Megabait Swimbait', category: 'Long Range', description: 'Large profile swimbait that imitates mackerel. Deadly on cow tuna and wahoo at the islands.', priceRange: '$12 - $20', importance: 'nice-to-have' },
  // Misc
  { name: 'Fishing Pliers (aluminum)', category: 'Half Day / Inshore', description: 'Corrosion-resistant split ring pliers. Invaluable for de-hooking and cutting line.', priceRange: '$15 - $40', importance: 'essential' },
  { name: 'Fillet Knife', category: 'Full Day / Offshore', description: 'Flexible 7-9" fillet knife. Dexter-Russell or Rapala. Keep it sharp.', priceRange: '$15 - $35', importance: 'recommended' },
  { name: '5-Gallon Bucket', category: 'Half Day / Inshore', description: 'The most versatile item on the boat. Seat, tackle box, wash bucket, fish transport.', priceRange: '$5 - $8', importance: 'recommended' },
  { name: 'Rod Belt / Harness', category: 'Tuna Trips', description: 'Padded rod belt for fighting big fish. Braid belts save your back on long tuna battles.', priceRange: '$30 - $80', importance: 'essential' },
  { name: 'Insulated Fish Bag', category: 'Long Range', description: 'Kill bag to keep your catch cold on the ride home. 60-72" size for tuna.', priceRange: '$30 - $60', importance: 'recommended' },
  // Sun Protection
  { name: 'Polarized Sunglasses', category: 'Half Day / Inshore', description: 'Quality polarized lenses cut glare and let you spot bait and fish. Amber or copper lens.', priceRange: '$30 - $200', importance: 'essential' },
  { name: 'UPF 50+ Sun Shirt', category: 'Full Day / Offshore', description: 'Long sleeve performance shirt. Keeps you cool and protected all day on the water.', priceRange: '$25 - $60', importance: 'essential' },
  { name: 'Sunscreen SPF 50+', category: 'Half Day / Inshore', description: 'Reef-safe, water-resistant sunscreen. Reapply every 2 hours. Your skin will thank you.', priceRange: '$8 - $15', importance: 'essential' },
];

const CATEGORIES: GearCategory[] = ['All', 'Half Day / Inshore', 'Full Day / Offshore', 'Tuna Trips', 'Long Range'];

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

function importanceBadge(importance: Importance) {
  const styles: Record<Importance, { bg: string; text: string; label: string }> = {
    essential: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: 'Essential' },
    recommended: { bg: 'rgba(0,212,255,0.12)', text: '#00d4ff', label: 'Recommended' },
    'nice-to-have': { bg: 'rgba(136,153,170,0.15)', text: '#8899aa', label: 'Nice to Have' },
  };
  const s = styles[importance];
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function categoryTag(category: string) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}
    >
      {category}
    </span>
  );
}

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

function GearGuide() {
  const [activeCategory, setActiveCategory] = useState<GearCategory>('All');

  const filtered = activeCategory === 'All'
    ? GEAR_ITEMS
    : GEAR_ITEMS.filter((g) => g.category === activeCategory);

  return (
    <div>
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: isActive ? '#00d4ff' : '#131b2e',
                color: isActive ? '#0a0f1a' : '#8899aa',
                border: `1px solid ${isActive ? '#00d4ff' : '#1e2a42'}`,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Gear grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.name}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{item.name}</h3>
              {importanceBadge(item.importance)}
            </div>
            <div>{categoryTag(item.category)}</div>
            <p className="text-sm leading-relaxed flex-1" style={{ color: '#8899aa' }}>{item.description}</p>
            <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{item.priceRange}</p>
          </div>
        ))}
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
      setChecked({});
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
