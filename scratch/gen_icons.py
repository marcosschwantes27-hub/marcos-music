from PIL import Image, ImageDraw
import os

def create_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (18, 18, 18, 255))
    draw = ImageDraw.Draw(img)
    
    # Outer circle: Spotify green
    margin = int(size * 0.1)
    draw.ellipse([margin, margin, size - margin, size - margin], fill=(30, 215, 96, 255))
    
    # Inner dark disc
    center_margin = int(size * 0.35)
    draw.ellipse([center_margin, center_margin, size - center_margin, size - center_margin], fill=(18, 18, 18, 255))
    
    # Center green dot
    dot_margin = int(size * 0.44)
    draw.ellipse([dot_margin, dot_margin, size - dot_margin, size - dot_margin], fill=(30, 215, 96, 255))
    
    # Soundwaves / curved lines
    w = max(2, int(size * 0.035))
    draw.arc([int(size * 0.2), int(size * 0.2), int(size * 0.8), int(size * 0.8)], start=210, end=330, fill=(18, 18, 18, 255), width=w)
    draw.arc([int(size * 0.27), int(size * 0.27), int(size * 0.73), int(size * 0.73)], start=210, end=330, fill=(18, 18, 18, 255), width=w)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG')
    print(f"Ícone gerado: {output_path} ({size}x{size})")

if __name__ == '__main__':
    create_icon(192, "public/icon-192.png")
    create_icon(512, "public/icon-512.png")
