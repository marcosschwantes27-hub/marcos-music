import urllib.request
import re
import json

url = "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M"
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    data = json.loads(match.group(1))
    entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
    print("Entity keys:", list(entity.keys()))
    print("Playlist cover:", entity.get('visualIdentity', {}))
    tracks = entity.get('trackList', [])
    if tracks:
        print("First track keys:", list(tracks[0].keys()))
        print("First track dump:", json.dumps(tracks[0], indent=2))
