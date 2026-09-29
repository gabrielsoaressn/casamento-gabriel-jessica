// ============================================================================
// Música de fundo — "Fly Me To The Moon" (violão fingerstyle).
//
// Navegadores bloqueiam áudio com som antes de o visitante interagir com a
// página. Então: tenta tocar ao abrir; se for bloqueado, começa no primeiro
// toque, clique ou tecla. O botão no canto pausa e volta, e a escolha de
// deixar em silêncio fica lembrada. Entre as páginas do site a música
// continua de onde parou.
//
// Autocontido (injeta o próprio CSS) porque /confirmar não usa o style.css.
// ============================================================================
(() => {
    const CHAVE_SILENCIO = 'musica-silenciada';
    const CHAVE_POSICAO = 'musica-posicao';

    const ler = (armazenamento, chave) => {
        try { return armazenamento.getItem(chave); } catch { return null; }
    };
    const gravar = (armazenamento, chave, valor) => {
        try { armazenamento.setItem(chave, valor); } catch { /* modo privado */ }
    };

    const arquivo = new URL('audio/fly-me-to-the-moon.mp3', document.currentScript.src);
    const audio = new Audio(arquivo.href);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'auto';

    const posicaoSalva = parseFloat(ler(sessionStorage, CHAVE_POSICAO));
    if (posicaoSalva > 0) {
        audio.addEventListener('loadedmetadata', () => {
            if (posicaoSalva < audio.duration) audio.currentTime = posicaoSalva;
        }, { once: true });
    }
    window.addEventListener('pagehide', () => {
        gravar(sessionStorage, CHAVE_POSICAO, String(audio.currentTime));
    });

    const estilo = document.createElement('style');
    estilo.textContent = `
        .botao-musica {
            position: fixed;
            left: 18px;
            bottom: 18px;
            z-index: 900;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 1px solid rgba(201, 162, 74, 0.6);
            border-radius: 50%;
            background: #FDF8EA;
            color: #5B4127;
            box-shadow: 0 8px 22px rgba(70, 48, 24, 0.18);
            cursor: pointer;
            transition: transform 0.18s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .botao-musica:hover { transform: translateY(-2px); }
        .botao-musica:focus-visible { outline: 3px solid #C9A24A; outline-offset: 2px; }
        .botao-musica svg { width: 22px; height: 22px; }
        .botao-musica .icone-mudo { display: none; }
        .botao-musica[aria-pressed="false"] .icone-tocando { display: none; }
        .botao-musica[aria-pressed="false"] .icone-mudo { display: block; }
        .botao-musica[aria-pressed="true"] { color: #C32B6E; }
        @media (prefers-reduced-motion: no-preference) {
            .botao-musica[aria-pressed="true"] .icone-tocando {
                animation: nota-balanca 2.4s ease-in-out infinite;
            }
        }
        @keyframes nota-balanca {
            0%, 100% { transform: rotate(-6deg); }
            50%      { transform: rotate(6deg); }
        }
    `;
    document.head.appendChild(estilo);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-musica';
    botao.innerHTML = `
        <svg class="icone-tocando" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
        </svg>
        <svg class="icone-mudo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle><line x1="3" y1="3" x2="21" y2="21"></line>
        </svg>`;

    function atualizarBotao() {
        const tocando = !audio.paused;
        botao.setAttribute('aria-pressed', String(tocando));
        botao.setAttribute('aria-label', tocando ? 'Pausar a música' : 'Tocar a música');
        botao.title = tocando ? 'Pausar a música' : 'Tocar a música';
    }
    audio.addEventListener('play', atualizarBotao);
    audio.addEventListener('pause', atualizarBotao);

    const EVENTOS_DE_INTERACAO = ['pointerdown', 'keydown', 'touchstart'];

    function pararDeEsperarInteracao() {
        EVENTOS_DE_INTERACAO.forEach((tipo) =>
            document.removeEventListener(tipo, tocarNaPrimeiraInteracao, true));
    }

    function tocarNaPrimeiraInteracao(evento) {
        // O próprio botão decide sozinho — senão o toque nele tocaria e
        // pausaria a música no mesmo gesto.
        if (botao.contains(evento.target)) return;
        pararDeEsperarInteracao();
        audio.play().catch(() => {});
    }

    botao.addEventListener('click', () => {
        pararDeEsperarInteracao();
        if (audio.paused) {
            gravar(localStorage, CHAVE_SILENCIO, '0');
            audio.play().catch(() => {});
        } else {
            gravar(localStorage, CHAVE_SILENCIO, '1');
            audio.pause();
        }
    });

    function iniciar() {
        document.body.appendChild(botao);
        atualizarBotao();

        if (ler(localStorage, CHAVE_SILENCIO) === '1') return;

        audio.play().catch(() => {
            EVENTOS_DE_INTERACAO.forEach((tipo) =>
                document.addEventListener(tipo, tocarNaPrimeiraInteracao, true));
        });
    }

    if (document.body) iniciar();
    else document.addEventListener('DOMContentLoaded', iniciar);
})();
