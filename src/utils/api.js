/**
 * Resilient API fetcher with automatic direct backend fallback.
 * If Vite proxy fails, or another server conflicts on port 5173,
 * or on mobile devices / Capacitor, falls back directly to port 8085.
 */
export async function apiFetch(path, options = {}) {
  // If the path already has http:// or https://, fetch directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return fetch(path, options);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 1. Configured cloud backend URL (via localStorage, env or official cloud URL)
  const configuredApiUrl =
    (typeof localStorage !== 'undefined' && localStorage.getItem('custom_backend_url')) ||
    import.meta.env.VITE_API_URL ||
    'https://marcos-music.onrender.com';

  if (configuredApiUrl) {
    const baseUrl = configuredApiUrl.replace(/\/+$/, '');
    try {
      const res = await fetch(`${baseUrl}${cleanPath}`, options);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        return res;
      }
    } catch (e) {
      console.warn('Configured cloud backend request failed, trying fallback:', e);
    }
  }

  // 2. Try relative path
  try {
    const res = await fetch(cleanPath, options);
    const contentType = res.headers.get('content-type') || '';
    // If it's OK and not an accidental HTML error page from a conflicting server
    if (res.ok && !contentType.includes('text/html')) {
      return res;
    }
  } catch (err) {
    // Relative fetch failed, fall through to direct backend
  }

  // 3. Direct fallback to Python backend on port 8085
  const host = (typeof window !== 'undefined' && window.location.hostname) || '127.0.0.1';
  const directUrl = `http://${host}:8085${cleanPath}`;

  return fetch(directUrl, options);
}
