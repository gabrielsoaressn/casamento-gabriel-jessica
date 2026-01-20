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
        const response = await fetch('/api/criar-cobranca', {
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
