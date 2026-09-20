from PIL import Image
import os

out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src-tauri', 'icons')
os.makedirs(out_dir, exist_ok=True)

img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
for y in range(256):
    for x in range(256):
        dx = x - 128
        dy = y - 128
        dist = (dx * dx + dy * dy) ** 0.5
        r = 20 + int(200 * (x / 255))
        g = 80 + int(130 * (1 - y / 255))
        b = 140 + int(60 * (1 - dist / 180))
        if dist < 110:
            r = 255
            g = 180
            b = 80
        img.putpixel((x, y), (min(255, max(0, r)), min(255, max(0, g)), min(255, max(0, b)), 255))

png_path = os.path.join(out_dir, 'icon.png')
ico_path = os.path.join(out_dir, 'icon.ico')
img.save(png_path)
img.save(ico_path, format='ICO')

print(f'Created {png_path}')
print(f'Created {ico_path}')
