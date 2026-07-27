const DocumentoService = require('../services/DocumentoService');

class DocumentoController {
    async uploadDocumento(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
            }

            const empresaId = req.empresaId || (req.usuario && req.usuario.empresaId);
            const usuarioId = req.usuario && req.usuario.id;
            const file = req.file;

            const documentoCriado = await DocumentoService.processarUploadDocumento(empresaId, usuarioId, file);

            return res.status(201).json({
                mensagem: 'Documento enviado e processado com sucesso!',
                documento: documentoCriado
            });
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = new DocumentoController();