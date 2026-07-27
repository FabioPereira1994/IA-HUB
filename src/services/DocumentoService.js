const { OpenAI } = require('openai');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const ParserService = require('./ParserService');
const ChunkerService = require('./ChunkerService');
const { withTenant } = require('../config/db');

const openai = new OpenAI();

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Único lugar que sabe mapear mimetype -> extensão salva no banco
const MIME_PARA_EXTENSAO = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt'
};

class DocumentoService {
  /**
   * Orquestra o pipeline completo: File -> Texto -> Chunks -> Embeddings -> Banco
   */
  static async processarUploadDocumento(empresaId, usuarioId, file) {
    const { buffer, mimetype, originalname } = file;

    const tipoArquivo = MIME_PARA_EXTENSAO[mimetype];
    if (!tipoArquivo) {
      throw new Error(`Tipo de arquivo não suportado: ${mimetype}`);
    }

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
        input: chunks
      });
    } catch (error) {
      console.error('[DocumentoService] Falha na API da OpenAI:', error.message);
      throw new Error('Falha ao gerar embeddings com a OpenAI.');
    }

    // 4. Só grava o arquivo em disco depois de confirmar que ele é processável.
    // TODO: trocar por upload a um storage persistente (Supabase Storage/S3)
    // antes de ir pra produção — disco local não sobrevive a redeploy na
    // maioria dos PaaS (Render, Railway, containers sem volume).
    const urlArquivo = await this._salvarBufferEmDisco(buffer, originalname);

    // 5. Persistência — UMA transação só, gerenciada pelo withTenant.
    // Não abrir BEGIN/COMMIT aqui dentro: withTenant já faz isso e já dá
    // ROLLBACK sozinho se qualquer query lançar erro.
    let documentoId;
    try {
      await withTenant(empresaId, async (client) => {
        const docResult = await client.query(
          `INSERT INTO documentos (empresa_id, nome_arquivo, tipo_arquivo, url_arquivo, status, enviado_por)
           VALUES ($1, $2, $3, $4, 'pronto', $5) RETURNING id`,
          [empresaId, originalname, tipoArquivo, urlArquivo, usuarioId]
        );
        documentoId = docResult.rows[0].id;

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
      });
    } catch (err) {
      // Limpa o arquivo órfão em disco se a transação falhou
      await fsPromises.unlink(path.join(UPLOAD_DIR, path.basename(urlArquivo))).catch(() => {});
      throw err;
    }

    return {
      sucesso: true,
      documentoId,
      nomeArquivo: originalname,
      chunksGerados: chunks.length
    };
  }

  static async _salvarBufferEmDisco(buffer, originalname) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const nomeArquivo = `${uniqueSuffix}-${originalname.replace(/\s+/g, '_')}`;
    await fsPromises.writeFile(path.join(UPLOAD_DIR, nomeArquivo), buffer);
    return path.join('uploads', nomeArquivo);
  }
}

module.exports = DocumentoService;