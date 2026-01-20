# Site de Casamento - Gabriel & Jessica

Site de casamento com integração ao PicPay para lista de presentes e cobranças online.

## Funcionalidades

- ✨ Site responsivo e elegante
- 📅 Contador regressivo para o casamento
- 📖 Linha do tempo da história do casal
- 🖼️ Galeria de fotos
- 📍 Informações de cerimônia e recepção
- 🎁 **Lista de presentes com pagamento integrado**
- 💳 Pagamento via PIX, cartão de crédito ou saldo PicPay
- ✉️ Confirmação de presença

## Como funciona a Lista de Presentes

1. O convidado escolhe uma categoria (Casa ou Lua de Mel)
2. Seleciona um presente ou valor personalizado
3. Preenche seus dados (nome, email, telefone)
4. O sistema gera automaticamente uma cobrança no PicPay
5. O convidado recebe um link de pagamento
6. Pode pagar com PIX, cartão de crédito ou saldo PicPay
7. Após o pagamento, recebe confirmação

## Pré-requisitos

- Node.js 16+ instalado
- Conta no PicPay (pode ser PF ou PJ)
- Token de integração do PicPay E-commerce

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/gabrielsoaressn/casamento-gabriel-jessica.git
cd casamento-gabriel-jessica
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas credenciais do PicPay:
```env
PORT=3000
SITE_URL=http://localhost:3000

# Credenciais da API do PicPay
PICPAY_API_URL=https://api.picpay.com
PICPAY_TOKEN=seu_token_aqui
PICPAY_SELLER_TOKEN=seu_seller_token_aqui
```

## Como obter as credenciais do PicPay

1. **Criar conta no PicPay** (se ainda não tiver)
   - Acesse: https://picpay.com ou baixe o app
   - Pode ser conta PF ou PJ

2. **Solicitar acesso ao PicPay E-commerce**
   - Acesse: https://lojista.picpay.com/
   - Faça login com sua conta PicPay
   - Solicite habilitação do E-commerce

3. **Obter o Token de Integração**
   - No painel do lojista, vá em **Integrações**
   - Copie seu **x-picpay-token**
   - Este token será usado como `PICPAY_TOKEN` no `.env`

4. **Documentação oficial**
   - API E-commerce: https://developers-business.picpay.com/
   - Suporte: atendimento disponível no app do PicPay

## Executando o Projeto

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

O site estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
casamento-gabriel-jessica/
├── index.html          # Página principal
├── style.css           # Estilos
├── script.js           # JavaScript frontend
├── server.js           # Backend Node.js
├── package.json        # Dependências
├── .env.example        # Exemplo de variáveis de ambiente
├── .gitignore          # Arquivos ignorados pelo git
├── images/             # Galeria de fotos
└── README.md           # Este arquivo
```

## API Endpoints

### POST /api/criar-cobranca
Cria uma nova cobrança no PicPay.

**Request:**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "telefone": "83999999999",
  "presenteId": "lua-mel",
  "presenteNome": "Lua de Mel",
  "valor": 500.00
}
```

**Response:**
```json
{
  "success": true,
  "paymentUrl": "https://picpay.com/checkout/xxxxxx",
  "referenceId": "presente-1234567890-abc123",
  "qrcode": {
    "content": "00020101021...",
    "base64": "data:image/png;base64,..."
  }
}
```

### POST /api/webhook/picpay
Recebe notificações de pagamento do PicPay.

### GET /api/health
Verifica se o servidor está funcionando.

## Deploy

### Opção 1: Vercel (Recomendado para sites estáticos + serverless)

1. Instale a CLI da Vercel:
```bash
npm install -g vercel
```

2. Faça login:
```bash
vercel login
```

3. Configure as variáveis de ambiente no painel da Vercel

4. Deploy:
```bash
vercel --prod
```

### Opção 2: Railway / Render / Heroku

1. Crie uma conta no serviço escolhido
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Deploy automático a cada push

### Opção 3: VPS (Digital Ocean, AWS, etc)

1. Configure um servidor com Node.js
2. Clone o repositório
3. Configure as variáveis de ambiente
4. Use PM2 para manter o servidor rodando:
```bash
npm install -g pm2
pm2 start server.js
pm2 save
```

## Configurações Adicionais

### Personalizar Lista de Presentes

Edite o arquivo `index.html` na seção de presentes para adicionar/remover itens:

```html
<div class="presente-card" data-presente="id-do-presente" data-valor="valor-em-centavos">
    <div class="presente-icon">🎁</div>
    <h3>Nome do Presente</h3>
    <p>Descrição</p>
    <p class="presente-valor">R$ 100,00</p>
    <button class="btn-presente" onclick="selecionarPresente('id', 100.00, 'Nome')">
        Presentear
    </button>
</div>
```

### Webhook do PicPay

Para receber notificações de pagamento em tempo real:

1. Configure a URL do webhook no painel do PicPay Lojista
2. Use a URL: `https://seu-dominio.com/api/webhook/picpay`
3. O sistema consultará automaticamente o status do pagamento
4. Estados possíveis: `paid`, `analysis`, `expired`, `refunded`, `chargeback`

## Suporte

- Documentação PicPay: https://developers-business.picpay.com/
- Painel Lojista: https://lojista.picpay.com/
- Suporte PicPay: Disponível no app
- Issues do projeto: https://github.com/gabrielsoaressn/casamento-gabriel-jessica/issues

## Tecnologias Utilizadas

- HTML5, CSS3, JavaScript (ES6+)
- Node.js + Express
- API PicPay E-commerce
- Axios para requisições HTTP

## Licença

ISC

---

Feito com ❤️ por Gabriel & Jessica
