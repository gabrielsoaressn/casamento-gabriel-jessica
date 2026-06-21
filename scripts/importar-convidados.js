/**
 * Importa dados/convidados_final.csv para as tabelas convites + convidados.
 * Usa ON CONFLICT para ser idempotente: pode rodar várias vezes com segurança.
 *
 * Uso:
 *   node scripts/importar-convidados.js
 *   node scripts/importar-convidados.js --dry-run   (mostra o que seria importado sem gravar)
 *
 * CSV esperado: convite_id,codigo,entrega,grupo,nome,vai_comparecer
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const DRY_RUN = process.argv.includes('--dry-run');
const CSV_PATH = path.join(__dirname, '..', 'dados', 'convidados_final.csv');

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
  });
}

function groupByConviteId(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.convite_id;
    if (!map.has(key)) {
      map.set(key, {
        codigo:   row.codigo,
        entrega:  row.entrega,
        grupo:    row.grupo,
        nomes:    [],
      });
    }
    if (row.nome) {
      map.get(key).nomes.push(row.nome);
    }
  }
  return map;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`\n❌ Arquivo não encontrado: ${CSV_PATH}`);
    console.error('   Coloque o arquivo CSV em dados/convidados_final.csv\n');
    process.exit(1);
  }

  const rows = parseCSV(CSV_PATH);
  const convites = groupByConviteId(rows);

  console.log(`\n📋 CSV lido: ${rows.length} linhas, ${convites.size} convites\n`);

  for (const [id, c] of convites) {
    console.log(`  Convite ${id}: "${c.grupo}" | código: ${c.codigo} | ${c.entrega} | ${c.nomes.length} pessoa(s): ${c.nomes.join(', ')}`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Modo dry-run: nenhum dado gravado.\n');
    return;
  }

  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'casamento',
    user:     process.env.DB_USER     || 'metricsuser',
    password: process.env.DB_PASSWORD || 'metricspass',
  });

  await client.connect();
  console.log('\n✓ Conectado ao banco\n');

  let importados = 0;
  let pulados    = 0;

  for (const [_, c] of convites) {
    // Insere convite — ON CONFLICT ignora duplicatas (idempotente)
    const res = await client.query(
      `INSERT INTO convites (codigo, entrega, grupo)
       VALUES ($1, $2, $3)
       ON CONFLICT (LOWER(codigo)) DO NOTHING
       RETURNING id`,
      [c.codigo, c.entrega, c.grupo],
    );

    if (res.rows.length === 0) {
      console.log(`  ⏩ Convite "${c.codigo}" já existe — pulando`);
      pulados++;
      continue;
    }

    const conviteId = res.rows[0].id;

    for (const nome of c.nomes) {
      await client.query(
        'INSERT INTO convidados (convite_id, nome) VALUES ($1, $2)',
        [conviteId, nome],
      );
    }

    console.log(`  ✓ Importado: "${c.grupo}" (${c.codigo}) — ${c.nomes.length} convidado(s)`);
    importados++;
  }

  await client.end();

  console.log(`\n✅ Importação concluída: ${importados} convites inseridos, ${pulados} já existiam.\n`);
}

main().catch(err => {
  console.error('\n❌ Erro na importação:', err.message);
  process.exit(1);
});
