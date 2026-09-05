import React, { useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Minimize2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/formatters';
import CoverArt from './CoverArt';

export default function VisualizerModal({ isOpen, onClose }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    seekTo,
    handleNextTrack,
    handlePrevTrack,
    isShuffle,
    setIsShuffle,
    repeatMode,
    cycleRepeatMode,
  } = usePlayer();

  const canvasRef = useRef(null);

  // Animated visualizer effect
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const barCount = 48;
    const bars = Array.from({ length: barCount }, () => ({
      height: 20,
      targetHeight: 20,
      speed: 0.15,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / barCount - 3;

      bars.forEach((bar, index) => {
        if (isPlaying) {
          if (Math.random() < 0.1) {
            // Random dynamic height for visual pulse
            bar.targetHeight = Math.random() * (height * 0.75) + 15;
          }
        } else {
          bar.targetHeight = 8;
        }

        bar.height += (bar.targetHeight - bar.height) * bar.speed;

        const x = index * (barWidth + 3);
        const y = height - bar.height;

        // Gradient from Spotify green to emerald/cyan
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, '#1ed760');
        gradient.addColorStop(1, '#1db954');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, bar.height, [3, 3, 0, 0]);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-neutral-900 via-black to-black z-50 flex flex-col justify-between p-8 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-spotify-textSubdued text-xs uppercase tracking-spotify-caps font-bold">
          <span className="w-2 h-2 rounded-full bg-spotify-green animate-pulse" />
          <span>Marcos Music Visualizer</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-spotify-textSubdued hover:text-white rounded-full bg-spotify-surface hover:bg-spotify-highlight transition-colors"
          title="Fechar tela cheia"
        >
          <Minimize2 size={20} />
        </button>
      </div>

      {/* Center Showcase */}
      <div className="flex flex-col items-center justify-center my-auto gap-6 max-w-lg mx-auto w-full">
        {currentSong ? (
          <>
            <div className="relative group">
              <CoverArt
                song={currentSong}
                size="xl"
                className="w-56 h-56 sm:w-72 sm:h-72 rounded-card shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-neutral-800"
              />
            </div>

            <div className="text-center w-full">
              <h1 className="text-2xl font-bold text-white truncate mb-1">
                {currentSong.title}
              </h1>
              <p className="text-base text-spotify-textSubdued truncate">
                {currentSong.artist} • {currentSong.album}
              </p>
            </div>

            {/* Live Audio Visualizer Canvas */}
            <div className="w-full h-24 flex items-end justify-center">
              <canvas ref={canvasRef} width={420} height={90} className="w-full h-full" />
            </div>
          </>
        ) : (
          <div className="text-center text-spotify-textSubdued">
            <p className="text-lg font-bold">Nenhuma música tocando</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="max-w-xl mx-auto w-full flex flex-col gap-4">
        {/* Seekbar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-spotify-textSubdued w-10 text-right">
            {formatDuration(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
            <div className="absolute left-0 right-0 h-1.5 bg-spotify-border/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-spotify-green"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={currentTime || 0}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="spotify-slider w-full z-10 opacity-0 group-hover:opacity-100"
            />
          </div>
          <span className="text-xs text-spotify-textSubdued w-10 text-left">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`transition-colors ${isShuffle ? 'text-spotify-green' : 'text-spotify-textSubdued hover:text-white'}`}
          >
            <Shuffle size={20} />
          </button>
          <button
            onClick={handlePrevTrack}
            className="text-spotify-textSubdued hover:text-white transition-colors"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button
            onClick={togglePlayPause}
            className="w-14 h-14 rounded-full bg-spotify-green text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>
          <button
            onClick={handleNextTrack}
            className="text-spotify-textSubdued hover:text-white transition-colors"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button
            onClick={cycleRepeatMode}
            className={`transition-colors ${repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-textSubdued hover:text-white'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
