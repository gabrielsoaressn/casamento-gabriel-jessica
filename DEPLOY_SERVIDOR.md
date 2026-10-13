# 🚀 Guia de Deploy do Backend no Servidor

## 📋 Como o site está no ar

| Parte | Onde roda | Como atualiza |
|---|---|---|
| **Site** (HTML, CSS, JS, imagens) | GitHub Pages — https://gabrielsoaressn.github.io/casamento-gabriel-jessica | Sozinho, a cada push na `master` (`.github/workflows/deploy.yml`) |
| **API** (NestJS) | Servidor `38.52.130.145`, atrás do Nginx em https://38-52-130-145.sslip.io | À mão, pelo **Passo 1** abaixo |
| **Banco** (PostgreSQL) | Mesmo servidor, database `casamento` | — |

Dados do processo da API no servidor:

- **Pasta**: `/root/projeto-c/casamento-gabriel-jessica`
- **Processo PM2**: `casamento-nestjs` (roda `dist/main.js`)
- **Porta interna**: 3847 (não fica exposta; o Nginx encaminha `/api/` e `/confirmar` para ela)
- **Node**: 20

> ⚠️ O servidor é compartilhado com vários outros projetos no PM2. Reinicie
> **só** o `casamento-nestjs`; nunca rode `pm2 restart all` nem `pm2 delete all`.

---

## 🔄 Passo 1: Atualizar a API (o dia a dia)

Faça isso **sempre que mudar a lista de presentes** (`presentes/presentes-data.js`)
ou qualquer coisa em `src/`. O backend lê a lista para saber quanto cobrar no
Mercado Pago: se o servidor não for atualizado, presente novo dá erro no
pagamento e presente removido continua valendo para a API.

```bash
ssh root@38.52.130.145
cd /root/projeto-c/casamento-gabriel-jessica
git pull --ff-only origin master
```

Depois, conforme o que mudou:

- **Só a lista de presentes, imagens, HTML/CSS/JS do site:** basta reiniciar.

  ```bash
  pm2 restart casamento-nestjs
  ```

- **Mudou algo em `src/` (código TypeScript):** compile antes de reiniciar.

  ```bash
  npm run build
  pm2 restart casamento-nestjs
  ```

- **Mudou o `package.json`:** rode `npm install` antes do build.

Conferir:

```bash
pm2 logs casamento-nestjs --lines 20 --nostream   # deve mostrar "Servidor rodando na porta 3847"
curl https://38-52-130-145.sslip.io/api/health    # {"status":"ok", ...}
```

> Há um `test-picpay.js` fora do git nessa pasta. Deixe-o lá; o `git pull` não mexe nele.

---

## 🔑 Passo 2: Variáveis de ambiente (`.env`)

O arquivo fica em `/root/projeto-c/casamento-gabriel-jessica/.env` e não vai
para o git. O modelo comentado está em `.env.example`. Depois de editar, rode
`pm2 restart casamento-nestjs`.

| Variável | Para quê |
|---|---|
| `PORT` | Porta interna da API: `3847` (é a que o Nginx espera) |
| `SITE_URL` | `https://38-52-130-145.sslip.io` |
| `FRONTEND_URL` | `https://gabrielsoaressn.github.io/casamento-gabriel-jessica` (links de convite e retorno do pagamento) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexão com o PostgreSQL (`localhost`, database `casamento`) |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de produção: cria a cobrança e confere o pagamento no webhook |
| `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET` | Credenciais do app no Mercado Pago |
| `PICPAY_CLIENT_ID`, `PICPAY_CLIENT_SECRET`, `PICPAY_TOKEN` | Integração PicPay (o `/api/health` mostra `picpayConfigured`) |
| `ADMIN_TOKEN` | Senha da tela `admin-rsvp.html` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_NOTIFICACOES` | Avisos por e-mail (presente pago, mensagens). Opcional: sem elas o site funciona, só não envia e-mail |

Webhook a cadastrar no painel do Mercado Pago:
`https://38-52-130-145.sslip.io/api/webhook/mercadopago`

---

## 🌐 Passo 3: Nginx e HTTPS

A configuração está em `/etc/nginx/sites-available/default`, no bloco
`server_name 38-52-130-145.sslip.io`. Ela encaminha para `127.0.0.1:3847`:

- `/api/` → endpoints da API
- `/confirmar` → página de RSVP e links de convite (`/confirmar/CODIGO`)

O certificado é do Let's Encrypt, gerado pelo Certbot, e se renova sozinho
(`certbot.timer`). Depois de editar o Nginx:

```bash
nginx -t && systemctl reload nginx
```

O `config.js` do site aponta para `https://38-52-130-145.sslip.io` em produção.
Se o domínio da API mudar, atualize esse arquivo também.

---

## 🗄️ Passo 4: Banco de dados

O TypeORM roda com `synchronize: false`, ou seja, **não cria nem altera
tabelas sozinho**. Tabelas usadas:

| Tabela | Criada por |
|---|---|
| `presentes_reservados` | `setup-tables.js` |
| `convites`, `convidados` | `scripts/criar-tabelas-rsvp.sql` |
| `mensagens` | `scripts/criar-tabela-mensagens.sql` |

Se um commit trouxer tabela ou coluna nova, rode o SQL correspondente antes
de reiniciar a API:

```bash
psql -h localhost -U <DB_USER> -d casamento -f scripts/<arquivo>.sql
```

Mais detalhes em `SETUP_BANCO.md`.

---

## 🆕 Instalação do zero (só se o servidor for refeito)

```bash
# Node 20 e PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Código
mkdir -p /root/projeto-c && cd /root/projeto-c
git clone https://github.com/gabrielsoaressn/casamento-gabriel-jessica.git
cd casamento-gabriel-jessica
npm install
cp .env.example .env   # e preencha conforme o Passo 2

# Banco: crie o database "casamento" e as tabelas (Passo 4)

# Compilar e subir
npm run build
pm2 start dist/main.js --name casamento-nestjs
pm2 save
pm2 startup             # execute o comando que ele mostrar
```

Depois configure o Nginx e o certificado (Passo 3): `certbot --nginx -d 38-52-130-145.sslip.io`.

---

## ⚠️ Troubleshooting

**A API não responde / 502 no Nginx**

```bash
pm2 describe casamento-nestjs        # status e número de restarts
pm2 logs casamento-nestjs --err --lines 50 --nostream
ss -ltnp | grep 3847                 # a API precisa estar escutando aqui
```

**Pagamento de um presente dá erro**: quase sempre a lista do servidor está
desatualizada em relação ao site. Rode o Passo 1.

**Erro de conexão com o banco**

```bash
systemctl status postgresql
psql -h localhost -U <DB_USER> -d casamento -c "SELECT 1;"
```

**O build falhou**: o `dist/` antigo pode ter ficado incompleto. Corrija o erro
e rode `npm run build` de novo antes de reiniciar; enquanto o processo não for
reiniciado, a versão anterior continua no ar.

---

## 🗃️ Cópia antiga (legado)

`/var/www/casamento-gabriel-jessica` e o processo PM2 `casamento-api` (porta
3002) são a primeira versão do backend, em Express (`server.js`). **Não estão
em uso**: o Nginx não encaminha nada para eles. Não faça deploy ali. Podem ser
removidos (`pm2 delete casamento-api && pm2 save`) quando quiser liberar recursos.

---

## 🎯 URLs

- **Site**: https://gabrielsoaressn.github.io/casamento-gabriel-jessica
- **API**: https://38-52-130-145.sslip.io/api/
- **Health check**: https://38-52-130-145.sslip.io/api/health
- **Presentes reservados**: https://38-52-130-145.sslip.io/api/presentes-reservados
- **Webhook Mercado Pago**: https://38-52-130-145.sslip.io/api/webhook/mercadopago
