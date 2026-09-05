import { Home, Search, FolderUp, Music2, Disc3, Smartphone, ArrowDownToLine } from 'lucide-react';
import SpotifyIcon from './SpotifyIcon';
import { usePlayer } from '../context/PlayerContext';

export default function Sidebar({ onOpenUpload, onOpenCreatePlaylist, onOpenInstallMobile }) {
  const {
    currentView,
    setCurrentView,
    playlists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    likedSongs,
    songs,
    activeDownloadsCount,
  } = usePlayer();

  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'downloads', label: 'Downloads', icon: ArrowDownToLine, badge: activeDownloadsCount },
    { id: 'spotify', label: 'Importar Músicas', icon: SpotifyIcon, isSpotify: true },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-black flex-col h-full flex-shrink-0 select-none text-spotify-textSubdued p-3 gap-2">
      {/* Top Section: Logo & Main Navigation */}
      <div className="bg-spotify-surface rounded-card p-4 flex flex-col gap-5">
        {/* Brand Logo */}
        <div
          onClick={() => setCurrentView('home')}
          className="cursor-pointer group px-1 py-0.5"
          title="Marcos Music - Início"
        >
          <img
            src="/marcos-music-logo.png"
            alt="Marcos Music"
            className="h-11 sm:h-12 w-auto max-w-[200px] object-contain transition-transform group-hover:scale-105"
          />
        </div>

        {/* Main Nav Links */}
        <nav className="flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setSelectedPlaylistId(null);
                }}
                className={`flex items-center justify-between text-sm font-spotify transition-colors px-2 py-1.5 rounded-subtle ${
                  isActive
                    ? 'text-spotify-textBase font-bold bg-spotify-middark'
                    : 'text-spotify-textSubdued font-normal hover:text-spotify-textBase'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={
                      item.id === 'spotify'
                        ? 'text-spotify-green'
                        : item.id === 'downloads' && item.badge > 0
                        ? 'text-spotify-green'
                        : ''
                    }
                  />
                  <span>{item.label}</span>
                </div>
                {item.id === 'downloads' && item.badge > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-spotify-green text-black animate-pulse shadow-sm">
                    {item.badge}
                  </span>
                )}
                {item.id === 'spotify' && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-spotify-green/20 text-spotify-green border border-spotify-green/40 tracking-wider shadow-sm">
                    Músicas
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Library / Playlists Box */}
      <div className="bg-spotify-surface rounded-card p-3 flex-1 flex flex-col min-h-0">
        {/* Action Buttons: Importar & Criar Playlist */}
        <div className="flex flex-col gap-2 pb-3 border-b border-spotify-border/40">
          <button
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center gap-2 bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps py-2.5 px-4 rounded-fullpill transition-all transform active:scale-95 shadow-md"
          >
            <FolderUp size={16} strokeWidth={2.5} />
            <span>Adicionar Músicas</span>
          </button>
        </div>

        {/* Scrollable Playlist List */}
        <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-1">
          {playlists.length === 0 ? (
            <div className="py-6 px-2 text-center text-xs text-spotify-textSubdued">
              <p className="font-semibold text-spotify-textBright mb-1">Crie sua primeira playlist</p>
              <p className="text-[11px] text-spotify-textSubdued">É fácil, vamos te ajudar.</p>
            </div>
          ) : (
            playlists.map((pl) => {
              const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    setCurrentView('playlist');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-subtle text-xs transition-colors flex items-center justify-between group ${
                    isSelected
                      ? 'bg-spotify-middark text-spotify-green font-bold'
                      : 'text-spotify-textSubdued hover:text-spotify-textBase hover:bg-spotify-middark/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Music2 size={14} className="flex-shrink-0" />
                    <span className="truncate">{pl.name}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-normal group-hover:text-spotify-textSubdued">
                    {pl.songIds?.length || 0}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Mobile App Download Button (Desktop only) */}
        <div className="pt-2 mb-2">
          <button
            onClick={onOpenInstallMobile}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-subtle text-xs font-semibold text-spotify-textSubdued hover:text-white bg-spotify-elevated/60 hover:bg-spotify-highlight transition-all border border-spotify-border/30 group"
            title="Instalar no celular / Baixar APK"
          >
            <Smartphone size={15} className="text-spotify-green group-hover:scale-110 transition-transform" />
            <span>App no Celular / APK</span>
          </button>
        </div>

        {/* Offline Badge Footer */}
        <div className="pt-3 border-t border-spotify-border/30 flex items-center justify-between text-[11px] text-spotify-textSubdued px-1">
          <span>100% Offline</span>
          <span>{songs.length} faixas</span>
        </div>
      </div>
    </aside>
  );
}
