/**
 * Deixa o banco igual a dados/convidados_final.csv (o importar-convidados.js
 * só insere convites novos e ignora os que já existem).
 *
 * O convite é casado pelo código:
 *   - código no CSV e não no banco  → convite criado
 *   - código nos dois               → grupo/entrega atualizados e pessoas sincronizadas
 *   - código no banco e não no CSV  → convite excluído (com as pessoas)
 *
 * Dentro de um convite, quem tem o mesmo nome fica como está (mantém a resposta).
 * Nomes que sobraram dos dois lados são tratados como renomeação, na ordem;
 * o resto é incluído ou removido.
 *
 * Uso:
 *   node scripts/sincronizar-convidados.js              (só mostra o que mudaria)
 *   node scripts/sincronizar-convidados.js --confirmar  (grava no banco)
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const CONFIRMAR = process.argv.includes('--confirmar');
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

function conviteDoCSV(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.codigo.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { codigo: row.codigo, entrega: row.entrega, grupo: row.grupo, nomes: [] });
    }
    if (row.nome) map.get(key).nomes.push(row.nome);
  }
  return map;
}

/** Compara as pessoas do banco com os nomes do CSV e devolve as operações. */
function diffPessoas(atuais, nomes) {
  const sobraAtuais = [...atuais];
  const sobraNomes  = [];
  for (const nome of nomes) {
    const i = sobraAtuais.findIndex(p => p.nome === nome);
    if (i >= 0) sobraAtuais.splice(i, 1);
    else sobraNomes.push(nome);
  }

  const n = Math.min(sobraAtuais.length, sobraNomes.length);
  return {
    renomear: sobraAtuais.slice(0, n).map((p, i) => ({ id: p.id, de: p.nome, para: sobraNomes[i] })),
    remover:  sobraAtuais.slice(n),
    incluir:  sobraNomes.slice(n),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`\n❌ Arquivo não encontrado: ${CSV_PATH}\n`);
    process.exit(1);
  }
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('\n❌ Defina DB_USER e DB_PASSWORD no .env (veja .env.example)\n');
    process.exit(1);
  }

  const csv = conviteDoCSV(parseCSV(CSV_PATH));

  const client = new Client({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'casamento',
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  const { rows: convites } = await client.query('SELECT id, codigo, entrega, grupo FROM convites');
  const { rows: pessoas }  = await client.query(
    'SELECT id, convite_id, nome FROM convidados ORDER BY created_at, id',
  );

  const banco = new Map(convites.map(c => [
    c.codigo.toLowerCase(),
    { ...c, pessoas: pessoas.filter(p => p.convite_id === c.id) },
  ]));

  const ops = [];

  for (const [key, c] of csv) {
    const atual = banco.get(key);
    if (!atual) {
      console.log(`  + criar ${c.codigo} "${c.grupo}" (${c.entrega}): ${c.nomes.join(', ')}`);
      ops.push(async () => {
        const res = await client.query(
          'INSERT INTO convites (codigo, entrega, grupo) VALUES ($1, $2, $3) RETURNING id',
          [c.codigo, c.entrega, c.grupo],
        );
        for (const nome of c.nomes) {
          await client.query('INSERT INTO convidados (convite_id, nome) VALUES ($1, $2)', [res.rows[0].id, nome]);
        }
      });
      continue;
    }

    const linhas = [];
    if (atual.grupo !== c.grupo || atual.entrega !== c.entrega) {
      linhas.push(`grupo/entrega: "${atual.grupo}"/${atual.entrega} → "${c.grupo}"/${c.entrega}`);
      ops.push(() => client.query(
        'UPDATE convites SET grupo = $1, entrega = $2 WHERE id = $3',
        [c.grupo, c.entrega, atual.id],
      ));
    }

    const d = diffPessoas(atual.pessoas, c.nomes);
    for (const r of d.renomear) {
      linhas.push(`renomear ${r.de} → ${r.para}`);
      ops.push(() => client.query('UPDATE convidados SET nome = $1 WHERE id = $2', [r.para, r.id]));
    }
    for (const p of d.remover) {
      linhas.push(`remover ${p.nome}`);
      ops.push(() => client.query('DELETE FROM convidados WHERE id = $1', [p.id]));
    }
    for (const nome of d.incluir) {
      linhas.push(`incluir ${nome}`);
      ops.push(() => client.query('INSERT INTO convidados (convite_id, nome) VALUES ($1, $2)', [atual.id, nome]));
    }

    if (linhas.length) {
      console.log(`  ~ ${c.codigo} "${c.grupo}"`);
      for (const l of linhas) console.log(`      ${l}`);
    }
  }

  for (const [key, atual] of banco) {
    if (csv.has(key)) continue;
    console.log(`  - excluir ${atual.codigo} "${atual.grupo}": ${atual.pessoas.map(p => p.nome).join(', ')}`);
    ops.push(async () => {
      await client.query('DELETE FROM convidados WHERE convite_id = $1', [atual.id]);
      await client.query('DELETE FROM convites WHERE id = $1', [atual.id]);
    });
  }

  if (!ops.length) {
    console.log('\n✅ Banco já está igual ao CSV.\n');
  } else if (!CONFIRMAR) {
    console.log(`\n⚠️  ${ops.length} alteração(ões). Nada gravado; rode de novo com --confirmar.\n`);
  } else {
    await client.query('BEGIN');
    try {
      for (const op of ops) await op();
      await client.query('COMMIT');
      console.log(`\n✅ ${ops.length} alteração(ões) gravadas.\n`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  await client.end();
}

main().catch(err => {
  console.error('\n❌ Erro na sincronização:', err.message);
  process.exit(1);
});
