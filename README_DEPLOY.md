# 🎉 Site de Casamento - Gabriel & Jéssica

Deploy completo realizado com sucesso!

## 🌐 URLs do Projeto

### Frontend (GitHub Pages)
```
https://gabrielsoaressn.github.io/casamento-gabriel-jessica
```

### Backend (Servidor)
```
http://38.52.130.145:3000
```

### API Endpoints
- Health Check: `http://38.52.130.145:3000/api/health`
- Presentes Reservados: `http://38.52.130.145:3000/api/presentes-reservados`
- Criar Cobrança: `POST http://38.52.130.145:3000/api/criar-cobranca`

---

## 📁 Estrutura do Deploy

### Frontend (GitHub Pages)
- **Branch**: `gh-pages`
- **Arquivos**: HTML, CSS, JavaScript, Imagens
- **Configuração**: `config.js` aponta para o servidor backend

### Backend (Servidor 38.52.130.145)
- **Porta**: 3000
- **Banco**: PostgreSQL (mesmo servidor)
- **Gerenciador**: PM2
- **Arquivos**: server.js, db.js, e dependências Node.js

---

## 🚀 Próximos Passos

### 1. Ativar GitHub Pages

1. Acesse: https://github.com/gabrielsoaressn/casamento-gabriel-jessica/settings/pages
2. Em **Source**, selecione: Branch `gh-pages` → pasta `/root`
3. Clique em **Save**
4. Aguarde alguns minutos
5. O site estará disponível em: https://gabrielsoaressn.github.io/casamento-gabriel-jessica

### 2. Fazer Deploy do Backend no Servidor

Siga o guia completo em: **[DEPLOY_SERVIDOR.md](./DEPLOY_SERVIDOR.md)**

Resumo rápido:
```bash
# SSH no servidor
ssh usuario@38.52.130.145

# Configurar PostgreSQL (ver DEPLOY_SERVIDOR.md)
sudo nano /etc/postgresql/[versão]/main/pg_hba.conf

# Clonar repositório
cd /var/www
sudo git clone https://github.com/gabrielsoaressn/casamento-gabriel-jessica.git
cd casamento-gabriel-jessica

# Instalar dependências
npm install

# Criar .env
nano .env

# Inicializar banco
node init-db.js

# Iniciar com PM2
pm2 start server.js --name casamento-api
pm2 save
pm2 startup
```

### 3. Configurar PicPay (Opcional)

Para ativar pagamentos reais, adicione as credenciais do PicPay no arquivo `.env` do servidor:

```env
PICPAY_TOKEN=seu_token_aqui
PICPAY_SELLER_TOKEN=seu_seller_token_aqui
```

Depois reinicie:
```bash
pm2 restart casamento-api
```

---

## 🧪 Como Testar

### Teste 1: Frontend no GitHub Pages

1. Acesse: https://gabrielsoaressn.github.io/casamento-gabriel-jessica
2. Navegue pelo site
3. Verifique se todas as páginas carregam corretamente

### Teste 2: Backend API

```bash
curl http://38.52.130.145:3000/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-01-20T...",
  "picpayConfigured": false
}
```

### Teste 3: Sistema de Reserva

1. Acesse o site
2. Clique em "Ver Presentes"
3. Escolha um presente
4. Preencha o formulário
5. Verifique se o presente fica cinza
6. Abra em outra aba/navegador anônimo
7. Confirme que o presente aparece como "JÁ RESERVADO"

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────┐
│     GitHub Pages (Frontend)             │
│  https://gabrielsoaressn.github.io/     │
│           casamento-gabriel-jessica     │
│                                         │
│  • index.html                           │
│  • style.css                            │
│  • script.js                            │
│  • config.js (API_URL)                  │
│  • Imagens                              │
└─────────────────┬───────────────────────┘
                  │
                  │ Fetch API
                  │
┌─────────────────▼───────────────────────┐
│   Servidor (38.52.130.145:3000)         │
│                                         │
│  • Node.js + Express                    │
│  • server.js (API)                      │
│  • db.js (PostgreSQL)                   │
│  • PM2 (Process Manager)                │
│                                         │
│  Endpoints:                             │
│  • GET  /api/health                     │
│  • GET  /api/presentes-reservados       │
│  • POST /api/criar-cobranca             │
│  • POST /api/webhook/picpay             │
└─────────────────┬───────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────┐
│   PostgreSQL (38.52.130.145:5432)       │
│                                         │
│  • Database: casamento                  │
│  • Tabela: presentes_reservados         │
│  • User: metricsdb                      │
└─────────────────────────────────────────┘
```

---

## 🔧 Manutenção

### Atualizar Presentes

1. Adicione imagens na pasta `Lista de Presentes/`
2. Edite `index.html` adicionando novos cards
3. Commit e push:
   ```bash
   git add .
   git commit -m "Adiciona novos presentes"
   git push origin master
   git push origin gh-pages
   ```

### Atualizar Backend

```bash
# No servidor
cd /var/www/casamento-gabriel-jessica
git pull origin master
npm install
pm2 restart casamento-api
```

### Ver Presentes Reservados

```bash
# No servidor
PGPASSWORD=$DB_PASSWORD psql -h localhost -U metricsdb -d casamento -c "SELECT presente_nome, status, nome_convidado FROM presentes_reservados;"
```

---

## 📚 Documentação

- **[SETUP_BANCO.md](./SETUP_BANCO.md)** - Configuração do banco de dados PostgreSQL
- **[DEPLOY_SERVIDOR.md](./DEPLOY_SERVIDOR.md)** - Guia completo de deploy do backend
- **[.env.example](./.env.example)** - Exemplo de variáveis de ambiente

---

## ✅ Status do Deploy

- [x] Código commitado no Git
- [x] Push para GitHub (branch master)
- [x] Branch gh-pages criada e enviada
- [x] Frontend configurado para apontar para API
- [x] Documentação de deploy criada
- [ ] GitHub Pages ativado (fazer manualmente)
- [ ] Backend deployado no servidor (seguir DEPLOY_SERVIDOR.md)
- [ ] PostgreSQL configurado
- [ ] Teste completo do sistema

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do PM2: `pm2 logs casamento-api`
2. Teste a API: `curl http://38.52.130.145:3000/api/health`
3. Consulte [DEPLOY_SERVIDOR.md](./DEPLOY_SERVIDOR.md) → Troubleshooting
4. Verifique o console do navegador (F12) para erros de CORS

---

**Desenvolvido com ❤️ por Gabriel & Jéssica**

🤖 Assistido por [Claude Code](https://claude.com/claude-code)
