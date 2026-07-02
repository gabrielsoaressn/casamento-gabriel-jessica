# 🚀 Guia de Deploy do Backend no Servidor

## 📋 Informações do Servidor

- **IP**: 38.52.130.145
- **Porta da API**: 3001
- **Banco de Dados**: PostgreSQL (mesmo servidor)
- **URL do Frontend**: https://gabrielsoaressn.github.io/casamento-gabriel-jessica

## ⚡ Resumo Executivo

**Configurações necessárias no servidor:**

1. **PostgreSQL** - Criar database `casamento` e configurar acesso
2. **PM2** - Instalar e configurar processo Node.js
3. **Firewall** - Abrir porta 3001
4. **Arquivo .env** - Configurar variáveis de ambiente com token do PicPay
5. **CORS** - Já configurado para aceitar requisições do GitHub Pages

> **Nota:** A porta foi alterada para **3001** porque a porta 3000 já estava em uso pelo imobai-frontend.

---

## 🌐 Passo 0: Ativar GitHub Pages no Repositório

**IMPORTANTE:** Antes de configurar o servidor, ative o GitHub Pages:

1. Acesse: https://github.com/gabrielsoaressn/casamento-gabriel-jessica/settings/pages
2. Em **Source**, selecione **GitHub Actions**
3. O workflow já está configurado em `.github/workflows/deploy.yml`
4. A cada push na branch `master`, o site será automaticamente atualizado
5. O site ficará disponível em: https://gabrielsoaressn.github.io/casamento-gabriel-jessica

---

## 🔧 Passo 1: Configurar PostgreSQL

### 1.1. Conectar ao servidor via SSH

```bash
ssh usuario@38.52.130.145
```

### 1.2. Configurar pg_hba.conf

Edite o arquivo de configuração do PostgreSQL:

```bash
sudo nano /etc/postgresql/[versão]/main/pg_hba.conf
```

Adicione estas linhas no final:

```
# Permitir conexões locais do Node.js
host    casamento       metricsdb       127.0.0.1/32            md5
host    casamento       metricsdb       ::1/128                 md5

# Permitir conexões externas (se necessário para desenvolvimento)
host    casamento       metricsdb       0.0.0.0/0               md5
```

### 1.3. Configurar postgresql.conf

```bash
sudo nano /etc/postgresql/[versão]/main/postgresql.conf
```

Certifique-se que tenha:

```
listen_addresses = '*'
```

### 1.4. Reiniciar PostgreSQL

```bash
sudo systemctl restart postgresql
```

### 1.5. Criar o database

```bash
sudo -u postgres psql
```

No psql:

```sql
CREATE DATABASE casamento;
GRANT ALL PRIVILEGES ON DATABASE casamento TO metricsdb;
\q
```

---

## 📦 Passo 2: Instalar Dependências no Servidor

### 2.1. Instalar Node.js (se não tiver)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2. Instalar PM2 (gerenciador de processos)

```bash
sudo npm install -g pm2
```

---

## 📂 Passo 3: Fazer Deploy do Código

### 3.1. Clonar o repositório no servidor

```bash
cd /var/www
sudo git clone https://github.com/gabrielsoaressn/casamento-gabriel-jessica.git
cd casamento-gabriel-jessica
```

### 3.2. Instalar dependências

```bash
npm install
```

### 3.3. Criar arquivo .env

```bash
nano .env
```

Cole o seguinte conteúdo:

```env
PORT=3001
SITE_URL=https://gabrielsoaressn.github.io/casamento-gabriel-jessica

# API do PicPay
PICPAY_API_URL=https://api.picpay.com
PICPAY_TOKEN=seu_token_do_picpay_aqui
PICPAY_SELLER_TOKEN=seu_seller_token_aqui

# Banco de dados (já está configurado em db.js, mas pode sobrescrever aqui se quiser)
# DB_HOST=38.52.130.145
# DB_PORT=5432
# DB_NAME=casamento
# DB_USER=metricsuser
# DB_PASSWORD=SUA_SENHA_AQUI
```

### 3.4. Inicializar o banco de dados

```bash
NODE_PATH=/usr/lib/node_modules node init-db.js
```

Ou se preferir criar manualmente:

```bash
PGPASSWORD=$DB_PASSWORD psql -h localhost -U metricsdb -d postgres -c "CREATE DATABASE casamento;"
NODE_PATH=/usr/lib/node_modules node setup-tables.js
```

---

## ▶️ Passo 4: Iniciar o Servidor

### 4.1. Iniciar com PM2

```bash
pm2 start server.js --name casamento-api
pm2 save
pm2 startup
```

Copie e execute o comando que o PM2 mostrar.

### 4.2. Verificar se está rodando

```bash
pm2 status
pm2 logs casamento-api
```

### 4.3. Testar a API

```bash
curl http://localhost:3000/api/health
```

Deve retornar:

```json
{
  "status": "ok",
  "timestamp": "...",
  "picpayConfigured": false
}
```

---

## 🔥 Passo 5: Configurar Firewall

### 5.1. Abrir porta 3001

```bash
sudo ufw allow 3001/tcp
sudo ufw status
```

### 5.2. Testar acesso externo

Do seu computador local:

```bash
curl http://38.52.130.145:3001/api/health
```

---

## 🌐 Passo 6: Configurar CORS (Importante!)

O servidor já está configurado para aceitar requisições de qualquer origem com `cors()`, mas se quiser restringir apenas ao GitHub Pages, edite o `server.js`:

```javascript
const cors = require('cors');

app.use(cors({
    origin: [
        'https://gabrielsoaressn.github.io',
        'http://localhost:5500', // Para desenvolvimento local
        'http://127.0.0.1:5500'
    ]
}));
```

Depois reinicie:

```bash
pm2 restart casamento-api
```

---

## 🔄 Passo 7: Atualizar o Código (quando fizer mudanças)

```bash
cd /var/www/casamento-gabriel-jessica
git pull origin master
npm install
pm2 restart casamento-api
```

---

## 📊 Comandos Úteis do PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs casamento-api

# Ver logs de erro
pm2 logs casamento-api --err

# Reiniciar
pm2 restart casamento-api

# Parar
pm2 stop casamento-api

# Remover
pm2 delete casamento-api
```

---

## 🧪 Testar o Sistema Completo

### 7.1. Acesse o site no GitHub Pages

```
https://gabrielsoaressn.github.io/casamento-gabriel-jessica
```

### 7.2. Abra o Console do Navegador (F12)

Procure por erros relacionados a CORS ou conexão com a API.

### 7.3. Teste reservar um presente

Clique em "Ver Presentes" → Escolha um presente → Preencha o formulário

Se tudo funcionar, você verá:
- O presente ficar cinza/indisponível
- Outros usuários verão o presente como reservado

---

## ⚠️ Troubleshooting

### Erro: Cannot connect to database

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Ver logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Testar conexão manual
PGPASSWORD=$DB_PASSWORD psql -h localhost -U metricsdb -d casamento -c "SELECT 1;"
```

### Erro: CORS blocked

Verifique se o CORS está configurado corretamente no server.js e reinicie o PM2.

### Erro: Port 3001 already in use

```bash
# Ver o que está usando a porta
sudo lsof -i :3001

# Matar o processo
sudo kill -9 [PID]
```

### Servidor não responde externamente

```bash
# Verificar firewall
sudo ufw status

# Verificar se o servidor está escutando em todas as interfaces
netstat -tuln | grep 3001
```

---

## 🎯 URLs Finais

- **Frontend (GitHub Pages)**: https://gabrielsoaressn.github.io/casamento-gabriel-jessica
- **Backend API**: http://38.52.130.145:3001
- **Health Check**: http://38.52.130.145:3001/api/health
- **Presentes Reservados**: http://38.52.130.145:3001/api/presentes-reservados

---

## ✅ Checklist Final

- [x] PostgreSQL configurado e rodando
- [x] Database "casamento" criado
- [x] Tabelas criadas (presentes_reservados)
- [x] Código clonado no servidor
- [x] Dependências instaladas (npm install)
- [x] Arquivo .env configurado
- [x] Servidor iniciado com PM2
- [x] Porta 3001 aberta no firewall
- [x] CORS configurado
- [x] API respondendo em http://38.52.130.145:3001/api/health
- [x] GitHub Pages ativo e funcionando
- [ ] Teste de reserva de presente funcionando

---

**Dúvidas?** Consulte o SETUP_BANCO.md para mais informações sobre o banco de dados.
