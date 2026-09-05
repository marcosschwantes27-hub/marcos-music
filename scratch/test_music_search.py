import urllib.request
import urllib.parse
import json

def search_tracks(query, limit=20):
    encoded_q = urllib.parse.quote(query)
    url = f"https://api.deezer.com/search?q={encoded_q}&limit={limit}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        
    results = []
    for idx, item in enumerate(data.get('data', [])):
        results.append({
            'index': idx + 1,
            'id': f"dz_{item.get('id')}",
            'title': item.get('title'),
            'artist': item.get('artist', {}).get('name', 'Artista Desconhecido'),
            'album': item.get('album', {}).get('title', 'Álbum Desconhecido'),
            'duration': item.get('duration', 0),
            'coverUrl': item.get('album', {}).get('cover_big') or item.get('album', {}).get('cover_medium'),
            'previewUrl': item.get('preview'),
        })
    return results

if __name__ == '__main__':
    for term in ['Matuê', 'Bohemian Rhapsody Queen', 'Henrique e Juliano']:
        res = search_tracks(term, limit=3)
        print(f"\n--- Busca por '{term}': {len(res)} resultados ---")
        for r in res:
            print(f"- {r['title']} | Artista: {r['artist']} | Álbum: {r['album']} | Duração: {r['duration']}s")
