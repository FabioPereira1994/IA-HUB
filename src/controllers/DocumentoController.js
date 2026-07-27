const DocumentoService = require('../services/DocumentoService');

class DocumentoController {
    async uploadDocumento(req, res, next) {
        try {
            // 1. Valida se o arquivo veio através do multer
            if (!req.file) {
                return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
            }

            // 2. Extrai os dados injetados pelo middleware de autenticação e pelo multer
            const empresaId = req.empresaId || (req.usuario && req.usuario.empresaId);
            const usuarioId = req.usuario && req.usuario.id;
            const file = req.file;

            // 3. Chama o serviço responsável por persistir no banco (maestro de regras de negócio)
            const documentoCriado = await DocumentoService.salvarDocumento({
                empresaId,
                usuarioId,
                file
            });

            return res.status(201).json({
                mensagem: 'Documento enviado e processado com sucesso!',
                documento: documentoCriado
            });
        } catch (error) {
            return next(error); // Encaminha para o errorHandler global do app.js
        }
    }
}

// Exporta uma instância única do Controller para garantir o mapeamento correto
module.exports = new DocumentoController();