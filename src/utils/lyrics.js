/**
 * LRC Parser & Real-Time Lyric Synchronization
 * Marcos Music
 */

/**
 * Parses standard and enhanced LRC text formats into an array of timestamped lyric lines.
 * Examples handled:
 * [00:14.50] Hello from the other side
 * [00:14.50][00:28.10] Repeated line
 * 
 * @param {string} lrcText - Raw LRC string
 * @returns {Array<{ time: number, text: string, id: string }>}
 */
export function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split(/\r?\n/);
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const matches = [...rawLine.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = rawLine.replace(timeRegex, '').trim();
      for (const match of matches) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const time = min * 60 + sec;
        result.push({
          time,
          text: text || '♪',
          id: `lyric_${time.toFixed(2)}_${i}`,
        });
      }
    }
  }

  // Sort lines chronologically
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Determines which line of lyrics should be currently active based on playback position.
 * Applies a 0.2s lead-in anticipation so lines illuminate in sync with vocals.
 * 
 * @param {Array<{ time: number, text: string }>} parsedLyrics
 * @param {number} currentTime - Current audio position in seconds
 * @returns {number} Index of current line, or -1
 */
export function findActiveLyricIndex(parsedLyrics, currentTime) {
  if (!parsedLyrics || parsedLyrics.length === 0) return -1;
  const targetTime = currentTime + 0.2;

  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (parsedLyrics[i].time <= targetTime) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}
