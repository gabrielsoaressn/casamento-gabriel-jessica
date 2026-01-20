# Configuração do Banco de Dados PostgreSQL

## Informações de Conexão

- **Host**: 38.52.130.145
- **Porta**: 5432
- **Usuário**: metricsdb
- **Senha**: metricspass
- **Database**: casamento

## Configuração do pg_hba.conf

Para que a aplicação consiga se conectar ao banco de dados, é necessário configurar o arquivo `pg_hba.conf` no servidor PostgreSQL para permitir conexões do IP da aplicação.

### Passos:

1. Conecte-se ao servidor PostgreSQL (38.52.130.145)

2. Edite o arquivo `/etc/postgresql/[versão]/main/pg_hba.conf` (ou o caminho equivalente)

3. Adicione a seguinte linha para permitir conexões:
   ```
   # Conexão da aplicação de casamento
   host    casamento       metricsdb       0.0.0.0/0               md5
   ```

   Ou para permitir apenas do IP específico:
   ```
   host    casamento       metricsdb       179.224.44.134/32      md5
   ```

4. Edite o arquivo `/etc/postgresql/[versão]/main/postgresql.conf` e certifique-se de que o PostgreSQL está escutando em todas as interfaces:
   ```
   listen_addresses = '*'
   ```

5. Reinicie o PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

## Criação do Banco de Dados

### Opção 1: Conectando via psql

```bash
psql -h 38.52.130.145 -U metricsdb -d postgres
```

Depois execute:
```sql
CREATE DATABASE casamento;
```

### Opção 2: Via script Node.js

Após configurar o pg_hba.conf, execute:
```bash
npm run init-db
```

Ou para criar apenas as tabelas (assumindo que o database já existe):
```bash
npm run setup-tables
```

## Estrutura do Banco

A aplicação criará automaticamente a seguinte estrutura:

### Tabela: presentes_reservados

| Coluna             | Tipo            | Descrição                                    |
|--------------------|-----------------|----------------------------------------------|
| id                 | SERIAL          | ID único da reserva                          |
| presente_id        | VARCHAR(100)    | ID do presente (único)                       |
| presente_nome      | VARCHAR(255)    | Nome do presente                             |
| presente_valor     | DECIMAL(10, 2)  | Valor do presente                            |
| nome_convidado     | VARCHAR(255)    | Nome do convidado que reservou               |
| email_convidado    | VARCHAR(255)    | E-mail do convidado                          |
| telefone_convidado | VARCHAR(50)     | Telefone do convidado (opcional)             |
| reference_id       | VARCHAR(255)    | ID de referência do PicPay                   |
| status             | VARCHAR(50)     | Status: pendente, pago, expirado, cancelado  |
| data_reserva       | TIMESTAMP       | Data/hora da reserva                         |
| data_pagamento     | TIMESTAMP       | Data/hora do pagamento (quando confirmado)   |

### Índices criados:
- `idx_presente_id` em `presente_id`
- `idx_reference_id` em `reference_id`
- `idx_status` em `status`

## Funcionalidades Automáticas

1. **Limpeza de Reservas Expiradas**: A aplicação limpa automaticamente reservas pendentes com mais de 24 horas a cada 1 hora.

2. **Atualização de Status**: O webhook do PicPay atualiza automaticamente o status dos presentes quando o pagamento é confirmado.

3. **Consulta em Tempo Real**: O frontend consulta a cada 30 segundos a lista de presentes reservados para atualizar a interface.

## Verificando a Conexão

Para verificar se o banco está configurado corretamente, acesse:
```
http://localhost:3000/api/health
```

Deve retornar algo como:
```json
{
  "status": "ok",
  "timestamp": "2026-01-20T...",
  "picpayConfigured": true/false
}
```

## Troubleshooting

### Erro: "no pg_hba.conf entry for host"
- Configure o pg_hba.conf conforme as instruções acima

### Erro: "could not connect to server"
- Verifique se o PostgreSQL está rodando
- Verifique se o firewall permite conexões na porta 5432
- Confirme o IP do servidor

### Erro: "database does not exist"
- Execute o comando para criar o database conforme as instruções acima

### A aplicação inicia mas sem banco
- A aplicação está configurada para iniciar mesmo sem conexão com o banco
- Os presentes não serão marcados como reservados até que o banco esteja conectado
- Configure o banco e reinicie a aplicação

## Consultas Úteis

### Ver todos os presentes reservados:
```sql
SELECT * FROM presentes_reservados ORDER BY data_reserva DESC;
```

### Ver presentes por status:
```sql
SELECT presente_nome, status, nome_convidado, data_reserva
FROM presentes_reservados
WHERE status = 'pago'
ORDER BY data_reserva DESC;
```

### Limpar uma reserva específica:
```sql
UPDATE presentes_reservados
SET status = 'cancelado'
WHERE presente_id = 'robo-limpeza';
```

### Ver estatísticas:
```sql
SELECT status, COUNT(*) as quantidade, SUM(presente_valor) as valor_total
FROM presentes_reservados
GROUP BY status;
```
