"""
Converte as fotos aprovadas de processadas/ para a galeria do site.

WebP com qualidade 82 e no máximo LARGURA px de largura. A galeria mostra
cada foto com ~350px de largura; 720px cobre telas de densidade 2x sem
pesar. Foto mais estreita que isso fica como está (nunca aumenta).

Uso:  .venv/bin/python publicar.py
Imprime o width/height de cada arquivo para as tags <img> do index.html.
"""

from pathlib import Path

from PIL import Image, ImageOps

AQUI = Path(__file__).resolve().parent
DESTINO = AQUI.parent.parent / "images" / "galeria"
LARGURA = 720
QUALIDADE = 82

# origem (relativa a esta pasta) → images/galeria/<nome>.webp, na ordem da
# galeria. Lote 1: prints do Instagram, limpos por limpar.py (processadas/).
# Lote 2: fotos de câmera sem interface nem texto sobreposto, que vão direto
# do zip (entrada/lote2/) — passar OCR nelas apagaria estampas e placas.
LOTE2 = "entrada/lote2/WhatsApp Image 2026-09-28 at "
APROVADAS = [
    ("processadas/coqueirinho.png", "coqueirinho"),
    ("processadas/dijarda.png", "dijarda"),
    ("processadas/jacare.png", "jacare"),
    ("processadas/jacarpe.png", "jacarpe"),
    ("processadas/janeiro.png", "janeiro"),
    ("processadas/lcuky.png", "foto-impressa"),
    ("processadas/voeli.png", "voeli"),
    ("processadas/WhatsApp Image 2026-09-28 at 22.27.06.png", "whatsapp-2026-09-28-22-27-06"),
    ("processadas/WhatsApp Image 2026-09-28 at 22.27.07.png", "whatsapp-2026-09-28-22-27-07"),
    (LOTE2 + "23.09.03 (1).jpeg", "whatsapp-2026-09-28-23-09-03-1"),
    (LOTE2 + "23.09.03.jpeg", "whatsapp-2026-09-28-23-09-03"),
    (LOTE2 + "23.09.04.jpeg", "whatsapp-2026-09-28-23-09-04"),
    (LOTE2 + "23.09.05.jpeg", "whatsapp-2026-09-28-23-09-05"),
    (LOTE2 + "23.09.06 (1).jpeg", "whatsapp-2026-09-28-23-09-06-1"),
    (LOTE2 + "23.09.06 (2).jpeg", "whatsapp-2026-09-28-23-09-06-2"),
    (LOTE2 + "23.09.06.jpeg", "whatsapp-2026-09-28-23-09-06"),
    (LOTE2 + "23.09.07.jpeg", "whatsapp-2026-09-28-23-09-07"),
    (LOTE2 + "23.09.08 (1).jpeg", "whatsapp-2026-09-28-23-09-08-1"),
    (LOTE2 + "23.09.08 (2).jpeg", "whatsapp-2026-09-28-23-09-08-2"),
    (LOTE2 + "23.09.08 (3).jpeg", "whatsapp-2026-09-28-23-09-08-3"),
    (LOTE2 + "23.09.08.jpeg", "whatsapp-2026-09-28-23-09-08"),
    (LOTE2 + "23.09.09 (1).jpeg", "whatsapp-2026-09-28-23-09-09-1"),
    (LOTE2 + "23.09.09 (2).jpeg", "whatsapp-2026-09-28-23-09-09-2"),
    (LOTE2 + "23.09.09 (3).jpeg", "whatsapp-2026-09-28-23-09-09-3"),
    (LOTE2 + "23.09.09.jpeg", "whatsapp-2026-09-28-23-09-09"),
]


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    total = 0
    for origem, nome in APROVADAS:
        # exif_transpose: foto de celular pode vir deitada com a rotação só no EXIF
        img = ImageOps.exif_transpose(Image.open(AQUI / origem)).convert("RGB")
        if img.width > LARGURA:
            altura = round(img.height * LARGURA / img.width)
            img = img.resize((LARGURA, altura), Image.LANCZOS)
        saida = DESTINO / f"{nome}.webp"
        img.save(saida, "WEBP", quality=QUALIDADE, method=6)
        kb = saida.stat().st_size / 1024
        total += kb
        formato = "deitada" if img.width > img.height else ""
        print(f"{saida.name:40s} {img.width}x{img.height}  {kb:6.1f} KB  {formato}")
    print(f"Total: {total:.0f} KB")


if __name__ == "__main__":
    main()
