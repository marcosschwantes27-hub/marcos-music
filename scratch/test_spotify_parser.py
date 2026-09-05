import urllib.request
import re
import json

def parse_spotify_url(url):
    # Extract type and id from URL
    match = re.search(r'(playlist|album|track)[/:]([a-zA-Z0-9]+)', url)
    if not match:
        raise ValueError("URL do Spotify inválida. Use links no formato https://open.spotify.com/playlist/...")
    
    entity_type = match.group(1)
    entity_id = match.group(2)
    embed_url = f"https://open.spotify.com/embed/{entity_type}/{entity_id}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(embed_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
    
    match_data = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if not match_data:
        raise Exception("Não foi possível extrair dados da página do Spotify.")
    
    data = json.loads(match_data.group(1))
    entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
    
    title = entity.get('name') or entity.get('title') or 'Playlist do Spotify'
    subtitle = entity.get('subtitle') or entity.get('authors', [{}])[0].get('name', 'Spotify')
    
    # Extract cover art image
    cover_images = entity.get('visualIdentity', {}).get('image', []) or entity.get('coverArt', {}).get('sources', [])
    cover_url = cover_images[-1].get('url') if cover_images else None
    
    tracks = []
    raw_tracks = entity.get('trackList', [])
    # If single track
    if not raw_tracks and entity_type == 'track':
        raw_tracks = [entity]
        
    for idx, t in enumerate(raw_tracks):
        t_title = t.get('title') or t.get('name')
        t_artist = t.get('subtitle') or subtitle
        t_duration = round((t.get('duration') or 0) / 1000)
        t_preview = t.get('audioPreview', {}).get('url')
        t_uri = t.get('uri') or f"spotify:track:{idx}"
        
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
        
    return {
        'type': entity_type,
        'id': entity_id,
        'title': title,
        'subtitle': subtitle,
        'cover': cover_url,
        'total': len(tracks),
        'tracks': tracks
    }

if __name__ == '__main__':
    res = parse_spotify_url("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
    print("Sucesso! Nome:", res['title'], "| Faixas:", res['total'])
    print("Primeira faixa:", res['tracks'][0])
