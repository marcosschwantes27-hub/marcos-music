import { apiFetch } from './api';
import { parseLrc } from './lyrics';
import * as db from '../db/database';

// In-memory session cache to avoid refetching during rapid song navigation
const lyricsCache = new Map();

/**
 * Clean track title by stripping noise like (Official Video), [Remastered], etc.
 */
function cleanSongTitle(title) {
  if (!title) return '';
  return title
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/official\s+video|official\s+audio|lyric\s+video|audio|video|hd|4k/gi, '')
    .trim();
}

/**
 * Clean artist name by stripping featured artists
 */
function cleanArtistName(artist) {
  if (!artist) return '';
  return artist
    .split(/,|&|feat\.|ft\./i)[0]
    .trim();
}

/**
 * Fetches lyrics for a song. Checks local song cache first, then API.
 * Automatically saves fetched lyrics to IndexedDB for offline access.
 * 
 * @param {Object} song
 * @returns {Promise<{
 *   syncedLyrics: string | null,
 *   plainLyrics: string | null,
 *   parsedLines: Array<{ time: number, text: string, id: string }>,
 *   isSynced: boolean,
 *   instrumental: boolean,
 *   error: string | null
 * }>}
 */
export async function fetchLyricsForSong(song) {
  if (!song || !song.title) {
    return {
      syncedLyrics: null,
      plainLyrics: null,
      parsedLines: [],
      isSynced: false,
      instrumental: false,
      error: 'Nenhuma música selecionada',
    };
  }

  const cacheKey = `${song.title.toLowerCase()}___${(song.artist || '').toLowerCase()}`;

  // 1. Check in-memory cache
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  // 2. Check if song already has lyrics stored in IndexedDB
  if (song.syncedLyrics || song.plainLyrics) {
    const parsedLines = song.syncedLyrics ? parseLrc(song.syncedLyrics) : [];
    const result = {
      syncedLyrics: song.syncedLyrics || null,
      plainLyrics: song.plainLyrics || null,
      parsedLines,
      isSynced: parsedLines.length > 0,
      instrumental: song.instrumental || false,
      error: null,
    };
    lyricsCache.set(cacheKey, result);
    return result;
  }

  const title = cleanSongTitle(song.title);
  const artist = cleanArtistName(song.artist || '');
  const duration = song.duration ? Math.round(song.duration) : 0;

  let apiData = null;

  // 3. Try fetching via our unified backend API (with fallback to direct lrclib.net)
  try {
    const params = new URLSearchParams({
      track: title,
      artist: artist,
      duration: duration ? duration.toString() : '0',
    });
    apiData = await apiFetch(`/api/lyrics?${params.toString()}`);
  } catch (err) {
    console.warn('Backend lyrics proxy error, trying direct lrclib:', err);
  }

  // 4. Fallback directly to lrclib.net if backend didn't return valid data
  if (!apiData || (!apiData.syncedLyrics && !apiData.plainLyrics && !apiData.instrumental)) {
    try {
      const lrclibParams = new URLSearchParams({
        track_name: title,
        artist_name: artist,
      });
      if (duration > 0) lrclibParams.append('duration', duration.toString());
      
      const resp = await fetch(`https://lrclib.net/api/get?${lrclibParams.toString()}`);
      if (resp.ok) {
        apiData = await resp.json();
      } else {
        // Try LRCLIB search
        const searchResp = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`)}`);
        if (searchResp.ok) {
          const searchItems = await searchResp.json();
          if (searchItems && searchItems.length > 0) {
            apiData = searchItems.find((it) => it.syncedLyrics) || searchItems[0];
          }
        }
      }
    } catch (e) {
      console.warn('Direct LRCLIB fetch failed:', e);
    }
  }

  const syncedLyrics = apiData?.syncedLyrics || null;
  const plainLyrics = apiData?.plainLyrics || null;
  const instrumental = Boolean(apiData?.instrumental);
  const parsedLines = syncedLyrics ? parseLrc(syncedLyrics) : [];

  const result = {
    syncedLyrics,
    plainLyrics,
    parsedLines,
    isSynced: parsedLines.length > 0,
    instrumental,
    error: parsedLines.length === 0 && !plainLyrics && !instrumental
      ? 'Letra não encontrada para esta música'
      : null,
  };

  lyricsCache.set(cacheKey, result);

  // 5. Save to IndexedDB so lyrics work completely OFFLINE next time!
  if ((syncedLyrics || plainLyrics || instrumental) && song.id) {
    try {
      const existingDb = await db.getDB();
      const storedSong = await existingDb.get('songs', song.id);
      if (storedSong) {
        storedSong.syncedLyrics = syncedLyrics;
        storedSong.plainLyrics = plainLyrics;
        storedSong.instrumental = instrumental;
        await existingDb.put('songs', storedSong);
      }
    } catch (saveErr) {
      console.warn('Could not persist lyrics to IndexedDB:', saveErr);
    }
  }

  return result;
}
