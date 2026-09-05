import React, { useState } from 'react';
import { X, ListPlus, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function CreatePlaylistModal({ isOpen, onClose }) {
  const { addPlaylist, setSelectedPlaylistId, setCurrentView } = usePlayer();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPl = await addPlaylist(name, description);
    setName('');
    setDescription('');
    setSelectedPlaylistId(newPl.id);
    setCurrentView('playlist');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-spotify-surface border border-spotify-border/40 rounded-card shadow-spotify-heavy w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-spotify-border/30">
          <div className="flex items-center gap-2">
            <ListPlus className="text-spotify-green" size={20} />
            <h2 className="text-base font-bold text-spotify-textBase">Criar Nova Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Centered Playlist Artwork Preview */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2">
            <div className="w-24 h-24 rounded-card bg-spotify-middark border border-spotify-border/40 flex items-center justify-center text-spotify-green shadow-spotify-heavy">
              <ListMusic size={44} />
            </div>
            <span className="text-[11px] text-spotify-textSubdued mt-2 font-medium">
              Capa da Playlist
            </span>
          </div>
          <div>
            <label className="block text-xs font-bold text-spotify-textBase mb-1.5 uppercase tracking-spotify-caps">
              Nome da Playlist
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: Favoritas do Marcos, Rock Clássico..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-spotify-middark text-spotify-textBase text-sm rounded-subtle px-3 py-2.5 outline-none border border-transparent focus:border-spotify-borderLight focus:bg-spotify-elevated transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-spotify-textBase mb-1.5 uppercase tracking-spotify-caps">
              Descrição (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Adicione uma breve descrição para esta playlist..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-spotify-middark text-spotify-textBase text-sm rounded-subtle px-3 py-2.5 outline-none border border-transparent focus:border-spotify-borderLight focus:bg-spotify-elevated transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-spotify-border/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-spotify-caps text-spotify-textSubdued hover:text-spotify-textBase transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 rounded-fullpill bg-spotify-green hover:bg-spotify-greenHover disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-spotify-caps transition-all transform active:scale-95 shadow-md"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
