import { openDB } from 'idb';

const DB_NAME = 'MarcosMusicDB';
const OLD_DB_NAME = 'FurtadoMusicDB';
const DB_VERSION = 1;

let migrationDone = false;

export async function getDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('songs')) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id' });
        songStore.createIndex('dateAdded', 'dateAdded');
        songStore.createIndex('isLiked', 'isLiked');
        songStore.createIndex('artist', 'artist');
        songStore.createIndex('album', 'album');
      }

      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  // Seamlessly migrate previous downloads if any
  if (!migrationDone) {
    migrationDone = true;
    try {
      const songCount = await db.count('songs');
      if (songCount === 0) {
        const oldDb = await openDB(OLD_DB_NAME, DB_VERSION).catch(() => null);
        if (oldDb && oldDb.objectStoreNames.contains('songs')) {
          const oldSongs = await oldDb.getAll('songs');
          if (oldSongs && oldSongs.length > 0) {
            const tx = db.transaction('songs', 'readwrite');
            for (const s of oldSongs) {
              await tx.store.put(s);
            }
            await tx.done;
          }
          if (oldDb.objectStoreNames.contains('playlists')) {
            const oldPlaylists = await oldDb.getAll('playlists');
            if (oldPlaylists && oldPlaylists.length > 0) {
              const txP = db.transaction('playlists', 'readwrite');
              for (const p of oldPlaylists) {
                await txP.store.put(p);
              }
              await txP.done;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Migration check completed without changes:', e);
    }
  }

  return db;
}

// ================= Songs Operations =================

export async function getAllSongs() {
  const db = await getDB();
  const songs = await db.getAll('songs');
  // Sort descending by dateAdded
  return songs.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
}

export async function saveSong(song) {
  const db = await getDB();
  await db.put('songs', song);
  return song;
}

export async function saveMultipleSongs(songs) {
  const db = await getDB();
  const tx = db.transaction('songs', 'readwrite');
  for (const song of songs) {
    await tx.store.put(song);
  }
  await tx.done;
  return songs;
}

export async function deleteSong(songId) {
  const db = await getDB();
  // Delete from songs store
  await db.delete('songs', songId);

  // Also remove from any playlist containing this song
  const playlists = await getAllPlaylists();
  const tx = db.transaction('playlists', 'readwrite');
  for (const pl of playlists) {
    if (pl.songIds && pl.songIds.includes(songId)) {
      pl.songIds = pl.songIds.filter((id) => id !== songId);
      await tx.store.put(pl);
    }
  }
  await tx.done;
}

export async function clearAllSongs() {
  const db = await getDB();
  await db.clear('songs');

  // Also clean old db if present
  try {
    const oldDb = await openDB(OLD_DB_NAME, DB_VERSION).catch(() => null);
    if (oldDb && oldDb.objectStoreNames.contains('songs')) {
      await oldDb.clear('songs');
    }
  } catch (e) {
    // ignore
  }

  // Remove song IDs from all playlists
  const playlists = await getAllPlaylists();
  const tx = db.transaction('playlists', 'readwrite');
  for (const pl of playlists) {
    pl.songIds = [];
    await tx.store.put(pl);
  }
  await tx.done;
}

export async function toggleLikeSong(songId) {
  const db = await getDB();
  const song = await db.get('songs', songId);
  if (!song) return null;
  song.isLiked = !song.isLiked;
  await db.put('songs', song);
  return song;
}

// ================= Playlists Operations =================

export async function getAllPlaylists() {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function createPlaylist(name, description = '') {
  const db = await getDB();
  const newPlaylist = {
    id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim() || 'Minha Playlist',
    description: description.trim(),
    songIds: [],
    createdAt: new Date().toISOString(),
  };
  await db.put('playlists', newPlaylist);
  return newPlaylist;
}

export async function updatePlaylist(playlist) {
  const db = await getDB();
  await db.put('playlists', playlist);
  return playlist;
}

export async function deletePlaylist(playlistId) {
  const db = await getDB();
  await db.delete('playlists', playlistId);
}

export async function addSongToPlaylist(playlistId, songId) {
  const db = await getDB();
  const playlist = await db.get('playlists', playlistId);
  if (!playlist) return null;
  if (!playlist.songIds) playlist.songIds = [];
  if (!playlist.songIds.includes(songId)) {
    playlist.songIds.push(songId);
    await db.put('playlists', playlist);
  }
  return playlist;
}

export async function addMultipleSongsToPlaylist(playlistId, songIds) {
  const db = await getDB();
  const playlist = await db.get('playlists', playlistId);
  if (!playlist) return null;
  if (!playlist.songIds) playlist.songIds = [];
  for (const songId of songIds) {
    if (!playlist.songIds.includes(songId)) {
      playlist.songIds.push(songId);
    }
  }
  await db.put('playlists', playlist);
  return playlist;
}

export async function removeSongFromPlaylist(playlistId, songId) {
  const db = await getDB();
  const playlist = await db.get('playlists', playlistId);
  if (!playlist) return null;
  if (playlist.songIds) {
    playlist.songIds = playlist.songIds.filter((id) => id !== songId);
    await db.put('playlists', playlist);
  }
  return playlist;
}
