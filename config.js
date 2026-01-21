// Configuração da API
const API_CONFIG = {
    // Para produção (GitHub Pages)
    production: 'http://38.52.130.145:3001',

    // Para desenvolvimento local
    development: 'http://localhost:3001'
};

// Detectar ambiente
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? API_CONFIG.development
    : API_CONFIG.production;
