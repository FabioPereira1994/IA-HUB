const { OpenAI } = require('openai');
const ParserService = require('./ParserService');
const ChunkerService = require('./ChunkerService');
const { withTenant } = require('../config/db'); 

const openai = new OpenAI();

class DocumentoService {
  /**
   * Orquestra o pipeline completo: File -> Texto -> Chunks -> Embeddings -> Banco
   */
  static async processarUploadDocumento(empresaId, usuarioId, file) {
    const { buffer, mimetype, tipo_arquivo, originalname, path } = file;
    // "path" é o caminho físico gerado pelo multer (ex: uploads/169000-arquivo.pdf)

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
    let embeddingsResponse;
    try {
      embeddingsResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks,
      });
    } catch (error) {
      console.error('[DocumentoService] Falha na API da OpenAI:', error.message);
      throw new Error('Falha ao gerar embeddings com a OpenAI.');
    }

    // 4. Persistência de Dados (Transaction + RLS)
    let documentoId;
    await withTenant(empresaId, async (client) => {
      await client.query('BEGIN');
      
      try {
        // Insere o registro pai - AGORA ALINHADO COM O SCHEMA
        // Incluído: url_arquivo e enviado_por. Removido: tamanho.
        const docResult = await client.query(
          `INSERT INTO documentos (empresa_id, nome_arquivo, tipo_arquivo, url_arquivo, status, enviado_por) 
           VALUES ($1, $2, $3, $4, 'pronto', $5) RETURNING id`,
          [empresaId, originalname, tipo_arquivo, path, usuarioId]
        );
        documentoId = docResult.rows[0].id;

        // Insere os chunks - AGORA ALINHADO COM O SCHEMA
        // Incluído: ordem (indice do loop) e empresa_id (desnormalizado conforme seu schema)
        for (let i = 0; i < chunks.length; i++) {
          const conteudo = chunks[i];
          const embeddingArray = embeddingsResponse.data[i].embedding;
          const vetorSql = `[${embeddingArray.join(',')}]`;

          await client.query(
            `INSERT INTO documento_chunks (documento_id, empresa_id, ordem, conteudo, embedding) 
             VALUES ($1, $2, $3, $4, $5::vector)`,
            [documentoId, empresaId, i + 1, conteudo, vetorSql]
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