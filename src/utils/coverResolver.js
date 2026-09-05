import { apiFetch } from './api';

/**
 * Resolves high-resolution album cover art using multiple fallback sources:
 * 1. Backend /api/music/track-meta (Deezer + iTunes catalog)
 * 2. Direct browser iTunes Search API (100% open CORS, works everywhere)
 * 
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {Promise<{ coverUrl: string | null, album: string | null, artist: string | null }>}
 */
export async function resolveCoverArt(title, artist) {
  if (!title) return { coverUrl: null, album: null, artist: null };

  const cleanTitle = title
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/#\d+/g, '')
    .replace(/official\s+video|official\s+audio|lyric\s+video|audio|video|hd|4k/gi, '')
    .trim();

  const cleanArtist = (artist || '')
    .replace(/\xa0/g, ' ')
    .split(/[,&/]|\bfeat\.?\b|\bft\.?\b/i)[0]
    .trim();

  // 1. Try unified backend endpoint
  try {
    const params = new URLSearchParams({
      title: cleanTitle || title,
      artist: cleanArtist || '',
    });
    const res = await apiFetch(`/api/music/track-meta?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.coverUrl) {
        return {
          coverUrl: data.coverUrl,
          album: data.album,
          artist: data.artist || cleanArtist,
        };
      }
    }
  } catch (err) {
    // Continue to direct client search
  }

  // 2. Direct iTunes Search API fallback (Directly from browser with CORS *)
  const candidates = [
    `${cleanTitle} ${cleanArtist}`.trim(),
    cleanTitle,
  ];

  for (const q of candidates) {
    try {
      const term = encodeURIComponent(q);
      const itunesUrl = `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`;
      const itunesRes = await fetch(itunesUrl);
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData.results && itunesData.results.length > 0) {
          const item = itunesData.results[0];
          const art = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
          if (art) {
            return {
              coverUrl: art,
              album: item.collectionName || item.trackName,
              artist: item.artistName || cleanArtist,
            };
          }
        }
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  return { coverUrl: null, album: null, artist: null };
}

/**
 * Downloads an image from a URL and returns it as a Blob
 * for permanent offline storage in IndexedDB.
 * 
 * @param {string} url
 * @returns {Promise<Blob | null>}
 */
export async function fetchCoverBlob(url) {
  if (!url) return null;

  // 1. Try direct fetch (works for open CORS CDNs like Deezer and iTunes)
  try {
    const directRes = await fetch(url);
    if (directRes.ok) {
      const blob = await directRes.blob();
      if (blob && blob.size > 1000) return blob;
    }
  } catch (e) {
    // Fall through to backend image proxy
  }

  // 2. Try backend thumbnail proxy
  try {
    const proxyRes = await apiFetch(`/api/spotify/thumbnail?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const blob = await proxyRes.blob();
      if (blob && blob.size > 1000) return blob;
    }
  } catch (err) {
    console.warn('Cover blob fetch failed:', err);
  }

  return null;
}
