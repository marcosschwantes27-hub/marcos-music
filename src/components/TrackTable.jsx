import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Clock,
  MoreHorizontal,
  Trash2,
  PlusCircle,
  Volume2,
  Plus,
  Shuffle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration, formatDateAdded } from '../utils/formatters';
import CoverArt from './CoverArt';

export default function TrackTable({
  songs = [],
  playlistId = null,
  showAlbum = true,
  showDate = true,
}) {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    removeSong,
    playlists,
    addPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    playCollectionInShuffle,
    updateSongCover,
  } = usePlayer();

  const [activeMenuSongId, setActiveMenuSongId] = useState(null);
  const [updatingSongId, setUpdatingSongId] = useState(null);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuSongId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (songs.length === 0) {
    return (
      <div className="py-16 text-center text-spotify-textSubdued select-none">
        <p className="text-base font-bold text-spotify-textBase mb-2">Nenhuma música encontrada</p>
        <p className="text-sm">Envie suas faixas ou crie novas listas para começar a ouvir.</p>
      </div>
    );
  }

  return (
    <div className="w-full select-none text-spotify-textSubdued text-sm font-spotify">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-2 md:gap-4 px-2 md:px-4 py-2 border-b border-spotify-border/40 text-xs font-semibold uppercase tracking-wider text-spotify-textSubdued">
        <span className="hidden md:block text-center">#</span>
        <span>Título</span>
        {showAlbum && <span className="hidden md:block">Álbum</span>}
        {showDate && <span className="hidden lg:block">Adicionada</span>}
        <div className="flex justify-end pr-2 md:pr-8">
          <Clock size={16} />
        </div>
      </div>

      {/* Rows */}
      <div className="mt-2 space-y-1">
        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          const isThisPlaying = isCurrent && isPlaying;

          return (
            <div
              key={song.id}
              onClick={() => playSong(song, songs)}
              className={`group grid grid-cols-[1fr_auto] md:grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-2 md:gap-4 px-2 md:px-4 py-2 rounded-subtle items-center transition-colors relative hover:bg-spotify-highlight cursor-pointer ${
                isCurrent ? 'bg-spotify-middark/70' : ''
              }`}
            >
              {/* Index or Play Button / Animated Soundwave (Desktop only) */}
              <div className="hidden md:flex items-center justify-center relative w-4 h-4">
                {isThisPlaying ? (
                  <>
                    <Volume2
                      size={16}
                      className="text-spotify-green group-hover:hidden animate-pulse"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                      }}
                      className="hidden group-hover:flex text-spotify-textBase hover:scale-110 transition-transform"
                    >
                      <Pause size={15} fill="currentColor" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`text-sm group-hover:hidden ${
                        isCurrent ? 'text-spotify-green font-bold' : 'text-spotify-textSubdued'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(song, songs);
                      }}
                      className="hidden group-hover:flex text-spotify-textBase hover:scale-110 transition-transform"
                    >
                      <Play size={15} fill="currentColor" />
                    </button>
                  </>
                )}
              </div>

              {/* Title & Artist & Thumbnail */}
              <div className="flex items-center gap-2.5 md:gap-3 min-w-0 pr-2">
                <CoverArt song={song} size="sm" className="w-10 h-10 rounded-subtle object-cover shadow-sm flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-semibold text-sm truncate ${
                      isCurrent ? 'text-spotify-green' : 'text-spotify-textBase'
                    }`}
                  >
                    {song.title}
                  </span>
                  <span className="text-xs text-spotify-textSubdued truncate hover:underline hover:text-spotify-textBase">
                    {song.artist}
                  </span>
                </div>
              </div>

              {/* Album (Desktop only) */}
              {showAlbum && (
                <div className="hidden md:block truncate text-xs text-spotify-textSubdued hover:text-spotify-textBase">
                  {song.album}
                </div>
              )}

              {/* Date Added (Desktop only) */}
              {showDate && (
                <div className="hidden lg:block text-xs text-spotify-textSubdued truncate">
                  {formatDateAdded(song.dateAdded)}
                </div>
              )}

              {/* Like, Duration & Options */}
              <div className="flex items-center justify-end gap-2 md:gap-3 pr-1 md:pr-2">
                {/* Duration */}
                <span className="hidden sm:inline text-xs text-spotify-textSubdued w-9 text-right font-mono">
                  {formatDuration(song.duration)}
                </span>

                {/* Dropdown Options Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuSongId(activeMenuSongId === song.id ? null : song.id);
                    }}
                    className={`p-1 text-spotify-textSubdued hover:text-spotify-textBase rounded-full transition-opacity ${
                      activeMenuSongId === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Mais opções"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {/* Context Menu Dropdown */}
                  {activeMenuSongId === song.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-7 w-56 bg-spotify-elevated rounded-card shadow-spotify-heavy py-1.5 z-50 text-xs border border-spotify-border/40"
                    >
                      {/* Add to Playlist Submenu */}
                      <div className="px-3 py-1.5 text-spotify-textSubdued font-bold text-[10px] uppercase tracking-wider">
                        Adicionar à Playlist
                      </div>

                      {/* Create New Playlist & Add Track */}
                      <button
                        onClick={async () => {
                          const plName = prompt(`Digite o nome da nova playlist para adicionar "${song.title}":`);
                          if (plName && plName.trim()) {
                            await addPlaylist(plName.trim(), '', song.id);
                          }
                          setActiveMenuSongId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-spotify-highlight text-spotify-green flex items-center gap-2 font-semibold transition-colors"
                      >
                        <Plus size={14} />
                        <span>Nova Playlist</span>
                      </button>

                      {playlists.map((pl) => {
                        const isAlreadyIn = pl.songIds && pl.songIds.includes(song.id);
                        return (
                          <button
                            key={pl.id}
                            onClick={() => {
                              if (isAlreadyIn) {
                                removeTrackFromPlaylist(pl.id, song.id);
                              } else {
                                addTrackToPlaylist(pl.id, song.id);
                              }
                              setActiveMenuSongId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-spotify-highlight text-spotify-textBase flex items-center justify-between transition-colors"
                          >
                            <span className="truncate">{pl.name}</span>
                            {isAlreadyIn ? (
                              <Check size={14} className="text-spotify-green flex-shrink-0" />
                            ) : (
                              <PlusCircle size={14} className="text-spotify-textSubdued flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}

                      <div className="my-1 border-t border-spotify-border/30" />

                      {/* Play all in random order */}
                      <button
                        onClick={() => {
                          playCollectionInShuffle(songs);
                          setActiveMenuSongId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-spotify-highlight text-spotify-textBase flex items-center gap-2 transition-colors"
                      >
                        <Shuffle size={14} className="text-spotify-green" />
                        <span>Tocar em Ordem Aleatória</span>
                      </button>

                      {/* Restore original album cover */}
                      <button
                        onClick={async () => {
                          try {
                            setUpdatingSongId(song.id);
                            await updateSongCover(song.id);
                            setActiveMenuSongId(null);
                          } catch (err) {
                            alert('Não foi possível obter a capa original deste álbum.');
                          } finally {
                            setUpdatingSongId(null);
                          }
                        }}
                        disabled={updatingSongId === song.id}
                        className="w-full text-left px-3 py-1.5 hover:bg-spotify-highlight text-spotify-textBase flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={`text-spotify-green ${updatingSongId === song.id ? 'animate-spin' : ''}`} />
                        <span>{updatingSongId === song.id ? 'Buscando capa original...' : 'Restaurar Capa do Álbum'}</span>
                      </button>

                      {/* Remove from current playlist if viewing one */}
                      {playlistId && (
                        <button
                          onClick={() => {
                            removeTrackFromPlaylist(playlistId, song.id);
                            setActiveMenuSongId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-spotify-highlight text-spotify-textBase flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>Remover desta playlist</span>
                        </button>
                      )}

                      {/* Delete from library */}
                      <button
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir "${song.title}" da sua biblioteca?`)) {
                            removeSong(song.id);
                          }
                          setActiveMenuSongId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-spotify-negative/20 text-spotify-negative flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Excluir da biblioteca</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
