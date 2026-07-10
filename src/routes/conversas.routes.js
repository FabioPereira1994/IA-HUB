const { Router } = require('express');
const { autenticar } = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/conversas.controller');
const { enviarMensagemSchema, adicionarNotaSchema } = require('../validators/conversas.validators');

const router = Router();

router.use(autenticar);
router.get('/', controller.listar);
router.get('/:id', controller.detalhe);
router.post('/:id/mensagens', validate(enviarMensagemSchema), controller.enviarMensagem);
router.post('/:id/transferir', controller.transferir);
router.post('/:id/encerrar', controller.encerrar);
router.post('/:id/notas', validate(adicionarNotaSchema), controller.adicionarNota);

module.exports = router;
