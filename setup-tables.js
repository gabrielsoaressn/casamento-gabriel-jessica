const { Pool } = require('pg');

// Conectar diretamente ao database casamento (assumindo que já existe)
const pool = new Pool({
    host: '38.52.130.145',
    port: 5432,
    database: 'casamento',
    user: 'metricsdb',
    password: 'metricspass',
});

async function setupTables() {
    const client = await pool.connect();
    try {
        console.log('✓ Conectado ao banco de dados');

        // Criar tabela de presentes reservados
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

        console.log('✓ Tabela presentes_reservados criada/verificada');

        // Criar índices
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_presente_id ON presentes_reservados(presente_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_reference_id ON presentes_reservados(reference_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_status ON presentes_reservados(status);
        `);

        console.log('✓ Índices criados');

        // Verificar quantos presentes já estão reservados
        const result = await client.query('SELECT COUNT(*) FROM presentes_reservados');
        console.log(`✓ Total de presentes reservados: ${result.rows[0].count}`);

        console.log('\n✓ Configuração concluída com sucesso!');
    } catch (error) {
        console.error('✗ Erro:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
