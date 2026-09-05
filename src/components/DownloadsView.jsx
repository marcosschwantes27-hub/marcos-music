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
    <div className="p-4 md:p-6 pb-32 md:pb-24 max-w-6xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-spotify-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-spotify-green/20 text-spotify-green flex items-center justify-center shadow-sm">
              <ArrowDownToLine size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-spotifyTitle text-white tracking-tight flex items-center gap-2.5">
                <span>Downloads</span>
                {counts.active > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-spotify-green text-black font-extrabold animate-pulse">
                    {counts.active} em andamento
                  </span>
                )}
              </h1>
              <p className="text-xs text-spotify-textSubdued mt-0.5">
                Os downloads continuam executando em segundo plano mesmo com o app minimizado
              </p>
            </div>
          </div>
        </div>

        {/* Global Queue Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {counts.active > 0 && (
            <button
              onClick={() => setIsQueuePaused(!isQueuePaused)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-fullpill transition-all transform active:scale-95 shadow-sm border ${
                isQueuePaused
                  ? 'bg-spotify-green text-black border-transparent hover:bg-spotify-greenHover'
                  : 'bg-spotify-surface text-white border-spotify-border/50 hover:bg-spotify-middark'
              }`}
            >
              {isQueuePaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
              <span>{isQueuePaused ? 'Retomar Fila' : 'Pausar Fila'}</span>
            </button>
          )}

          {counts.completed > 0 && (
            <button
              onClick={clearCompletedDownloads}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-fullpill bg-spotify-surface hover:bg-spotify-middark text-spotify-textSubdued hover:text-white transition-all transform active:scale-95 border border-spotify-border/40 shadow-sm"
              title="Remover itens concluídos da lista"
            >
              <Trash2 size={14} />
              <span>Limpar Concluídos</span>
            </button>
          )}

          {downloadQueue.length > 0 && (
            <button
              onClick={clearAllDownloads}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-fullpill bg-spotify-surface hover:bg-spotify-negative/20 text-spotify-textSubdued hover:text-spotify-negative transition-all transform active:scale-95 border border-spotify-border/40 shadow-sm"
              title="Limpar todos os registros"
            >
              <X size={14} />
              <span>Limpar Tudo</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Downloading Spotlight Card */}
      {currentDownloadingItem && (
        <div className="p-4 rounded-card bg-gradient-to-r from-spotify-green/20 via-spotify-surface to-spotify-surface border border-spotify-green/40 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex-shrink-0">
                {currentDownloadingItem.coverUrl ? (
                  <img
                    src={currentDownloadingItem.coverUrl}
                    alt={currentDownloadingItem.title}
                    className="w-14 h-14 rounded-subtle object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-subtle bg-spotify-middark flex items-center justify-center text-spotify-green">
                    <Music size={24} />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-spotify-green text-black flex items-center justify-center shadow">
                  <Loader2 size={12} className="animate-spin" />
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-spotify-green uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-spotify-green animate-ping inline-block" />
                  Baixando agora na nuvem
                </span>
                <h3 className="text-base font-bold text-white truncate">
                  {currentDownloadingItem.title}
                </h3>
                <span className="text-xs text-spotify-textSubdued truncate">
                  {currentDownloadingItem.artist} • {currentDownloadingItem.album || 'Single'}
                </span>
              </div>
            </div>

            <button
              onClick={() => cancelDownload(currentDownloadingItem.id)}
              className="p-2 rounded-full bg-spotify-surface hover:bg-spotify-negative/30 text-spotify-textSubdued hover:text-spotify-negative transition-colors"
              title="Cancelar este download"
            >
              <X size={18} />
            </button>
          </div>

          {/* Animated Striped Progress Bar */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-3.5">
            <div className="h-full bg-spotify-green rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `Todos (${counts.total})` },
          { id: 'active', label: `Na Fila (${counts.active})` },
          { id: 'completed', label: `Concluídos (${counts.completed})` },
          { id: 'failed', label: `Falhas (${counts.failed})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-fullpill text-xs font-bold uppercase tracking-spotify-caps transition-all whitespace-nowrap ${
              filterTab === tab.id
                ? 'bg-white text-black shadow'
                : 'bg-spotify-surface text-spotify-textSubdued hover:text-white hover:bg-spotify-middark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {filteredQueue.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-spotify-surface/20 rounded-card border border-dashed border-spotify-border/30 p-8">
          <div className="w-14 h-14 rounded-full bg-spotify-surface flex items-center justify-center text-spotify-textSubdued">
            <FolderDown size={28} />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum download nesta lista</h3>
          <p className="text-xs text-spotify-textSubdued max-w-sm">
            {filterTab === 'all'
              ? 'Pesquise músicas ou importe uma playlist para começar a baixar para ouvir offline.'
              : 'Nenhum item com este status no momento.'}
          </p>
          <button
            onClick={() => setCurrentView('search')}
            className="mt-2 bg-spotify-green hover:bg-spotify-greenHover text-black text-xs font-bold uppercase tracking-spotify-caps py-2.5 px-5 rounded-fullpill transition-all transform active:scale-95 shadow-md flex items-center gap-2"
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
                {/* Left: Thumbnail & Info */}
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
                      <div className="absolute inset-0 bg-black/50 rounded-subtle flex items-center justify-center">
                        <Loader2 size={16} className="text-spotify-green animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate leading-tight">
                      {item.title}
                    </span>
                    <span className="text-xs text-spotify-textSubdued truncate mt-0.5">
                      {item.artist} {item.album ? `• ${item.album}` : ''}
                    </span>
                    {isFailed && item.error && (
                      <span className="text-[11px] text-spotify-negative font-semibold truncate mt-0.5 flex items-center gap-1">
                        <AlertCircle size={12} className="flex-shrink-0" />
                        {item.error}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Status Badge & Actions */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* Status Badge */}
                  {isDownloading && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-spotify-green bg-spotify-green/15 px-2.5 py-1 rounded-full border border-spotify-green/30">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Baixando...</span>
                    </div>
                  )}

                  {isPending && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-neutral-400 bg-neutral-800/60 px-2.5 py-1 rounded-full border border-neutral-700/40">
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
                      <span>Falhou</span>
                    </div>
                  )}

                  {/* Actions */}
                  {isCompleted && (
                    <button
                      onClick={() => handlePlayCompleted(item)}
                      className="p-2 rounded-full bg-spotify-surface hover:bg-spotify-green hover:text-black text-white transition-colors shadow-sm"
                      title="Tocar música agora"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  )}

                  {isFailed && (
                    <button
                      onClick={() => retryDownload(item.id)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-spotify-surface hover:bg-spotify-middark text-white transition-colors border border-spotify-border/50"
                      title="Tentar baixar novamente"
                    >
                      <RotateCcw size={13} />
                      <span className="hidden sm:inline">Tentar Novamente</span>
                    </button>
                  )}

                  {(isPending || isDownloading) && (
                    <button
                      onClick={() => cancelDownload(item.id)}
                      className="p-1.5 rounded-full hover:bg-spotify-negative/20 text-spotify-textSubdued hover:text-spotify-negative transition-colors"
                      title="Cancelar download"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {(isCompleted || isFailed) && (
                    <button
                      onClick={() => cancelDownload(item.id)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-spotify-textSubdued hover:text-white transition-colors"
                      title="Remover da lista"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
