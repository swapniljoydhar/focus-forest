from PIL import Image, ImageDraw
from pathlib import Path

out = Path('/home/ubuntu/focus-forest/icons')
out.mkdir(exist_ok=True)
for size in (16, 32, 48, 128):
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    s = size / 128
    draw.ellipse((8*s, 8*s, 120*s, 120*s), fill=(239, 244, 230, 255))
    draw.ellipse((49*s, 70*s, 77*s, 108*s), fill=(73, 111, 73, 255))
    draw.rounded_rectangle((62*s, 31*s, 68*s, 81*s), radius=max(1, int(3*s)), fill=(103, 145, 96, 255))
    draw.ellipse((36*s, 36*s, 69*s, 58*s), fill=(125, 165, 112, 255))
    draw.ellipse((62*s, 23*s, 94*s, 46*s), fill=(104, 151, 96, 255))
    image.save(out / f'icon-{size}.png')
