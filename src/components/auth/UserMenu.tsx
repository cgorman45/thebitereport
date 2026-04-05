'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 cursor-pointer"
        aria-label="User menu"
      >
        <img
          src={`/avatars/${profile?.avatar_key ?? 'captain'}.svg`}
          alt=""
          width={30}
          height={30}
          className="rounded-full shrink-0"
          style={{ border: '2px solid #00d4ff', imageRendering: 'pixelated' }}
        />
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#8899aa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[40px] rounded-lg py-1 min-w-[200px] z-50"
          style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {/* User info */}
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #1e2a42' }}>
            <div className="text-sm font-medium text-[#e2e8f0]">{displayName}</div>
            <div className="text-xs" style={{ color: '#556677' }}>{user.email}</div>
          </div>

          {/* Nav links */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#e2e8f0] hover:bg-[#1e2a4233] transition-colors"
            >
              <span style={{ color: '#00d4ff' }}>&#9881;</span> Profile
            </Link>
            <Link
              href="/my-boats"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#e2e8f0] hover:bg-[#1e2a4233] transition-colors"
            >
              <span style={{ color: '#f0c040' }}>&#9733;</span> My Boats
            </Link>
          </div>

          {/* Sign out */}
          <div style={{ borderTop: '1px solid #1e2a42' }} className="py-1">
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[#1e2a4233] transition-colors"
              style={{ color: '#8899aa' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
