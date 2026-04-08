'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOptionalAuth } from './auth/AuthProvider';
import AuthModal from './auth/AuthModal';
import UserMenu from './auth/UserMenu';
import { getSupabase } from '@/lib/supabase/client';

const NAV_LINKS = [
  { href: '/', label: 'Bite Report' },
  { href: '/fleet-tracker', label: 'Fleet Map' },
  { href: '/ocean-data', label: 'Ocean Data' },
  { href: '/plan-your-trip', label: 'Plan Trip' },
  { href: '/weather', label: 'Weather' },
  { href: '/gear', label: 'Gear' },
  { href: '/reports', label: 'Reports' },
  { href: '/local-intel', label: 'Intel' },
  { href: '/tutorials', label: 'Tutorials' },
];

export default function Header() {
  const pathname = usePathname();
  const auth = useOptionalAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth?.user) { setIsAdmin(false); return; }
    getSupabase()
      .from('profiles')
      .select('is_admin')
      .eq('id', auth.user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
  }, [auth?.user]);

  return (
    <React.Fragment>
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
          {auth?.user && (
            <Link
              href="/my-boats"
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200"
              style={{
                backgroundColor: pathname === '/my-boats' ? '#f0c04018' : 'transparent',
                color: pathname === '/my-boats' ? '#f0c040' : '#f0c040',
                border: pathname === '/my-boats' ? '1px solid #f0c04033' : '1px solid transparent',
              }}
            >
              My Boats
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/kelp-review"
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200"
              style={{
                backgroundColor: pathname.startsWith('/admin') ? '#ff6b3518' : 'transparent',
                color: '#ff6b35',
                border: pathname.startsWith('/admin') ? '1px solid #ff6b3533' : '1px solid transparent',
              }}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Status indicator + Auth */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#22c55e' }}
            />
            <span className="text-xs" style={{ color: '#8899aa' }}>
              Live
            </span>
          </div>
          {auth?.user ? <UserMenu /> : (
            <button
              onClick={() => auth?.openAuthModal()}
              className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile auth - visible on small screens */}
        <div className="flex sm:hidden items-center flex-shrink-0">
          {auth?.user ? <UserMenu /> : (
            <button
              onClick={() => auth?.openAuthModal()}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
    <AuthModal />
    </React.Fragment>
  );
}
