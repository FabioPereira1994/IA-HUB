const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  // Erro em um client ocioso do pool — não deve derrubar requisições em andamento,
  // mas indica algo errado com a conexão (banco caiu, rede, etc.)
  console.error('Erro inesperado no pool do Postgres', err);
});

/**
 * Executa `callback` dentro de uma transação com o contexto de tenant
 * definido via SET LOCAL, para funcionar corretamente com Row Level
 * Security mesmo usando um pool de conexões compartilhado.
 * SET LOCAL só vale dentro da transação atual — por isso o BEGIN/COMMIT
 * em volta, e não um SET normal (que vazaria pra próxima requisição que
 * reusar essa conexão do pool).
 */
async function withTenant(empresaId, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.empresa_id = $1', [empresaId]);
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Para operações sem contexto de empresa ainda definido: cadastro de
 * nova empresa e login (que busca o usuário pelo e-mail, globalmente).
 */
async function withoutTenant(callback) {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

module.exports = { pool, withTenant, withoutTenant };
