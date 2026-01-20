# Site de Casamento - Gabriel & Jessica

Site de casamento com integração ao Nubank PJ para lista de presentes e cobranças online.

## Funcionalidades

- ✨ Site responsivo e elegante
- 📅 Contador regressivo para o casamento
- 📖 Linha do tempo da história do casal
- 🖼️ Galeria de fotos
- 📍 Informações de cerimônia e recepção
- 🎁 **Lista de presentes com pagamento integrado**
- 💳 Pagamento via PIX, cartão de crédito, débito ou NuPay
- ✉️ Confirmação de presença

## Como funciona a Lista de Presentes

1. O convidado escolhe um presente ou valor personalizado
2. Preenche seus dados (nome, email, telefone)
3. O sistema gera automaticamente uma cobrança no Nubank PJ
4. O convidado recebe um link de pagamento do Nubank
5. Pode pagar com PIX, cartão, débito ou NuPay
6. Após o pagamento, recebe confirmação por email

## Pré-requisitos

- Node.js 16+ instalado
- Conta PJ no Nubank
- Acesso à API do Nubank (NuPay for Business)

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

4. Edite o arquivo `.env` com suas credenciais do Nubank:
```env
PORT=3000
SITE_URL=http://localhost:3000

# Credenciais da API do Nubank PJ
NUBANK_API_URL=https://api.nupaybusiness.com.br
NUBANK_API_KEY=sua_chave_api_aqui
NUBANK_MERCHANT_ID=seu_merchant_id_aqui

NUBANK_CNPJ=seu_cnpj_aqui
NUBANK_PIX_KEY=sua_chave_pix_aqui
```

## Como obter as credenciais do Nubank

1. Acesse o app do Nubank PJ
2. Vá em **Configurações** > **Integrações** > **API**
3. Ou acesse a documentação: https://docs.nupaybusiness.com.br
4. Entre em contato com o suporte: oi-nupay@nubank.com.br
5. Solicite acesso à API e suas credenciais:
   - `NUBANK_API_KEY`: Chave de autenticação da API
   - `NUBANK_MERCHANT_ID`: ID da sua conta merchant

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
Cria uma nova cobrança no Nubank.

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
  "paymentUrl": "https://nubank.com.br/pay/xxxxxx",
  "paymentId": "pay_xxxxxx",
  "chargeId": "charge_xxxxxx"
}
```

### POST /api/webhook/nubank
Recebe notificações de pagamento do Nubank.

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

### Webhook do Nubank

Para receber notificações de pagamento em tempo real:

1. Configure a URL do webhook no painel do Nubank PJ
2. Use a URL: `https://seu-dominio.com/api/webhook/nubank`
3. O sistema processará automaticamente os eventos de pagamento

## Suporte

- Documentação Nubank: https://docs.nupaybusiness.com.br
- Email Nubank: oi-nupay@nubank.com.br
- Issues do projeto: https://github.com/gabrielsoaressn/casamento-gabriel-jessica/issues

## Tecnologias Utilizadas

- HTML5, CSS3, JavaScript (ES6+)
- Node.js + Express
- API NuPay for Business
- Axios para requisições HTTP

## Licença

ISC

---

Feito com ❤️ por Gabriel & Jessica
