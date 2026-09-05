import React, { useState, useRef } from 'react';
import { UploadCloud, Music, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function UploadModal({ isOpen, onClose }) {
  const { importAudioFiles } = usePlayer();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileInputChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const processFiles = async (files) => {
    setIsProcessing(true);
    setResultMessage(null);

    try {
      const count = await importAudioFiles(files);
      if (count > 0) {
        setResultMessage({
          type: 'success',
          text: `${count} ${count === 1 ? 'música adicionada' : 'músicas adicionadas'} com sucesso!`,
        });
        setTimeout(() => {
          onClose();
          setResultMessage(null);
        }, 1200);
      } else {
        setResultMessage({
          type: 'error',
          text: 'Nenhum arquivo de áudio compatível encontrado (formatos suportados: MP3, WAV, FLAC, OGG, M4A).',
        });
      }
    } catch (err) {
      console.error(err);
      setResultMessage({
        type: 'error',
        text: 'Ocorreu um erro ao importar os arquivos.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-spotify-surface border border-spotify-border/40 rounded-card shadow-spotify-heavy w-full max-w-lg overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-spotify-border/30">
          <div className="flex items-center gap-2">
            <Music className="text-spotify-green" size={22} />
            <h2 className="text-lg font-bold text-spotify-textBase">Importar Músicas Offline</h2>
          </div>
          <button
            onClick={onClose}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-spotify-green bg-spotify-green/10 scale-[0.99]'
                : 'border-spotify-border/60 hover:border-spotify-textBase bg-spotify-middark/50'
            } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={44} className="text-spotify-green animate-spin" />
                <p className="font-bold text-spotify-textBase text-sm">
                  Lendo tags ID3 e salvando no IndexedDB...
                </p>
                <p className="text-xs text-spotify-textSubdued">
                  Extraindo capa, título e artista das suas músicas
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-spotify-middark flex items-center justify-center text-spotify-green">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <p className="font-bold text-spotify-textBase text-base mb-1">
                    Arraste suas músicas aqui
                  </p>
                  <p className="text-xs text-spotify-textSubdued">
                    ou clique para procurar no seu computador
                  </p>
                </div>
                <div className="mt-2 text-[11px] text-spotify-textSubdued/80 bg-spotify-surface px-3 py-1 rounded-full border border-spotify-border/30">
                  Suporta MP3, WAV, FLAC, OGG, M4A, AAC
                </div>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {resultMessage && (
            <div
              className={`mt-4 p-3 rounded-subtle flex items-center gap-2.5 text-xs font-semibold ${
                resultMessage.type === 'success'
                  ? 'bg-spotify-green/20 text-spotify-green border border-spotify-green/30'
                  : 'bg-spotify-negative/20 text-spotify-negative border border-spotify-negative/30'
              }`}
            >
              {resultMessage.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/40 border-t border-spotify-border/30 flex items-center justify-between text-xs text-spotify-textSubdued">
          <span>Armazenamento local seguro</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-fullpill font-bold uppercase tracking-spotify-caps text-spotify-textBase hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
