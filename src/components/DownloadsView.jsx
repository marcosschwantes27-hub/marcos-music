import React, { useState, useMemo } from 'react';
import {
  Download,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Trash2,
  X,
  Pause,
  ArrowDownToLine,
  Music,
  FolderDown,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function DownloadsView() {
  const {
    downloadQueue,
    activeDownloadsCount,
    isQueuePaused,
    setIsQueuePaused,
    retryDownload,
    cancelDownload,
    clearCompletedDownloads,
    clearAllDownloads,
    songs,
    playSong,
    setCurrentView,
  } = usePlayer();

  // Filter tab: 'all' | 'active' | 'completed' | 'failed'
  const [filterTab, setFilterTab] = useState('all');

  // Currently downloading item
  const currentDownloadingItem = useMemo(() => {
    return downloadQueue.find((it) => it.status === 'downloading');
  }, [downloadQueue]);

  // Counts
  const counts = useMemo(() => {
    const pending = downloadQueue.filter((it) => it.status === 'pending').length;
    const downloading = downloadQueue.filter((it) => it.status === 'downloading').length;
    const completed = downloadQueue.filter((it) => it.status === 'completed').length;
    const failed = downloadQueue.filter((it) => it.status === 'failed').length;
    return {
      active: pending + downloading,
      completed,
      failed,
      total: downloadQueue.length,
    };
  }, [downloadQueue]);

  // Filtered list
  const filteredQueue = useMemo(() => {
    if (filterTab === 'active') {
      return downloadQueue.filter(
        (it) => it.status === 'pending' || it.status === 'downloading'
      );
    }
    if (filterTab === 'completed') {
      return downloadQueue.filter((it) => it.status === 'completed');
    }
    if (filterTab === 'failed') {
      return downloadQueue.filter((it) => it.status === 'failed');
    }
    return downloadQueue;
  }, [downloadQueue, filterTab]);

  // Play a completed song directly from downloads view
  const handlePlayCompleted = (item) => {
    const song = songs.find(
      (s) =>
        s.id === item.savedSongId ||
        (s.title.toLowerCase() === item.title.toLowerCase() &&
          s.artist.toLowerCase().includes(item.artist.toLowerCase()))
    );
    if (song) {
      playSong(song, songs);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 select-none pb-44 sm:pb-36 md:pb-28">
      {/* Sticky Responsive Header */}
      <header className="sticky top-0 z-20 bg-spotify-surface/95 backdrop-blur-md px-3.5 py-3 sm:px-6 sm:py-4 border-b border-spotify-border/30">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          {/* Top Row: Back button, Title & Live Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setCurrentView('home')}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-spotify-textSubdued hover:text-white transition-colors active:scale-95 flex-shrink-0"
                title="Voltar ao início"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center flex-shrink-0">
                <ArrowDownToLine size={18} strokeWidth={2.5} />
              </div>

              <div className="min-w-0 flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-spotifyTitle text-white tracking-tight truncate">
                  Downloads
                </h1>
                {counts.active > 0 && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-spotify-green text-black font-extrabold animate-pulse flex-shrink-0">
                    {counts.active} {counts.active === 1 ? 'ativo' : 'ativos'}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {counts.active > 0 && (
                <button
                  onClick={() => setIsQueuePaused(!isQueuePaused)}
                  className={`flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-fullpill transition-all transform active:scale-95 border ${
                    isQueuePaused
                      ? 'bg-spotify-green text-black border-transparent hover:bg-spotify-greenHover'
                      : 'bg-spotify-surface text-white border-spotify-border/50 hover:bg-spotify-middark'
                  }`}
                  title={isQueuePaused ? 'Retomar downloads pausados' : 'Pausar fila de downloads'}
                >
                  {isQueuePaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
                  <span className="hidden xs:inline">{isQueuePaused ? 'Retomar' : 'Pausar'}</span>
                </button>
              )}

              {counts.completed > 0 && (
                <button
                  onClick={clearCompletedDownloads}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-fullpill bg-spotify-surface hover:bg-spotify-middark text-spotify-textSubdued hover:text-white transition-all transform active:scale-95 border border-spotify-border/40"
                  title="Limpar itens concluídos"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Limpar Concluídos</span>
                </button>
              )}

              {downloadQueue.length > 0 && (
                <button
                  onClick={clearAllDownloads}
                  className="flex items-center gap-1 text-xs font-medium px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-fullpill bg-spotify-surface hover:bg-spotify-negative/20 text-spotify-textSubdued hover:text-spotify-negative transition-all transform active:scale-95 border border-spotify-border/40"
                  title="Limpar todos os registros"
                >
                  <X size={14} />
                  <span className="hidden md:inline">Limpar Tudo</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-spotify-textSubdued line-clamp-1">
            Os downloads continuam executando em segundo plano mesmo com o app minimizado ou fechado.
          </p>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Active Downloading Spotlight Card */}
        {currentDownloadingItem && (
          <div className="p-3.5 sm:p-4 rounded-card bg-gradient-to-r from-spotify-green/20 via-spotify-surface to-spotify-surface border border-spotify-green/40 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="text-[11px] font-bold text-spotify-green uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-spotify-green animate-ping inline-block" />
                Baixando agora na nuvem
              </span>

              <button
                onClick={() => cancelDownload(currentDownloadingItem.id)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-spotify-negative/30 text-spotify-textSubdued hover:text-spotify-negative transition-colors active:scale-90"
                title="Cancelar este download"
                aria-label="Cancelar download"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                {currentDownloadingItem.coverUrl ? (
                  <img
                    src={currentDownloadingItem.coverUrl}
                    alt={currentDownloadingItem.title}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-subtle object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-subtle bg-spotify-middark flex items-center justify-center text-spotify-green">
                    <Music size={22} />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-spotify-green text-black flex items-center justify-center shadow">
                  <Loader2 size={11} className="animate-spin" />
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                  {currentDownloadingItem.title}
                </h3>
                <span className="text-xs text-spotify-textSubdued truncate mt-0.5">
                  {currentDownloadingItem.artist} • {currentDownloadingItem.album || 'Single'}
                </span>
              </div>
            </div>

            {/* Animated Striped Progress Bar */}
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-spotify-green rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Filter Tabs (Horizontal Scrollable on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {[
            { id: 'all', label: 'Todos', count: counts.total },
            { id: 'active', label: 'Na Fila', count: counts.active },
            { id: 'completed', label: 'Concluídos', count: counts.completed },
            { id: 'failed', label: 'Falhas', count: counts.failed },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-fullpill text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-white text-black shadow-md'
                    : 'bg-spotify-surface text-spotify-textSubdued hover:text-white hover:bg-spotify-middark border border-spotify-border/30'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-spotify-textSubdued'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Queue List / Empty State */}
        {filteredQueue.length === 0 ? (
          <div className="py-14 sm:py-20 text-center flex flex-col items-center justify-center gap-3 bg-spotify-surface/30 rounded-card border border-dashed border-spotify-border/40 p-6 sm:p-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-spotify-surface flex items-center justify-center text-spotify-textSubdued shadow-sm">
              <FolderDown size={26} />
            </div>
            <h3 className="text-base font-bold text-white">Nenhum download nesta lista</h3>
            <p className="text-xs text-spotify-textSubdued max-w-sm leading-relaxed">
              {filterTab === 'all'
                ? 'Pesquise músicas ou importe playlists do Spotify para ouvir suas faixas favoritas 100% offline.'
                : 'Nenhum item com este status no momento.'}
            </p>
            <button
              onClick={() => setCurrentView('spotify')}
              className="mt-2 bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold py-2.5 px-5 rounded-fullpill transition-all transform active:scale-95 shadow-md flex items-center gap-2"
            >
              <Download size={14} strokeWidth={2.5} />
              <span>Buscar Músicas para Baixar</span>
            </button>
          </div>
        ) : (
          <div className="bg-spotify-surface/40 rounded-card border border-spotify-border/30 overflow-hidden divide-y divide-spotify-border/20">
            {filteredQueue.map((item) => {
              const isDownloading = item.status === 'downloading';
              const isPending = item.status === 'pending';
              const isCompleted = item.status === 'completed';
              const isFailed = item.status === 'failed';

              return (
                <div
                  key={item.id}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-spotify-highlight/40 transition-colors"
                >
                  {/* Left: Cover Art & Information */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-subtle object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-subtle bg-spotify-middark flex items-center justify-center text-spotify-green">
                          <Music size={20} />
                        </div>
                      )}
                      {isDownloading && (
                        <div className="absolute inset-0 bg-black/60 rounded-subtle flex items-center justify-center">
                          <Loader2 size={16} className="text-spotify-green animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 pr-1">
                      <span className="text-sm font-bold text-white truncate leading-tight">
                        {item.title}
                      </span>
                      <span className="text-xs text-spotify-textSubdued truncate mt-0.5">
                        {item.artist} {item.album ? `• ${item.album}` : ''}
                      </span>

                      {/* Mobile Visible Status Badges */}
                      <div className="flex items-center gap-2 mt-1 sm:hidden">
                        {isDownloading && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-spotify-green bg-spotify-green/15 px-2 py-0.5 rounded-full border border-spotify-green/30">
                            <Loader2 size={10} className="animate-spin" />
                            <span>Baixando</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded-full border border-neutral-700/50">
                            <Clock size={10} />
                            <span>Na fila</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-spotify-green bg-spotify-green/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} strokeWidth={2.5} />
                            <span>Baixado</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-spotify-negative bg-spotify-negative/15 px-2 py-0.5 rounded-full border border-spotify-negative/30 truncate max-w-[200px]">
                            <AlertCircle size={10} className="flex-shrink-0" />
                            <span className="truncate">{item.error || 'Falha ao baixar'}</span>
                          </span>
                        )}
                      </div>

                      {/* Desktop Error Message */}
                      {isFailed && item.error && (
                        <span className="hidden sm:flex text-[11px] text-spotify-negative font-medium truncate mt-0.5 items-center gap-1">
                          <AlertCircle size={12} className="flex-shrink-0" />
                          <span>{item.error}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Desktop Status Badges & Action Buttons */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Desktop Status Badges */}
                    {isDownloading && (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-spotify-green bg-spotify-green/15 px-2.5 py-1 rounded-full border border-spotify-green/30">
                        <Loader2 size={12} className="animate-spin" />
                        <span>Baixando...</span>
                      </div>
                    )}

                    {isPending && (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-neutral-300 bg-neutral-800/80 px-2.5 py-1 rounded-full border border-neutral-700/50">
                        <Clock size={12} />
                        <span>Na fila</span>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-spotify-green bg-spotify-green/10 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={13} strokeWidth={2.5} />
                        <span>Concluído</span>
                      </div>
                    )}

                    {isFailed && (
                      <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-spotify-negative bg-spotify-negative/15 px-2.5 py-1 rounded-full border border-spotify-negative/30">
                        <AlertCircle size={12} />
                        <span>Falha</span>
                      </div>
                    )}

                    {/* Actions with Generous Mobile Touch Targets */}
                    {isCompleted && (
                      <button
                        onClick={() => handlePlayCompleted(item)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-spotify-green text-black flex items-center justify-center hover:scale-105 transition-all shadow-md active:scale-95"
                        title="Tocar música agora"
                        aria-label="Tocar música"
                      >
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </button>
                    )}

                    {isFailed && (
                      <button
                        onClick={() => retryDownload(item.id)}
                        className="flex items-center gap-1 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full bg-spotify-surface hover:bg-spotify-middark text-white transition-colors border border-spotify-border/50 active:scale-95"
                        title="Tentar baixar novamente"
                        aria-label="Tentar novamente"
                      >
                        <RotateCcw size={13} />
                        <span className="hidden sm:inline">Repetir</span>
                      </button>
                    )}

                    {(isPending || isDownloading) && (
                      <button
                        onClick={() => cancelDownload(item.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-spotify-negative/20 text-spotify-textSubdued hover:text-spotify-negative transition-colors active:scale-90"
                        title="Cancelar download"
                        aria-label="Cancelar"
                      >
                        <X size={18} />
                      </button>
                    )}

                    {(isCompleted || isFailed) && (
                      <button
                        onClick={() => cancelDownload(item.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-spotify-textSubdued hover:text-white transition-colors active:scale-90"
                        title="Remover da lista"
                        aria-label="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
