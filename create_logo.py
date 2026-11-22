import math
from PIL import Image, ImageDraw, ImageFilter

def create_robo_island_logo():
    # Super-sampled canvas for ultra-sharp anti-aliased rendering
    SIZE = 1024
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    
    # 1. Background Ambient Glow Aura
    glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Large soft radial glow
    for r in range(480, 200, -20):
        alpha = int(45 * (1 - (r - 200) / 280))
        glow_draw.ellipse(
            [SIZE//2 - r, SIZE//2 - r * 0.7, SIZE//2 + r, SIZE//2 + r * 0.7],
            fill=(0, 240, 255, alpha)
        )
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img, glow)
    
    draw = ImageDraw.Draw(img)
    
    # 2. Main Capsule (Dynamic Island Pill) Geometry
    # Pill center and dimensions
    pill_w = 840
    pill_h = 440
    px0 = (SIZE - pill_w) // 2
    py0 = (SIZE - pill_h) // 2
    px1 = px0 + pill_w
    py1 = py0 + pill_h
    pill_radius = pill_h // 2
    
    # Drop shadow
    shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle([px0, py0 + 35, px1, py1 + 45], radius=pill_radius, fill=(0, 0, 0, 200))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)
    
    # 3. Outer Neon Border Gradient
    for i in range(12, 0, -1):
        alpha = int(180 * (1 - i / 12))
        draw.rounded_rectangle(
            [px0 - i, py0 - i, px1 + i, py1 + i],
            radius=pill_radius + i,
            outline=(0, 240, 255, alpha),
            width=2
        )
    
    # 4. Pill Body (Deep OLED Titanium / Glass)
    pill_body = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pill_draw = ImageDraw.Draw(pill_body)
    
    # Gradient fill from top to bottom
    for y in range(py0, py1):
        progress = (y - py0) / pill_h
        # Dark metallic gradient: (16, 20, 28) to (8, 10, 14)
        r = int(18 - progress * 10)
        g = int(24 - progress * 14)
        b = int(36 - progress * 22)
        pill_draw.line([(px0, y), (px1, y)], fill=(r, g, b, 255))
        
    # Mask to rounded rectangle
    mask = Image.new('L', (SIZE, SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([px0, py0, px1, py1], radius=pill_radius, fill=255)
    img.paste(pill_body, (0, 0), mask)
    draw = ImageDraw.Draw(img)
    
    # 5. Inner Rim Light (Glass bevel highlight)
    draw.rounded_rectangle(
        [px0 + 2, py0 + 2, px1 - 2, py1 - 2],
        radius=pill_radius - 2,
        outline=(255, 255, 255, 40),
        width=3
    )
    # Top highlight sheen
    draw.arc(
        [px0 + 6, py0 + 6, px1 - 6, py0 + pill_h - 6],
        start=190, end=350,
        fill=(0, 240, 255, 140),
        width=4
    )
    
    # 6. Robo Eyes (The Character)
    eye_w = 120
    eye_h = 160
    eye_radius = 48
    spacing = 110
    
    left_x0 = SIZE // 2 - spacing // 2 - eye_w
    left_y0 = SIZE // 2 - eye_h // 2 - 10
    left_x1 = left_x0 + eye_w
    left_y1 = left_y0 + eye_h
    
    right_x0 = SIZE // 2 + spacing // 2
    right_y0 = left_y0
    right_x1 = right_x0 + eye_w
    right_y1 = left_y1
    
    eyes = [(left_x0, left_y0, left_x1, left_y1), (right_x0, right_y0, right_x1, right_y1)]
    
    # Eye Glow Layer
    eye_glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    eg_draw = ImageDraw.Draw(eye_glow)
    for ex0, ey0, ex1, ey1 in eyes:
        for expand in range(25, 0, -2):
            alpha = int(120 * (1 - expand / 25))
            eg_draw.rounded_rectangle(
                [ex0 - expand, ey0 - expand, ex1 + expand, ey1 + expand],
                radius=eye_radius + expand,
                fill=(0, 240, 255, alpha)
            )
    eye_glow = eye_glow.filter(ImageFilter.GaussianBlur(15))
    img = Image.alpha_composite(img, eye_glow)
    draw = ImageDraw.Draw(img)
    
    # Draw Eyes
    for ex0, ey0, ex1, ey1 in eyes:
        # Base cyan fill
        draw.rounded_rectangle([ex0, ey0, ex1, ey1], radius=eye_radius, fill=(0, 240, 255, 255))
        
        # Subtle inner gradient / glow
        draw.rounded_rectangle([ex0 + 4, ey0 + 4, ex1 - 4, ey1 - 4], radius=eye_radius - 4, fill=(30, 245, 255, 255))
        
        # Upper gloss reflection (pill glint)
        draw.ellipse([ex0 + 20, ey0 + 18, ex0 + 52, ey0 + 50], fill=(255, 255, 255, 240))
        draw.ellipse([ex0 + 42, ey0 + 44, ex0 + 58, ey0 + 60], fill=(255, 255, 255, 160))
    
    # 7. Soundwave / Notch Accent at Bottom of Island
    wave_y = py1 - 50
    wave_cx = SIZE // 2
    bar_heights = [14, 28, 45, 60, 45, 28, 14]
    bar_w = 12
    bar_gap = 14
    total_w = len(bar_heights) * bar_w + (len(bar_heights) - 1) * bar_gap
    start_bx = wave_cx - total_w // 2
    
    for i, bh in enumerate(bar_heights):
        bx = start_bx + i * (bar_w + bar_gap)
        draw.rounded_rectangle(
            [bx, wave_y - bh // 2, bx + bar_w, wave_y + bh // 2],
            radius=6,
            fill=(0, 240, 255, 190)
        )
        
    # Resize to standard icon sizes with high-quality Lanczos resampling
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    img_128 = img.resize((128, 128), Image.Resampling.LANCZOS)
    img_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    img_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
    img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    img_16 = img.resize((16, 16), Image.Resampling.LANCZOS)
    
    # Save files
    out_dir = r"C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows"
    img_512.save(f"{out_dir}\\logo.png", "PNG")
    img_256.save(f"{out_dir}\\icon.png", "PNG")
    
    # Multi-resolution ICO for Windows
    img_512.save(
        f"{out_dir}\\icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    print("Logo and multi-resolution ICO generated successfully!")

if __name__ == "__main__":
    create_robo_island_logo()
