import React, { useState, useMemo } from 'react';
import {
  Search,
  Play,
  Pause,
  Music,
  Trash2,
  ListMusic,
  FolderUp,
  Disc,
  Smartphone,
  Plus,
  Shuffle,
  ListPlus,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getGreeting, formatDuration } from '../utils/formatters';
import TrackTable from './TrackTable';
import CoverArt from './CoverArt';
import SpotifyImporter from './SpotifyImporter';

export default function MainView({ onOpenUpload, onOpenInstallMobile, onOpenCreatePlaylist }) {
  const {
    songs,
    playlists,
    currentView,
    setCurrentView,
    selectedPlaylistId,
    setSelectedPlaylistId,
    searchQuery,
    setSearchQuery,
    playSong,
    currentSong,
    isPlaying,
    togglePlayPause,
    removePlaylist,
    isShuffle,
    setIsShuffle,
    playCollectionInShuffle,
  } = usePlayer();

  const [libraryFilter, setLibraryFilter] = useState('all'); // 'all' | 'songs' | 'playlists' | 'artists'

  // Selected Playlist object
  const activePlaylist = useMemo(() => {
    return playlists.find((p) => p.id === selectedPlaylistId);
  }, [playlists, selectedPlaylistId]);

  // Playlist songs
  const playlistSongs = useMemo(() => {
    if (!activePlaylist || !activePlaylist.songIds) return [];
    return activePlaylist.songIds
      .map((id) => songs.find((s) => s.id === id))
      .filter(Boolean);
  }, [activePlaylist, songs]);

  // Filtered songs by search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        (s.genre && s.genre.toLowerCase().includes(q))
    );
  }, [songs, searchQuery]);

  const topSearchResult = searchResults.length > 0 ? searchResults[0] : null;

  // Filtered songs for Início view
  const displayedSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    return searchResults;
  }, [songs, searchQuery, searchResults]);

  // Artists unique list for Search view
  const uniqueArtists = useMemo(() => {
    const map = new Map();
    songs.forEach((s) => {
      const art = s.artist || 'Artista Desconhecido';
      if (!map.has(art)) {
        map.set(art, []);
      }
      map.get(art).push(s);
    });
    return Array.from(map.entries()).map(([artist, artistSongs]) => ({
      artist,
      count: artistSongs.length,
      sampleSong: artistSongs[0],
    }));
  }, [songs]);



  // Handle Play for a list of songs
  const handlePlayCollection = (songList) => {
    if (songList.length === 0) return;
    if (currentSong && songList.some((s) => s.id === currentSong.id)) {
      togglePlayPause();
    } else {
      playSong(songList[0], songList);
    }
  };

  const isCollectionPlaying = (songList) => {
    return (
      isPlaying &&
      currentSong &&
      songList.some((s) => s.id === currentSong.id)
    );
  };

  if (currentView === 'spotify') {
    return (
      <main className="flex-1 bg-spotify-base md:rounded-card overflow-hidden m-0 md:m-2 md:ml-0 flex flex-col relative select-none">
        <SpotifyImporter />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-gradient-to-b from-neutral-900 to-spotify-base md:rounded-card overflow-y-auto m-0 md:m-2 md:ml-0 flex flex-col relative select-none">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-spotify-surface/90 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-3.5 flex items-center justify-between border-b border-spotify-border/20 gap-3 sm:gap-4">
        {/* Left: Brand Logo */}
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center cursor-pointer flex-shrink-0 select-none"
          title="Marcos Music - Início"
        >
          <img
            src="/marcos-music-logo.png"
            alt="Marcos Music"
            className="h-8 sm:h-10 md:h-12 w-auto max-w-[150px] sm:max-w-[200px] md:max-w-[240px] object-contain transition-transform hover:scale-105"
          />
        </div>

        {/* Right Section: Search Bar (far right) & App no Celular */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          {/* Search Bar */}
          <div className="relative flex items-center w-44 sm:w-60 md:w-72">
            <Search
              size={15}
              className="absolute left-3 text-spotify-textSubdued pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentView !== 'search' && e.target.value) {
                  setCurrentView('search');
                }
              }}
              onFocus={() => {
                if (currentView !== 'search') setCurrentView('search');
              }}
              placeholder="O que você quer ouvir?"
              className="w-full bg-spotify-middark text-white text-xs placeholder:text-spotify-textSubdued rounded-pill py-2 pl-9 pr-3 outline-none shadow-spotify-inset focus:ring-1 focus:ring-spotify-green transition-all"
            />
          </div>

          {/* Top Right: App no Celular (Apenas na versão Desktop) */}
          <div className="hidden md:flex items-center flex-shrink-0">
            <button
              onClick={onOpenInstallMobile}
              className="flex items-center gap-1.5 bg-spotify-elevated hover:bg-spotify-highlight text-spotify-textBase hover:text-white text-xs font-semibold px-3 py-1.5 rounded-fullpill transition-all transform active:scale-95 border border-spotify-border/40 shadow-sm"
              title="Instalar no Celular / Baixar APK"
            >
              <Smartphone size={14} className="text-spotify-green" />
              <span>App no Celular</span>
            </button>
          </div>
        </div>
      </header>

      {/* View Content */}
      <div className="flex-1 p-3 sm:p-6 pb-36 md:pb-28">
        {/* ================= HOME / INÍCIO VIEW ================= */}
        {currentView === 'home' && (
          <div className="space-y-6">
            {/* Header with Title, Action Buttons & Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold font-spotifyTitle text-white tracking-tight">
                  Início
                </h1>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2">
                {['all', 'songs', 'playlists'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLibraryFilter(f)}
                    className={`px-3 py-1.5 rounded-fullpill text-xs font-bold uppercase tracking-spotify-caps transition-colors ${
                      libraryFilter === f
                        ? 'bg-white text-black'
                        : 'bg-spotify-surface text-spotify-textSubdued hover:text-white hover:bg-spotify-middark'
                    }`}
                  >
                    {f === 'all'
                      ? 'Tudo'
                      : f === 'songs'
                      ? 'Músicas'
                      : 'Playlists'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content according to filter: Playlists */}
            {(libraryFilter === 'all' || libraryFilter === 'playlists') && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">Playlists</h2>
                  {playlists.length > 0 && (
                    <button
                      onClick={onOpenCreatePlaylist}
                      className="text-xs text-spotify-textSubdued hover:text-spotify-green flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Nova playlist</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">

                  {/* Create New Playlist Action Card */}
                  <div
                    onClick={onOpenCreatePlaylist}
                    className="group bg-spotify-surface/40 hover:bg-spotify-surface border-2 border-dashed border-spotify-border/40 hover:border-spotify-green p-3.5 rounded-card transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[160px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-spotify-green/15 text-spotify-green flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
                      <Plus size={24} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-xs text-white">Criar Playlist</span>
                    <span className="text-[11px] text-spotify-textSubdued mt-0.5">Nova coleção</span>
                  </div>

                  {playlists.map((pl) => {
                    const firstSong = songs.find((s) => pl.songIds && pl.songIds.includes(s.id));
                    return (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlaylistId(pl.id);
                          setCurrentView('playlist');
                        }}
                        className="group bg-spotify-surface hover:bg-spotify-highlight p-3.5 rounded-card transition-all cursor-pointer flex flex-col"
                      >
                        <div className="aspect-square w-full rounded-standard bg-spotify-middark flex items-center justify-center text-spotify-green mb-3 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                          {firstSong ? (
                            <CoverArt song={firstSong} size="lg" className="w-full h-full object-cover" />
                          ) : (
                            <ListMusic size={32} />
                          )}
                        </div>
                        <span className="font-bold text-sm text-white truncate">{pl.name}</span>
                        <span className="text-xs text-spotify-textSubdued mt-1">
                          Playlist • {pl.songIds?.length || 0} faixas
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content according to filter: Songs */}
            {(libraryFilter === 'all' || libraryFilter === 'songs') && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-white mb-3">
                  {searchQuery.trim() ? `Músicas encontradas para "${searchQuery}"` : 'Todas as Músicas'}
                </h2>
                {displayedSongs.length > 0 ? (
                  <TrackTable songs={displayedSongs} />
                ) : searchQuery.trim() ? (
                  <div className="py-8 text-center text-spotify-textSubdued bg-spotify-surface/40 rounded-card p-6 border border-dashed border-spotify-border/40">
                    <p className="font-bold text-base text-white mb-1">Nenhuma música encontrada</p>
                    <p className="text-xs">Não encontramos nenhuma faixa baixada para "{searchQuery}".</p>
                  </div>
                ) : (
                  <div className="p-8 rounded-card bg-spotify-surface/50 border border-spotify-border/30 flex flex-col items-center justify-center text-center max-w-sm mx-auto my-4">
                    <div className="w-14 h-14 rounded-full bg-spotify-green/15 text-spotify-green flex items-center justify-center mb-3">
                      <Music size={28} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Nenhuma música baixada</h3>
                    <p className="text-xs text-spotify-textSubdued mb-4">
                      Adicione músicas para ouvir offline a qualquer momento.
                    </p>
                    <button
                      onClick={onOpenUpload}
                      className="py-2.5 px-6 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps transition-all transform active:scale-95 shadow-md flex items-center gap-2"
                    >
                      <FolderUp size={16} strokeWidth={2.5} />
                      <span>Adicionar Músicas</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ================= SEARCH VIEW ================= */}
        {currentView === 'search' && (
          <div className="space-y-6">
            {!searchQuery.trim() ? (
              <div>
                <h2 className="text-xl font-bold font-spotifyTitle text-white mb-4">
                  Navegar por Artistas ({uniqueArtists.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {uniqueArtists.map(({ artist, count, sampleSong }) => (
                    <div
                      key={artist}
                      onClick={() => setSearchQuery(artist)}
                      className="group bg-spotify-surface p-4 rounded-card hover:bg-spotify-highlight transition-colors cursor-pointer flex flex-col items-center text-center"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden mb-3 shadow-md">
                        <CoverArt song={sampleSong} size="lg" className="w-full h-full rounded-full" />
                      </div>
                      <span className="font-bold text-sm text-white truncate w-full">{artist}</span>
                      <span className="text-xs text-spotify-textSubdued mt-0.5">
                        {count} {count === 1 ? 'música' : 'músicas'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold font-spotifyTitle text-white mb-4">
                  Resultados para "{searchQuery}"
                </h2>

                {searchResults.length === 0 ? (
                  <div className="py-12 text-center text-spotify-textSubdued space-y-3 bg-spotify-surface/40 rounded-card p-6 border border-dashed border-spotify-border/40">
                    <p className="font-bold text-base text-white">Nenhuma música offline encontrada para "{searchQuery}"</p>
                    <p className="text-xs">Você pode buscar e baixar essa música diretamente da nuvem com 1 clique.</p>
                    <button
                      onClick={() => setCurrentView('spotify')}
                      className="mt-2 py-2.5 px-6 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps transition-all transform active:scale-95 shadow-md inline-block"
                    >
                      Buscar e Baixar "{searchQuery}"
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Top Result Card & Top 4 Songs */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                      {topSearchResult && (
                        <div
                          onClick={() => playSong(topSearchResult, searchResults)}
                          className="group bg-spotify-surface p-5 rounded-card hover:bg-spotify-highlight transition-all cursor-pointer flex flex-col justify-between relative shadow-spotify-medium"
                        >
                          <CoverArt
                            song={topSearchResult}
                            size="lg"
                            className="w-24 h-24 rounded-standard mb-4 shadow-md"
                          />
                          <div>
                            <span className="text-xs uppercase font-bold tracking-spotify-caps text-spotify-textSubdued">
                              Melhor Resultado
                            </span>
                            <h3 className="text-2xl font-bold text-white truncate mt-1">
                              {topSearchResult.title}
                            </h3>
                            <p className="text-sm text-spotify-textSubdued mt-1">
                              {topSearchResult.artist} • {topSearchResult.album}
                            </p>
                          </div>
                          <button
                            className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-spotify-heavy opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105"
                          >
                            <Play size={20} fill="currentColor" className="ml-0.5" />
                          </button>
                        </div>
                      )}

                      <div>
                        <TrackTable songs={searchResults.slice(0, 5)} showDate={false} />
                      </div>
                    </div>

                    {/* All matching tracks */}
                    {searchResults.length > 5 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-bold text-white mb-3">Mais Músicas</h3>
                        <TrackTable songs={searchResults.slice(5)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}



        {/* ================= PLAYLIST VIEW ================= */}
        {currentView === 'playlist' && activePlaylist && (
          <div className="space-y-6">
            {/* Playlist Header (Centered Cover & Info) */}
            <div className="flex flex-col items-center text-center gap-5 sm:gap-6 bg-gradient-to-t from-spotify-base to-neutral-800 -mx-3 sm:-mx-6 -mt-3 sm:-mt-6 p-6 sm:p-8 rounded-t-card">
              <div className="w-48 h-48 sm:w-56 sm:h-56 min-w-[192px] sm:min-w-[224px] rounded-card bg-spotify-surface flex items-center justify-center text-spotify-green shadow-spotify-heavy mx-auto">
                {playlistSongs.length > 0 ? (
                  <CoverArt song={playlistSongs[0]} size="xl" className="w-full h-full rounded-card" />
                ) : (
                  <ListMusic size={80} />
                )}
              </div>
              <div className="flex flex-col items-center gap-2 max-w-2xl text-center">
                <span className="text-xs font-bold uppercase tracking-spotify-caps text-spotify-textBase">
                  Playlist Pública
                </span>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-spotifyTitle text-white tracking-tight break-words">
                  {activePlaylist.name}
                </h1>
                {activePlaylist.description && (
                  <p className="text-xs sm:text-sm text-spotify-textSubdued line-clamp-2 max-w-lg">
                    {activePlaylist.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 text-xs text-spotify-textSubdued font-semibold mt-1">
                  <span className="text-white">Marcos</span>
                  <span>•</span>
                  <span>
                    {playlistSongs.length} {playlistSongs.length === 1 ? 'música' : 'músicas'}
                  </span>
                  {playlistSongs.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {formatDuration(
                          playlistSongs.reduce((acc, curr) => acc + (curr.duration || 0), 0)
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-4 sm:gap-6">
                {playlistSongs.length > 0 && (
                  <>
                    <button
                      onClick={() => handlePlayCollection(playlistSongs)}
                      className="w-14 h-14 rounded-full bg-spotify-green hover:scale-105 text-black flex items-center justify-center transition-all transform active:scale-95 shadow-spotify-heavy"
                      title={isCollectionPlaying(playlistSongs) ? 'Pausar' : 'Reproduzir playlist'}
                    >
                      {isCollectionPlaying(playlistSongs) ? (
                        <Pause size={24} fill="currentColor" />
                      ) : (
                        <Play size={24} fill="currentColor" className="ml-1" />
                      )}
                    </button>

                    {/* Shuffle Button (Ordem Aleatória) */}
                    <button
                      onClick={() => playCollectionInShuffle(playlistSongs)}
                      className={`p-3 rounded-full hover:scale-110 transition-all transform active:scale-95 relative ${
                        isShuffle && isCollectionPlaying(playlistSongs)
                          ? 'text-spotify-green bg-spotify-green/15'
                          : 'text-spotify-textSubdued hover:text-white'
                      }`}
                      title={isShuffle ? 'Ordem aleatória ativada (Clique para nova ordem)' : 'Tocar em ordem aleatória'}
                    >
                      <Shuffle size={26} />
                      {isShuffle && isCollectionPlaying(playlistSongs) && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-spotify-green rounded-full" />
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Delete Playlist Option */}
              <button
                onClick={() => {
                  if (confirm(`Deseja realmente apagar a playlist "${activePlaylist.name}"?`)) {
                    removePlaylist(activePlaylist.id);
                  }
                }}
                className="text-xs text-spotify-textSubdued hover:text-spotify-negative flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={16} />
                <span>Excluir Playlist</span>
              </button>
            </div>

            {/* Track Table or Empty State */}
            {playlistSongs.length > 0 ? (
              <TrackTable songs={playlistSongs} playlistId={activePlaylist.id} />
            ) : (
              <div className="p-10 rounded-card bg-spotify-surface/40 border border-spotify-border/30 flex flex-col items-center justify-center text-center max-w-md mx-auto my-6">
                <ListMusic size={44} className="text-spotify-textSubdued mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Esta playlist está vazia</h3>
                <p className="text-xs text-spotify-textSubdued mb-5">
                  Adicione músicas à playlist clicando no menu de 3 pontinhos ao lado de qualquer música.
                </p>
                <button
                  onClick={() => setCurrentView('spotify')}
                  className="py-2.5 px-6 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps transition-all transform active:scale-95 shadow-md flex items-center gap-2"
                >
                  <Search size={15} />
                  <span>Explorar Músicas</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
