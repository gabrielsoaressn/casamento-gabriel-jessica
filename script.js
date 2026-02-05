// Countdown Timer
function updateCountdown() {
    const weddingDate = new Date('2026-12-05T09:30:00').getTime();
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    } else {
        document.getElementById('countdown').innerHTML = '<p>O grande dia chegou!</p>';
    }
}

// Update countdown every second
setInterval(updateCountdown, 1000);
updateCountdown();

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', function() {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Copy PIX key
function copyPix() {
    const pixKey = '12345678000190';
    navigator.clipboard.writeText(pixKey).then(() => {
        showToast('Chave PIX copiada!');
    }).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = pixKey;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Chave PIX copiada!');
    });
}

// Show bank details modal
function showBankDetails() {
    alert('Dados Bancarios - Nubank Empresas\n\nBanco: Nu Pagamentos S.A. (260)\nAgencia: 0001\nConta: 12345678-9\nTipo: Conta Corrente PJ\nCNPJ: 12.345.678/0001-90\nRazao Social: Gabriel & Jessica Casamento\n\nChave PIX: 12345678000190');
}

// Toast notification
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #820AD1;
        color: white;
        padding: 15px 30px;
        border-radius: 50px;
        font-weight: 500;
        z-index: 10000;
        animation: toastIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(130, 10, 209, 0.4);
    `;
    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animation styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(toastStyles);

// Form submission
document.getElementById('rsvpForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    // Here you would typically send the data to a server
    console.log('Form data:', data);

    // Show success message
    showToast('Presenca confirmada com sucesso!');

    // Reset form
    this.reset();
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.timeline-item, .evento-card, .presente-card').forEach(el => {
    observer.observe(el);
});

// ========== FUNCIONALIDADE DE PRESENTES ==========

// Variáveis globais para o presente selecionado
let presenteSelecionado = {
    id: '',
    nome: '',
    valor: 0
};

// Variável para armazenar presentes reservados
let presentesReservados = [];

// Função para carregar presentes reservados do servidor
async function carregarPresentesReservados() {
    try {
        const response = await fetch(`${API_URL}/api/presentes-reservados`);
        const data = await response.json();

        if (data.success && data.presentes) {
            presentesReservados = data.presentes;
            marcarPresentesIndisponiveis();
        }
    } catch (error) {
        console.error('Erro ao carregar presentes reservados:', error);
    }
}

// Função para marcar presentes como indisponíveis visualmente
function marcarPresentesIndisponiveis() {
    // Buscar todos os cards de presentes
    const cards = document.querySelectorAll('.presente-card');

    cards.forEach(card => {
        const botao = card.querySelector('.btn-presente');
        if (botao) {
            // Extrair o presente ID do onclick do botão
            const onclickAttr = botao.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/selecionarPresente\('([^']+)'/);
                if (match) {
                    const presenteId = match[1];

                    // Verificar se está reservado
                    const reservado = presentesReservados.find(p =>
                        p.presenteId === presenteId &&
                        (p.status === 'pendente' || p.status === 'pago')
                    );

                    if (reservado) {
                        card.classList.add('indisponivel');
                        botao.disabled = true;
                        botao.textContent = 'Indisponível';
                    }
                }
            }
        }
    });
}

// Carregar presentes reservados ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarPresentesReservados();

    // Recarregar a cada 30 segundos para manter atualizado
    setInterval(carregarPresentesReservados, 30000);

    // Verificar se voltou do pagamento PicPay
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pagamento') === 'sucesso') {
        mostrarModalObrigado();
        // Limpar o parâmetro da URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Modal de agradecimento após pagamento
function mostrarModalObrigado() {
    const modal = document.createElement('div');
    modal.className = 'modal-obrigado';
    modal.innerHTML = `
        <div class="modal-obrigado-content">
            <h2>Muito Obrigado!</h2>
            <p>Seu presente significa muito para nós.</p>
            <p>Mal podemos esperar para compartilhar este dia especial com você!</p>
            <p class="email-info">Você receberá uma confirmação do pagamento por e-mail em breve.</p>
            <button onclick="fecharModalObrigado()" class="btn-fechar-obrigado">Fechar</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Adicionar estilos do modal
    const style = document.createElement('style');
    style.textContent = `
        .modal-obrigado {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        }
        .modal-obrigado-content {
            background: linear-gradient(135deg, #c9a86c 0%, #b8975b 100%);
            color: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
            animation: modalIn 0.3s ease;
        }
        .modal-obrigado-content h2 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        .modal-obrigado-content p {
            font-size: 1.1rem;
            margin-bottom: 15px;
        }
        .modal-obrigado-content .email-info {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        .btn-fechar-obrigado {
            margin-top: 20px;
            padding: 15px 40px;
            background: white;
            color: #c9a86c;
            border: none;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        .btn-fechar-obrigado:hover {
            transform: scale(1.05);
        }
        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

function fecharModalObrigado() {
    const modal = document.querySelector('.modal-obrigado');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Função para mostrar categoria de presentes
function mostrarCategoria(categoria) {
    // Esconder categorias principais
    document.getElementById('categorias-presentes').style.display = 'none';

    // Mostrar lista da categoria selecionada
    if (categoria === 'casa') {
        document.getElementById('presentes-casa').style.display = 'grid';
        document.getElementById('presentes-lua-mel').style.display = 'none';
    } else if (categoria === 'lua-mel') {
        document.getElementById('presentes-lua-mel').style.display = 'grid';
        document.getElementById('presentes-casa').style.display = 'none';
    }

    // Remarcar presentes indisponíveis na categoria exibida
    setTimeout(marcarPresentesIndisponiveis, 100);

    // Scroll suave até a seção de presentes
    document.getElementById('presentes').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Função para voltar às categorias
function voltarCategorias() {
    // Mostrar categorias principais
    document.getElementById('categorias-presentes').style.display = 'grid';

    // Esconder listas de presentes
    document.getElementById('presentes-casa').style.display = 'none';
    document.getElementById('presentes-lua-mel').style.display = 'none';

    // Scroll suave até a seção de presentes
    document.getElementById('presentes').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Função para abrir modal com presente selecionado
function selecionarPresente(id, valor, nome) {
    // Verificar se o presente está disponível
    const reservado = presentesReservados.find(p =>
        p.presenteId === id &&
        (p.status === 'pendente' || p.status === 'pago')
    );

    if (reservado) {
        showToast('Este presente já foi reservado por outro convidado');
        return;
    }

    presenteSelecionado = { id, valor, nome };

    document.getElementById('modalTitulo').textContent = `Presentear: ${nome}`;
    document.getElementById('modalDescricao').textContent = `Valor: R$ ${valor.toFixed(2).replace('.', ',')}`;

    document.getElementById('presenteId').value = id;
    document.getElementById('presenteValor').value = valor;
    document.getElementById('presenteNome').value = nome;

    document.getElementById('valorPersonalizadoGroup').style.display = 'none';
    document.getElementById('formPresente').style.display = 'block';
    document.getElementById('resultadoCobranca').style.display = 'none';

    abrirModal();
}

// Função para abrir modal com valor personalizado
function abrirModalValorPersonalizado() {
    presenteSelecionado = { id: 'personalizado', nome: 'Contribuição Personalizada', valor: 0 };

    document.getElementById('modalTitulo').textContent = 'Contribuição Personalizada';
    document.getElementById('modalDescricao').textContent = 'Escolha o valor que deseja contribuir';

    document.getElementById('presenteId').value = 'personalizado';
    document.getElementById('presenteNome').value = 'Contribuição Personalizada';

    document.getElementById('valorPersonalizadoGroup').style.display = 'block';
    document.getElementById('valorPersonalizado').required = true;
    document.getElementById('formPresente').style.display = 'block';
    document.getElementById('resultadoCobranca').style.display = 'none';

    abrirModal();
}

// Função para abrir modal
function abrirModal() {
    document.getElementById('modalPresente').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Função para fechar modal
function fecharModal() {
    document.getElementById('modalPresente').classList.remove('active');
    document.body.style.overflow = 'auto';

    // Limpar formulário
    document.getElementById('formPresente').reset();
    document.getElementById('resultadoCobranca').style.display = 'none';
    document.getElementById('formPresente').style.display = 'block';
}

// Fechar modal ao clicar fora
document.getElementById('modalPresente').addEventListener('click', function(e) {
    if (e.target === this) {
        fecharModal();
    }
});

// Função para gerar cobrança
async function gerarCobranca(event) {
    event.preventDefault();

    const btnTexto = document.getElementById('btnTexto');
    const btnLoading = document.getElementById('btnLoading');
    const btnGerarCobranca = document.getElementById('btnGerarCobranca');

    // Mostrar loading
    btnTexto.style.display = 'none';
    btnLoading.style.display = 'inline';
    btnGerarCobranca.disabled = true;

    // Obter dados do formulário
    const formData = new FormData(event.target);
    const dados = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        telefone: formData.get('telefone'),
        presenteId: formData.get('presenteId'),
        presenteNome: formData.get('presenteNome'),
        valor: formData.get('presenteId') === 'personalizado'
            ? parseFloat(formData.get('valor'))
            : parseFloat(formData.get('presenteValor'))
    };

    try {
        // Chamar API do backend
        const response = await fetch(`${API_URL}/api/criar-cobranca`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            throw new Error('Erro ao gerar cobrança');
        }

        const resultado = await response.json();

        // Mostrar resultado
        document.getElementById('linkPagamento').href = resultado.paymentUrl;
        document.getElementById('formPresente').style.display = 'none';
        document.getElementById('resultadoCobranca').style.display = 'block';

        // Recarregar lista de presentes reservados
        carregarPresentesReservados();

        // Resetar botão
        btnTexto.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnGerarCobranca.disabled = false;

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao gerar link de pagamento. Tente novamente.');

        // Resetar botão
        btnTexto.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnGerarCobranca.disabled = false;
    }
}
