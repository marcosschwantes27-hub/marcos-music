import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Bluetooth,
  Speaker,
  ListMusic,
  Activity,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/formatters';
import CoverArt from './CoverArt';

export default function MobilePlayerModal({
  isOpen,
  onClose,
  onOpenDevices,
  onOpenQueue,
  onOpenVisualizer,
}) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    togglePlayPause,
    seekTo,
    handleNextTrack,
    handlePrevTrack,
    setIsShuffle,
    cycleRepeatMode,
    isBluetoothActive,
    currentDeviceName,
  } = usePlayer();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  if (!isOpen || !currentSong) return null;

  const displayTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

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

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white flex flex-col justify-between p-6 select-none font-spotify animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-spotify-textSubdued hover:text-white transition-colors"
          title="Minimizar"
        >
          <ChevronDown size={28} />
        </button>

        <div className="flex flex-col items-center text-center max-w-[200px]">
          <span className="text-[10px] uppercase font-bold tracking-widest text-spotify-textSubdued">
            Tocando Agora
          </span>
          <span className="text-xs font-bold text-white truncate w-full">
            {currentSong.album || 'Marcos Music Offline'}
          </span>
        </div>

        <button
          onClick={onOpenVisualizer}
          className="p-2 -mr-2 text-spotify-textSubdued hover:text-white transition-colors"
          title="Visualizador"
        >
          <Activity size={22} />
        </button>
      </div>

      {/* Center: Large Album Artwork */}
      <div className="my-auto flex items-center justify-center py-4">
        <div className="w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden shadow-2xl bg-spotify-surface border border-spotify-border/20">
          <CoverArt song={currentSong} size="lg" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Bottom Section: Title, Controls, Seekbar */}
      <div className="space-y-4 pb-6">
        {/* Track Title, Artist & Like */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0 pr-4">
            <h2 className="text-xl font-bold text-white truncate tracking-tight">
              {currentSong.title}
            </h2>
            <p className="text-sm text-spotify-textSubdued truncate mt-0.5">
              {currentSong.artist}
            </p>
          </div>
        </div>

        {/* Seekbar */}
        <div className="space-y-1.5">
          <div className="relative flex items-center h-4">
            <div className="absolute left-0 right-0 h-1 bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-white transition-all"
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
              className="spotify-slider w-full z-10 opacity-0 active:opacity-100"
            />
          </div>

          <div className="flex justify-between text-[11px] text-spotify-textSubdued font-mono">
            <span>{formatDuration(displayTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Main Controls: Shuffle, Prev, Big Play, Next, Repeat */}
        <div className="flex items-center justify-between px-2 pt-1">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 transition-colors relative ${
              isShuffle ? 'text-spotify-green' : 'text-spotify-textSubdued'
            }`}
          >
            <Shuffle size={20} />
            {isShuffle && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
            )}
          </button>

          <button
            onClick={handlePrevTrack}
            className="p-2 text-white active:scale-90 transition-transform"
          >
            <SkipBack size={30} fill="currentColor" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button
            onClick={handleNextTrack}
            className="p-2 text-white active:scale-90 transition-transform"
          >
            <SkipForward size={30} fill="currentColor" />
          </button>

          <button
            onClick={cycleRepeatMode}
            className={`p-2 transition-colors relative ${
              repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-textSubdued'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
            )}
          </button>
        </div>

        {/* Footer Quick Actions: Bluetooth / Car & Queue */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            onClick={onOpenDevices}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-fullpill border transition-colors ${
              isBluetoothActive
                ? 'bg-spotify-green/20 border-spotify-green/50 text-spotify-green'
                : 'bg-neutral-800/80 border-neutral-700 text-spotify-textSubdued'
            }`}
          >
            {isBluetoothActive ? <Bluetooth size={15} /> : <Speaker size={15} />}
            <span className="truncate max-w-[140px]">{currentDeviceName}</span>
          </button>

          <button
            onClick={onOpenQueue}
            className="flex items-center gap-1.5 text-spotify-textSubdued hover:text-white p-2"
          >
            <ListMusic size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
