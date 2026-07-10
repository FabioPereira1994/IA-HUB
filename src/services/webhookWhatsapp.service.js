const { withTenant, withoutTenant } = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const evolutionApi = require('./evolutionApi.service');
const embeddings = require('./embeddings.service');
const baseConhecimento = require('./baseConhecimento.service');
const n8nAgente = require('./n8nAgente.service');

const HISTORICO_MENSAGENS = 12;

function extrairTelefone(remoteJid) {
  // remoteJid chega como "5511999999999@s.whatsapp.net" (ou "@lid" em
  // alguns casos) — pegamos só a parte numérica antes do @.
  return remoteJid.split('@')[0];
}

function extrairTextoMensagem(mensagem) {
  if (!mensagem) return null;
  if (typeof mensagem.conversation === 'string') return mensagem.conversation;
  if (mensagem.extendedTextMessage && typeof mensagem.extendedTextMessage.text === 'string') {
    return mensagem.extendedTextMessage.text;
  }
  return null;
}

async function localizarIntegracaoPorInstancia(instancia) {
  return withoutTenant(async (client) => {
    const result = await client.query(
      `SELECT empresa_id, instancia, token_acesso
       FROM integracoes_whatsapp WHERE instancia = $1`,
      [instancia]
    );
    if (result.rowCount === 0) {
      throw new ApiError(404, `Nenhuma empresa configurada para a instância "${instancia}"`);
    }
    return result.rows[0];
  });
}

async function localizarOuCriarCliente(client, empresaId, telefone) {
  const existente = await client.query(
    'SELECT * FROM clientes WHERE empresa_id = $1 AND telefone = $2',
    [empresaId, telefone]
  );
  if (existente.rowCount > 0) return existente.rows[0];

  // Nome temporário = telefone. O Módulo 4 (Evolution API) também expõe o
  // nome de exibição do contato (pushName) — dá pra melhorar isso passando
  // esse dado aqui quando o payload trouxer.
  const criado = await client.query(
    `INSERT INTO clientes (empresa_id, telefone, nome) VALUES ($1, $2, $3) RETURNING *`,
    [empresaId, telefone, telefone]
  );
  return criado.rows[0];
}

async function localizarOuCriarConversa(client, empresaId, clienteId) {
  const aberta = await client.query(
    `SELECT * FROM conversas
     WHERE empresa_id = $1 AND cliente_id = $2 AND resolvida = FALSE
     ORDER BY criado_em DESC LIMIT 1`,
    [empresaId, clienteId]
  );
  if (aberta.rowCount > 0) return aberta.rows[0];

  const criada = await client.query(
    `INSERT INTO conversas (empresa_id, cliente_id, categoria, status)
     VALUES ($1, $2, 'suporte', 'ia') RETURNING *`,
    [empresaId, clienteId]
  );
  return criada.rows[0];
}

/**
 * Executa a decisão vinda do n8n: envia a resposta ao cliente (se houver),
 * atualiza o status da conversa e abre chamado quando for o caso.
 *
 * 'transferir' e 'abrir_chamado' colocam a conversa em 'pendente' (fila de
 * atendimento humano, ainda sem um atendente específico) — é o clique em
 * "Transferir" no Inbox que move de 'pendente' pra 'humano', atribuindo um
 * atendente. Ver conversas.service.js.
 */
async function executarDecisao(client, integracao, conversa, cliente, decisao) {
  if (decisao.resposta) {
    await client.query(
      `INSERT INTO mensagens (conversa_id, autor, tipo, conteudo) VALUES ($1, 'ia', 'texto', $2)`,
      [conversa.id, decisao.resposta]
    );
    await evolutionApi.enviarTexto(
      { evolutionApiUrl: env.EVOLUTION_API_URL, instancia: integracao.instancia, tokenAcesso: integracao.token_acesso },
      cliente.telefone,
      decisao.resposta
    );
    await client.query('UPDATE conversas SET ultima_mensagem_em = now() WHERE id = $1', [conversa.id]);
  }

  if (decisao.acao === 'responder') {
    await client.query(`UPDATE conversas SET status = 'ia' WHERE id = $1`, [conversa.id]);
    return;
  }

  await client.query(`UPDATE conversas SET status = 'pendente' WHERE id = $1`, [conversa.id]);
  await client.query(
    `INSERT INTO mensagens (conversa_id, autor, tipo, conteudo)
     VALUES ($1, 'sistema', 'texto', 'IA encaminhou a conversa para a fila de atendimento humano')`,
    [conversa.id]
  );

  if (decisao.acao === 'abrir_chamado' && decisao.chamado && decisao.chamado.problema) {
    await client.query(
      `INSERT INTO tickets (empresa_id, cliente_id, conversa_origem_id, problema, descricao, prioridade)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'media'))`,
      [
        conversa.empresa_id,
        cliente.id,
        conversa.id,
        decisao.chamado.problema,
        decisao.chamado.descricao || null,
        decisao.chamado.prioridade || null,
      ]
    );
  }
}

async function receberMensagem(payload) {
  if (!payload || !payload.instance) {
    throw new ApiError(400, 'Payload sem "instance"');
  }

  const dadosMensagem = payload.data;
  if (!dadosMensagem || !dadosMensagem.key) {
    return { ignorado: true, motivo: 'payload sem dados de mensagem' };
  }

  // A Evolution API dispara messages.upsert tanto pra mensagens recebidas
  // quanto enviadas (inclusive as que o nosso backend manda). Ignorar as
  // "fromMe" evita que o próprio envio da IA seja processado como se fosse
  // uma nova mensagem do cliente.
  if (dadosMensagem.key.fromMe) {
    return { ignorado: true, motivo: 'mensagem enviada pela própria instância' };
  }

  const texto = extrairTextoMensagem(dadosMensagem.message);
  if (!texto) {
    return { ignorado: true, motivo: 'tipo de mensagem ainda não suportado (áudio/imagem/documento)' };
  }

  const telefone = extrairTelefone(dadosMensagem.key.remoteJid);
  const mensagemExternaId = dadosMensagem.key.id || null;

  const integracao = await localizarIntegracaoPorInstancia(payload.instance);
  const empresaId = integracao.empresa_id;

  return withTenant(empresaId, async (client) => {
    if (mensagemExternaId) {
      // Idempotência: se esse messages.upsert já foi processado (o Evolution
      // API reentrega webhooks quando não recebe 200 a tempo), não duplica.
      const jaExiste = await client.query(
        'SELECT id FROM mensagens WHERE mensagem_externa_id = $1',
        [mensagemExternaId]
      );
      if (jaExiste.rowCount > 0) {
        return { ignorado: true, motivo: 'mensagem já processada' };
      }
    }

    const cliente = await localizarOuCriarCliente(client, empresaId, telefone);
    const conversa = await localizarOuCriarConversa(client, empresaId, cliente.id);

    await client.query(
      `INSERT INTO mensagens (conversa_id, autor, tipo, conteudo, mensagem_externa_id)
       VALUES ($1, 'cliente', 'texto', $2, $3)`,
      [conversa.id, texto, mensagemExternaId]
    );
    await client.query('UPDATE conversas SET ultima_mensagem_em = now() WHERE id = $1', [conversa.id]);

    // Conversa já nas mãos de um atendente: só guarda a mensagem. Quem
    // responde é o humano, pelo Inbox — a IA não entra em cena de novo até
    // o atendimento ser encerrado (Módulo 3).
    if (conversa.status === 'humano') {
      return { ignorado: false, encaminhadoParaHumano: true };
    }

    const historicoResult = await client.query(
      `SELECT autor, conteudo FROM mensagens
       WHERE conversa_id = $1 ORDER BY enviado_em DESC LIMIT $2`,
      [conversa.id, HISTORICO_MENSAGENS]
    );
    const historico = historicoResult.rows.reverse().map((m) => ({ autor: m.autor, texto: m.conteudo }));

    const configResult = await client.query(
      `SELECT nome_agente, tom, objetivo_vendas, objetivo_atendimento, objetivo_suporte,
              regras_transferencia, regras_abertura_chamado, limites_atuacao
       FROM configuracoes_ia WHERE empresa_id = $1`,
      [empresaId]
    );
    const configuracaoAgente = configResult.rows[0] || null;

    let trechosBaseConhecimento = [];
    try {
      const embeddingConsulta = await embeddings.gerarEmbedding(texto);
      trechosBaseConhecimento = await baseConhecimento.buscarTrechosRelevantes(client, empresaId, embeddingConsulta);
    } catch (err) {
      // Base de conhecimento é um "nice to have" nesse ponto — se a busca
      // vetorial falhar (ex.: OpenAI fora do ar), o agente segue sem esse
      // contexto em vez de travar o atendimento inteiro.
      console.error('Falha ao buscar contexto na base de conhecimento', err);
    }

    const contexto = {
      empresaId,
      conversaId: conversa.id,
      cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone },
      mensagemAtual: texto,
      historico,
      configuracaoAgente,
      baseConhecimento: trechosBaseConhecimento,
    };

    let decisao;
    try {
      decisao = await n8nAgente.decidirResposta(contexto);
    } catch (err) {
      console.error('Falha ao chamar o n8n — transferindo conversa por segurança', err);
      // Nunca deixamos o cliente sem retorno nem "preso" com a IA: se o
      // orquestrador falhar, a conversa vai direto pra fila de humanos.
      decisao = { acao: 'transferir', resposta: null, chamado: null };
    }

    await executarDecisao(client, integracao, conversa, cliente, decisao);

    return { ignorado: false, decisao: decisao.acao };
  });
}

module.exports = { receberMensagem };
