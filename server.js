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

// Configuração da API do PicPay
const PICPAY_API_URL = process.env.PICPAY_API_URL || 'https://api.picpay.com';
const PICPAY_TOKEN = process.env.PICPAY_TOKEN;
const PICPAY_SELLER_TOKEN = process.env.PICPAY_SELLER_TOKEN;

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

        // Gerar ID único para a referência do pagamento
        const referenceId = `presente-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Preparar dados para a API do PicPay
        const paymentData = {
            referenceId: referenceId,
            callbackUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/api/webhook/picpay`,
            returnUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/obrigado`,
            value: valor,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
            buyer: {
                firstName: nome.split(' ')[0],
                lastName: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
                document: '00000000000', // CPF não obrigatório para link de pagamento
                email: email,
                phone: telefone || '+5500000000000'
            },
            additionalInfo: [
                {
                    key: 'presenteId',
                    value: presenteId
                },
                {
                    key: 'presenteNome',
                    value: presenteNome
                }
            ]
        };

        console.log('Criando cobrança no PicPay:', paymentData);

        // Chamar API do PicPay
        const response = await axios.post(
            `${PICPAY_API_URL}/ecommerce/public/payments`,
            paymentData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-picpay-token': PICPAY_TOKEN
                }
            }
        );

        // Retornar URL de pagamento
        res.json({
            success: true,
            paymentUrl: response.data.paymentUrl,
            referenceId: response.data.referenceId,
            qrcode: response.data.qrcode
        });

    } catch (error) {
        console.error('Erro ao criar cobrança:', error.response?.data || error.message);

        // Se estiver em modo de desenvolvimento sem API configurada
        if (!PICPAY_TOKEN || error.code === 'ECONNREFUSED') {
            console.warn('API do PicPay não configurada. Retornando mock para desenvolvimento.');
            return res.json({
                success: true,
                paymentUrl: 'https://picpay.com/mock-payment-link',
                referenceId: 'mock-' + Date.now(),
                qrcode: {
                    content: 'mock-qrcode',
                    base64: 'data:image/png;base64,mock'
                },
                isDevelopment: true
            });
        }

        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.response?.data?.message || error.message
        });
    }
});

// Endpoint para webhook do PicPay (notificações de pagamento)
app.post('/api/webhook/picpay', async (req, res) => {
    try {
        const { event, data } = req.body;

        console.log('Webhook recebido:', event, data);

        // O PicPay envia a referenceId quando há atualização de status
        const { referenceId, authorizationId } = req.body;

        if (referenceId) {
            console.log(`Notificação de pagamento recebida para: ${referenceId}`);

            // Consultar status do pagamento na API do PicPay
            try {
                const statusResponse = await axios.get(
                    `${PICPAY_API_URL}/ecommerce/public/payments/${referenceId}/status`,
                    {
                        headers: {
                            'x-picpay-token': PICPAY_TOKEN
                        }
                    }
                );

                const status = statusResponse.data.status;
                console.log(`Status do pagamento ${referenceId}: ${status}`);

                // Processar de acordo com o status
                switch (status) {
                    case 'paid':
                        console.log(`✓ Pagamento confirmado: ${referenceId}`);
                        // Aqui você pode enviar email, atualizar banco de dados, etc.
                        break;

                    case 'analysis':
                        console.log(`⏳ Pagamento em análise: ${referenceId}`);
                        break;

                    case 'expired':
                        console.log(`⏰ Pagamento expirado: ${referenceId}`);
                        break;

                    case 'refunded':
                        console.log(`↩️ Pagamento estornado: ${referenceId}`);
                        break;

                    case 'chargeback':
                        console.log(`⚠️ Chargeback: ${referenceId}`);
                        break;

                    default:
                        console.log(`Status desconhecido: ${status}`);
                }
            } catch (error) {
                console.error('Erro ao consultar status:', error.message);
            }
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
        picpayConfigured: !!PICPAY_TOKEN
    });
});

app.listen(PORT, () => {
    console.log(`\n🎉 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Acesse: http://localhost:${PORT}`);
    console.log(`💳 API PicPay: ${PICPAY_TOKEN ? 'Configurada ✓' : 'Não configurada ⚠️'}`);
    console.log('\n');
});
