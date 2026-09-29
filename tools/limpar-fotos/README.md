# limpar-fotos

Tira a interface do Instagram (contador "1/2", ícones redondos, faixas de
print) e os textos sobrepostos das fotos da galeria. Fica fora do site: nada
daqui é servido nem entra no build.

```bash
cd tools/limpar-fotos
python3.11 -m venv .venv   # 3.11: o simple-lama-inpainting exige Pillow < 10
.venv/bin/pip install -r requirements.txt
.venv/bin/python limpar.py          # todas as fotos
.venv/bin/python limpar.py voeli    # só uma
```

Depois, abra `revisao.html` no navegador.

- `originais/` cópia intocada de cada foto (o script nunca a altera)
- `processadas/` resultado em PNG, sem perda
- `mascaras/` o que foi apagado: `<foto>.png` (branco = preenchido) e
  `<foto>-sobreposta.jpg` (em vermelho sobre a foto)

## Ajustes por foto — `ajustes.json`

Chave = nome da foto sem extensão. Coordenadas em pixels do ORIGINAL,
`[x0, y0, x1, y1]`.

```json
{
  "voeli": {
    "mascara_retangulos": [[520, 300, 640, 360]],
    "texto_nao_detectado": "emojis 💙🌊 ao fim da frase",
    "ignorar": [[600, 1250, 900, 1450]],
    "interface_manual": [[820, 40, 900, 100]]
  }
}
```

- `mascara_retangulos`: áreas a apagar que o OCR não pegou
- `texto_nao_detectado`: força a marcação "revisar com atenção"
- `ignorar`: texto que é parte da foto (estampa de camiseta, placa) e fica
- `interface_manual`: elemento de interface que o detector não achou
- `sem_recorte`: `true` para não cortar nada da foto; toda a interface é
  apagada e preenchida

Para uma máscara livre, salve `mascaras-manuais/<foto>.png` do tamanho do
original, branco onde deve apagar. Ela é somada à automática.
