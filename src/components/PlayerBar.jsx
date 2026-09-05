import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Activity,
  ListMusic,
  Speaker,
  Bluetooth,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/formatters';
import CoverArt from './CoverArt';
import MobilePlayerModal from './MobilePlayerModal';

export default function PlayerBar({
  onToggleVisualizer,
  onToggleQueue,
  onToggleDevices,
}) {
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlayPause,
    seekTo,
    handleNextTrack,
    handlePrevTrack,
    handleVolumeChange,
    toggleMute,
    setIsShuffle,
    cycleRepeatMode,
    isBluetoothActive,
    currentDeviceName,
  } = usePlayer();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  // Mobile swipe gesture state (arrastar para esquerda/direita)
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchDeltaXRef.current = 0;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      isSwipingRef.current = true;
      touchDeltaXRef.current = deltaX;
      const dampened = Math.sign(deltaX) * Math.min(Math.abs(deltaX), 60);
      setSwipeOffset(dampened);
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    const threshold = 35; // Distância mínima do gesto de arrastar em pixels

    if (deltaX > threshold) {
      // Arrastou para a direita -> volta a música anterior
      handlePrevTrack();
    } else if (deltaX < -threshold) {
      // Arrastou para a esquerda -> pula para a próxima música
      handleNextTrack();
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchDeltaXRef.current = 0;
    setSwipeOffset(0);

    setTimeout(() => {
      isSwipingRef.current = false;
    }, 120);
  };

  const displayTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  const handleSeekChange = (e) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    seekTo(seekValue);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      {/* Desktop Player Bar (hidden on mobile) */}
      <footer className="hidden md:flex h-20 bg-black border-t border-spotify-surface px-4 items-center justify-between select-none z-30 flex-shrink-0">
      {/* Left Column: Now Playing Info */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[180px]">
        {currentSong ? (
          <>
            <CoverArt song={currentSong} size="md" className="rounded-subtle shadow-md" />
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-bold text-spotify-textBase truncate hover:underline cursor-pointer">
                {currentSong.title}
              </span>
              <span className="text-xs text-spotify-textSubdued truncate hover:underline hover:text-spotify-textBase cursor-pointer">
                {currentSong.artist}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-spotify-surface rounded-subtle flex items-center justify-center text-neutral-600">
              <Activity size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-neutral-500">Nenhuma música tocando</span>
              <span className="text-[11px] text-neutral-600">Selecione uma faixa</span>
            </div>
          </div>
        )}
      </div>

      {/* Center Column: Controls & Seekbar */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-2xl px-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-5">
          {/* Shuffle Button */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`transition-colors relative ${
              isShuffle ? 'text-spotify-green' : 'text-spotify-textSubdued hover:text-spotify-textBase'
            }`}
            title={isShuffle ? 'Desativar ordem aleatória' : 'Ativar ordem aleatória'}
          >
            <Shuffle size={17} />
            {isShuffle && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={handlePrevTrack}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors transform active:scale-95"
            title="Anterior"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          {/* Play / Pause Circular Button */}
          <button
            onClick={togglePlayPause}
            className="w-9 h-9 rounded-full bg-spotify-green hover:scale-105 text-black flex items-center justify-center transition-all transform active:scale-95 shadow-md"
            title={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" strokeWidth={1} />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" strokeWidth={1} />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={handleNextTrack}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors transform active:scale-95"
            title="Próxima"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          {/* Repeat Button */}
          <button
            onClick={cycleRepeatMode}
            className={`transition-colors relative ${
              repeatMode !== 'off'
                ? 'text-spotify-green'
                : 'text-spotify-textSubdued hover:text-spotify-textBase'
            }`}
            title={
              repeatMode === 'off'
                ? 'Ativar repetição'
                : repeatMode === 'all'
                ? 'Repetir uma'
                : 'Desativar repetição'
            }
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            {repeatMode !== 'off' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
            )}
          </button>
        </div>

        {/* Seekbar */}
        <div className="w-full flex items-center gap-2 group">
          <span className="text-[11px] font-normal text-spotify-textSubdued w-10 text-right">
            {formatDuration(displayTime)}
          </span>

          <div className="relative flex-1 flex items-center h-3">
            {/* Custom filled progress bar layer */}
            <div className="absolute left-0 right-0 h-1 bg-spotify-border/60 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-spotify-textBase group-hover:bg-spotify-green transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={displayTime || 0}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekMouseDown}
              onTouchEnd={handleSeekMouseUp}
              className="spotify-slider w-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>

          <span className="text-[11px] font-normal text-spotify-textSubdued w-10 text-left">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Right Column: Volume & Extra Controls */}
      <div className="flex items-center justify-end gap-3.5 w-1/4 min-w-[180px]">
        {/* Visualizer Button */}
        <button
          onClick={onToggleVisualizer}
          className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors p-1"
          title="Modo Visualizador / Canvas"
        >
          <Activity size={18} />
        </button>

        {/* Queue Button */}
        <button
          onClick={onToggleQueue}
          className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors p-1"
          title="Fila de reprodução"
        >
          <ListMusic size={18} />
        </button>

        {/* Bluetooth & Output Devices Button */}
        <button
          onClick={onToggleDevices}
          className={`relative p-1 transition-colors ${
            isBluetoothActive
              ? 'text-spotify-green'
              : 'text-spotify-textSubdued hover:text-spotify-textBase'
          }`}
          title={`Dispositivo: ${currentDeviceName} (Clique para conectar Bluetooth/Carro)`}
        >
          {isBluetoothActive ? <Bluetooth size={18} /> : <Speaker size={18} />}
          {isBluetoothActive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-spotify-green rounded-full shadow-sm" />
          )}
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-2 group w-32">
          <button
            onClick={toggleMute}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
            title={isMuted ? 'Desmutar' : 'Mutar'}
          >
            <VolumeIcon size={18} />
          </button>

          <div className="relative flex-1 flex items-center h-3">
            <div className="absolute left-0 right-0 h-1 bg-spotify-border/60 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-spotify-textBase group-hover:bg-spotify-green transition-colors"
                style={{ width: `${volumePercent}%` }}
              />
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="spotify-slider w-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
      </footer>
      {/* Mobile Floating Mini-Player Bar (Spotify Mobile style with gestures) */}
      {currentSong && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
            transition: swipeOffset ? 'none' : 'transform 0.25s ease-out',
          }}
          className="md:hidden fixed bottom-[70px] left-2.5 right-2.5 z-40 bg-spotify-surface/95 backdrop-blur-md rounded-card shadow-spotify-heavy border border-spotify-border/40 overflow-hidden select-none cursor-pointer"
        >
          <div className="flex items-center justify-between p-2 gap-2">
            {/* Song Info (Tap to open full player) */}
            <div
              onClick={() => {
                if (!isSwipingRef.current && Math.abs(touchDeltaXRef.current) < 10) {
                  setIsMobileModalOpen(true);
                }
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <CoverArt song={currentSong} size="sm" className="w-10 h-10 rounded-subtle object-cover shadow-sm flex-shrink-0 pointer-events-none" />
              <div className="flex flex-col min-w-0 pointer-events-none">
                <span className="text-xs font-bold text-white truncate">
                  {currentSong.title}
                </span>
                <span className="text-[11px] text-spotify-textSubdued truncate">
                  {currentSong.artist}
                </span>
              </div>
            </div>

            {/* Quick Actions (Previous, Play/Pause, Next & More) */}
            <div
              className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onToggleDevices}
                className={`p-1.5 transition-colors ${
                  isBluetoothActive ? 'text-spotify-green' : 'text-spotify-textSubdued'
                }`}
                title={currentDeviceName}
              >
                {isBluetoothActive ? <Bluetooth size={16} /> : <Speaker size={16} />}
              </button>

              {/* Botão Voltar à Anterior */}
              <button
                onClick={handlePrevTrack}
                className="p-1.5 text-spotify-textSubdued hover:text-white active:scale-75 transition-transform"
                title="Voltar à música anterior (ou deslize para a direita)"
              >
                <SkipBack size={18} />
              </button>

              {/* Botão Play / Pause */}
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md active:scale-90 transition-transform mx-0.5"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? (
                  <Pause size={17} fill="currentColor" />
                ) : (
                  <Play size={17} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              {/* Botão Pular para a Próxima */}
              <button
                onClick={handleNextTrack}
                className="p-1.5 text-spotify-textSubdued hover:text-white active:scale-75 transition-transform"
                title="Pular para a próxima música (ou deslize para a esquerda)"
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>

          {/* Slim Progress Bar */}
          <div className="w-full h-0.5 bg-neutral-800">
            <div
              className="h-full bg-spotify-green transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Mobile Full Screen Player Modal */}
      <MobilePlayerModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onOpenDevices={onToggleDevices}
        onOpenQueue={onToggleQueue}
        onOpenVisualizer={onToggleVisualizer}
      />
    </>
  );
}
