import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import * as db from '../db/database';
import { extractMetadata } from '../utils/metadata';
import { apiFetch, getAbsoluteApiUrl } from '../utils/api';
import { fetchLyricsForSong } from '../utils/lyricsApi';
import { resolveCoverArt, fetchCoverBlob } from '../utils/coverResolver';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Playback state
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'

  // Navigation & View state
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'search' | 'library' | 'liked' | 'playlist' | 'downloads'
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Background Download Queue State
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const isProcessingQueueRef = useRef(false);

  // Queue and history
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);

  // Audio Output & Bluetooth Device Management
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('default');
  const [currentDeviceName, setCurrentDeviceName] = useState('Alto-falantes deste Computador');
  const [isBluetoothActive, setIsBluetoothActive] = useState(false);

  // Real-time Lyrics State
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [lyricsData, setLyricsData] = useState({
    syncedLyrics: null,
    plainLyrics: null,
    parsedLines: [],
    isSynced: false,
    instrumental: false,
    isLoading: false,
    error: null,
  });

  // Audio element reference
  const audioRef = useRef(new Audio());
  const currentObjectUrlRef = useRef(null);
  const coverUrlsMapRef = useRef(new Map());

  // Helper to get or create object URL for cover art
  const getCoverUrl = (song) => {
    if (!song) return null;
    if (song.coverBlob) {
      if (coverUrlsMapRef.current.has(song.id)) {
        return coverUrlsMapRef.current.get(song.id);
      }
      const url = URL.createObjectURL(song.coverBlob);
      coverUrlsMapRef.current.set(song.id, url);
      return url;
    }
    if (song.coverUrl) return song.coverUrl;
    return null;
  };

  // Load songs, playlists, and download queue from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 1500);

    async function loadData() {
      try {
        // Clear all songs if requested by user
        if (localStorage.getItem('clear_songs_user_requested_v1') !== 'true') {
          localStorage.setItem('clear_songs_user_requested_v1', 'true');
          await db.clearAllSongs();
        }

        // Recover any background fetch responses from cache
        if (typeof window !== 'undefined' && 'caches' in window) {
          try {
            const cache = await caches.open('marcosmusic-downloads-v1').catch(() => null);
            if (cache) {
              const keys = await cache.keys();
              for (const req of keys) {
                const match = req.url.match(/\/bg-download\/(.+)$/);
                if (match) {
                  const fetchId = match[1];
                  const resp = await cache.match(req);
                  if (resp && resp.ok) {
                    const audioBlob = await resp.blob();
                    const queueItems = await db.getAllQueueItems();
                    const qItem = queueItems.find((it) => it.id === fetchId);
                    if (qItem && qItem.status !== 'completed') {
                      const safeTitle = (qItem.title || 'Música').replace(/[/\\?%*:|"<>]/g, '-');
                      const safeArtist = (qItem.artist || 'Artista').replace(/[/\\?%*:|"<>]/g, '-');
                      const songId = 'sp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

                      const newSong = {
                        id: songId,
                        title: qItem.title,
                        artist: qItem.artist,
                        album: qItem.album || 'Single',
                        duration: qItem.duration || 0,
                        fileBlob: audioBlob,
                        fileType: audioBlob.type || 'audio/mp4',
                        fileName: `${safeTitle} - ${safeArtist}.m4a`,
                        fileSize: audioBlob.size,
                        coverUrl: qItem.coverUrl || null,
                        coverBlob: null,
                        isLiked: false,
                        dateAdded: new Date().toISOString(),
                      };

                      await db.saveSong(newSong);
                      await db.saveQueueItem({
                        ...qItem,
                        status: 'completed',
                        savedSongId: songId,
                        completedAt: new Date().toISOString(),
                      });
                    }
                    await cache.delete(req);
                  }
                }
              }
            }
          } catch (cacheErr) {
            console.warn('Cache recovery check completed:', cacheErr);
          }
        }

        const [loadedSongs, loadedPlaylists, loadedQueue] = await Promise.all([
          db.getAllSongs(),
          db.getAllPlaylists(),
          db.getAllQueueItems(),
        ]);

        if (isMounted) {
          setSongs(loadedSongs || []);
          setPlaylists(loadedPlaylists || []);

          // Sanitize queue: reset any interrupted 'downloading' status to 'pending' so it automatically resumes
          const sanitizedQueue = (loadedQueue || []).map((item) => {
            if (item.status === 'downloading') {
              return { ...item, status: 'pending' };
            }
            return item;
          });
          setDownloadQueue(sanitizedQueue);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do IndexedDB:', err);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      // Clean up audio and cover URLs
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
      coverUrlsMapRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Configure HTML5 Audio listeners
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [volume, isMuted]);

  // Handle track ended
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else if (repeatMode === 'all') {
        handleNextTrack();
      } else {
        const activeList = queue.length > 0 ? queue : songs;
        const currentIndex = activeList.findIndex((s) => s.id === currentSong?.id);
        if (currentIndex !== -1 && currentIndex < activeList.length - 1) {
          handleNextTrack();
        } else {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
        }
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentSong, queue, songs, repeatMode, isShuffle]);

  // Load lyrics whenever currentSong changes
  useEffect(() => {
    if (!currentSong) {
      setLyricsData({
        syncedLyrics: null,
        plainLyrics: null,
        parsedLines: [],
        isSynced: false,
        instrumental: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    let isCancelled = false;
    async function loadLyrics() {
      setLyricsData((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await fetchLyricsForSong(currentSong);
        if (!isCancelled) {
          setLyricsData({ ...data, isLoading: false });
        }
      } catch (err) {
        if (!isCancelled) {
          setLyricsData({
            syncedLyrics: null,
            plainLyrics: null,
            parsedLines: [],
            isSynced: false,
            instrumental: false,
            isLoading: false,
            error: 'Erro ao carregar letra',
          });
        }
      }
    }

    loadLyrics();

    return () => {
      isCancelled = true;
    };
  }, [currentSong?.id, currentSong?.title, currentSong?.artist]);

  const reloadLyrics = async () => {
    if (!currentSong) return;
    setLyricsData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchLyricsForSong(currentSong);
      setLyricsData({ ...data, isLoading: false });
    } catch (e) {
      setLyricsData((prev) => ({ ...prev, isLoading: false, error: 'Erro ao recarregar letra' }));
    }
  };

  const toggleLyrics = () => {
    setIsLyricsOpen((prev) => !prev);
  };

  // Fetch audio output devices
  const fetchAudioDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => {
          const lowerLabel = (d.label || '').toLowerCase();
          const isBt =
            lowerLabel.includes('bluetooth') ||
            lowerLabel.includes('car') ||
            lowerLabel.includes('som') ||
            lowerLabel.includes('fone') ||
            lowerLabel.includes('headset') ||
            lowerLabel.includes('airpods') ||
            lowerLabel.includes('tws');
          return {
            deviceId: d.deviceId,
            label:
              d.label ||
              (d.deviceId === 'default'
                ? 'Alto-falantes Padrão'
                : `Dispositivo de Áudio (${d.deviceId.substring(0, 5)})`),
            isBluetooth: isBt,
          };
        });
      setAudioDevices(outputs);
      return outputs;
    } catch (err) {
      console.warn('Erro ao listar dispositivos de saída:', err);
      return [];
    }
  };

  // Enumerate devices on mount and listen to device changes
  useEffect(() => {
    fetchAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', fetchAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', fetchAudioDevices);
      };
    }
  }, []);

  // Select output device (Bluetooth / Car / Headphone / Speakers)
  const selectAudioDevice = async (deviceId) => {
    const audio = audioRef.current;
    if (audio.setSinkId) {
      try {
        await audio.setSinkId(deviceId);
        setSelectedDeviceId(deviceId);
        const dev = audioDevices.find((d) => d.deviceId === deviceId);
        if (dev) {
          setCurrentDeviceName(dev.label);
          setIsBluetoothActive(dev.isBluetooth);
        }
        return true;
      } catch (err) {
        console.error('Falha ao alternar saída de áudio:', err);
        return false;
      }
    } else {
      console.warn('setSinkId não é suportado neste navegador.');
      return false;
    }
  };

  // Request Bluetooth / Audio output selection
  const pairBluetoothDevice = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
      try {
        const device = await navigator.mediaDevices.selectAudioOutput();
        if (device) {
          await selectAudioDevice(device.deviceId);
          await fetchAudioDevices();
          return { success: true, name: device.label };
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('selectAudioOutput error:', err);
        }
      }
    }

    if (navigator.bluetooth && navigator.bluetooth.requestDevice) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
        });
        if (device) {
          setIsBluetoothActive(true);
          setCurrentDeviceName(device.name || 'Dispositivo Bluetooth');
          await fetchAudioDevices();
          return { success: true, name: device.name };
        }
      } catch (err) {
        if (err.name !== 'NotFoundError') {
          console.warn('Web Bluetooth error:', err);
        }
      }
    }

    await fetchAudioDevices();
    return { success: false };
  };

  // Synchronize MediaSession API for Car Dashboards & Bluetooth Controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      const coverUrl = getCoverUrl(currentSong);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || 'Marcos Music',
        artwork: coverUrl
          ? [
              { src: coverUrl, sizes: '96x96', type: 'image/png' },
              { src: coverUrl, sizes: '256x256', type: 'image/png' },
              { src: coverUrl, sizes: '512x512', type: 'image/png' },
            ]
          : [],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seekTo(details.seekTime);
    });

    if ('setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: Math.min(currentTime, duration),
        });
      } catch (e) {}
    }
  }, [currentSong, isPlaying, currentTime, duration]);

  // Shuffle history and unplayed pool for zero-repeat shuffle
  const shuffleHistoryRef = useRef([]);
  const unplayedShuffleRef = useRef([]);

  // Play a specific song
  const playSong = (song, trackList = null) => {
    if (!song) return;

    if (currentSong && currentSong.id !== song.id) {
      shuffleHistoryRef.current.push(currentSong.id);
      if (shuffleHistoryRef.current.length > 50) {
        shuffleHistoryRef.current.shift();
      }
    }

    if (trackList && Array.isArray(trackList) && trackList.length > 0) {
      setQueue(trackList);
      if (isShuffle) {
        unplayedShuffleRef.current = trackList.filter((s) => s.id !== song.id).map((s) => s.id);
      }
    } else if (queue.length === 0) {
      setQueue(songs);
    }

    const audio = audioRef.current;

    // Revoke previous audio Object URL to free memory
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }

    let audioSrc = '';
    if (song.fileBlob) {
      const audioUrl = URL.createObjectURL(song.fileBlob);
      currentObjectUrlRef.current = audioUrl;
      audioSrc = audioUrl;
    } else if (song.previewUrl) {
      audioSrc = song.previewUrl;
    } else if (song.url) {
      audioSrc = song.url;
    }

    if (!audioSrc) {
      console.warn('Faixa sem áudio disponível:', song);
      return;
    }

    audio.src = audioSrc;
    audio.currentTime = 0;
    setCurrentSong(song);
    setDuration(song.duration || 0);

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.error('Erro ao reproduzir áudio:', err);
        setIsPlaying(false);
      });
  };

  // Toggle Play / Pause - checks real HTML5 audio state
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!currentSong) {
      const activeList = queue.length > 0 ? queue : songs;
      if (activeList.length > 0) {
        playSong(activeList[0], activeList);
      }
      return;
    }

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Erro ao reproduzir áudio:', err);
          setIsPlaying(false);
        });
    }
  };

  // Seek in track
  const seekTo = (seconds) => {
    const audio = audioRef.current;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  };

  // Shuffle toggle and play collection in random order
  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (next && currentSong) {
        const activeList = queue.length > 0 ? queue : songs;
        unplayedShuffleRef.current = activeList
          .filter((s) => s.id !== currentSong.id)
          .map((s) => s.id);
      }
      return next;
    });
  };

  const playCollectionInShuffle = (trackList) => {
    if (!trackList || trackList.length === 0) return;
    setIsShuffle(true);
    const randomIndex = Math.floor(Math.random() * trackList.length);
    const startSong = trackList[randomIndex];
    unplayedShuffleRef.current = trackList.filter((s) => s.id !== startSong.id).map((s) => s.id);
    playSong(startSong, trackList);
  };

  // Next Track - loops reliably and never breaks audio playback
  const handleNextTrack = () => {
    const activeList = queue.length > 0 ? queue : songs;
    if (activeList.length === 0) return;

    if (!currentSong) {
      playSong(activeList[0], activeList);
      return;
    }

    if (isShuffle) {
      let availableIds = unplayedShuffleRef.current.filter(
        (id) => id !== currentSong.id && activeList.some((s) => s.id === id)
      );

      if (availableIds.length === 0) {
        availableIds = activeList.filter((s) => s.id !== currentSong.id).map((s) => s.id);
      }

      if (availableIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableIds.length);
        const chosenId = availableIds[randomIndex];
        unplayedShuffleRef.current = availableIds.filter((id) => id !== chosenId);
        const nextSong = activeList.find((s) => s.id === chosenId);
        if (nextSong) {
          playSong(nextSong, activeList);
          return;
        }
      }
      playSong(activeList[0], activeList);
      return;
    }

    const currentIndex = activeList.findIndex((s) => s.id === currentSong.id);
    if (currentIndex !== -1) {
      if (currentIndex < activeList.length - 1) {
        playSong(activeList[currentIndex + 1], activeList);
        return;
      }
      // If reached the end of list or single track, loop back to start
      playSong(activeList[0], activeList);
      return;
    }

    // If current song is not in activeList (e.g. list was changed), play first track
    playSong(activeList[0], activeList);
  };

  // Previous Track
  const handlePrevTrack = () => {
    const audio = audioRef.current;
    // If played more than 3 seconds, restart current track (Spotify behavior)
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const activeList = queue.length > 0 ? queue : songs;
    if (activeList.length === 0) return;

    if (isShuffle && shuffleHistoryRef.current.length > 0) {
      const prevSongId = shuffleHistoryRef.current.pop();
      const prevSong = activeList.find((s) => s.id === prevSongId) || songs.find((s) => s.id === prevSongId);
      if (prevSong) {
        playSong(prevSong, activeList);
        return;
      }
    }

    const currentIndex = activeList.findIndex((s) => s.id === currentSong?.id);
    if (currentIndex > 0) {
      playSong(activeList[currentIndex - 1], activeList);
    } else {
      playSong(activeList[activeList.length - 1], activeList);
    }
  };

  // Volume change
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
    audioRef.current.volume = isMuted ? 0 : newVol;
  };

  // Mute toggle
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.volume = newMuted ? 0 : volume;
  };

  // Repeat mode cycle: off -> all -> one -> off
  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  // Toggle like
  const toggleLike = async (songId) => {
    const updated = await db.toggleLikeSong(songId);
    if (updated) {
      setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, isLiked: updated.isLiked } : s)));
      if (currentSong && currentSong.id === songId) {
        setCurrentSong((prev) => ({ ...prev, isLiked: updated.isLiked }));
      }
    }
  };

  // Delete song
  const removeSong = async (songId) => {
    await db.deleteSong(songId);
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setQueue((prev) => prev.filter((s) => s.id !== songId));

    if (currentSong && currentSong.id === songId) {
      audioRef.current.pause();
      setCurrentSong(null);
      setIsPlaying(false);
    }

    // Refresh playlists state
    const updatedPlaylists = await db.getAllPlaylists();
    setPlaylists(updatedPlaylists);
  };

  // Delete all songs
  const clearAllSongs = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(false);
      setCurrentSong(null);
      setCurrentTime(0);
      setDuration(0);
      setQueue([]);
      setHistory([]);

      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }
      coverUrlsMapRef.current.forEach((url) => URL.revokeObjectURL(url));
      coverUrlsMapRef.current.clear();

      await db.clearAllSongs();
      setSongs([]);
      setPlaylists((prev) => prev.map((p) => ({ ...p, songIds: [] })));
    } catch (err) {
      console.error('Erro ao limpar músicas:', err);
    }
  };

  // Upload files handler
  const importAudioFiles = async (files) => {
    const fileArray = Array.from(files).filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f.name)
    );

    if (fileArray.length === 0) return 0;

    const newSongObjects = [];

    for (const file of fileArray) {
      const meta = await extractMetadata(file);
      let coverBlob = meta.coverBlob;
      let coverUrl = null;
      let album = meta.album;

      // If file has no embedded cover, look up official cover art
      if (!coverBlob) {
        try {
          const resolved = await resolveCoverArt(meta.title, meta.artist);
          if (resolved?.coverUrl) {
            coverUrl = resolved.coverUrl;
            if (!album || album === 'Desconhecido') album = resolved.album;
            coverBlob = await fetchCoverBlob(resolved.coverUrl);
          }
        } catch (e) {
          console.warn('Could not auto-fetch cover for uploaded file:', e);
        }
      }

      const song = {
        id: 'song_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        title: meta.title,
        artist: meta.artist,
        album: album || 'Desconhecido',
        duration: meta.duration,
        fileBlob: file,
        fileType: meta.fileType,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        coverUrl: coverUrl,
        coverBlob: coverBlob,
        isLiked: false,
        year: meta.year,
        genre: meta.genre,
        dateAdded: new Date().toISOString(),
      };
      newSongObjects.push(song);
    }

    await db.saveMultipleSongs(newSongObjects);
    setSongs((prev) => [...newSongObjects, ...prev]);

    return newSongObjects.length;
  };

  // Playlists management
  const addPlaylist = async (name, description = '', initialSongId = null) => {
    const newPl = await db.createPlaylist(name, description);
    let finalPl = newPl;
    if (initialSongId) {
      const updated = await db.addSongToPlaylist(newPl.id, initialSongId);
      if (updated) {
        finalPl = updated;
      }
    }
    setPlaylists((prev) => [finalPl, ...prev.filter((p) => p.id !== finalPl.id)]);
    return finalPl;
  };

  const removePlaylist = async (playlistId) => {
    await db.deletePlaylist(playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setCurrentView('home');
      setSelectedPlaylistId(null);
    }
  };

  const addTrackToPlaylist = async (playlistId, songId) => {
    const updated = await db.addSongToPlaylist(playlistId, songId);
    if (updated) {
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
    }
  };

  const addMultipleTracksToPlaylist = async (playlistId, songIds) => {
    const updated = await db.addMultipleSongsToPlaylist(playlistId, songIds);
    if (updated) {
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
    }
    return updated;
  };

  const removeTrackFromPlaylist = async (playlistId, songId) => {
    const updated = await db.removeSongFromPlaylist(playlistId, songId);
    if (updated) {
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
    }
  };



  // Download Spotify Track by metadata and save to IndexedDB
  const downloadSpotifyTrack = async (trackItem) => {
    try {
      let finalCoverUrl = trackItem.coverUrl;
      let finalAlbum = trackItem.album;

      // If coverUrl is missing, or is a mosaic/generic playlist cover, fetch real album metadata
      if (
        !finalCoverUrl ||
        !finalAlbum ||
        finalAlbum === 'Spotify Playlist' ||
        finalCoverUrl.includes('mosaic.scdn.co')
      ) {
        try {
          const resolved = await resolveCoverArt(trackItem.title, trackItem.artist);
          if (resolved?.coverUrl) finalCoverUrl = resolved.coverUrl;
          if (resolved?.album) finalAlbum = resolved.album;
        } catch (e) {
          console.warn('Erro ao buscar metadados detalhados:', e);
        }
      }

      const queryParams = new URLSearchParams({
        title: trackItem.title,
        artist: trackItem.artist,
        duration: trackItem.duration || 0,
      });

      const res = await apiFetch(`/api/spotify/download-track?${queryParams.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao baixar faixa do Spotify');
      }

      const audioBlob = await res.blob();

      let coverBlob = null;
      if (finalCoverUrl) {
        try {
          coverBlob = await fetchCoverBlob(finalCoverUrl);
        } catch (thumbErr) {
          console.warn('Erro ao obter capa do Spotify:', thumbErr);
        }
      }

      const safeTitle = trackItem.title.replace(/[/\\?%*:|"<>]/g, '-');
      const safeArtist = trackItem.artist.replace(/[/\\?%*:|"<>]/g, '-');

      const newSong = {
        id: 'sp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: trackItem.title,
        artist: trackItem.artist,
        album: finalAlbum || 'Single',
        duration: trackItem.duration || 0,
        fileBlob: audioBlob,
        fileType: audioBlob.type || 'audio/mp4',
        fileName: `${safeTitle} - ${safeArtist}.m4a`,
        fileSize: audioBlob.size,
        coverUrl: finalCoverUrl || null,
        coverBlob: coverBlob,
        isLiked: false,
        dateAdded: new Date().toISOString(),
      };

      await db.saveSong(newSong);
      setSongs((prev) => [newSong, ...prev]);
      return newSong;
    } catch (err) {
      console.error('Erro ao baixar música do Spotify:', err);
      throw err;
    }
  };

  // Update a single song's cover art and album name using multi-source resolver
  const updateSongCover = async (songId) => {
    const song = songs.find((s) => s.id === songId);
    if (!song) return null;

    try {
      const resolved = await resolveCoverArt(song.title, song.artist);
      if (!resolved?.coverUrl) throw new Error('Capa original não encontrada.');

      const newCoverBlob = await fetchCoverBlob(resolved.coverUrl);

      // Revoke old cached URL so UI updates immediately
      if (coverUrlsMapRef.current.has(song.id)) {
        URL.revokeObjectURL(coverUrlsMapRef.current.get(song.id));
        coverUrlsMapRef.current.delete(song.id);
      }

      const updatedSong = {
        ...song,
        album: resolved.album || song.album,
        coverUrl: resolved.coverUrl,
        coverBlob: newCoverBlob || song.coverBlob,
      };

      await db.saveSong(updatedSong);

      setSongs((prev) => prev.map((s) => (s.id === songId ? updatedSong : s)));
      if (currentSong?.id === songId) {
        setCurrentSong(updatedSong);
      }

      return updatedSong;
    } catch (err) {
      console.error(`Erro ao atualizar capa para "${song.title}":`, err);
      throw err;
    }
  };

  // Automatically heal and recover album covers for any songs that are missing covers
  const autoHealMissingCovers = async (songList = null) => {
    const list = songList || songs;
    const missing = list.filter((s) => !s.coverBlob && !s.coverUrl);
    if (missing.length === 0) return 0;

    console.info(`[CoverHealer] Encontradas ${missing.length} músicas sem capa. Recuperando capas...`);

    let healedCount = 0;
    for (const song of missing) {
      try {
        const resolved = await resolveCoverArt(song.title, song.artist);
        if (resolved?.coverUrl) {
          const coverBlob = await fetchCoverBlob(resolved.coverUrl);
          const updatedSong = {
            ...song,
            album: song.album && song.album !== 'Spotify Playlist' && song.album !== 'Desconhecido'
              ? song.album
              : (resolved.album || song.album),
            coverUrl: resolved.coverUrl,
            coverBlob: coverBlob,
          };
          await db.saveSong(updatedSong);
          setSongs((prev) => prev.map((s) => (s.id === song.id ? updatedSong : s)));
          if (currentSong?.id === song.id) {
            setCurrentSong(updatedSong);
          }
          healedCount++;
        }
      } catch (err) {
        console.warn(`[CoverHealer] Não foi possível obter capa para "${song.title}":`, err);
      }
    }
    return healedCount;
  };

  // Restore album covers for a list of songs or all songs
  const fixAllSongCovers = async (targetSongIds = null) => {
    return autoHealMissingCovers(targetSongIds ? songs.filter((s) => targetSongIds.includes(s.id)) : songs);
  };

  // Auto-heal missing covers once songs are loaded
  const hasCheckedMissingCoversRef = useRef(false);
  useEffect(() => {
    if (!isLoading && songs.length > 0 && !hasCheckedMissingCoversRef.current) {
      hasCheckedMissingCoversRef.current = true;
      const hasMissing = songs.some((s) => !s.coverBlob && !s.coverUrl);
      if (hasMissing) {
        setTimeout(() => {
          autoHealMissingCovers();
        }, 1200);
      }
    }
  }, [isLoading, songs]);

  // Liked songs list
  const likedSongs = useMemo(() => {
    return songs.filter((s) => s.isLiked);
  }, [songs]);

  // ================= Background Download Queue Manager =================

  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (e) {
        // Wake lock can fail if battery saver is on, harmless to catch
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
    }
  };

  // Sync downloads completed by Service Worker in background (even with app closed)
  const syncBackgroundDownloads = async () => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('marcosmusic-downloads-v1').catch(() => null);
        if (cache) {
          const keys = await cache.keys();
          for (const req of keys) {
            const match = req.url.match(/\/bg-download\/(.+)$/);
            if (match) {
              const fetchId = match[1];
              const resp = await cache.match(req);
              if (resp && resp.ok) {
                const audioBlob = await resp.blob();
                const queueItems = await db.getAllQueueItems();
                const qItem = queueItems.find((it) => it.id === fetchId);
                if (qItem && qItem.status !== 'completed') {
                  const safeTitle = (qItem.title || 'Música').replace(/[/\\?%*:|"<>]/g, '-');
                  const safeArtist = (qItem.artist || 'Artista').replace(/[/\\?%*:|"<>]/g, '-');
                  const songId = 'sp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

                  const newSong = {
                    id: songId,
                    title: qItem.title,
                    artist: qItem.artist,
                    album: qItem.album || 'Single',
                    duration: qItem.duration || 0,
                    fileBlob: audioBlob,
                    fileType: audioBlob.type || 'audio/mp4',
                    fileName: `${safeTitle} - ${safeArtist}.m4a`,
                    fileSize: audioBlob.size,
                    coverUrl: qItem.coverUrl || null,
                    coverBlob: null,
                    isLiked: false,
                    dateAdded: new Date().toISOString(),
                  };

                  await db.saveSong(newSong);

                  const completedItem = {
                    ...qItem,
                    status: 'completed',
                    savedSongId: songId,
                    completedAt: new Date().toISOString(),
                  };
                  await db.saveQueueItem(completedItem);

                  if (qItem.playlistId) {
                    await addTrackToPlaylist(qItem.playlistId, songId);
                  }
                }
                await cache.delete(req);
              }
            }
          }
        }
      }

      // Reload latest data from IndexedDB
      const [latestSongs, latestQueue, latestPlaylists] = await Promise.all([
        db.getAllSongs(),
        db.getAllQueueItems(),
        db.getAllPlaylists(),
      ]);

      setSongs(latestSongs || []);
      setPlaylists(latestPlaylists || []);

      const sanitizedQueue = (latestQueue || []).map((it) => {
        if (it.status === 'downloading') {
          return { ...it, status: 'pending' };
        }
        return it;
      });
      setDownloadQueue(sanitizedQueue);
    } catch (err) {
      console.warn('Erro ao sincronizar downloads de background:', err);
    }
  };

  // Listen to Service Worker completion messages
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event) => {
        if (event.data?.type === 'BG_FETCH_SUCCESS' || event.data?.type === 'BG_FETCH_FAIL') {
          syncBackgroundDownloads();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, []);

  const processDownloadQueue = async () => {
    if (isProcessingQueueRef.current || isQueuePaused) return;

    // Find next pending item from IndexedDB
    const currentQueue = await db.getAllQueueItems();
    const nextItem = currentQueue.find((item) => item.status === 'pending');
    if (!nextItem) {
      releaseWakeLock();
      return;
    }

    // Keep screen awake while downloading
    requestWakeLock();
    isProcessingQueueRef.current = true;

    const updatingItem = {
      ...nextItem,
      status: 'downloading',
      updatedAt: new Date().toISOString(),
    };
    await db.saveQueueItem(updatingItem);
    setDownloadQueue((prev) =>
      prev.map((it) => (it.id === nextItem.id ? updatingItem : it))
    );

    // 1. Try Native Background Fetch API (Android Chrome/Edge)
    // Downloads execute at Android OS level even if browser/app is closed
    let usedBgFetch = false;
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'BackgroundFetchManager' in window
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.backgroundFetch) {
          // Pre-resolve cover art if missing or generic
          let finalCoverUrl = nextItem.coverUrl;
          if (!finalCoverUrl || finalCoverUrl.includes('mosaic.scdn.co')) {
            try {
              const resolved = await resolveCoverArt(nextItem.title, nextItem.artist);
              if (resolved?.coverUrl) finalCoverUrl = resolved.coverUrl;
            } catch (e) {}
          }

          const queryParams = new URLSearchParams({
            title: nextItem.title,
            artist: nextItem.artist,
            duration: nextItem.duration || 0,
          });
          const downloadUrl = getAbsoluteApiUrl(`/api/spotify/download-track?${queryParams.toString()}`);

          await registration.backgroundFetch.fetch(
            nextItem.id,
            [downloadUrl],
            {
              title: `${nextItem.title} - ${nextItem.artist}`,
              icons: finalCoverUrl ? [{ src: finalCoverUrl, sizes: '192x192', type: 'image/jpeg' }] : [],
              downloadTotal: (nextItem.duration || 180) * 32000,
            }
          );
          usedBgFetch = true;
          console.info(`Background Fetch iniciado para "${nextItem.title}"`);
        }
      } catch (bgErr) {
        console.warn('Background Fetch falhou ou não suportado, usando fallback in-app:', bgErr);
        usedBgFetch = false;
      }
    }

    if (usedBgFetch) {
      isProcessingQueueRef.current = false;
      // Stagger next queue item
      setTimeout(() => {
        processDownloadQueue();
      }, 1200);
      return;
    }

    // 2. Standard Fallback Download (iOS Safari, Firefox, Desktop)
    try {
      const savedSong = await downloadSpotifyTrack(nextItem.track);
      if (nextItem.playlistId && savedSong) {
        await addTrackToPlaylist(nextItem.playlistId, savedSong.id);
      }

      const completedItem = {
        ...nextItem,
        status: 'completed',
        savedSongId: savedSong?.id,
        completedAt: new Date().toISOString(),
      };
      await db.saveQueueItem(completedItem);
      setDownloadQueue((prev) =>
        prev.map((it) => (it.id === nextItem.id ? completedItem : it))
      );
    } catch (err) {
      console.warn(`Erro no download em segundo plano de "${nextItem.title}":`, err);
      const failedItem = {
        ...nextItem,
        status: 'failed',
        error: err.message || 'Falha ao baixar áudio',
        failedAt: new Date().toISOString(),
      };
      await db.saveQueueItem(failedItem);
      setDownloadQueue((prev) =>
        prev.map((it) => (it.id === nextItem.id ? failedItem : it))
      );
    } finally {
      isProcessingQueueRef.current = false;
      const remaining = await db.getAllQueueItems();
      const hasPending = remaining.some((it) => it.status === 'pending');
      if (hasPending && !isQueuePaused) {
        setTimeout(() => {
          processDownloadQueue();
        }, 300);
      } else {
        releaseWakeLock();
      }
    }
  };

  // Run queue processor whenever downloadQueue changes or is unpaused
  useEffect(() => {
    if (!isQueuePaused && downloadQueue.some((it) => it.status === 'pending')) {
      processDownloadQueue();
    }
  }, [downloadQueue, isQueuePaused]);

  // Keep processing when tab wakes up, is unminimized, or returns to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isQueuePaused) {
        syncBackgroundDownloads().then(() => {
          processDownloadQueue();
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isQueuePaused]);

  // Queue Operations
  const enqueueDownload = async (track, playlistId = null) => {
    const existing = songs.find(
      (s) =>
        s.title.toLowerCase() === track.title.toLowerCase() &&
        s.artist.toLowerCase().includes(track.artist.toLowerCase())
    );
    if (existing) {
      if (playlistId) {
        await addTrackToPlaylist(playlistId, existing.id);
      }
      return existing;
    }

    const item = {
      id: 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || 'Single',
        duration: track.duration || 0,
        coverUrl: track.coverUrl,
        previewUrl: track.previewUrl,
      },
      title: track.title,
      artist: track.artist,
      album: track.album || 'Single',
      duration: track.duration || 0,
      coverUrl: track.coverUrl,
      status: 'pending',
      error: null,
      playlistId: playlistId,
      createdAt: new Date().toISOString(),
    };

    await db.saveQueueItem(item);
    setDownloadQueue((prev) => [...prev, item]);
    return item;
  };

  const enqueueBatchDownload = async (trackList, playlistId = null) => {
    const newItems = [];
    for (const track of trackList) {
      const existing = songs.find(
        (s) =>
          s.title.toLowerCase() === track.title.toLowerCase() &&
          s.artist.toLowerCase().includes(track.artist.toLowerCase())
      );
      if (existing) {
        if (playlistId) {
          await addTrackToPlaylist(playlistId, existing.id);
        }
        continue;
      }

      const item = {
        id: 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        track: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album || 'Single',
          duration: track.duration || 0,
          coverUrl: track.coverUrl,
          previewUrl: track.previewUrl,
        },
        title: track.title,
        artist: track.artist,
        album: track.album || 'Single',
        duration: track.duration || 0,
        coverUrl: track.coverUrl,
        status: 'pending',
        error: null,
        playlistId: playlistId,
        createdAt: new Date().toISOString(),
      };
      await db.saveQueueItem(item);
      newItems.push(item);
    }
    if (newItems.length > 0) {
      setDownloadQueue((prev) => [...prev, ...newItems]);
    }
    return newItems;
  };

  const retryDownload = async (queueId) => {
    const item = downloadQueue.find((it) => it.id === queueId);
    if (!item) return;
    const updated = {
      ...item,
      status: 'pending',
      error: null,
      createdAt: new Date().toISOString(),
    };
    await db.saveQueueItem(updated);
    setDownloadQueue((prev) =>
      prev.map((it) => (it.id === queueId ? updated : it))
    );
  };

  const cancelDownload = async (queueId) => {
    await db.deleteQueueItem(queueId);
    setDownloadQueue((prev) => prev.filter((it) => it.id !== queueId));
  };

  const clearCompletedDownloads = async () => {
    await db.clearCompletedQueueItems();
    setDownloadQueue((prev) => prev.filter((it) => it.status !== 'completed'));
  };

  const clearAllDownloads = async () => {
    await db.clearAllQueueItems();
    setDownloadQueue([]);
  };

  const activeDownloadsCount = useMemo(() => {
    return downloadQueue.filter((it) => it.status === 'pending' || it.status === 'downloading').length;
  }, [downloadQueue]);

  return (
    <PlayerContext.Provider
      value={{
        songs,
        playlists,
        likedSongs,
        isLoading,
        downloadQueue,
        activeDownloadsCount,
        isQueuePaused,
        setIsQueuePaused,
        enqueueDownload,
        enqueueBatchDownload,
        retryDownload,
        cancelDownload,
        clearCompletedDownloads,
        clearAllDownloads,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        isLyricsOpen,
        setIsLyricsOpen,
        toggleLyrics,
        lyricsData,
        reloadLyrics,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        currentView,
        selectedPlaylistId,
        searchQuery,
        queue,
        setCurrentView,
        setSelectedPlaylistId,
        setSearchQuery,
        playSong,
        togglePlayPause,
        seekTo,
        handleNextTrack,
        handlePrevTrack,
        handleVolumeChange,
        toggleMute,
        isShuffle,
        setIsShuffle,
        toggleShuffle,
        playCollectionInShuffle,
        cycleRepeatMode,
        toggleLike,
        removeSong,
        clearAllSongs,
        importAudioFiles,
        addPlaylist,
        removePlaylist,
        addTrackToPlaylist,
        addMultipleTracksToPlaylist,
        removeTrackFromPlaylist,
        getCoverUrl,
        downloadSpotifyTrack,
        updateSongCover,
        fixAllSongCovers,
        autoHealMissingCovers,
        audioDevices,
        selectedDeviceId,
        currentDeviceName,
        isBluetoothActive,
        selectAudioDevice,
        pairBluetoothDevice,
        fetchAudioDevices,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer deve ser usado dentro de um PlayerProvider');
  }
  return context;
}
