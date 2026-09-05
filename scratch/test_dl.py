import sys
import yt_dlp
import os

# Set UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

def test_download():
    video_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw" # "Me at the zoo" (19 seconds)
    out_tmpl = os.path.join("scratch", "%(id)s.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': out_tmpl,
        'noplaylist': True,
        'quiet': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        filename = ydl.prepare_filename(info)
        print(f"Sucesso! Arquivo baixado: {filename}")
        print(f"Título: {info.get('title')}, Duração: {info.get('duration')}")
        print(f"Tamanho: {os.path.getsize(filename)} bytes")

if __name__ == '__main__':
    test_download()
