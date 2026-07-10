const { withoutTenant } = require('../config/db');
const ApiError = require('../utils/ApiError');

async function buscarEmpresa(empresaId) {
  return withoutTenant(async (client) => {
    const result = await client.query(
      'SELECT id, nome, cnpj, ativo, criado_em FROM empresas WHERE id = $1',
      [empresaId]
    );
    if (result.rowCount === 0) {
      throw new ApiError(404, 'Empresa não encontrada');
    }
    return result.rows[0];
  });
}

async function atualizarEmpresa(empresaId, { nome }) {
  return withoutTenant(async (client) => {
    const result = await client.query(
      `UPDATE empresas SET nome = COALESCE($1, nome) WHERE id = $2
       RETURNING id, nome, cnpj, ativo`,
      [nome, empresaId]
    );
    if (result.rowCount === 0) {
      throw new ApiError(404, 'Empresa não encontrada');
    }
    return result.rows[0];
  });
}

module.exports = { buscarEmpresa, atualizarEmpresa };
