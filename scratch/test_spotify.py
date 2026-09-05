import urllib.request
import re
import json

def test_spotify():
    url = "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            
            # Check for __NEXT_DATA__ or resource data
            match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
            if match:
                data = json.loads(match.group(1))
                print("Encontrou __NEXT_DATA__!")
                entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                print("Playlist:", entity.get('name'))
                tracklist = entity.get('trackList', [])
                print(f"Total de faixas: {len(tracklist)}")
                for t in tracklist[:5]:
                    title = t.get('title')
                    subtitle = t.get('subtitle') # Usually artist
                    duration = t.get('duration')
                    print(f"- {title} por {subtitle} ({duration}ms)")
            else:
                # Check for session data or script json
                scripts = re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html)
                print(f"Scripts JSON encontrados: {len(scripts)}")
                for i, s in enumerate(scripts):
                    try:
                        d = json.loads(s)
                        print(f"Script {i}:", list(d.keys())[:5])
                    except Exception:
                        pass
    except Exception as e:
        print("Erro:", e)

if __name__ == '__main__':
    test_spotify()
