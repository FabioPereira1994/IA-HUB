class ChunkerService {
  /**
   * Divide um texto longo em blocos (chunks) menores, com sobreposição.
   * 
   * @param {string} text - O texto limpo vindo do ParserService
   * @param {number} chunkSize - Tamanho máximo de caracteres por bloco
   * @param {number} overlap - Caracteres de sobreposição entre os blocos
   * @returns {string[]} Array de chunks de texto
   */
  static splitText(text, chunkSize = 1000, overlap = 200) {
    if (!text || typeof text !== 'string') return [];

    // Proteção contra loops infinitos caso a configuração de overlap seja incorreta
    if (overlap >= chunkSize) {
      throw new Error('Chunker: O overlap não pode ser maior ou igual ao chunkSize.');
    }

    const chunks = [];
    let i = 0;
    
    while (i < text.length) {
      // 1. Pegamos o bloco bruto pelo tamanho máximo
      let chunk = text.slice(i, i + chunkSize);
      
      // 2. Prevenção de quebra de palavras no meio
      // Se não estamos no final do texto total, procuramos o último espaço
      // para cortar o bloco de forma limpa, sem fatiar uma palavra ao meio.
      if (i + chunkSize < text.length) {
        const lastSpaceIndex = chunk.lastIndexOf(' ');
        
        // Se encontramos um espaço na segunda metade do bloco, cortamos nele
        if (lastSpaceIndex > chunkSize / 2) {
          chunk = chunk.slice(0, lastSpaceIndex);
        }
      }
      
      const cleanChunk = chunk.trim();
      if (cleanChunk.length > 0) {
        chunks.push(cleanChunk);
      }
      
      // 3. Avançamos o ponteiro para o próximo bloco.
      // Em vez de pular o tamanho todo, recuamos o valor do 'overlap' 
      // usando o tamanho REAL do chunk atual (que pode ter sido encurtado no passo 2).
      const step = chunk.length - overlap;
      
      // Garantia matemática de que o ponteiro sempre avance
      i += step > 0 ? step : 1; 
    }
    
    return chunks;
  }
}

module.exports = ChunkerService;