const { withTenant } = require('../config/db');
const ApiError = require('../utils/ApiError');

// Recebe um client já dentro de uma transação com tenant (withTenant) — pra
// poder ser reaproveitado dentro de outras operações, como o detalhe da
// conversa no Inbox, sem abrir uma segunda transação.
async function buscarPerfilCliente(client, empresaId, clienteId) {
  const clienteResult = await client.query(
    'SELECT id, nome, telefone, email, observacoes, criado_em FROM clientes WHERE id = $1 AND empresa_id = $2',
    [clienteId, empresaId]
  );
  if (clienteResult.rowCount === 0) {
    throw new ApiError(404, 'Cliente não encontrado');
  }
  const cliente = clienteResult.rows[0];

  const tagsResult = await client.query(
    `SELECT t.nome FROM tags t
     JOIN cliente_tags ct ON ct.tag_id = t.id
     WHERE ct.cliente_id = $1
     ORDER BY t.nome`,
    [clienteId]
  );

  const historicoResult = await client.query(
    `SELECT descricao, data_evento, valor FROM cliente_historico
     WHERE cliente_id = $1
     ORDER BY data_evento DESC`,
    [clienteId]
  );

  const chamadosResult = await client.query(
    `SELECT numero, problema, status, prioridade, criado_em FROM tickets
     WHERE cliente_id = $1
     ORDER BY criado_em DESC`,
    [clienteId]
  );

  return {
    ...cliente,
    tags: tagsResult.rows.map((linha) => linha.nome),
    historico: historicoResult.rows,
    chamados: chamadosResult.rows,
  };
}

async function buscarPerfil(empresaId, clienteId) {
  return withTenant(empresaId, (client) => buscarPerfilCliente(client, empresaId, clienteId));
}

module.exports = { buscarPerfilCliente, buscarPerfil };
