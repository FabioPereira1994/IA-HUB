// Busca por similaridade na base de conhecimento (Módulo 6, pgvector).
//
// Nota: o pipeline que POPULA documento_chunks (upload de PDF/DOCX, split,
// geração de embedding dos documentos) é do Sprint 3 — ainda não existe.
// Por enquanto essa busca sempre retorna vazio, e o agente de IA simplesmente
// responde sem contexto de base de conhecimento. Assim que o Sprint 3 estiver
// pronto, isso passa a funcionar automaticamente, sem mudar nada aqui.

const SIMILARIDADE_MINIMA = 0.5;

async function buscarTrechosRelevantes(client, empresaId, embeddingConsulta, limite = 4) {
  const vetor = `[${embeddingConsulta.join(',')}]`;

  const resultado = await client.query(
    `SELECT conteudo, 1 - (embedding <=> $2::vector) AS similaridade
     FROM documento_chunks
     WHERE empresa_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [empresaId, vetor, limite]
  );

  return resultado.rows
    .filter((linha) => Number(linha.similaridade) >= SIMILARIDADE_MINIMA)
    .map((linha) => linha.conteudo);
}

module.exports = { buscarTrechosRelevantes };
