const express = require('express');
const router = express.Router();

// 🟢 CORRIGIDO: Aponta para 'auth' e extrai a função 'autenticar'
const { autenticar } = require('../middleware/auth'); 
const uploadMiddleware = require('../middleware/uploadMiddleware');

const DocumentoController = require('../controllers/DocumentoController');

/**
 * @route POST /api/documentos/upload
 * @desc Faz o upload de um documento (PDF, DOCX, TXT) e salva no banco de dados
 * @access Private
 */
router.post(
    '/upload', 
    autenticar, // Protege a rota usando a função correta do auth.js
    uploadMiddleware.single('file'), // Processa o upload (espera o campo 'file' no form-data)
    DocumentoController.uploadDocumento // Manda para o controller processar
);

module.exports = router;