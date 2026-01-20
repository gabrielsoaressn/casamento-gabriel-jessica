# 🚀 Guia de Deploy do Backend no Servidor

## 📋 Informações do Servidor

- **IP**: 38.52.130.145
- **Porta da API**: 3000
- **Banco de Dados**: PostgreSQL (mesmo servidor)

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
PORT=3000
SITE_URL=https://gabrielsoaressn.github.io/casamento-gabriel-jessica

# API do PicPay
PICPAY_API_URL=https://api.picpay.com
PICPAY_TOKEN=seu_token_do_picpay_aqui
PICPAY_SELLER_TOKEN=seu_seller_token_aqui

# Banco de dados (já está configurado em db.js, mas pode sobrescrever aqui se quiser)
# DB_HOST=38.52.130.145
# DB_PORT=5432
# DB_NAME=casamento
# DB_USER=metricsdb
# DB_PASSWORD=metricspass
```

### 3.4. Inicializar o banco de dados

```bash
NODE_PATH=/usr/lib/node_modules node init-db.js
```

Ou se preferir criar manualmente:

```bash
PGPASSWORD=metricspass psql -h localhost -U metricsdb -d postgres -c "CREATE DATABASE casamento;"
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

### 5.1. Abrir porta 3000

```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

### 5.2. Testar acesso externo

Do seu computador local:

```bash
curl http://38.52.130.145:3000/api/health
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
PGPASSWORD=metricspass psql -h localhost -U metricsdb -d casamento -c "SELECT 1;"
```

### Erro: CORS blocked

Verifique se o CORS está configurado corretamente no server.js e reinicie o PM2.

### Erro: Port 3000 already in use

```bash
# Ver o que está usando a porta
sudo lsof -i :3000

# Matar o processo
sudo kill -9 [PID]
```

### Servidor não responde externamente

```bash
# Verificar firewall
sudo ufw status

# Verificar se o servidor está escutando em todas as interfaces
netstat -tuln | grep 3000
```

---

## 🎯 URLs Finais

- **Frontend (GitHub Pages)**: https://gabrielsoaressn.github.io/casamento-gabriel-jessica
- **Backend API**: http://38.52.130.145:3000
- **Health Check**: http://38.52.130.145:3000/api/health
- **Presentes Reservados**: http://38.52.130.145:3000/api/presentes-reservados

---

## ✅ Checklist Final

- [ ] PostgreSQL configurado e rodando
- [ ] Database "casamento" criado
- [ ] Tabelas criadas (presentes_reservados)
- [ ] Código clonado no servidor
- [ ] Dependências instaladas (npm install)
- [ ] Arquivo .env configurado
- [ ] Servidor iniciado com PM2
- [ ] Porta 3000 aberta no firewall
- [ ] CORS configurado
- [ ] API respondendo em http://38.52.130.145:3000/api/health
- [ ] GitHub Pages ativo e funcionando
- [ ] Teste de reserva de presente funcionando

---

**Dúvidas?** Consulte o SETUP_BANCO.md para mais informações sobre o banco de dados.
