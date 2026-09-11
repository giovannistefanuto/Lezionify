"""
Script per convertire qualsiasi immagine (PNG/JPG) generata da AI
nelle icone ufficiali di Lezionify (resources/icon.png e resources/icon.ico).
"""
import sys
import os
from PIL import Image

def convert_to_app_icon(input_image_path):
    if not os.path.exists(input_image_path):
        print(f"Errore: File non trovato: {input_image_path}")
        sys.exit(1)
        
    img = Image.open(input_image_path).convert("RGBA")
    
    # Crop centrale quadrato se non e' esattamente 1:1
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    img = img.crop((left, top, right, bottom))
    w, h = img.size

    # Se le 4 estremita' esterne sono nere (tipico delle immagini generate da AI con squircle),
    # creiamo una maschera trasparente per gli angoli esterni per una resa nativa Windows 11
    corners = [img.getpixel((0, 0)), img.getpixel((w - 1, 0)), img.getpixel((0, h - 1)), img.getpixel((w - 1, h - 1))]
    corners_are_black = all(c[0] < 5 and c[1] < 5 and c[2] < 5 for c in corners)

    if corners_are_black:
        import numpy as np
        from PIL import ImageFilter
        arr = np.array(img)
        gray = np.maximum(np.maximum(arr[:, :, 0], arr[:, :, 1]), arr[:, :, 2])
        # Angoli neri esterni diventano trasparenti
        alpha_mask = np.where(gray > 3, 255, 0).astype(np.uint8)
        alpha_img = Image.fromarray(alpha_mask)
        alpha_smooth = alpha_img.filter(ImageFilter.GaussianBlur(1.2))
        img.putalpha(alpha_smooth)
        print("[INFO] Applicata maschera trasparente per gli angoli esterni dello squircle.")
    
    res_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "resources")
    os.makedirs(res_dir, exist_ok=True)
    
    # 1. Salva PNG a 512x512
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    png_path = os.path.join(res_dir, "icon.png")
    img_512.save(png_path, format="PNG")
    print(f"[OK] Salvato PNG ad alta risoluzione: {png_path}")
    
    # 2. Salva ICO multi-risoluzione per Windows (da 16x16 fino a 256x256)
    ico_path = os.path.join(res_dir, "icon.ico")
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img_512.save(ico_path, format="ICO", sizes=icon_sizes)
    print(f"[OK] Salvato Windows ICO multi-risoluzione: {ico_path}")
    print("Operazione completata con successo! Le icone dell'app sono state aggiornate.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python tools/convert_icon.py <percorso-immagine>")
        sys.exit(1)
    convert_to_app_icon(sys.argv[1])
