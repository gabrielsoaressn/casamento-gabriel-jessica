// Configuração da API
const API_CONFIG = {
    // Produção: HTTPS via Nginx reverse proxy (sslip.io + Let's Encrypt → Nest na 3847)
    production: 'https://38-52-130-145.sslip.io',

    // Desenvolvimento local
    development: 'http://localhost:3847'
};

// Detectar ambiente
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? API_CONFIG.development
    : API_CONFIG.production;
