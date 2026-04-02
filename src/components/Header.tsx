'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Fishing Score' },
  { href: '/fleet-tracker', label: 'Live Fleet Map' },
  { href: '/plan-your-trip', label: 'Plan Your Trip' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        backgroundColor: 'rgba(7, 11, 22, 0.85)',
        borderBottom: '1px solid #1e2a42',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Site name */}
        <Link href="/" className="flex-shrink-0">
          <h1
            className="text-lg sm:text-xl font-black uppercase tracking-[0.2em] leading-none"
            style={{ color: '#e2e8f0' }}
          >
            The{' '}
            <span style={{ color: '#00d4ff' }}>Bite</span>
            {' '}Report
          </h1>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: isActive ? '#00d4ff18' : 'transparent',
                  color: isActive ? '#00d4ff' : '#8899aa',
                  border: isActive ? '1px solid #00d4ff33' : '1px solid transparent',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#22c55e' }}
          />
          <span className="text-xs" style={{ color: '#8899aa' }}>
            Live
          </span>
        </div>
      </div>
    </header>
  );
}
