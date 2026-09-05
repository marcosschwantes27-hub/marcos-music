import * as mm from 'music-metadata-browser';

/**
 * Clean track title and artist from filename if metadata is missing.
 * E.g., "01 - Queen - Bohemian Rhapsody.mp3" -> Artist: Queen, Title: Bohemian Rhapsody
 */
function parseFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const parts = nameWithoutExt.split(' - ');
  if (parts.length >= 2) {
    const artist = parts[0].replace(/^\d+[\s.-]*/, '').trim();
    const title = parts.slice(1).join(' - ').trim();
    return {
      title: title || nameWithoutExt,
      artist: artist || 'Artista Desconhecido',
    };
  }

  // Remove leading numbers like "01. " or "01 - "
  const cleaned = nameWithoutExt.replace(/^\d+[\s.-]*/, '').trim();
  return {
    title: cleaned || nameWithoutExt,
    artist: 'Artista Desconhecido',
  };
}

/**
 * Get duration reliably via HTML5 Audio element
 */
function getDurationFromAudio(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      resolve(isFinite(duration) ? duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

/**
 * Extract full metadata (ID3 tags, cover image, duration) from an audio File/Blob
 */
export async function extractMetadata(file) {
  const fallback = parseFromFilename(file.name);
  let title = fallback.title;
  let artist = fallback.artist;
  let album = 'Álbum Desconhecido';
  let duration = 0;
  let coverBlob = null;
  let year = null;
  let genre = null;

  try {
    const metadata = await mm.parseBlob(file, { duration: true, skipCovers: false });
    if (metadata) {
      if (metadata.common) {
        if (metadata.common.title && metadata.common.title.trim()) {
          title = metadata.common.title.trim();
        }
        if (metadata.common.artist && metadata.common.artist.trim()) {
          artist = metadata.common.artist.trim();
        }
        if (metadata.common.album && metadata.common.album.trim()) {
          album = metadata.common.album.trim();
        }
        if (metadata.common.year) {
          year = metadata.common.year;
        }
        if (metadata.common.genre && metadata.common.genre.length > 0) {
          genre = metadata.common.genre[0];
        }

        // Cover art picture
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0];
          coverBlob = new Blob([pic.data], { type: pic.format || 'image/jpeg' });
        }
      }

      if (metadata.format && metadata.format.duration) {
        duration = metadata.format.duration;
      }
    }
  } catch (err) {
    console.warn('Metadata parsing fallback for file:', file.name, err);
  }

  // If duration wasn't obtained from ID3 tags, calculate from Audio element
  if (!duration || duration <= 0) {
    duration = await getDurationFromAudio(file);
  }

  return {
    title,
    artist,
    album,
    duration,
    coverBlob,
    year,
    genre,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'audio/mpeg',
  };
}
