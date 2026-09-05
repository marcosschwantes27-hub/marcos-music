import sys
import yt_dlp

def test_search():
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'extract_flat': True, # Fast search without downloading
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info("ytsearch3:lofi hip hop radio", download=False)
        for entry in info.get('entries', []):
            print("Encontrado:", entry.get('title'), "| ID:", entry.get('id'), "| Duração:", entry.get('duration'))

if __name__ == '__main__':
    test_search()
