const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuração da API do Nubank
const NUBANK_API_URL = process.env.NUBANK_API_URL || 'https://api.nupaybusiness.com.br';
const NUBANK_API_KEY = process.env.NUBANK_API_KEY;
const NUBANK_MERCHANT_ID = process.env.NUBANK_MERCHANT_ID;

// Endpoint para criar cobrança
app.post('/api/criar-cobranca', async (req, res) => {
    try {
        const { nome, email, telefone, presenteId, presenteNome, valor } = req.body;

        // Validação básica
        if (!nome || !email || !valor) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        if (valor < 10) {
            return res.status(400).json({ error: 'Valor mínimo é R$ 10,00' });
        }

        // Converter valor para centavos
        const valorEmCentavos = Math.round(valor * 100);

        // Preparar dados para a API do Nubank
        const paymentData = {
            amount: valorEmCentavos,
            description: `Presente de Casamento - ${presenteNome}`,
            customer: {
                name: nome,
                email: email,
                phone: telefone || ''
            },
            metadata: {
                presenteId: presenteId,
                presenteNome: presenteNome,
                tipo: 'presente_casamento'
            },
            // Habilitar múltiplos métodos de pagamento
            payment_methods: ['pix', 'credit_card', 'debit_card', 'nupay'],
            // URL de retorno após pagamento
            success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/obrigado`,
            cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}#presentes`
        };

        console.log('Criando cobrança no Nubank:', paymentData);

        // Chamar API do Nubank
        const response = await axios.post(
            `${NUBANK_API_URL}/v1/payments`,
            paymentData,
            {
                headers: {
                    'Authorization': `Bearer ${NUBANK_API_KEY}`,
                    'Content-Type': 'application/json',
                    'X-Merchant-Id': NUBANK_MERCHANT_ID
                }
            }
        );

        // Retornar URL de pagamento
        res.json({
            success: true,
            paymentUrl: response.data.payment_url || response.data.url,
            paymentId: response.data.id,
            chargeId: response.data.charge_id
        });

    } catch (error) {
        console.error('Erro ao criar cobrança:', error.response?.data || error.message);

        // Se estiver em modo de desenvolvimento sem API configurada
        if (!NUBANK_API_KEY || error.code === 'ECONNREFUSED') {
            console.warn('API do Nubank não configurada. Retornando mock para desenvolvimento.');
            return res.json({
                success: true,
                paymentUrl: 'https://nubank.com.br/mock-payment-link',
                paymentId: 'mock-' + Date.now(),
                chargeId: 'mock-charge-' + Date.now(),
                isDevelopment: true
            });
        }

        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.response?.data?.message || error.message
        });
    }
});

// Endpoint para webhook do Nubank (notificações de pagamento)
app.post('/api/webhook/nubank', async (req, res) => {
    try {
        const { event, data } = req.body;

        console.log('Webhook recebido:', event, data);

        // Processar diferentes tipos de eventos
        switch (event) {
            case 'payment.succeeded':
                // Pagamento confirmado
                console.log(`Pagamento confirmado: ${data.id}`);
                // Aqui você pode enviar email, atualizar banco de dados, etc.
                break;

            case 'payment.failed':
                // Pagamento falhou
                console.log(`Pagamento falhou: ${data.id}`);
                break;

            case 'payment.pending':
                // Pagamento pendente
                console.log(`Pagamento pendente: ${data.id}`);
                break;

            default:
                console.log(`Evento desconhecido: ${event}`);
        }

        // Sempre retornar 200 para o webhook
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

// Página de agradecimento
app.get('/obrigado', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Obrigado! - Gabriel & Jessica</title>
            <style>
                body {
                    font-family: 'Montserrat', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #c9a86c 0%, #b8975b 100%);
                    color: white;
                    text-align: center;
                    padding: 20px;
                }
                .container {
                    max-width: 600px;
                }
                h1 {
                    font-size: 3rem;
                    margin-bottom: 20px;
                }
                p {
                    font-size: 1.2rem;
                    margin-bottom: 30px;
                }
                a {
                    display: inline-block;
                    padding: 15px 40px;
                    background: white;
                    color: #c9a86c;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 600;
                    transition: transform 0.3s ease;
                }
                a:hover {
                    transform: scale(1.05);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Muito Obrigado!</h1>
                <p>Seu presente significa muito para nós. Mal podemos esperar para compartilhar este dia especial com você!</p>
                <p>Você receberá uma confirmação do pagamento por e-mail em breve.</p>
                <a href="/">Voltar ao Site</a>
            </div>
        </body>
        </html>
    `);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        nubankConfigured: !!NUBANK_API_KEY
    });
});

app.listen(PORT, () => {
    console.log(`\n🎉 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Acesse: http://localhost:${PORT}`);
    console.log(`💳 API Nubank: ${NUBANK_API_KEY ? 'Configurada ✓' : 'Não configurada ⚠️'}`);
    console.log('\n');
});
