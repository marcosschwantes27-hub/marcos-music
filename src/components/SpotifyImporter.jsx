import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FolderDown,
  ListMusic,
  ExternalLink,
  Search,
  X,
  Music,
  Disc3,
  Layers,
} from 'lucide-react';
import SpotifyIcon from './SpotifyIcon';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../utils/formatters';
import { apiFetch } from '../utils/api';

export default function SpotifyImporter() {
  const {
    downloadSpotifyTrack,
    addPlaylist,
    addTrackToPlaylist,
    addMultipleTracksToPlaylist,
    setSelectedPlaylistId,
    setCurrentView,
    songs,
  } = usePlayer();

  // Tab mode: 'search' (Pesquisar Músicas) | 'playlist' (Importar Playlist do Spotify)
  const [activeTab, setActiveTab] = useState('search');

  // Input states
  const [queryInput, setQueryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [playlistData, setPlaylistData] = useState(null);
  const [importedPlaylistId, setImportedPlaylistId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [trackFilter, setTrackFilter] = useState('');

  // Track download states: { [trackId]: 'idle' | 'downloading' | 'saved' | 'error' }
  const [trackStatus, setTrackStatus] = useState({});

  // Batch download progress
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const cancelBatchRef = useRef(false);

  // Audio preview player (30s clip)
  const [playingPreviewId, setPlayingPreviewId] = useState(null);
  const previewAudioRef = useRef(new Audio());

  useEffect(() => {
    const audio = previewAudioRef.current;
    const handleEnded = () => setPlayingPreviewId(null);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Check which tracks are already in library
  const checkSavedTracks = (trackList) => {
    const statusMap = {};
    trackList.forEach((t) => {
      const already = songs.some(
        (s) =>
          s.title.toLowerCase() === t.title.toLowerCase() &&
          s.artist.toLowerCase().includes(t.artist.toLowerCase())
      );
      if (already) {
        statusMap[t.id] = 'saved';
      }
    });
    setTrackStatus((prev) => ({ ...prev, ...statusMap }));
  };

  // Perform search or playlist load
  const handleExecute = async (inputOverride) => {
    const term = (inputOverride !== undefined ? inputOverride : queryInput).trim();
    if (!term) return;

    setIsLoading(true);
    setErrorMessage(null);

    // If it's a Spotify link, switch to playlist mode
    if (term.includes('spotify.com') || term.includes('spotify.link') || term.startsWith('spotify:')) {
      setActiveTab('playlist');
      setPlaylistData(null);
      try {
        const res = await apiFetch(`/api/spotify/playlist?url=${encodeURIComponent(term)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Não foi possível carregar a playlist do Spotify.');
        }
        const data = await res.json();
        setPlaylistData(data);
        checkSavedTracks(data.tracks || []);
      } catch (err) {
        console.error(err);
        setErrorMessage(err.message || 'Falha ao carregar playlist do Spotify.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal song search
    setActiveTab('search');
    try {
      const res = await apiFetch(`/api/music/search?q=${encodeURIComponent(term)}&limit=35`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro na pesquisa de músicas.');
      }
      const data = await res.json();
      setSearchResults(data.tracks || []);
      checkSavedTracks(data.tracks || []);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Falha ao pesquisar músicas.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle 30s audio preview
  const togglePreview = (track) => {
    const audio = previewAudioRef.current;
    if (playingPreviewId === track.id) {
      audio.pause();
      setPlayingPreviewId(null);
      return;
    }

    if (track.previewUrl) {
      audio.src = track.previewUrl;
      audio.play().catch(console.error);
      setPlayingPreviewId(track.id);
    } else {
      alert('Prévia de áudio não disponível para esta faixa. Você pode baixá-la diretamente!');
    }
  };

  // Download single track
  const handleDownloadTrack = async (track, localPlaylistId = null) => {
    setTrackStatus((prev) => ({ ...prev, [track.id]: 'downloading' }));
    try {
      // Check if song already exists in library
      const existing = songs.find(
        (s) =>
          s.title.toLowerCase() === track.title.toLowerCase() &&
          s.artist.toLowerCase().includes(track.artist.toLowerCase())
      );

      let savedSong = existing;
      if (!savedSong) {
        savedSong = await downloadSpotifyTrack(track);
      }

      setTrackStatus((prev) => ({ ...prev, [track.id]: 'saved' }));

      const targetPlaylistId = localPlaylistId || importedPlaylistId;
      if (targetPlaylistId && savedSong) {
        await addTrackToPlaylist(targetPlaylistId, savedSong.id);
      }
      return savedSong;
    } catch (err) {
      console.error(err);
      setTrackStatus((prev) => ({ ...prev, [track.id]: 'error' }));
    }
  };

  // Batch download and import Spotify playlist into Marcos Music
  const handleDownloadAll = async () => {
    if (!playlistData || !playlistData.tracks || playlistData.tracks.length === 0) return;

    cancelBatchRef.current = false;
    setIsBatchDownloading(true);

    // 1. Create the playlist in Marcos Music
    let localPl = null;
    try {
      const plTitle = playlistData.title || 'Playlist do Spotify';
      const plDesc = playlistData.subtitle
        ? `${playlistData.subtitle} • Importada do Spotify`
        : `Importada do Spotify • ${playlistData.total} faixas`;

      localPl = await addPlaylist(plTitle, plDesc);
      setImportedPlaylistId(localPl.id);
    } catch (e) {
      console.warn('Erro ao criar playlist local:', e);
    }

    const tracksToDownload = playlistData.tracks;
    setBatchProgress({ current: 0, total: tracksToDownload.length });

    const collectedSongIds = [];

    for (let i = 0; i < tracksToDownload.length; i++) {
      if (cancelBatchRef.current) break;

      const track = tracksToDownload[i];
      setBatchProgress({ current: i + 1, total: tracksToDownload.length });

      // Check if track is already in local library
      const existingSong = songs.find(
        (s) =>
          s.title.toLowerCase() === track.title.toLowerCase() &&
          s.artist.toLowerCase().includes(track.artist.toLowerCase())
      );

      if (existingSong) {
        collectedSongIds.push(existingSong.id);
        if (localPl) {
          await addTrackToPlaylist(localPl.id, existingSong.id);
        }
        setTrackStatus((prev) => ({ ...prev, [track.id]: 'saved' }));
        continue;
      }

      try {
        setTrackStatus((prev) => ({ ...prev, [track.id]: 'downloading' }));
        const saved = await downloadSpotifyTrack(track);
        if (saved) {
          collectedSongIds.push(saved.id);
          if (localPl) {
            await addTrackToPlaylist(localPl.id, saved.id);
          }
          setTrackStatus((prev) => ({ ...prev, [track.id]: 'saved' }));
        }
      } catch (e) {
        console.warn(`Erro ao baixar faixa ${track.title}:`, e);
        setTrackStatus((prev) => ({ ...prev, [track.id]: 'error' }));
      }
    }

    setIsBatchDownloading(false);

    // Automatically navigate to the imported playlist in Marcos Music!
    if (localPl) {
      setSelectedPlaylistId(localPl.id);
      setCurrentView('playlist');
    }
  };

  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
    setIsBatchDownloading(false);
  };

  // Filter tracks list
  const currentList = activeTab === 'playlist' ? playlistData?.tracks || [] : searchResults;
  const filteredList = currentList.filter((t) => {
    if (!trackFilter.trim()) return true;
    const q = trackFilter.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto select-none bg-spotify-base font-spotify text-white p-3 sm:p-6 space-y-4 sm:space-y-6 pb-36 md:pb-28">
      {/* Top Banner & Tabs */}
      <div className="bg-spotify-surface border border-spotify-border/40 rounded-card p-4 shadow-spotify-heavy space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex items-center">
          <div className="flex items-center bg-spotify-middark p-1 rounded-fullpill border border-spotify-border/40">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-5 py-2 rounded-fullpill text-xs font-bold uppercase tracking-spotify-caps transition-all ${
                activeTab === 'search'
                  ? 'bg-spotify-green text-black shadow-md'
                  : 'text-spotify-textSubdued hover:text-white'
              }`}
            >
              Pesquisar Músicas
            </button>
            <button
              onClick={() => setActiveTab('playlist')}
              className={`px-5 py-2 rounded-fullpill text-xs font-bold uppercase tracking-spotify-caps transition-all ${
                activeTab === 'playlist'
                  ? 'bg-spotify-green text-black shadow-md'
                  : 'text-spotify-textSubdued hover:text-white'
              }`}
            >
              Playlist por Link
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1 relative flex items-center">
            {activeTab === 'playlist' ? (
              <SpotifyIcon size={18} className="absolute left-3.5 text-spotify-green pointer-events-none" />
            ) : (
              <Search size={18} className="absolute left-3.5 text-spotify-textSubdued pointer-events-none" />
            )}

            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={
                activeTab === 'playlist'
                  ? 'Cole o link da playlist do Spotify...'
                  : 'Digite o nome da música ou artista...'
              }
              className="w-full bg-spotify-middark text-white text-xs rounded-fullpill py-3 pl-11 pr-4 outline-none shadow-spotify-inset focus:ring-1 focus:ring-white transition-all placeholder:text-spotify-textSubdued"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !queryInput.trim()}
            className="bg-spotify-green hover:bg-spotify-greenHover disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-spotify-caps py-3 px-6 rounded-fullpill transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : activeTab === 'playlist' ? (
              <FolderDown size={16} />
            ) : (
              <Search size={16} />
            )}
            <span>{activeTab === 'playlist' ? 'Carregar Playlist' : 'Pesquisar'}</span>
          </button>
        </form>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-card bg-spotify-negative/15 border border-spotify-negative/30 flex items-center gap-2 text-spotify-negative text-xs font-semibold">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-spotify-textSubdued">
          <Loader2 size={40} className="animate-spin text-spotify-green" />
          <p className="text-sm font-bold text-white">
            {activeTab === 'playlist'
              ? 'Carregando faixas da playlist do Spotify...'
              : 'Pesquisando músicas no catálogo global...'}
          </p>
          <p className="text-xs">Buscando capas oficiais, artistas e prévias</p>
        </div>
      )}

      {/* ================= PLAYLIST SHOWCASE ================= */}
      {activeTab === 'playlist' && playlistData && !isLoading && (
        <div className="bg-gradient-to-t from-spotify-surface to-neutral-800 p-6 rounded-card border border-spotify-border/30 shadow-spotify-heavy flex flex-col md:flex-row items-center md:items-end gap-6">
          {playlistData.cover ? (
            <img
              src={playlistData.cover}
              alt={playlistData.title}
              className="w-44 h-44 rounded-card object-cover shadow-spotify-heavy flex-shrink-0"
            />
          ) : (
            <div className="w-44 h-44 rounded-card bg-spotify-middark flex items-center justify-center text-spotify-green shadow-spotify-heavy">
              <ListMusic size={64} />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-spotify-caps text-spotify-green">
              {playlistData.type === 'album' ? 'Álbum do Spotify' : 'Playlist do Spotify'}
            </span>
            <h2 className="text-3xl md:text-4xl font-black font-spotifyTitle text-white truncate">
              {playlistData.title}
            </h2>
            <p className="text-xs text-spotify-textSubdued">
              Criado por <strong className="text-white">{playlistData.subtitle}</strong> •{' '}
              {playlistData.total} faixas encontradas
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {isBatchDownloading ? (
                <div className="flex items-center gap-3">
                  <button
                    disabled
                    className="py-3 px-6 rounded-fullpill bg-spotify-green/80 text-black text-xs font-black uppercase tracking-spotify-caps flex items-center gap-2 shadow-lg"
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span>
                      Importando Playlist: {batchProgress.current} de {batchProgress.total} faixas...
                    </span>
                  </button>
                  <button
                    onClick={handleCancelBatch}
                    className="py-3 px-4 rounded-fullpill bg-spotify-negative/20 text-spotify-negative hover:bg-spotify-negative/30 text-xs font-bold uppercase tracking-spotify-caps transition-colors"
                  >
                    Parar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDownloadAll}
                  className="py-3.5 px-8 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-black uppercase tracking-spotify-caps flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 shadow-spotify-heavy"
                  title="Baixar músicas e importar playlist para o Marcos Music"
                >
                  <FolderDown size={19} strokeWidth={2.5} />
                  <span>Baixar Playlist ({playlistData.total} faixas)</span>
                </button>
              )}

              {importedPlaylistId && !isBatchDownloading && (
                <button
                  onClick={() => {
                    setSelectedPlaylistId(importedPlaylistId);
                    setCurrentView('playlist');
                  }}
                  className="py-3.5 px-6 rounded-fullpill bg-spotify-elevated hover:bg-spotify-highlight text-white text-xs font-bold uppercase tracking-spotify-caps flex items-center gap-2 transition-all border border-spotify-border/40 shadow-sm"
                >
                  <ListMusic size={16} className="text-spotify-green" />
                  <span>Abrir Playlist no Marcos Music</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= RESULTS / TRACKS LIST ================= */}
      {!isLoading && (filteredList.length > 0 || currentList.length > 0) && (
        <div className="space-y-4">
          {/* Header & Filter input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold font-spotifyTitle text-white flex items-center gap-2">
              <Disc3 size={20} className="text-spotify-green" />
              <span>
                {activeTab === 'playlist'
                  ? `Músicas da Playlist (${filteredList.length})`
                  : `Resultados da Pesquisa (${filteredList.length})`}
              </span>
            </h3>

            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 text-spotify-textSubdued pointer-events-none" />
              <input
                type="text"
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                placeholder="Filtrar por nome ou artista..."
                className="w-full bg-spotify-surface text-white text-xs rounded-fullpill py-2 pl-9 pr-3 outline-none border border-spotify-border/40 focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Tracks Table */}
          <div className="bg-spotify-surface/50 rounded-card border border-spotify-border/30 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_auto] md:grid-cols-[24px_4fr_2.5fr_1fr_auto] gap-2 md:gap-4 px-3 md:px-4 py-2.5 border-b border-spotify-border/30 text-xs font-semibold uppercase tracking-wider text-spotify-textSubdued">
              <span className="hidden md:block text-center">#</span>
              <span>Título</span>
              <span className="hidden md:block">Álbum</span>
              <div className="hidden md:flex justify-end pr-4">
                <Clock size={16} />
              </div>
              <span className="text-right pr-2 md:pr-4">Ação</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-spotify-border/20">
              {filteredList.map((track, idx) => {
                const status = trackStatus[track.id];
                const isPreviewing = playingPreviewId === track.id;

                return (
                  <div
                    key={track.id || idx}
                    onClick={() => handleDownloadTrack(track)}
                    className="group grid grid-cols-[1fr_auto] md:grid-cols-[24px_4fr_2.5fr_1fr_auto] gap-2 md:gap-4 px-3 md:px-4 py-2.5 rounded-subtle items-center hover:bg-spotify-highlight transition-colors cursor-pointer"
                  >
                    {/* Index or Preview Button (Desktop only) */}
                    <div className="hidden md:flex items-center justify-center">
                      {track.previewUrl ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreview(track);
                          }}
                          className={`p-1 rounded-full transition-colors ${
                            isPreviewing ? 'text-spotify-green' : 'text-spotify-textSubdued group-hover:text-white'
                          }`}
                          title={isPreviewing ? 'Pausar prévia' : 'Ouvir prévia (30s)'}
                        >
                          {isPreviewing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </button>
                      ) : (
                        <span className="text-xs text-spotify-textSubdued">{idx + 1}</span>
                      )}
                    </div>

                    {/* Title, Artist & Album Art Thumbnail - in Full Evidence */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="relative flex-shrink-0">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-subtle object-cover shadow-sm"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-subtle bg-spotify-middark flex items-center justify-center text-spotify-green">
                            <Music size={20} />
                          </div>
                        )}
                        {track.previewUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreview(track);
                            }}
                            className={`md:hidden absolute inset-0 bg-black/40 flex items-center justify-center rounded-subtle transition-opacity ${
                              isPreviewing ? 'opacity-100 text-spotify-green' : 'opacity-0 active:opacity-100 text-white'
                            }`}
                          >
                            {isPreviewing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm sm:text-base font-bold text-white truncate group-hover:text-spotify-green transition-colors leading-tight">
                          {track.title}
                        </span>
                        <span className="text-xs text-spotify-textSubdued truncate mt-0.5">
                          {track.artist}
                        </span>
                      </div>
                    </div>

                    {/* Album (Desktop only) */}
                    <div className="hidden md:block text-xs text-spotify-textSubdued truncate">
                      {track.album || 'Single'}
                    </div>

                    {/* Duration (Desktop only) */}
                    <div className="hidden md:block text-xs text-spotify-textSubdued text-right pr-4">
                      {formatDuration(track.duration)}
                    </div>

                    {/* Download Button / Status */}
                    <div className="flex items-center justify-end pr-1 sm:pr-2 flex-shrink-0">
                      {status === 'downloading' ? (
                        <div className="flex items-center gap-1.5 text-xs text-spotify-green font-bold whitespace-nowrap">
                          <Loader2 size={14} className="animate-spin" />
                          <span>Baixando...</span>
                        </div>
                      ) : status === 'saved' ? (
                        <div className="flex items-center gap-1 text-xs text-spotify-green font-bold whitespace-nowrap">
                          <CheckCircle2 size={16} strokeWidth={2.5} />
                          <span>Salvo</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadTrack(track);
                          }}
                          className="px-3.5 py-1.5 rounded-fullpill bg-spotify-elevated hover:bg-spotify-green text-white hover:text-black text-xs font-bold uppercase tracking-spotify-caps flex items-center gap-1.5 transition-all shadow-sm active:scale-95 border border-spotify-border/40 hover:border-transparent whitespace-nowrap"
                          title="Baixar para a biblioteca offline"
                        >
                          <Download size={13} strokeWidth={2.5} />
                          <span>Baixar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && currentList.length === 0 && (
        <div className="py-16 text-center text-spotify-textSubdued bg-spotify-surface/20 rounded-card border border-dashed border-spotify-border/30 p-8 space-y-2">
          <div className="w-12 h-12 rounded-full bg-spotify-middark flex items-center justify-center text-spotify-green mx-auto">
            <Music size={24} />
          </div>
          <h4 className="text-sm font-bold text-white">Nenhuma música para exibir</h4>
        </div>
      )}
    </div>
  );
}
