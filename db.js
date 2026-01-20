const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    host: '38.52.130.145',
    port: 5432,
    database: 'casamento',
    user: 'metricsdb',
    password: 'metricspass',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Testar conexão
pool.on('connect', () => {
    console.log('✓ Conectado ao banco de dados PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Erro no pool de conexões:', err);
});

// Função para inicializar o banco de dados
async function initDatabase() {
    const client = await pool.connect();
    try {
        // Criar database se não existir (precisa conectar no postgres primeiro)
        await client.query(`
            CREATE TABLE IF NOT EXISTS presentes_reservados (
                id SERIAL PRIMARY KEY,
                presente_id VARCHAR(100) UNIQUE NOT NULL,
                presente_nome VARCHAR(255) NOT NULL,
                presente_valor DECIMAL(10, 2) NOT NULL,
                nome_convidado VARCHAR(255) NOT NULL,
                email_convidado VARCHAR(255) NOT NULL,
                telefone_convidado VARCHAR(50),
                reference_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pendente',
                data_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_pagamento TIMESTAMP,
                CONSTRAINT status_check CHECK (status IN ('pendente', 'pago', 'expirado', 'cancelado'))
            );
        `);

        // Criar índices para melhor performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_presente_id ON presentes_reservados(presente_id);
            CREATE INDEX IF NOT EXISTS idx_reference_id ON presentes_reservados(reference_id);
            CREATE INDEX IF NOT EXISTS idx_status ON presentes_reservados(status);
        `);

        console.log('✓ Tabelas criadas com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Funções auxiliares para gerenciar presentes

async function reservarPresente(presenteId, presenteNome, presenteValor, nomeConvidado, emailConvidado, telefoneConvidado, referenceId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO presentes_reservados
             (presente_id, presente_nome, presente_valor, nome_convidado, email_convidado, telefone_convidado, reference_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente')
             ON CONFLICT (presente_id) DO NOTHING
             RETURNING *`,
            [presenteId, presenteNome, presenteValor, nomeConvidado, emailConvidado, telefoneConvidado, referenceId]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function verificarPresenteDisponivel(presenteId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM presentes_reservados
             WHERE presente_id = $1 AND (status = 'pendente' OR status = 'pago')
             LIMIT 1`,
            [presenteId]
        );
        return result.rows.length === 0; // Retorna true se disponível
    } finally {
        client.release();
    }
}

async function getPresentesReservados() {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT presente_id, status FROM presentes_reservados
             WHERE status = 'pendente' OR status = 'pago'`
        );
        return result.rows;
    } finally {
        client.release();
    }
}

async function atualizarStatusPresente(referenceId, novoStatus) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `UPDATE presentes_reservados
             SET status = $1, data_pagamento = CASE WHEN $1 = 'pago' THEN CURRENT_TIMESTAMP ELSE data_pagamento END
             WHERE reference_id = $2
             RETURNING *`,
            [novoStatus, referenceId]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function limparReservasExpiradas() {
    const client = await pool.connect();
    try {
        // Marcar como expiradas reservas pendentes com mais de 24 horas
        const result = await client.query(
            `UPDATE presentes_reservados
             SET status = 'expirado'
             WHERE status = 'pendente'
             AND data_reserva < NOW() - INTERVAL '24 hours'
             RETURNING *`
        );
        return result.rows;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initDatabase,
    reservarPresente,
    verificarPresenteDisponivel,
    getPresentesReservados,
    atualizarStatusPresente,
    limparReservasExpiradas
};
