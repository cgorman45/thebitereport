'use client';

import SideTabs from './SideTabs';
import CatchReportsPanel from './CatchReportsPanel';
import WindPanel from './WindPanel';

const FISH_ICON = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
    <path d="M14.5 10c2.5-2 4.5-2 4.5-2s-2 0-4.5-2c-2-1.6-5-2-7.5-1.5C4.5 5 2 7 1 10c1 3 3.5 5 6 5.5 2.5.5 5.5 0 7.5-1.5zM7 10a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const WIND_ICON = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
    <path d="M3 7h8a3 3 0 100-6 3 3 0 00-3 3M3 13h12a3 3 0 110 6 3 3 0 013-3M3 10h6a2 2 0 100-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const TABS = [
  {
    id: 'catch-reports',
    label: 'Catch Reports',
    icon: FISH_ICON,
    panel: <CatchReportsPanel />,
  },
  {
    id: 'wind',
    label: 'Wind & Weather',
    icon: WIND_ICON,
    panel: <WindPanel />,
  },
];

export default function GlobalSideTabs() {
  return <SideTabs tabs={TABS} />;
}
