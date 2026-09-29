"""
Limpa os prints do Instagram antes de irem para a galeria do site.

Etapas, foto por foto:
  A. Recorte: tira pela borda os elementos de interface (contador do
     carrossel "1/2", ícones redondos de marcação/som, faixas lisas de
     print) sempre que isso custar no máximo ~10% da largura ou da altura.
  B. Texto sobreposto: OCR (EasyOCR) gera uma máscara, dilatada para cobrir
     contorno e sombra das letras, e o LaMa preenche. O que da interface
     não saiu no recorte entra nessa mesma máscara.
  C. Marcação: "REVISAR COM ATENÇÃO" se a máscara passa de 5% da área,
     se encosta num rosto, ou se há anotação manual de texto não detectado.
  D. Revisão: revisao.html com original, máscara e resultado lado a lado.

Nada de "melhoria": sem upscale, nitidez ou suavização. Os originais são
copiados para originais/ e nunca são alterados.

Uso:
  .venv/bin/python limpar.py            # processa todas as fotos de ORIGEM
  .venv/bin/python limpar.py voeli      # só as fotos cujo nome contém "voeli"

Ajustes por foto ficam em ajustes.json (veja o README).
"""

import json
import re
import shutil
import sys
import urllib.request
from datetime import datetime
from html import escape
from pathlib import Path

import cv2
import numpy as np

AQUI = Path(__file__).resolve().parent
ORIGEM = AQUI.parent.parent / "images"
ORIGINAIS = AQUI / "originais"
PROCESSADAS = AQUI / "processadas"
MASCARAS = AQUI / "mascaras"
MASCARAS_MANUAIS = AQUI / "mascaras-manuais"
MODELOS = AQUI / "modelos"
AJUSTES = AQUI / "ajustes.json"

# Fotos da galeria nova. Os demais arquivos de images/ (capa, monograma,
# emblema) não são prints e não passam por aqui.
FOTOS = [
    "WhatsApp Image 2026-09-28 at 22.27.06.jpeg",
    "WhatsApp Image 2026-09-28 at 22.27.07.jpeg",
    "coqueirinho.jpeg",
    "dijarda.jpeg",
    "jacare.jpeg",
    "jacarpe.jpeg",
    "janeiro.jpeg",
    "lcuky",
    "voeli.jpeg",
]

LIMITE_RECORTE = 0.10   # fração máxima da largura/altura que o recorte pode tirar
LIMITE_MASCARA = 0.05   # acima disso a foto vai para revisão
CONFIANCA_OCR = 0.30

URL_YUNET = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)


def carregar_ajustes():
    if AJUSTES.exists():
        return json.loads(AJUSTES.read_text(encoding="utf-8"))
    return {}


def copiar_originais():
    ORIGINAIS.mkdir(exist_ok=True)
    for nome in FOTOS:
        destino = ORIGINAIS / nome
        if not destino.exists():
            shutil.copy2(ORIGEM / nome, destino)


def nome_base(nome):
    return Path(nome).stem if Path(nome).suffix else nome


# ─────────────── Etapa A: interface do Instagram ───────────────

def faixas_lisas(img):
    """Faixas uniformes (pretas/brancas de print) coladas nas bordas."""
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    h, w = cinza.shape
    cortes = {"topo": 0, "base": 0, "esquerda": 0, "direita": 0}

    def lisa(linha):
        return linha.std() < 4 and (linha.mean() < 25 or linha.mean() > 235)

    for lado, tamanho, pegar in [
        ("topo", h, lambda i: cinza[i, :]),
        ("base", h, lambda i: cinza[h - 1 - i, :]),
        ("esquerda", w, lambda i: cinza[:, i]),
        ("direita", w, lambda i: cinza[:, w - 1 - i]),
    ]:
        i = 0
        while i < tamanho * LIMITE_RECORTE and lisa(pegar(i)):
            i += 1
        cortes[lado] = i
    return cortes


def cantos_arredondados(img):
    """Cantos pretos da moldura arredondada do print. Mede quantos pixels
    da diagonal, a partir de cada canto, são pretos: de 2 a 10 é moldura
    (um canto escuro da própria foto passa disso e fica). Devolve o quanto
    cortar em cada borda para tirar o arco inteiro."""
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = cinza.shape
    cortes = {"topo": 0, "base": 0, "esquerda": 0, "direita": 0}
    for vert, horiz in [("topo", "esquerda"), ("topo", "direita"), ("base", "esquerda"), ("base", "direita")]:
        k = 0
        while k < 12:
            y = k if vert == "topo" else h - 1 - k
            x = k if horiz == "esquerda" else w - 1 - k
            if cinza[y, x] >= 30:
                break
            k += 1
        if 2 <= k <= 10:
            # a diagonal escura mede r·(1 − 1/√2) num arco de raio r
            raio = int(np.ceil(k / (1 - 2 ** -0.5))) + 2
            cortes[vert] = max(cortes[vert], raio)
            cortes[horiz] = max(cortes[horiz], raio)
    return cortes


def icones_redondos(img):
    """Ícones de marcação/som: círculo escuro translúcido com desenho branco,
    nos cantos de baixo. Devolve caixas (x0, y0, x1, y1) já com folga."""
    h, w = img.shape[:2]
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    achados = []
    lado = int(w * 0.16)
    altura = int(h * 0.12)
    for x0 in (0, w - lado):
        y0 = h - altura
        zona = cinza[y0:h, x0:x0 + lado]
        circulos = cv2.HoughCircles(
            cv2.medianBlur(zona, 5), cv2.HOUGH_GRADIENT, dp=1.2,
            minDist=w * 0.05, param1=80, param2=22,
            minRadius=int(w * 0.018), maxRadius=int(w * 0.045),
        )
        if circulos is None:
            continue
        for cx, cy, r in circulos[0]:
            cx, cy, r = int(cx), int(cy), int(r)
            disco = np.zeros_like(zona)
            cv2.circle(disco, (cx, cy), int(r * 0.9), 255, -1)
            anel = np.zeros_like(zona)
            cv2.circle(anel, (cx, cy), int(r * 1.6), 255, -1)
            cv2.circle(anel, (cx, cy), int(r * 1.1), 0, -1)
            dentro = zona[disco > 0]
            fora = zona[anel > 0]
            if dentro.size == 0 or fora.size == 0:
                continue
            fundo_escuro = np.percentile(dentro, 50) < fora.mean() - 25
            desenho_branco = (dentro > 215).mean() > 0.06
            if fundo_escuro and desenho_branco:
                folga = int(r * 1.35)
                achados.append((
                    max(0, x0 + cx - folga), max(0, y0 + cy - folga),
                    min(w, x0 + cx + folga), min(h, y0 + cy + folga),
                ))
    return achados


def contadores_carrossel(textos, w, h):
    """Textos do OCR no formato "n/n" perto de um canto de cima."""
    achados = []
    for caixa, texto, _ in textos:
        limpo = texto.replace(" ", "")
        if not re.fullmatch(r"\d{1,2}[/|l]\d{1,2}", limpo):
            continue
        xs = [p[0] for p in caixa]
        ys = [p[1] for p in caixa]
        if max(ys) < h * 0.12 and (min(xs) > w * 0.75 or max(xs) < w * 0.25):
            # a pílula escura em volta do número é bem maior que o texto
            folga_x = (max(xs) - min(xs)) * 0.8
            folga_y = (max(ys) - min(ys)) * 0.9
            achados.append((
                int(max(0, min(xs) - folga_x)), int(max(0, min(ys) - folga_y)),
                int(min(w, max(xs) + folga_x)), int(min(h, max(ys) + folga_y)),
            ))
    return achados


def planejar_recorte(elementos, w, h, faixas):
    """Para cada elemento de interface, vê se sai tirando uma borda sem passar
    de LIMITE_RECORTE por eixo. O que não couber vai para o inpainting."""
    corte = dict(faixas)
    sobra = []
    # elementos mais perto da borda primeiro: custam menos para recortar
    candidatos = []
    for (x0, y0, x1, y1) in elementos:
        opcoes = [("topo", y1), ("base", h - y0), ("esquerda", x1), ("direita", w - x0)]
        lado, custo = min(opcoes, key=lambda o: o[1])
        candidatos.append((custo, lado, (x0, y0, x1, y1)))
    for custo, lado, caixa in sorted(candidatos):
        eixo_total = h if lado in ("topo", "base") else w
        oposto = {"topo": "base", "base": "topo", "esquerda": "direita", "direita": "esquerda"}[lado]
        novo = max(corte[lado], custo)
        if novo + corte[oposto] <= eixo_total * LIMITE_RECORTE:
            corte[lado] = novo
        else:
            sobra.append(caixa)
    return corte, sobra


# ─────────────── Etapa B: texto ───────────────

_leitor = None


def ler_texto(img):
    global _leitor
    if _leitor is None:
        import easyocr
        _leitor = easyocr.Reader(["pt", "en"], gpu=False, verbose=False,
                                 model_storage_directory=str(MODELOS / "easyocr"))
    return [t for t in _leitor.readtext(img) if t[2] >= CONFIANCA_OCR]


def dentro_de(caixa_texto, regioes):
    xs = [p[0] for p in caixa_texto]
    ys = [p[1] for p in caixa_texto]
    cx, cy = sum(xs) / 4, sum(ys) / 4
    return any(x0 <= cx <= x1 and y0 <= cy <= y1 for (x0, y0, x1, y1) in regioes)


_lama = None


def preencher(img, mascara):
    global _lama
    if _lama is None:
        from simple_lama_inpainting import SimpleLama
        _lama = SimpleLama()
    from PIL import Image
    rgb = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    resultado = _lama(rgb, Image.fromarray(mascara).convert("L"))
    saida = cv2.cvtColor(np.array(resultado), cv2.COLOR_RGB2BGR)
    # o LaMa arredonda o tamanho para múltiplo de 8
    return saida[: img.shape[0], : img.shape[1]]


# ─────────────── Etapa C: rostos ───────────────

_rostos = None


def detectar_rostos(img):
    global _rostos
    modelo = MODELOS / "face_detection_yunet_2023mar.onnx"
    if not modelo.exists():
        MODELOS.mkdir(exist_ok=True)
        urllib.request.urlretrieve(URL_YUNET, modelo)
    h, w = img.shape[:2]
    if _rostos is None:
        _rostos = cv2.FaceDetectorYN.create(str(modelo), "", (w, h), 0.6)
    _rostos.setInputSize((w, h))
    _, faces = _rostos.detect(img)
    caixas = []
    for f in (faces if faces is not None else []):
        x, y, fw, fh = [int(v) for v in f[:4]]
        # folga: a máscara não pode encostar nem no contorno do rosto
        mx, my = int(fw * 0.15), int(fh * 0.2)
        caixas.append((max(0, x - mx), max(0, y - my), min(w, x + fw + mx), min(h, y + fh + my)))
    return caixas


# ─────────────── Processamento de uma foto ───────────────

def processar(nome, ajustes):
    base = nome_base(nome)
    aj = ajustes.get(base, {})
    log = []
    img = cv2.imread(str(ORIGINAIS / nome))
    h, w = img.shape[:2]
    log.append(f"Original {w}×{h}.")

    # --- A. interface ---
    textos = ler_texto(img)
    faixas = faixas_lisas(img)
    icones = icones_redondos(img)
    contadores = contadores_carrossel(textos, w, h)
    for c in contadores:
        log.append(f"Contador do carrossel detectado pelo OCR em {c}.")
    for c in icones:
        log.append(f"Ícone redondo da interface detectado em {c}.")
    for lado, px in faixas.items():
        if px:
            log.append(f"Faixa lisa de {px}px na borda {lado}.")
    # Os cantos são medidos já sem as faixas retas: senão uma faixa preta
    # no topo pareceria o arco de um canto arredondado.
    sem_faixas = img[faixas["topo"]:h - faixas["base"], faixas["esquerda"]:w - faixas["direita"]]
    cantos = cantos_arredondados(sem_faixas)
    if any(cantos.values()):
        log.append("Cantos arredondados do print: " +
                   ", ".join(f"{lado} {px}px" for lado, px in cantos.items() if px) + ".")
    faixas = {lado: faixas[lado] + cantos[lado] for lado in faixas}

    ui_extra = [tuple(r) for r in aj.get("interface_manual", [])]
    for c in ui_extra:
        log.append(f"Elemento de interface marcado à mão em {c}.")

    if aj.get("sem_recorte"):
        # a pessoa preferiu não perder nada da foto: toda a interface vai
        # para o preenchimento, mesmo o que caberia num recorte
        corte = {"topo": 0, "base": 0, "esquerda": 0, "direita": 0}
        sobra = contadores + icones + ui_extra
        log.append("Recorte desligado para esta foto (ajustes.json): a interface é preenchida.")
    else:
        corte, sobra = planejar_recorte(contadores + icones + ui_extra, w, h, faixas)
    x0, y0 = corte["esquerda"], corte["topo"]
    x1, y1 = w - corte["direita"], h - corte["base"]
    if any(corte.values()):
        partes = [f"{lado} {px}px ({px / (h if lado in ('topo', 'base') else w):.1%})"
                  for lado, px in corte.items() if px]
        log.append("Recorte: " + ", ".join(partes) + ".")
    for c in sobra:
        if aj.get("sem_recorte"):
            log.append(f"Elemento em {c} vai para o preenchimento.")
        else:
            log.append(f"Elemento em {c} não cabe no recorte (passaria de 10%): vai para o preenchimento.")
    img = img[y0:y1, x0:x1].copy()
    h, w = img.shape[:2]

    def mover(caixa):
        a, b, c, d = caixa
        return (max(0, a - x0), max(0, b - y0), min(w, c - x0), min(h, d - y0))

    # --- B. máscara de texto ---
    ignorar = [tuple(r) for r in aj.get("ignorar", [])]  # coordenadas do original
    ignorar_mov = [mover(r) for r in ignorar]
    mascara = np.zeros((h, w), np.uint8)
    textos_rec = ler_texto(img)
    for caixa, texto, conf in textos_rec:
        if dentro_de(caixa, ignorar_mov):
            log.append(f"Texto \"{texto}\" mantido (é parte da foto, marcado em ajustes.json).")
            continue
        pts = np.array(caixa, np.int32)
        cv2.fillPoly(mascara, [pts], 255)
        log.append(f"Texto detectado: \"{texto}\" (confiança {conf:.2f}).")
    for (a, b, c, d) in (mover(s) for s in sobra):
        cv2.rectangle(mascara, (a, b), (c, d), 255, -1)

    dilatacao = max(7, int(min(h, w) * 0.012)) | 1
    mascara = cv2.dilate(mascara, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilatacao, dilatacao)))

    manual = MASCARAS_MANUAIS / f"{base}.png"
    if manual.exists():
        m = cv2.imread(str(manual), cv2.IMREAD_GRAYSCALE)
        m = cv2.resize(m, (corte["esquerda"] + w + corte["direita"], corte["topo"] + h + corte["base"]),
                       interpolation=cv2.INTER_NEAREST)[y0:y1, x0:x1]
        mascara = cv2.bitwise_or(mascara, (m > 127).astype(np.uint8) * 255)
        log.append("Máscara manual de mascaras-manuais/ somada à automática.")
    for (a, b, c, d) in (mover(tuple(r)) for r in aj.get("mascara_retangulos", [])):
        cv2.rectangle(mascara, (a, b), (c, d), 255, -1)
        log.append(f"Retângulo de máscara manual em {(a + x0, b + y0, c + x0, d + y0)}.")

    area = (mascara > 0).mean()
    if area > 0:
        resultado = preencher(img, mascara)
        log.append(f"Preenchimento LaMa em {area:.2%} da área.")
    else:
        resultado = img
        log.append("Nenhum texto para remover.")

    # --- C. marcação de risco ---
    motivos = []
    if area > LIMITE_MASCARA:
        motivos.append(f"a máscara cobre {area:.1%} da imagem (limite 5%)")
    for (a, b, c, d) in detectar_rostos(img):
        if mascara[b:d, a:c].any():
            motivos.append("a máscara encosta num rosto")
            break
    if aj.get("texto_nao_detectado"):
        motivos.append("texto visível que o OCR não pegou: " + aj["texto_nao_detectado"])

    PROCESSADAS.mkdir(exist_ok=True)
    MASCARAS.mkdir(exist_ok=True)
    cv2.imwrite(str(PROCESSADAS / f"{base}.png"), resultado)
    cv2.imwrite(str(MASCARAS / f"{base}.png"), mascara)
    # sobreposição em vermelho para conferir de relance
    sobre = img.copy()
    sobre[mascara > 0] = (0.45 * sobre[mascara > 0] + 0.55 * np.array([40, 40, 230])).astype(np.uint8)
    cv2.imwrite(str(MASCARAS / f"{base}-sobreposta.jpg"), sobre, [cv2.IMWRITE_JPEG_QUALITY, 85])

    return {
        "arquivo": nome,
        "base": base,
        "status": "revisar com atenção" if motivos else "ok",
        "motivos": motivos,
        "log": log,
        "tamanho_final": [w, h],
        "area_mascara": round(float(area), 4),
    }


# ─────────────── Etapa D: página de revisão ───────────────

def gerar_revisao(relatorio):
    cards = []
    for r in relatorio:
        revisar = r["status"] != "ok"
        selo = ("<span class='selo revisar'>REVISAR COM ATENÇÃO</span>" if revisar
                else "<span class='selo ok'>OK</span>")
        motivos = "".join(f"<li>{escape(m)}</li>" for m in r["motivos"])
        log = "".join(f"<li>{escape(l)}</li>" for l in r["log"])
        b = escape(r["base"])
        cards.append(f"""
<section class="foto{' alerta' if revisar else ''}">
  <h2>{escape(r['arquivo'])} {selo}</h2>
  {f'<ul class="motivos">{motivos}</ul>' if motivos else ''}
  <div class="trio">
    <figure><img src="originais/{escape(r['arquivo'])}" loading="lazy"><figcaption>Original</figcaption></figure>
    <figure><img src="mascaras/{b}-sobreposta.jpg" loading="lazy"><figcaption>Máscara (vermelho) sobre a foto recortada</figcaption></figure>
    <figure><img src="processadas/{b}.png" loading="lazy"><figcaption>Resultado {r['tamanho_final'][0]}×{r['tamanho_final'][1]}</figcaption></figure>
  </div>
  <details open><summary>O que foi feito</summary><ul>{log}</ul></details>
</section>""")
    html = f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Revisão das fotos da galeria</title>
<style>
body{{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#f4f1ea;color:#3b2f22}}
h1{{margin:0 0 4px}} .sub{{color:#6b5e4c;margin:0 0 24px}}
.foto{{background:#fff;border-radius:8px;padding:16px 20px;margin:0 0 24px;box-shadow:0 2px 10px #0001}}
.foto.alerta{{outline:3px solid #d9822b}}
h2{{font-size:17px;margin:0 0 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}}
.selo{{font-size:12px;padding:3px 10px;border-radius:20px;color:#fff;letter-spacing:.04em}}
.ok{{background:#4f7a3a}} .revisar{{background:#c0561b}}
.motivos{{color:#a2440f;font-weight:600;margin:0 0 10px}}
.trio{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}
figure{{margin:0}} img{{width:100%;height:auto;border-radius:4px;background:#eee}}
figcaption{{font-size:13px;color:#6b5e4c;margin-top:4px}}
@media (max-width:800px){{.trio{{grid-template-columns:1fr}}}}
</style>
<h1>Revisão das fotos da galeria</h1>
<p class="sub">Gerado em {datetime.now():%d/%m/%Y %H:%M}. {sum(r['status'] != 'ok' for r in relatorio)} de {len(relatorio)} fotos marcadas para revisar com atenção.</p>
{''.join(cards)}
</html>"""
    (AQUI / "revisao.html").write_text(html, encoding="utf-8")


def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else None
    copiar_originais()
    ajustes = carregar_ajustes()
    caminho_rel = AQUI / "relatorio.json"
    anterior = {r["arquivo"]: r for r in json.loads(caminho_rel.read_text())} if caminho_rel.exists() else {}
    for nome in FOTOS:
        if filtro and filtro not in nome:
            continue
        print(f"→ {nome}", flush=True)
        anterior[nome] = processar(nome, ajustes)
        r = anterior[nome]
        print(f"  {r['status'].upper()}  máscara {r['area_mascara']:.2%}  {'; '.join(r['motivos'])}")
    relatorio = [anterior[n] for n in FOTOS if n in anterior]
    caminho_rel.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")
    gerar_revisao(relatorio)
    print(f"\nRevisão: {AQUI / 'revisao.html'}")


if __name__ == "__main__":
    main()
