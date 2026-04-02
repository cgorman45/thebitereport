export type SourceType = 'landing' | 'forum' | 'agency';

export interface ScrapeSource {
  name: string;
  url: string;
  type: SourceType;
  locationSlugs: string[];
  parser: string;
}

export const scrapeSources: ScrapeSource[] = [
  {
    name: 'H&M Landing',
    url: 'https://www.hmlanding.com/fish-counts/',
    type: 'landing',
    locationSlugs: [
      'hm-landing-san-diego',
      'point-loma-sportfishing',
      'mission-bay',
      '9-mile-bank',
    ],
    parser: 'generic-fish-counts',
  },
  {
    name: "Davey's Locker",
    url: 'https://www.daveyslocker.com/fish-counts/',
    type: 'landing',
    locationSlugs: [
      'newport-beach-daveys-locker',
      'dana-point-harbor',
      '14-mile-bank',
      'san-clemente-island',
    ],
    parser: 'generic-fish-counts',
  },
  {
    name: '22nd Street Landing',
    url: 'https://www.22ndstreetlanding.com/fish-counts',
    type: 'landing',
    locationSlugs: [
      'san-pedro-22nd-street',
      'long-beach-22nd-street',
      'horseshoe-kelp',
      'catalina-island',
    ],
    parser: 'generic-fish-counts',
  },
  {
    name: 'Pierpoint Landing',
    url: 'https://www.pierpointlanding.com/fish-counts',
    type: 'landing',
    locationSlugs: [
      'long-beach-pierpoint',
      'belmont-pier',
      'horseshoe-kelp',
    ],
    parser: 'generic-fish-counts',
  },
  {
    name: 'Sportfishing.com',
    url: 'https://www.sportfishing.com/reports/',
    type: 'forum',
    locationSlugs: [
      'hm-landing-san-diego',
      'newport-beach-daveys-locker',
      'dana-point-harbor',
      'san-pedro-22nd-street',
      'long-beach-pierpoint',
      'ventura-harbor',
      'catalina-island',
    ],
    parser: 'generic-fish-counts',
  },
];
