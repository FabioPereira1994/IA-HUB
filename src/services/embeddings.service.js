const env = require('../config/env');

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

// text-embedding-3-small produz vetores de 1536 dimensões — o mesmo
// tamanho já usado na coluna documento_chunks.embedding (db/schema.sql).
// Se trocar de modelo, ajuste os dois lugares juntos.
const MODELO_EMBEDDING = 'text-embedding-3-small';

async function gerarEmbedding(texto) {
  const resposta = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODELO_EMBEDDING, input: texto }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`OpenAI embeddings respondeu ${resposta.status}: ${corpo}`);
  }

  const dados = await resposta.json();
  return dados.data[0].embedding;
}

module.exports = { gerarEmbedding, MODELO_EMBEDDING };
