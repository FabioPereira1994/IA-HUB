const { withTenant } = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const evolutionApi = require('./evolutionApi.service');
const { buscarPerfilCliente } = require('./clientes.service');

async function listarConversas(empresaId, { categoria, status, busca } = {}) {
  return withTenant(empresaId, async (client) => {
    const condicoes = ['c.empresa_id = $1'];
    const valores = [empresaId];

    if (categoria) {
      valores.push(categoria);
      condicoes.push(`c.categoria = $${valores.length}`);
    }
    if (status) {
      valores.push(status);
      condicoes.push(`c.status = $${valores.length}`);
    }
    if (busca) {
      valores.push(`%${busca}%`);
      condicoes.push(`cl.nome ILIKE $${valores.length}`);
    }

    const result = await client.query(
      `SELECT
         c.id, c.categoria, c.status, c.resolvida, c.ultima_mensagem_em,
         cl.id AS cliente_id, cl.nome AS cliente_nome, cl.telefone AS cliente_telefone,
         (SELECT m.conteudo FROM mensagens m
          WHERE m.conversa_id = c.id ORDER BY m.enviado_em DESC LIMIT 1) AS ultima_mensagem
       FROM conversas c
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE ${condicoes.join(' AND ')}
       ORDER BY c.ultima_mensagem_em DESC`,
      valores
    );

    return result.rows;
  });
}

async function buscarDetalhe(empresaId, conversaId) {
  return withTenant(empresaId, async (client) => {
    const conversaResult = await client.query(
      `SELECT c.*, cl.nome AS cliente_nome, cl.telefone AS cliente_telefone
       FROM conversas c JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = $1 AND c.empresa_id = $2`,
      [conversaId, empresaId]
    );
    if (conversaResult.rowCount === 0) {
      throw new ApiError(404, 'Conversa não encontrada');
    }
    const conversa = conversaResult.rows[0];

    const mensagensResult = await client.query(
      `SELECT id, autor, tipo, conteudo, enviado_em FROM mensagens
       WHERE conversa_id = $1 ORDER BY enviado_em ASC`,
      [conversaId]
    );

    const notasResult = await client.query(
      `SELECT n.id, n.conteudo, n.criado_em, u.nome AS usuario_nome
       FROM notas_internas n LEFT JOIN usuarios u ON u.id = n.usuario_id
       WHERE n.conversa_id = $1 ORDER BY n.criado_em ASC`,
      [conversaId]
    );

    const cliente = await buscarPerfilCliente(client, empresaId, conversa.cliente_id);

    return { ...conversa, mensagens: mensagensResult.rows, notas: notasResult.rows, cliente };
  });
}

async function obterIntegracao(client, empresaId) {
  const result = await client.query(
    'SELECT instancia, token_acesso FROM integracoes_whatsapp WHERE empresa_id = $1',
    [empresaId]
  );
  if (result.rowCount === 0) {
    throw new ApiError(409, 'Empresa ainda não conectou o WhatsApp (Módulo 4)');
  }
  return result.rows[0];
}

async function buscarConversaOuFalhar(client, empresaId, conversaId) {
  const result = await client.query(
    `SELECT c.*, cl.telefone AS cliente_telefone FROM conversas c
     JOIN clientes cl ON cl.id = c.cliente_id
     WHERE c.id = $1 AND c.empresa_id = $2`,
    [conversaId, empresaId]
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Conversa não encontrada');
  }
  return result.rows[0];
}

async function enviarMensagemHumano(empresaId, conversaId, usuarioId, texto) {
  return withTenant(empresaId, async (client) => {
    const conversa = await buscarConversaOuFalhar(client, empresaId, conversaId);
    if (conversa.resolvida) {
      throw new ApiError(409, 'Não é possível enviar mensagens em um atendimento encerrado');
    }

    const integracao = await obterIntegracao(client, empresaId);

    const mensagemResult = await client.query(
      `INSERT INTO mensagens (conversa_id, autor, usuario_id, tipo, conteudo)
       VALUES ($1, 'atendente', $2, 'texto', $3)
       RETURNING id, autor, conteudo, enviado_em`,
      [conversaId, usuarioId, texto]
    );
    await client.query('UPDATE conversas SET ultima_mensagem_em = now() WHERE id = $1', [conversaId]);

    await evolutionApi.enviarTexto(
      { evolutionApiUrl: env.EVOLUTION_API_URL, instancia: integracao.instancia, tokenAcesso: integracao.token_acesso },
      conversa.cliente_telefone,
      texto
    );

    return mensagemResult.rows[0];
  });
}

async function transferirParaHumano(empresaId, conversaId, usuario) {
  return withTenant(empresaId, async (client) => {
    const conversa = await buscarConversaOuFalhar(client, empresaId, conversaId);
    if (conversa.resolvida) {
      throw new ApiError(409, 'Atendimento já encerrado');
    }

    await client.query(`UPDATE conversas SET status = 'humano', usuario_id = $2 WHERE id = $1`, [conversaId, usuario.id]);
    await client.query(
      `INSERT INTO mensagens (conversa_id, autor, tipo, conteudo) VALUES ($1, 'sistema', 'texto', $2)`,
      [conversaId, `Conversa transferida para ${usuario.nome} (atendente)`]
    );

    return { id: conversaId, status: 'humano' };
  });
}

async function encerrarAtendimento(empresaId, conversaId, usuario) {
  return withTenant(empresaId, async (client) => {
    await buscarConversaOuFalhar(client, empresaId, conversaId);

    await client.query('UPDATE conversas SET resolvida = TRUE WHERE id = $1', [conversaId]);
    await client.query(
      `INSERT INTO mensagens (conversa_id, autor, tipo, conteudo) VALUES ($1, 'sistema', 'texto', $2)`,
      [conversaId, `Atendimento encerrado por ${usuario.nome}`]
    );

    return { id: conversaId, resolvida: true };
  });
}

async function adicionarNota(empresaId, conversaId, usuarioId, texto) {
  return withTenant(empresaId, async (client) => {
    await buscarConversaOuFalhar(client, empresaId, conversaId);

    const result = await client.query(
      `INSERT INTO notas_internas (conversa_id, usuario_id, conteudo)
       VALUES ($1, $2, $3) RETURNING id, conteudo, criado_em`,
      [conversaId, usuarioId, texto]
    );
    return result.rows[0];
  });
}

module.exports = {
  listarConversas,
  buscarDetalhe,
  enviarMensagemHumano,
  transferirParaHumano,
  encerrarAtendimento,
  adicionarNota,
};
