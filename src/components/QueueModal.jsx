import React from 'react';
import { X, Play, Music, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/formatters';
import CoverArt from './CoverArt';

export default function QueueModal({ isOpen, onClose }) {
  const { currentSong, queue, playSong, isPlaying } = usePlayer();

  if (!isOpen) return null;

  const currentIdx = currentSong ? queue.findIndex((s) => s.id === currentSong.id) : -1;
  const nextSongs = currentIdx !== -1 ? queue.slice(currentIdx + 1) : queue;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm sm:w-80 bg-spotify-surface border-l border-spotify-border/40 shadow-spotify-heavy z-50 flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-spotify-border/30">
        <div className="flex items-center gap-2">
          <ListMusic size={18} className="text-spotify-green" />
          <h2 className="text-sm font-bold text-spotify-textBase">Fila de Reprodução</h2>
        </div>
        <button
          onClick={onClose}
          className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Now Playing */}
        <div>
          <h3 className="text-xs font-bold text-spotify-textSubdued uppercase tracking-spotify-caps mb-3">
            Tocando Agora
          </h3>
          {currentSong ? (
            <div className="flex items-center gap-3 p-2 bg-spotify-middark rounded-subtle">
              <CoverArt song={currentSong} size="sm" className="rounded-subtle" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-spotify-green truncate">
                  {currentSong.title}
                </span>
                <span className="text-[11px] text-spotify-textSubdued truncate">
                  {currentSong.artist}
                </span>
              </div>
              <span className="text-[11px] text-spotify-textSubdued">
                {formatDuration(currentSong.duration)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-spotify-textSubdued italic">Nenhuma música tocando</p>
          )}
        </div>

        {/* Up Next */}
        <div>
          <h3 className="text-xs font-bold text-spotify-textSubdued uppercase tracking-spotify-caps mb-3">
            A Seguir ({nextSongs.length})
          </h3>
          {nextSongs.length === 0 ? (
            <p className="text-xs text-spotify-textSubdued italic">Fim da fila</p>
          ) : (
            <div className="space-y-1">
              {nextSongs.map((song, i) => (
                <div
                  key={song.id}
                  onClick={() => playSong(song, queue)}
                  className="flex items-center gap-3 p-2 rounded-subtle hover:bg-spotify-highlight cursor-pointer transition-colors group"
                >
                  <CoverArt song={song} size="sm" className="rounded-subtle" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-spotify-textBase truncate group-hover:text-spotify-green">
                      {song.title}
                    </span>
                    <span className="text-[11px] text-spotify-textSubdued truncate">
                      {song.artist}
                    </span>
                  </div>
                  <span className="text-[11px] text-spotify-textSubdued">
                    {formatDuration(song.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
