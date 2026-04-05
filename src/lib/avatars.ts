// src/lib/avatars.ts

export interface Avatar {
  key: string;
  label: string;
  category: 'fish' | 'character';
}

export const AVATARS: Avatar[] = [
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

export const AVATAR_KEYS = new Set(AVATARS.map((a) => a.key));

export const DEFAULT_AVATAR_KEY = 'captain';

export function getAvatarUrl(key: string): string {
  return `/avatars/${key}.svg`;
}
