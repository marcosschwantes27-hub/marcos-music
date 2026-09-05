import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerBar from './components/PlayerBar';
import UploadModal from './components/UploadModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import QueueModal from './components/QueueModal';
import VisualizerModal from './components/VisualizerModal';
import DeviceModal from './components/DeviceModal';
import InstallMobileModal from './components/InstallMobileModal';
import LyricsModal from './components/LyricsModal';
import BottomNav from './components/BottomNav';
import { UploadCloud } from 'lucide-react';

function AppContent() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isInstallMobileOpen, setIsInstallMobileOpen] = useState(false);

  // Global window drag & drop detection
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const { importAudioFiles, isLyricsOpen, setIsLyricsOpen } = usePlayer();

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsWindowDragging(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await importAudioFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [importAudioFiles]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-spotify text-white select-none">
      {/* Global Drag & Drop Overlay Indicator */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md border-4 border-dashed border-spotify-green flex flex-col items-center justify-center pointer-events-none transition-all animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-spotify-green flex items-center justify-center text-black mb-4 shadow-spotify-heavy animate-bounce">
            <UploadCloud size={40} />
          </div>
          <h2 className="text-2xl font-bold font-spotifyTitle text-white mb-2">
            Solte as músicas para adicionar
          </h2>
          <p className="text-sm text-spotify-textSubdued">
            Elas serão salvas no seu computador e reproduzidas offline
          </p>
        </div>
      )}

      {/* Main App Layout: Sidebar + Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenCreatePlaylist={() => setIsPlaylistModalOpen(true)}
          onOpenInstallMobile={() => setIsInstallMobileOpen(true)}
        />
        <MainView
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenInstallMobile={() => setIsInstallMobileOpen(true)}
          onOpenCreatePlaylist={() => setIsPlaylistModalOpen(true)}
        />
      </div>

      {/* Persistent Bottom Player */}
      <PlayerBar
        onToggleVisualizer={() => setIsVisualizerOpen(!isVisualizerOpen)}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
        onToggleDevices={() => setIsDeviceModalOpen(!isDeviceModalOpen)}
      />

      {/* Mobile Bottom Navigation (Spotify Mobile style) */}
      <BottomNav />

      {/* Modals & Slide-ins */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
      <QueueModal isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
      <VisualizerModal
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
      />
      <DeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />
      <InstallMobileModal
        isOpen={isInstallMobileOpen}
        onClose={() => setIsInstallMobileOpen(false)}
      />
      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}
