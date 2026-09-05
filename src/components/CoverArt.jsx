import React from 'react';
import { Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

// Generate consistent gradient based on string
function stringToGradient(str) {
  if (!str) return 'from-neutral-800 to-neutral-900';
  const gradients = [
    'from-emerald-700 to-zinc-900',
    'from-indigo-700 to-zinc-900',
    'from-rose-700 to-zinc-900',
    'from-amber-700 to-zinc-900',
    'from-cyan-700 to-zinc-900',
    'from-purple-700 to-zinc-900',
    'from-teal-700 to-zinc-900',
    'from-blue-700 to-zinc-900',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export default function CoverArt({ song, size = 'md', className = '' }) {
  const { getCoverUrl } = usePlayer();
  const coverUrl = getCoverUrl(song);

  const sizeClasses = {
    sm: 'w-10 h-10 min-w-[40px] min-h-[40px] rounded-[4px]',
    md: 'w-14 h-14 min-w-[56px] min-h-[56px] rounded-[4px]',
    lg: 'w-48 h-48 min-w-[192px] min-h-[192px] rounded-card shadow-spotify-heavy',
    xl: 'w-56 h-56 min-w-[224px] min-h-[224px] rounded-card shadow-spotify-heavy',
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 64,
    xl: 80,
  };

  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt={song?.title || 'Capa do álbum'}
        className={`${sizeClasses[size] || sizeClasses.md} object-cover flex-shrink-0 select-none ${className}`}
        loading="lazy"
      />
    );
  }

  const gradient = stringToGradient(song?.title || song?.artist || 'music');

  return (
    <div
      className={`${sizeClasses[size] || sizeClasses.md} bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 select-none shadow-sm ${className}`}
    >
      <Music size={iconSizes[size] || 24} className="text-white/60" />
    </div>
  );
}
