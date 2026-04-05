'use client';

import { useState } from 'react';
import { AVATARS, getAvatarUrl } from '@/lib/avatars';

interface AvatarPickerProps {
  currentKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export default function AvatarPicker({ currentKey, onSelect, onClose }: AvatarPickerProps) {
  const [selected, setSelected] = useState(currentKey);

  const fishAvatars = AVATARS.filter((a) => a.category === 'fish');
  const characterAvatars = AVATARS.filter((a) => a.category === 'character');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10, 15, 26, 0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[480px] mx-4 rounded-xl p-6"
        style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8899aa] hover:text-[#e2e8f0]"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold mb-1" style={{ color: '#e2e8f0' }}>Choose Your Avatar</h2>
        <p className="text-xs mb-5" style={{ color: '#8899aa' }}>Pick a fish or character</p>

        {/* Fish Species */}
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#3b82f6' }}>
          Fish Species
        </p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {fishAvatars.map((avatar) => (
            <button
              key={avatar.key}
              onClick={() => setSelected(avatar.key)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
              style={{
                border: selected === avatar.key ? '2px solid #00d4ff' : '2px solid transparent',
                backgroundColor: selected === avatar.key ? 'rgba(0,212,255,0.08)' : 'transparent',
              }}
            >
              <img
                src={getAvatarUrl(avatar.key)}
                alt={avatar.label}
                width={48}
                height={48}
                className="rounded-full"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-[9px] font-medium" style={{ color: '#8899aa' }}>{avatar.label}</span>
            </button>
          ))}
        </div>

        {/* Characters */}
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#f59e0b' }}>
          Characters
        </p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {characterAvatars.map((avatar) => (
            <button
              key={avatar.key}
              onClick={() => setSelected(avatar.key)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
              style={{
                border: selected === avatar.key ? '2px solid #00d4ff' : '2px solid transparent',
                backgroundColor: selected === avatar.key ? 'rgba(0,212,255,0.08)' : 'transparent',
              }}
            >
              <img
                src={getAvatarUrl(avatar.key)}
                alt={avatar.label}
                width={48}
                height={48}
                className="rounded-full"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-[9px] font-medium" style={{ color: '#8899aa' }}>{avatar.label}</span>
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={() => onSelect(selected)}
          className="w-full rounded-lg py-2.5 text-sm font-semibold"
          style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}
        >
          Save Avatar
        </button>
      </div>
    </div>
  );
}
