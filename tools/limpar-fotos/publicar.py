"""
Converte as fotos aprovadas de processadas/ para a galeria do site.

WebP com qualidade 82 e no máximo LARGURA px de largura. A galeria mostra
cada foto com ~350px de largura; 720px cobre telas de densidade 2x sem
pesar. Foto mais estreita que isso fica como está (nunca aumenta).

Uso:  .venv/bin/python publicar.py
Imprime o width/height de cada arquivo para as tags <img> do index.html.
"""

from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
DESTINO = AQUI.parent.parent / "images" / "galeria"
LARGURA = 720
QUALIDADE = 82

# processadas/<base>.png → images/galeria/<nome>.webp, na ordem da galeria
APROVADAS = [
    ("coqueirinho", "coqueirinho"),
    ("dijarda", "dijarda"),
    ("jacare", "jacare"),
    ("jacarpe", "jacarpe"),
    ("janeiro", "janeiro"),
    ("lcuky", "foto-impressa"),
    ("voeli", "voeli"),
    ("WhatsApp Image 2026-09-28 at 22.27.06", "whatsapp-2026-09-28-22-27-06"),
    ("WhatsApp Image 2026-09-28 at 22.27.07", "whatsapp-2026-09-28-22-27-07"),
]


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    total = 0
    for base, nome in APROVADAS:
        img = Image.open(AQUI / "processadas" / f"{base}.png").convert("RGB")
        if img.width > LARGURA:
            altura = round(img.height * LARGURA / img.width)
            img = img.resize((LARGURA, altura), Image.LANCZOS)
        saida = DESTINO / f"{nome}.webp"
        img.save(saida, "WEBP", quality=QUALIDADE, method=6)
        kb = saida.stat().st_size / 1024
        total += kb
        print(f"{saida.name:40s} {img.width}x{img.height}  {kb:6.1f} KB")
    print(f"Total: {total:.0f} KB")


if __name__ == "__main__":
    main()
