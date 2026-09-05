import React from 'react';
import { Home, Search } from 'lucide-react';
import SpotifyIcon from './SpotifyIcon';
import { usePlayer } from '../context/PlayerContext';

export default function BottomNav() {
  const { currentView, setCurrentView, setSelectedPlaylistId } = usePlayer();

  const navTabs = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'spotify', label: 'Músicas', icon: SpotifyIcon, isSpotify: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-spotify-border/30 px-4 py-1.5 flex items-center justify-around select-none pb-2">
      {navTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentView(tab.id);
              setSelectedPlaylistId(null);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 min-w-[64px] transition-all transform active:scale-90 ${
              isActive ? 'text-white' : 'text-spotify-textSubdued hover:text-white'
            }`}
          >
            <div className="relative">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={
                  isActive
                    ? tab.isSpotify
                      ? 'text-spotify-green'
                      : 'text-white'
                    : ''
                }
              />
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                isActive ? 'text-white font-bold' : 'text-spotify-textSubdued'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
