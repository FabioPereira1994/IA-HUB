const env = require('../config/env');

const ACOES_VALIDAS = ['responder', 'transferir', 'abrir_chamado'];

// Chama o workflow do n8n (Webhook -> monta prompt -> OpenAI -> responde)
// e devolve a decisão já validada. Se o n8n falhar por qualquer motivo,
// quem chama essa função decide o fallback (webhookWhatsapp.service.js
// transfere pra humano nesse caso, pra nunca deixar o cliente sem resposta).
async function decidirResposta(payload) {
  const resposta = await fetch(env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`n8n respondeu ${resposta.status} ao decidir a resposta: ${corpo}`);
  }

  const decisao = await resposta.json();

  return {
    acao: ACOES_VALIDAS.includes(decisao.acao) ? decisao.acao : 'responder',
    resposta: typeof decisao.resposta === 'string' ? decisao.resposta : null,
    chamado: decisao.chamado || null,
  };
}

module.exports = { decidirResposta };
