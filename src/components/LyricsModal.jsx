import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic2,
  Music,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { findActiveLyricIndex } from '../utils/lyrics';
import { formatDuration } from '../utils/formatters';

export default function LyricsModal({ isOpen, onClose }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    seekTo,
    handleNextTrack,
    handlePrevTrack,
    lyricsData,
    reloadLyrics,
  } = usePlayer();

  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  // Manual scroll detection to pause auto-scroll if user is browsing
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef(null);

  // Determine current active lyric line index
  const activeIndex = findActiveLyricIndex(lyricsData.parsedLines, currentTime);

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (!isOpen || isUserScrolling || !activeLineRef.current) return;

    activeLineRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeIndex, isOpen, isUserScrolling]);

  // Handle user scroll wheel / touch
  const handleScroll = () => {
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3500);
  };

  const resumeAutoScroll = () => {
    setIsUserScrolling(false);
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  if (!isOpen || !currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-none font-spotify animate-fadeIn overflow-hidden">
      {/* Dynamic Ambient Background using blurred album art */}
      {currentSong.coverUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-30 scale-125 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 pt-4 pb-3 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-spotify-textSubdued hover:text-white transition-colors active:scale-95 flex-shrink-0"
            title="Fechar letras"
            aria-label="Fechar"
          >
            <ChevronDown size={28} />
          </button>

          {currentSong.coverUrl ? (
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-subtle object-cover shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-subtle bg-spotify-surface flex items-center justify-center text-spotify-green flex-shrink-0">
              <Music size={20} />
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
              {currentSong.title}
            </h2>
            <span className="text-xs text-spotify-textSubdued truncate mt-0.5">
              {currentSong.artist}
            </span>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {lyricsData.isSynced && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-spotify-green bg-spotify-green/15 px-3 py-1 rounded-full border border-spotify-green/30">
              <span className="w-2 h-2 rounded-full bg-spotify-green animate-pulse" />
              Sincronizada
            </span>
          )}
          {!lyricsData.isSynced && !lyricsData.instrumental && lyricsData.plainLyrics && (
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-full">
              Texto corrido
            </span>
          )}
        </div>
      </header>

      {/* Main Lyrics Area */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchMove={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-12 md:px-20 py-16 scroll-smooth"
      >
        {/* State: Loading */}
        {lyricsData.isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center shadow-lg animate-pulse">
              <Mic2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-white">Carregando letra...</h3>
            <p className="text-xs text-spotify-textSubdued max-w-xs">
              Sincronizando as estrofes com a reprodução
            </p>
          </div>
        )}

        {/* State: Instrumental */}
        {!lyricsData.isLoading && lyricsData.instrumental && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
            <div className="w-16 h-16 rounded-full bg-spotify-surface text-spotify-green flex items-center justify-center shadow-lg">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-bold font-spotifyTitle text-white">
              ♪ Faixa Instrumental ♪
            </h3>
            <p className="text-sm text-spotify-textSubdued max-w-sm">
              Esta música não possui letra vocal. Aproveite o ritmo e a melodia!
            </p>
          </div>
        )}

        {/* State: Synchronized Lyrics */}
        {!lyricsData.isLoading && lyricsData.isSynced && lyricsData.parsedLines.length > 0 && (
          <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto py-8">
            {lyricsData.parsedLines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = activeIndex !== -1 && idx < activeIndex;

              return (
                <p
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => seekTo(line.time)}
                  className={`cursor-pointer transition-all duration-300 font-spotifyTitle leading-relaxed ${
                    isActive
                      ? 'text-white font-black text-2xl sm:text-3xl md:text-4xl scale-[1.03] origin-left drop-shadow-[0_4px_16px_rgba(255,255,255,0.25)] text-spotify-green'
                      : isPast
                      ? 'text-white/60 hover:text-white font-bold text-xl sm:text-2xl md:text-3xl'
                      : 'text-white/25 hover:text-white/60 font-semibold text-lg sm:text-xl md:text-2xl'
                  }`}
                  title={`Pular para ${formatDuration(line.time)}`}
                >
                  {line.text}
                </p>
              );
            })}
          </div>
        )}

        {/* State: Plain Lyrics (Unsynced) */}
        {!lyricsData.isLoading && !lyricsData.isSynced && lyricsData.plainLyrics && (
          <div className="max-w-2xl mx-auto py-8 text-center sm:text-left space-y-4">
            <div className="mb-6 p-3 rounded-card bg-spotify-surface/40 border border-white/10 text-xs text-spotify-textSubdued text-center">
              Letra em modo texto corrido (sem marcações de tempo).
            </div>
            {lyricsData.plainLyrics.split(/\r?\n/).map((line, i) => (
              <p key={i} className="text-lg sm:text-xl font-medium text-white/90 leading-relaxed">
                {line || ' '}
              </p>
            ))}
          </div>
        )}

        {/* State: Not Found / Error */}
        {!lyricsData.isLoading &&
          !lyricsData.isSynced &&
          !lyricsData.plainLyrics &&
          !lyricsData.instrumental && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
              <div className="w-14 h-14 rounded-full bg-spotify-surface text-spotify-textSubdued flex items-center justify-center shadow-lg">
                <Mic2 size={26} />
              </div>
              <h3 className="text-lg font-bold text-white">Letra ainda não disponível</h3>
              <p className="text-xs text-spotify-textSubdued max-w-sm">
                Não encontramos a letra sincronizada para &quot;{currentSong.title}&quot;.
              </p>
              <button
                onClick={reloadLyrics}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full bg-spotify-surface hover:bg-spotify-middark text-white text-xs font-bold transition-all border border-spotify-border/40 active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Tentar buscar novamente</span>
              </button>
            </div>
          )}
      </div>

      {/* Floating Resume Auto-Scroll Button */}
      {isUserScrolling && lyricsData.isSynced && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 animate-fadeIn">
          <button
            onClick={resumeAutoScroll}
            className="flex items-center gap-2 px-4 py-2 rounded-fullpill bg-spotify-green text-black font-extrabold text-xs shadow-spotify-heavy hover:scale-105 active:scale-95 transition-all"
          >
            <span>Sincronizar com o áudio</span>
          </button>
        </div>
      )}

      {/* Bottom Sticky Player Controls Bar */}
      <footer className="relative z-10 px-4 sm:px-8 py-3 bg-black/90 backdrop-blur-md border-t border-white/10 flex flex-col gap-2">
        {/* Mini Seekbar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-spotify-textSubdued w-10 text-right">
            {formatDuration(currentTime)}
          </span>
          <div className="relative flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-spotify-green transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-spotify-textSubdued w-10">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={handlePrevTrack}
            className="text-spotify-textSubdued hover:text-white active:scale-90 transition-transform"
            title="Música anterior"
          >
            <SkipBack size={22} fill="currentColor" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNextTrack}
            className="text-spotify-textSubdued hover:text-white active:scale-90 transition-transform"
            title="Próxima música"
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>
      </footer>
    </div>
  );
}
