const { OpenAI } = require('openai');
const ParserService = require('./ParserService');
const ChunkerService = require('./ChunkerService');
const { withTenant } = require('../config/db'); // Importa o seu helper de RLS

// Instancia o cliente da OpenAI (requer OPENAI_API_KEY no .env)
const openai = new OpenAI();

class DocumentoService {
  /**
   * Orquestra o pipeline completo: File -> Texto -> Chunks -> Embeddings -> Banco
   * 
   * @param {string} empresaId - ID do tenant para aplicar RLS
   * @param {object} file - Objeto do arquivo vindo do Multer
   * @returns {Promise<object>} Resumo do processamento
   */
  static async processarUploadDocumento(empresaId, file) {
    const { buffer, mimetype, originalname, size } = file;

    // 1. Extração
    const textoCompleto = await ParserService.extractText(buffer, mimetype);
    if (!textoCompleto) {
      throw new Error('Não foi possível extrair texto. O arquivo pode estar vazio ou ser apenas imagens escaneadas.');
    }

    // 2. Chunking
    const chunks = ChunkerService.splitText(textoCompleto, 1000, 200);
    if (chunks.length === 0) {
      throw new Error('Nenhum texto útil pôde ser fragmentado deste documento.');
    }

    // 3. Embeddings (OpenAI)
    // O text-embedding-3-small gera vetores de 1536 dimensões nativamente
    let embeddingsResponse;
    try {
      embeddingsResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks, // OpenAI aceita array de strings diretamente
      });
    } catch (error) {
      console.error('[DocumentoService] Falha na API da OpenAI:', error.message);
      throw new Error('Falha ao gerar embeddings com a OpenAI.');
    }

    // 4. Persistência de Dados (Transaction + RLS)
    // Usamos o withTenant para garantir que todo insert respeite a empresa atual
    let documentoId;
    await withTenant(empresaId, async (client) => {
      // Inicia a transação para evitar salvar o documento sem os chunks caso algo falhe
      await client.query('BEGIN');
      
      try {
        // Insere o registro pai (Documento)
        // Nota: Ajuste os nomes das colunas de acordo com o seu schema exato (migration)
        const docResult = await client.query(
          `INSERT INTO documentos (nome_arquivo, tipo, tamanho) 
           VALUES ($1, $2, $3) RETURNING id`,
          [originalname, mimetype, size]
        );
        documentoId = docResult.rows[0].id;

        // Insere os chunks com os vetores
        // O pgvector requer que o array de float venha no formato string '[0.1, 0.2, ...]'
        for (let i = 0; i < chunks.length; i++) {
          const conteudo = chunks[i];
          const embeddingArray = embeddingsResponse.data[i].embedding;
          const vetorSql = `[${embeddingArray.join(',')}]`;

          await client.query(
            `INSERT INTO documento_chunks (documento_id, conteudo, embedding) 
             VALUES ($1, $2, $3::vector)`,
            [documentoId, conteudo, vetorSql]
          );
        }

        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('[DocumentoService] Rollback executado devido a erro:', dbError.message);
        throw dbError;
      }
    });

    return { 
      sucesso: true, 
      documentoId, 
      nomeArquivo: originalname,
      chunksGerados: chunks.length 
    };
  }
}

module.exports = DocumentoService;