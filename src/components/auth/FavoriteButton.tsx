'use client';

import { useOptionalAuth } from './AuthProvider';

interface FavoriteButtonProps {
  mmsi: number;
  size?: number;  // icon size in px, default 16
}

export default function FavoriteButton({ mmsi, size = 16 }: FavoriteButtonProps) {
  const auth = useOptionalAuth();
  const isFav = auth?.favorites.has(mmsi) ?? false;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        auth?.toggleFavorite(mmsi);
      }}
      className="transition-colors shrink-0"
      style={{ color: isFav ? '#f0c040' : '#334455', fontSize: size, lineHeight: 1 }}
      aria-label={isFav ? 'Unfollow boat' : 'Follow boat'}
      title={isFav ? 'Unfollow boat' : 'Follow boat'}
    >
      {isFav ? '\u2605' : '\u2606'}
    </button>
  );
}
