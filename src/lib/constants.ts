// ---------------------------------------------------------------------------
// Shared constants used across multiple components.
// Centralised here to eliminate duplication and keep a single source of truth.
// ---------------------------------------------------------------------------

import type { FactorName } from '@/types';

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

/** Default species list for SoCal April season. */
export const SOCAL_APRIL_SPECIES = [
  'Yellowtail',
  'Bluefin Tuna',
  'Calico Bass',
  'Rockfish',
  'White Seabass',
  'Barracuda',
] as const;

/** Background + text color pairs for species badges. */
export const SPECIES_COLORS: Record<string, { bg: string; text: string }> = {
  'Yellowtail':     { bg: 'rgba(234,179,8,0.15)',   text: '#eab308' },
  'Bluefin Tuna':   { bg: 'rgba(0,212,255,0.12)',   text: '#00d4ff' },
  'Yellowfin Tuna': { bg: 'rgba(0,180,220,0.12)',   text: '#00b4dc' },
  'Calico Bass':    { bg: 'rgba(34,197,94,0.12)',    text: '#22c55e' },
  'Rockfish':       { bg: 'rgba(249,115,22,0.13)',   text: '#f97316' },
  'White Seabass':  { bg: 'rgba(168,85,247,0.13)',   text: '#a855f7' },
  'Barracuda':      { bg: 'rgba(239,68,68,0.12)',    text: '#ef4444' },
  'Dorado':         { bg: 'rgba(34,197,94,0.15)',    text: '#16a34a' },
  'Halibut':        { bg: 'rgba(139,92,246,0.12)',   text: '#8b5cf6' },
  'Lingcod':        { bg: 'rgba(20,184,166,0.12)',   text: '#14b8a6' },
  'Bonito':         { bg: 'rgba(59,130,246,0.12)',   text: '#3b82f6' },
  'Sheephead':      { bg: 'rgba(236,72,153,0.12)',   text: '#ec4899' },
  'Whitefish':      { bg: 'rgba(148,163,184,0.15)',  text: '#94a3b8' },
  'Sand Bass':      { bg: 'rgba(180,83,9,0.12)',     text: '#b45309' },
  'Sculpin':        { bg: 'rgba(217,70,239,0.12)',   text: '#d946ef' },
  'Red Snapper':    { bg: 'rgba(239,68,68,0.15)',    text: '#dc2626' },
  'Cabezon':        { bg: 'rgba(101,163,13,0.12)',   text: '#65a30d' },
};

export const DEFAULT_SPECIES_COLOR = { bg: 'rgba(136,153,170,0.15)', text: '#8899aa' };

// ---------------------------------------------------------------------------
// Moon
// ---------------------------------------------------------------------------

export const MOON_SYMBOLS: Record<string, string> = {
  'New Moon':        '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter':   '🌓',
  'Waxing Gibbous':  '🌔',
  'Full Moon':       '🌕',
  'Waning Gibbous':  '🌖',
  'Last Quarter':    '🌗',
  'Waning Crescent': '🌘',
};

// ---------------------------------------------------------------------------
// Score factors
// ---------------------------------------------------------------------------

export const FACTOR_LABELS: Record<FactorName, string> = {
  weather: 'Weather',
  tides: 'Tides',
  barometricPressure: 'Pressure',
  pressureDelta: 'Pressure Shift',
  waterTemp: 'Water Temp',
  moonPhase: 'Moon Phase',
  timeOfDay: 'Time of Day',
  wind: 'Wind',
  catchReports: 'Catch Reports',
};

// ---------------------------------------------------------------------------
// Pro tips (indexed by day-of-week: 0 = Sunday … 6 = Saturday)
// ---------------------------------------------------------------------------

export const PRO_TIPS: string[] = [
  'New moon periods bring stronger tidal currents — fish the tide changes for yellowtail in open water.',
  'Morning departures on full-day trips consistently produce the best results in April. Be on the water by first light.',
  'Slow-pitch jigging near structure is lethal on calico bass this time of year. Drop to the reef and work the pause.',
  'April water temps in the 60–65°F range are prime for white seabass. Fish the kelp edges at dawn with live squid.',
  'Bluefin tuna are surface-active on calm mornings. Look for birds working bait schools offshore of the 9-mile bank.',
  'Overcast skies reduce surface glare and push rockfish shallower. Target 120–180 ft ledges on cloudy days.',
  'Full moon tides stack barracuda along current seams. Cast iron jigs parallel to the kelp line during the high tide run.',
];
