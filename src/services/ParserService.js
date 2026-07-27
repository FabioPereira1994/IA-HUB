const fs = require('fs');
const PDFParse = require('pdf-parse').PDFParse;
const mammoth = require('mammoth');

/**
 * Utilitário interno para validar a extensão real do arquivo (Magic Numbers)
 * Evita que um arquivo malicioso (.exe) seja renomeado para .pdf e cause buffer overflow
 */
function validateMagicNumber(buffer, expectedType) {
  // Converte os primeiros 4 bytes em hexadecimal
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  if (expectedType === 'pdf') {
    // 25 50 44 46 = %PDF
    if (!hex.startsWith('25504446')) throw new Error('Arquivo inválido: Não é um PDF autêntico (Falha de Magic Number).');
  } 
  else if (expectedType === 'docx') {
    // 50 4B 03 04 = ZIP archive (DOCX é um zip por baixo dos panos)
    if (!hex.startsWith('504B0304')) throw new Error('Arquivo inválido: Não é um DOCX autêntico (Falha de Magic Number).');
  }
}

class ParserService {
  /**
   * Processa o buffer do arquivo dependendo do mimetype e extrai o texto bruto.
   * 
   * @param {Buffer} buffer - O buffer do arquivo em memória (vindo do multer)
   * @param {string} mimetype - O tipo MIME passado pelo multer (ex: application/pdf)
   * @returns {Promise<string>} O texto consolidado e limpo
   */
  static async extractText(buffer, mimetype) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Buffer de arquivo ausente ou inválido.');
    }

    try {
      let extractedText = '';

      switch (mimetype) {
        case 'application/pdf':
          validateMagicNumber(buffer, 'pdf');
          
          // Uso correto do pdf-parse v2 com base na engenharia reversa
          const pdfInstance = new PDFParse({ data: buffer });
          const pdfResult = await pdfInstance.getText();
          extractedText = pdfResult.text || '';
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // DOCX
          validateMagicNumber(buffer, 'docx');
          const docxResult = await mammoth.extractRawText({ buffer });
          extractedText = docxResult.value || '';
          break;

        case 'text/plain':
          // TXT é simples, basta converter para UTF-8. 
          // Importante: TXT não tem magic number universal, então limitaremos tamanho na controller.
          extractedText = buffer.toString('utf-8');
          break;

        default:
          throw new Error(`Mimetype não suportado para extração de texto: ${mimetype}`);
      }

      return this._cleanText(extractedText);

    } catch (error) {
      console.error('[ParserService Error]: Falha ao extrair texto do documento.', error);
      throw error;
    }
  }

  /**
   * Remove espaços múltiplos, caracteres nulos e quebras de linha excessivas
   * que poluem o vetor e estouram tokens da OpenAI atoa.
   */
  static _cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\u0000/g, '') // Remove NULL bytes
      .replace(/(\r\n|\n|\r){3,}/g, '\n\n') // Reduz 3+ quebras de linha para apenas 2
      .replace(/[ \t]{2,}/g, ' ') // Reduz espaços duplos
      .trim();
  }
}

module.exports = ParserService;