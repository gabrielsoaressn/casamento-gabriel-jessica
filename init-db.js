const { Pool } = require('pg');

// Primeiro, conectar ao database padrão 'postgres' para criar o database 'casamento'
const adminPool = new Pool({
    host: '38.52.130.145',
    port: 5432,
    database: 'postgres',
    user: 'metricsdb',
    password: 'metricspass',
});

async function createDatabase() {
    const client = await adminPool.connect();
    try {
        // Verificar se o database já existe
        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = 'casamento'`
        );

        if (result.rows.length === 0) {
            console.log('Criando database casamento...');
            await client.query('CREATE DATABASE casamento');
            console.log('✓ Database casamento criado com sucesso');
        } else {
            console.log('✓ Database casamento já existe');
        }
    } catch (error) {
        console.error('Erro ao criar database:', error);
        throw error;
    } finally {
        client.release();
        await adminPool.end();
    }
}

async function initTables() {
    const { initDatabase } = require('./db');
    try {
        await initDatabase();
        console.log('✓ Tabelas inicializadas com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar tabelas:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Iniciando configuração do banco de dados...\n');
        await createDatabase();
        await initTables();
        console.log('\n✓ Configuração concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Erro na configuração:', error);
        process.exit(1);
    }
}

main();
