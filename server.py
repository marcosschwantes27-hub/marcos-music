import os
import sys
import json
import re
import socket
import subprocess
import shutil
import urllib.parse
import urllib.request
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
import concurrent.futures
import yt_dlp

# Force UTF-8 on Windows
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = int(os.environ.get('PORT', 8085))
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'furtadomusic_yt')
os.makedirs(TEMP_DIR, exist_ok=True)

def ensure_deno_installed():
    """Auto-install deno JS runtime if not found (required by yt-dlp on cloud servers)."""
    if shutil.which('deno'):
        print("✓ Deno JS runtime found.")
        return
    if sys.platform.startswith('win'):
        return  # Not needed on Windows (user machines)
    print("⚙ Deno not found. Installing for yt-dlp YouTube support...")
    try:
        deno_dir = os.path.expanduser('~/.deno')
        subprocess.run(
            'curl -fsSL https://deno.land/install.sh | sh',
            shell=True, check=True, timeout=60,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        deno_bin = os.path.join(deno_dir, 'bin')
        if os.path.isdir(deno_bin):
            os.environ['PATH'] = deno_bin + ':' + os.environ.get('PATH', '')
            os.environ['DENO_DIR'] = deno_dir
            print(f"✓ Deno installed at {deno_bin}")
        else:
            print("⚠ Deno install completed but bin dir not found.")
    except Exception as e:
        print(f"⚠ Could not install deno: {e}. YouTube downloads may fail.")

ensure_deno_installed()

MIN_AUDIO_SIZE = 300_000  # 300KB minimum to consider a valid audio track

def _download_single_video(url):
    """Download a single video/track directly. Returns filepath or None."""
    out_tmpl = os.path.join(TEMP_DIR, "%(id)s.%(ext)s")
    downloaded_files = []

    def hook(d):
        if d.get('status') == 'finished':
            fn = d.get('filename')
            if fn:
                downloaded_files.append(fn)

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': out_tmpl,
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': True,
        'overwrites': True,
        'progress_hooks': [hook],
        'geo_bypass': True,
        'nocheckcertificate': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"Error downloading candidate {url}: {e}")

    # 1. Check direct filename from hook
    if downloaded_files:
        fp = downloaded_files[0]
        if os.path.exists(fp) and os.path.getsize(fp) >= MIN_AUDIO_SIZE:
            return fp
        base = os.path.splitext(fp)[0]
        for ext in ['.m4a', '.webm', '.opus', '.mp3']:
            if os.path.exists(base + ext) and os.path.getsize(base + ext) >= MIN_AUDIO_SIZE:
                return base + ext

    # 2. Check recent files in TEMP_DIR as fallback (for renamed/transcoded files)
    try:
        recent = [os.path.join(TEMP_DIR, f) for f in os.listdir(TEMP_DIR)]
        recent = [
            f for f in recent
            if os.path.isfile(f) and any(f.endswith(ext) for ext in ['.m4a', '.webm', '.opus', '.mp3'])
        ]
        if recent:
            recent.sort(key=os.path.getmtime, reverse=True)
            newest = recent[0]
            if os.path.getsize(newest) >= MIN_AUDIO_SIZE:
                return newest
    except Exception:
        pass

    return None

def try_download_audio(search_term):
    """
    Ultra-resilient multi-source audio downloader.
    Always includes candidates from BOTH YouTube and SoundCloud,
    so if YouTube blocks cloud/datacenter IPs, SoundCloud succeeds immediately.
    """
    flat_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'noplaylist': True,
        'ignoreerrors': True,
    }

    def fetch_urls(query, limit=3):
        urls = []
        try:
            with yt_dlp.YoutubeDL(flat_opts) as ydl:
                res = ydl.extract_info(query, download=False)
                entries = res.get('entries', []) if res else []
                for entry in entries[:limit]:
                    if not entry:
                        continue
                    u = entry.get('url') or entry.get('id')
                    if u:
                        if not str(u).startswith('http'):
                            u = f"https://www.youtube.com/watch?v={u}"
                        urls.append(u)
        except Exception as e:
            print(f"Search query error on {query}: {e}")
        return urls

    # Fetch 3 YouTube candidates
    yt_candidates = fetch_urls(f"ytsearch3:{search_term} audio", limit=3)
    # Always fetch 2 SoundCloud candidates for cloud servers
    sc_candidates = fetch_urls(f"scsearch2:{search_term}", limit=2)

    # Combine: try top YouTube candidate, then top SoundCloud candidate, then remaining
    candidates = []
    if yt_candidates:
        candidates.append(yt_candidates[0])
    if sc_candidates:
        candidates.append(sc_candidates[0])
    if len(yt_candidates) > 1:
        candidates.extend(yt_candidates[1:])
    if len(sc_candidates) > 1:
        candidates.extend(sc_candidates[1:])

    print(f"Found {len(candidates)} total interleaved candidates for '{search_term}'")

    for url in candidates:
        try:
            fp = _download_single_video(url)
            if fp:
                size_mb = os.path.getsize(fp) / 1024 / 1024
                print(f"✓ Download OK: {os.path.basename(fp)} ({size_mb:.1f}MB) from {url}")
                return fp
        except Exception as e:
            print(f"Candidate {url} failed: {e}")
            continue

    print(f"✗ All candidates failed for: {search_term}")
    return None

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def fetch_track_metadata(title, artist):
    """
    Looks up the authentic song album and 500x500 studio album cover art
    using music catalog APIs (Deezer + iTunes fallback).
    Robust against multi-artist strings, feat./ft., parentheses, and special chars.
    """
    # 1. Clean title and extract primary artist
    clean_title = re.sub(r'\(.*?\)|\[.*?\]', '', title).strip()
    clean_title = re.sub(r'#\d+', '', clean_title).strip() or title

    # Split artists by comma, slash, '&', or 'feat' and take the primary one
    artist_clean = (artist or '').replace('\xa0', ' ')
    artists = [a.strip() for a in re.split(r'[,&/]|\bfeat\.?\b|\bft\.?\b', artist_clean) if a.strip()]
    primary_artist = artists[0] if artists else artist_clean

    candidates = [
        f"{clean_title} {primary_artist}",
        f"{title} {primary_artist}",
        f"{clean_title}",
    ]

    # Try Deezer catalog first
    for q_str in candidates:
        try:
            q = urllib.parse.quote(q_str.strip())
            url = f"https://api.deezer.com/search?q={q}&limit=1"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                items = data.get('data', [])
                if items:
                    alb = items[0].get('album', {})
                    cover = alb.get('cover_big') or alb.get('cover_medium') or alb.get('cover')
                    if cover:
                        return {
                            'album': alb.get('title'),
                            'coverUrl': cover,
                            'artist': items[0].get('artist', {}).get('name') or primary_artist,
                        }
        except Exception:
            continue

    # Try iTunes Search API fallback (great coverage for brazilian and international releases)
    for q_str in [f"{clean_title} {primary_artist}", f"{clean_title}"]:
        try:
            q = urllib.parse.quote(q_str.strip())
            url = f"https://itunes.apple.com/search?term={q}&entity=song&country=BR&limit=1"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get('results', [])
                if results:
                    r = results[0]
                    art = (r.get('artworkUrl100') or '').replace('100x100bb', '600x600bb')
                    if art:
                        return {
                            'album': r.get('collectionName') or r.get('trackName'),
                            'coverUrl': art,
                            'artist': r.get('artistName') or primary_artist,
                        }
        except Exception:
            continue

    return {'album': None, 'coverUrl': None, 'artist': None}

def parse_spotify_url(url):
    """
    Extracts complete playlist, album, or track metadata directly from Spotify
    without requiring API keys or login.
    """
    clean_url = url.strip()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    }

    # Resolve shortened spotify links if any (e.g. spotify.link)
    if 'spotify.link' in clean_url:
        try:
            req = urllib.request.Request(clean_url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                clean_url = resp.geturl()
        except Exception:
            pass

    match = re.search(r'(playlist|album|track)[/:]([a-zA-Z0-9]+)', clean_url)
    if not match:
        raise ValueError("Link do Spotify inválido. Cole links como: https://open.spotify.com/playlist/...")

    entity_type = match.group(1)
    entity_id = match.group(2)

    if len(entity_id) < 18:
        raise ValueError(
            f"O link da playlist parece incompleto ({entity_id}). "
            "No Spotify, clique nos 3 pontinhos (...) > Compartilhar > Copiar Link da Playlist e cole o link completo aqui."
        )

    embed_url = f"https://open.spotify.com/embed/{entity_type}/{entity_id}"

    req = urllib.request.Request(embed_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise Exception("Playlist ou álbum não encontrado no Spotify. Verifique se o link foi copiado por completo e se a playlist está configurada como 'Pública'.")
        raise Exception(f"Erro ao acessar Spotify (código {e.code}). Verifique sua conexão e tente novamente.")

    match_data = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if not match_data:
        raise Exception("Não foi possível carregar a página da playlist. O link pode ser privado ou inválido.")

    try:
        data = json.loads(match_data.group(1))
    except Exception:
        raise Exception("Resposta inválida recebida do Spotify. Tente novamente.")

    props = data.get('props') if isinstance(data, dict) else {}
    page_props = (props.get('pageProps') or {}) if isinstance(props, dict) else {}

    # Check for error status or missing entity
    if page_props.get('status') in (404, 500) or 'Page not available' in page_props.get('title', ''):
        raise Exception("Esta playlist não foi encontrada no Spotify. Verifique se o link foi copiado por completo e se ela está pública.")

    state = page_props.get('state') if isinstance(page_props, dict) else {}
    s_data = state.get('data') if isinstance(state, dict) else {}
    entity = s_data.get('entity') if isinstance(s_data, dict) else None

    if not entity or not isinstance(entity, dict):
        raise Exception("Não foi possível ler as faixas desta playlist. Verifique se ela é pública no Spotify.")

    title = entity.get('name') or entity.get('title') or 'Playlist do Spotify'
    subtitle = entity.get('subtitle')
    if not subtitle:
        authors = entity.get('authors')
        if authors and isinstance(authors, list) and len(authors) > 0 and isinstance(authors[0], dict):
            subtitle = authors[0].get('name', 'Spotify')
        else:
            subtitle = 'Spotify'

    # Cover art safely extracted
    cover_images = []
    visual = entity.get('visualIdentity')
    if isinstance(visual, dict):
        img = visual.get('image')
        if isinstance(img, list):
            cover_images = img

    if not cover_images:
        ca = entity.get('coverArt')
        if isinstance(ca, dict):
            srcs = ca.get('sources')
            if isinstance(srcs, list):
                cover_images = srcs

    cover_url = None
    if cover_images and isinstance(cover_images[-1], dict):
        cover_url = cover_images[-1].get('url')

    raw_tracks = entity.get('trackList')
    if not isinstance(raw_tracks, list) or not raw_tracks:
        if entity_type == 'track':
            raw_tracks = [entity]
        else:
            raw_tracks = []

    tracks = []
    for idx, t in enumerate(raw_tracks):
        if not t or not isinstance(t, dict):
            continue
        t_title = t.get('title') or t.get('name') or f"Faixa {idx + 1}"
        t_artist = t.get('subtitle') or subtitle
        t_duration = round((t.get('duration') or 0) / 1000)
        
        audio_prev = t.get('audioPreview')
        t_preview = audio_prev.get('url') if isinstance(audio_prev, dict) else None

        tracks.append({
            'index': idx + 1,
            'id': t.get('uid') or t.get('uri') or f"sp_{idx}",
            'title': t_title,
            'artist': t_artist,
            'duration': t_duration,
            'previewUrl': t_preview,
            'coverUrl': cover_url,
            'album': title,
        })

    if not tracks:
        raise Exception("Nenhuma faixa pública foi encontrada nesta playlist.")

    # For playlists: enrich each track concurrently with its real studio album art and name
    if entity_type == 'playlist' and tracks:
        def enrich_item(item):
            meta = fetch_track_metadata(item['title'], item['artist'])
            if meta.get('coverUrl'):
                item['coverUrl'] = meta['coverUrl']
            if meta.get('album'):
                item['album'] = meta['album']
            return item

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            tracks = list(executor.map(enrich_item, tracks))

    return {
        'type': entity_type,
        'id': entity_id,
        'title': title,
        'subtitle': subtitle,
        'cover': cover_url,
        'total': len(tracks),
        'tracks': tracks,
    }

def search_music_catalog(query, limit=30):
    encoded_q = urllib.parse.quote(query)
    url = f"https://api.deezer.com/search?q={encoded_q}&limit={limit}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    results = []
    for idx, item in enumerate(data.get('data', [])):
        results.append({
            'index': idx + 1,
            'id': f"track_{item.get('id')}",
            'title': item.get('title'),
            'artist': item.get('artist', {}).get('name', 'Artista Desconhecido'),
            'album': item.get('album', {}).get('title', 'Álbum Desconhecido'),
            'duration': item.get('duration', 0),
            'coverUrl': item.get('album', {}).get('cover_big') or item.get('album', {}).get('cover_medium'),
            'previewUrl': item.get('preview'),
        })
    return results


def fetch_lyrics_from_lrclib(track, artist, duration=0):
    """
    Fetches synchronized LRC lyrics or plain text lyrics from LRCLIB API.
    Zero-cost, no API key required.
    """
    clean_track = re.sub(r'\(.*?\)|\[.*?\]', '', track).strip()
    clean_artist = artist.split(',')[0].split('&')[0].split('feat.')[0].strip()

    # 1. Try exact match
    params = {'track_name': clean_track, 'artist_name': clean_artist}
    if duration and duration > 0:
        params['duration'] = str(int(duration))

    try:
        url = f"https://lrclib.net/api/get?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'MarcosMusicApp/1.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('syncedLyrics') or data.get('plainLyrics') or data.get('instrumental'):
                return {
                    'syncedLyrics': data.get('syncedLyrics'),
                    'plainLyrics': data.get('plainLyrics'),
                    'instrumental': data.get('instrumental', False),
                    'trackName': data.get('trackName') or track,
                    'artistName': data.get('artistName') or artist,
                }
    except Exception:
        pass

    # 2. Try search endpoint
    try:
        search_query = f"{clean_track} {clean_artist}".strip()
        url = f"https://lrclib.net/api/search?{urllib.parse.urlencode({'q': search_query})}"
        req = urllib.request.Request(url, headers={'User-Agent': 'MarcosMusicApp/1.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            items = json.loads(resp.read().decode('utf-8'))
            if items and len(items) > 0:
                # Prefer one with syncedLyrics
                synced_item = next((it for it in items if it.get('syncedLyrics')), items[0])
                return {
                    'syncedLyrics': synced_item.get('syncedLyrics'),
                    'plainLyrics': synced_item.get('plainLyrics'),
                    'instrumental': synced_item.get('instrumental', False),
                    'trackName': synced_item.get('trackName') or track,
                    'artistName': synced_item.get('artistName') or artist,
                }
    except Exception:
        pass

    return {
        'syncedLyrics': None,
        'plainLyrics': None,
        'instrumental': False,
        'error': 'Letra não encontrada para esta música'
    }


class AudioRequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Content-Length', '0')
        self.send_header('Connection', 'close')
        self.end_headers()

    def do_HEAD(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Connection', 'close')
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        params = urllib.parse.parse_qs(parsed_path.query)

        # Root & Health check (for Cloud providers like Render and Uptime monitors)
        if path in ['/', '/health', '/api/ping', '/api/status']:
            self.send_json({'status': 'online', 'service': 'Marcos Music Cloud API', 'version': '1.0.0'})
            return

        # 0. Local Network IP Check
        if path == '/api/network-ip':
            ip = get_local_ip()
            self.send_json({'ip': ip, 'port': 5173, 'url': f'http://{ip}:5173'})
            return

        # 2. Universal Music Search: Search Songs, Artists or Albums by keyword
        if path == '/api/music/search':
            query = params.get('q', [''])[0].strip()
            limit = int(params.get('limit', ['30'])[0] or 30)
            if not query:
                self.send_json({'error': 'Param "q" is required'}, status=400)
                return

            try:
                # If query is a Spotify link, parse directly as playlist/album
                if 'spotify.com' in query:
                    data = parse_spotify_url(query)
                    self.send_json({'isPlaylist': True, **data})
                    return

                tracks = search_music_catalog(query, limit=limit)
                self.send_json({'isPlaylist': False, 'query': query, 'total': len(tracks), 'tracks': tracks})
            except Exception as e:
                print(f"Erro na busca de músicas ({query}): {e}")
                self.send_json({'error': str(e)}, status=500)
            return

        # 2.5 Real-Time Synchronized Lyrics API
        if path == '/api/lyrics':
            track = params.get('track', [''])[0].strip()
            artist = params.get('artist', [''])[0].strip()
            duration_raw = params.get('duration', ['0'])[0]
            try:
                duration = float(duration_raw) if duration_raw else 0
            except Exception:
                duration = 0

            if not track:
                self.send_json({'error': 'Param "track" is required'}, status=400)
                return

            try:
                data = fetch_lyrics_from_lrclib(track, artist, duration)
                self.send_json(data)
            except Exception as e:
                print(f"Erro ao buscar letras ({track} - {artist}): {e}")
                self.send_json({'error': str(e)}, status=500)
            return

        # 3. Spotify: Parse Playlist / Album / Track
        if path == '/api/spotify/playlist':
            spotify_url = params.get('url', [''])[0].strip()
            if not spotify_url:
                self.send_json({'error': 'Param "url" is required'}, status=400)
                return

            try:
                data = parse_spotify_url(spotify_url)
                self.send_json(data)
            except Exception as e:
                print(f"Erro ao obter playlist Spotify: {e}")
                self.send_json({'error': str(e)}, status=500)
            return

        # 3. Spotify: Download Track by Metadata (Title & Artist)
        if path == '/api/spotify/download-track':
            title = params.get('title', [''])[0].strip()
            artist = params.get('artist', [''])[0].strip()
            duration_hint = int(params.get('duration', ['0'])[0] or 0)

            if not title:
                self.send_json({'error': 'Param "title" is required'}, status=400)
                return

            try:
                clean_title = re.sub(r'[/\\?%*:|"<>#]', '', title)
                clean_artist = re.sub(r'[/\\?%*:|"<>#]', '', artist)
                search_term = f"{clean_title} {clean_artist}"

                filepath = try_download_audio(search_term)

                if not filepath:
                    raise Exception("Nenhum áudio encontrado para esta faixa. Tente pelo app desktop.")

                file_size = os.path.getsize(filepath)
                ext = os.path.splitext(filepath)[1].lower()
                content_type = 'audio/mp4' if ext == '.m4a' else 'audio/webm' if ext == '.webm' else 'audio/mpeg'

                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(file_size))
                self.send_header('Content-Disposition', f'attachment; filename="{clean_title}{ext}"')
                self.send_header('Connection', 'close')
                self.end_headers()

                with open(filepath, 'rb') as f:
                    while chunk := f.read(65536):
                        self.wfile.write(chunk)

                try:
                    os.remove(filepath)
                except Exception:
                    pass

            except Exception as e:
                print(f"Erro no download da faixa do Spotify ({title}): {e}")
                self.send_json({'error': str(e)}, status=500)
            return

        # 4. Image Proxy (Spotify album covers to bypass CORS)
        if path == '/api/spotify/thumbnail':
            thumb_url = params.get('url', [''])[0].strip()
            if not thumb_url:
                self.send_json({'error': 'Param "url" is required'}, status=400)
                return
            try:
                req = urllib.request.Request(
                    thumb_url,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                    content_type = resp.headers.get('Content-Type', 'image/jpeg')
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Length', str(len(data)))
                    self.send_header('Connection', 'close')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_json({'error': str(e)}, status=500)
                return

        # 5. Track Metadata Lookup (Original Album & 500x500 Cover Art)
        if path == '/api/music/track-meta':
            title = params.get('title', [''])[0].strip()
            artist = params.get('artist', [''])[0].strip()
            meta = fetch_track_metadata(title, artist)
            self.send_json(meta)
            return

        self.send_json({'error': 'Endpoint não encontrado'}, status=404)

def run():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, AudioRequestHandler)
    local_ip = get_local_ip()
    print(f"Servidor FurtadoMusic ativo em http://127.0.0.1:{PORT} e http://{local_ip}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado.")
        httpd.server_close()

if __name__ == '__main__':
    run()
