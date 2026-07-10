const { Router } = require('express');
const controller = require('../controllers/webhooks.controller');

const router = Router();

// Sem `autenticar`: quem chama é o Evolution API, não um usuário logado.
// A validação é o header x-webhook-secret, conferido no controller.
router.post('/whatsapp', controller.receberWhatsapp);

module.exports = router;
